// app/api/products/bulk/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import Papa from 'papaparse';
import * as xlsx from 'xlsx';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    let rows: any[] = [];

    // Check file type and parse accordingly
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      const fileText = await file.text();
      const parseResult = Papa.parse(fileText, { header: true, skipEmptyLines: true });
      if (parseResult.errors.length) {
         return NextResponse.json({ error: 'Failed to parse CSV file.' }, { status: 400 });
      }
      rows = parseResult.data;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx')) {
      const buffer = await file.arrayBuffer();
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      rows = xlsx.utils.sheet_to_json(worksheet);
    } else {
        return NextResponse.json({ error: 'Unsupported file type. Please upload CSV or XLSX.' }, { status: 400 });
    }

    if (rows.length === 0) {
        return NextResponse.json({ error: 'File is empty or could not be parsed.' }, { status: 400 });
    }

    const ebayShop = await db.shop.findFirst({
        where: { userId: session.user.id, marketplace: { name: 'eBay' } },
    });
    
    // Process rows in a transaction
    await db.$transaction(async (tx) => {
      for (const row of rows) {
        // This check ensures we don't process empty rows
        if (!row['SKU'] || !row['Pic Title']) {
            continue;
        }

        // --- THIS IS THE CORRECTED MAPPING LOGIC ---
        // It fully defines the productData object to satisfy db's type requirements.
        const productData = {
            title: row['Pic Title'] || row['Ebay Title 80 characters'] || 'Untitled Product',
            sku: row['SKU'],
            description: row['Description'] || '',
            price: parseFloat(row['Average Sold Price']) || 0,
            imagesJson: row['Image'] ? { urls: [row['Image']] } : {},
            attributesJson: {
                generalCategory: row['General Categories'],
                minSoldPrice: parseFloat(row['Min Sold Price']) || null,
                maxSoldPrice: parseFloat(row['Max Sold Price']) || null,
            },
            userId: session.user.id,
        };

        const newProduct = await tx.product.create({ data: productData });

        if (ebayShop) {
          await tx.listing.create({
            data: {
              productId: newProduct.id,
              shopId: ebayShop.id,
              externalListingId: `temp_${newProduct.sku}_${Date.now()}`,
              status: 'DRAFT',
              overridesJson: {
                title: row['Ebay Title 80 characters'],
                ebayCategoryId: row['Ebay Category'],
              },
            },
          });
        }
      }
    });

    return NextResponse.json({ message: `Successfully processed ${rows.length} rows.` });
  } catch (error: any) {
    console.error('Bulk upload error:', error);
    // Provide a more specific error message if it's a db error
    const errorMessage = error.code ? `A database error occurred.` : 'An error occurred during bulk import.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}