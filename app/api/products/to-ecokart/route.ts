import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx'; // Used for robustly reading the initial file (XLSX or CSV)
import Papa from 'papaparse'; // Used for creating the final CSV string
import path from 'path';
import fs from 'fs/promises';

// ==================================================================================
// --- Type Definitions, Error Class, and Helper Functions ---
// ==================================================================================
type InternalProduct = {
    sku: string; name: string; description: string; price: number; quantity: number;
    imageUrls: string[]; upc: string; ecokartCategory: string;
    brand: string; condition: string;
};

type ParsedRow = Record<string, any>;

class ValidationError extends Error {
    constructor(public row: number, public field: string, message:string) {
        super(message);
        this.name = 'ValidationError';
    }
}

// Uses the 'xlsx' library to safely parse both .csv and .xlsx user uploads
async function parseUploadedFile(file: File): Promise<ParsedRow[]> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    // Explicitly type rows as a string-keyed object to allow safe indexing
    const sheet = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "" });
    return sheet.map((row) => {
        const normalizedRow: ParsedRow = {};
        for (const [key, value] of Object.entries(row)) {
            const normalizedKey = key.trim().toLowerCase();
            // ParsedRow allows any values; cast here to satisfy TS
            normalizedRow[normalizedKey] = value as any;
        }
        return normalizedRow;
    });
}

function findValueByKey(row: ParsedRow, key: string): any {
    const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, ' ');
    for (const rowKey in row) {
        if (rowKey.trim().toLowerCase() === normalizedKey) {
            return row[rowKey];
        }
    }
    return "";
}

// ==================================================================================
// --- Mappers and Generators ---
// ==================================================================================

function mapEbayToInternal(row: ParsedRow, rowIndex: number): InternalProduct {
    const name = findValueByKey(row, 'title');
    // Use 'Item number' as a fallback for missing SKUs to prevent errors
    let sku = findValueByKey(row, 'custom label (sku)');
    if (!sku) {
        sku = findValueByKey(row, 'item number');
    }

    const rawPrice = findValueByKey(row, 'start price');
    const price = typeof rawPrice === 'string' ? parseFloat(rawPrice) : Number(rawPrice);

    if (!name) throw new ValidationError(rowIndex, 'Title', '"Title" cannot be empty.');
    if (!sku) throw new ValidationError(rowIndex, 'SKU', 'Both "Custom label (SKU)" and "Item number" are missing.');
    if (isNaN(price)) throw new ValidationError(rowIndex, 'Start price', '"Start price" must be a valid number.');

    const imageUrls = (findValueByKey(row, 'item photo url') || '').toString().split('|').filter(Boolean);

    return {
        sku, name, price,
        description: findValueByKey(row, 'description') || name,
        quantity: parseInt(findValueByKey(row, 'available quantity'), 10) || 0,
        imageUrls,
        upc: findValueByKey(row, 'p:upc') || '',
        ecokartCategory: findValueByKey(row, 'ebay category 1 name') || 'Uncategorized',
        brand: findValueByKey(row, 'brand') || 'Unbranded',
        condition: (findValueByKey(row, 'condition') || 'Used').toUpperCase(),
    };
}

function calaculateComparePrice(price : any){
  if (isNaN(price) || price <= 0) return 0;
    const comparePrice = price * 1.25;
    return parseFloat(comparePrice.toFixed(2));
}


function calaculateCostPrice(price : any){
  if (isNaN(price) || price <= 0) return 0;
    const costPrice = price * 0.60;
    return parseFloat(costPrice.toFixed(2));
}

function generateEcokartData(internalData: InternalProduct[]): Record<string, any>[] {
    return internalData.map(p => ({
        'name': p.name,
        'description': p.description,
        'shortDescription': p.name,
        'price': p.price,
        'compareAtPrice': calaculateComparePrice(p.price),
        'costPrice': calaculateCostPrice(p.price),
        'quantity': p.quantity,
        'lowStockThreshold': 10,
        'weight': '',
        'itemSize': 'SMALL',
        'brand': p.brand,
        'condition': p.condition,
        'categoryName': p.ecokartCategory,
        'barcode': p.upc,
        'metaTitle': p.name,
        'metaDescription': p.description,
        'isActive': true,
        'isFeatured': false,
        'trackQuantity': true,
        'allowBackorder': false,
        'tags': 'ebay, import',
        'image': p.imageUrls[0] || 'https://media-cdn.prabisha.com/uploads/ecokart/',
        'imageUrls': p.imageUrls.slice(1).join(','),
    }));
}


// ==================================================================================
// --- Main API Handler ---
// ==================================================================================
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
        }

        const rows = await parseUploadedFile(file);
        if (rows.length === 0) {
            return NextResponse.json({ error: 'Uploaded file is empty or could not be parsed.' }, { status: 400 });
        }

        const errors: { row: number; field: string; message: string }[] = [];
        const internalData: InternalProduct[] = [];

        rows.forEach((row, index) => {
            try {
                internalData.push(mapEbayToInternal(row, index + 2));
            } catch (e: unknown) {
                if (e instanceof ValidationError) {
                    errors.push({ row: e.row, field: e.field, message: e.message });
                } else if (e instanceof Error) {
                    errors.push({ row: index + 2, field: 'Unknown', message: e.message });
                }
            }
        });

        if (errors.length > 0) {
            return NextResponse.json({ error: 'Your file contains validation errors.', errors }, { status: 400 });
        }

        // 1. Read the Ecokart template file from the public directory
        const templatePath = path.join(process.cwd(), 'public', 'cross-list - ecokart.csv');
        const templateText = await fs.readFile(templatePath, 'utf-8');

        // 2. Generate the new data rows from the uploaded eBay file
        const newDataForEcokart = generateEcokartData(internalData);
        
        // 3. Convert the new data to a CSV string *without* a header row
        const newDataCsv = Papa.unparse(newDataForEcokart, { header: false });

        // 4. Append the new CSV data to the existing template content
        // Ensures there's a newline between the old content and the new rows
        const finalCsvString = `${templateText.trim()}\n${newDataCsv}`;

        // 5. Return the combined CSV file
        return new NextResponse(finalCsvString, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="ecokart-from-ebay-${Date.now()}.csv"`,
            }
        });

    } catch (error: unknown) {
      console.error(error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        // Handle file not found error separately
        if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
             return NextResponse.json({ error: 'Could not find "cross-list - ecokart.csv" on the server.' }, { status: 500 });
        }
        return NextResponse.json({ error: message }, { status: 500 });
    }
}