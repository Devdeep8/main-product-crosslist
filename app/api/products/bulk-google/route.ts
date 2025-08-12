import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import Papa from 'papaparse';
import fs from 'fs/promises';
import path from 'path';

// --- CONFIGURATION ---
const ECOKART_TO_GOOGLE_CATEGORY_MAP: Record<string, string> = {
  'Shoes & Footwear': '187', 'Toys & Games': '334', 'Fashion & Apparel': '1604',
  "Men's Clothing": '212', 'Boys Clothes': '5424', 'Electronics & Tech': '505369',
  'Home & Living': '449', 'Kids': '334',
};

// --- TYPE DEFINITIONS & ERROR CLASS ---
type InternalProduct = {
  sku: string; name: string; description: string; price: number; salePrice: number | null; quantity: number;
  imageUrls: string[]; upc: string; mpn: string; brand: string; condition: string;
  color: string; size: string; gender: string; ageGroup: string; material: string; pattern: string;
  itemGroupId: string; status: string; googleProductCategory?: string;
  availabilityDate?: string; expirationDate?: string; salePriceEffectiveDate?: string;
};
type ParsedRow = Record<string, any>;
class ValidationError extends Error {
  constructor(public row: number, public field: string, message: string) {
    super(message); this.name = 'ValidationError';
  }
}

// --- HELPER FUNCTIONS ---
async function getGoogleTemplateCsv(): Promise<string> {
  try {
    const templatePath = path.join(process.cwd(), 'public', 'google-template.csv');
    return await fs.readFile(templatePath, 'utf-8');
  } catch (error) {
    throw new Error('The "google-template.csv" file was not found in your /public directory.');
  }
}

async function parseFile(file: File): Promise<ParsedRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet, { defval: "" });
}

function findValueByKey(row: ParsedRow, key: string): any {
  const lowerKey = key.toLowerCase().trim();
  for (const rowKey in row) {
    if (rowKey.trim().toLowerCase() === lowerKey) {
      return row[rowKey];
    }
  }
  return "";
}

function generateSlug(name: string): string {
  if (!name) return '';
  return name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

function mapEcokartToInternal(row: ParsedRow, rowIndex: number): InternalProduct {
  const name = findValueByKey(row, 'Name');
  const sku = findValueByKey(row, 'SKU');
  const price = parseFloat(findValueByKey(row, 'Price'));
  const brand = findValueByKey(row, 'Brand');

  if (!name) throw new ValidationError(rowIndex, 'Name', 'The "Name" column is missing or empty.');
  if (!sku) throw new ValidationError(rowIndex, 'SKU', 'The "SKU" column is missing or empty.');
  if (isNaN(price)) throw new ValidationError(rowIndex, 'Price', 'The "Price" column is not a valid number.');
  if (!brand) throw new ValidationError(rowIndex, 'Brand', 'The "Brand" column is missing or empty.');

  const salePrice = parseFloat(findValueByKey(row, 'Sale Price'));
  const categoryName = findValueByKey(row, 'Category Name') || '';
  const description = findValueByKey(row, 'Description') || name;
  const quantity = parseInt(findValueByKey(row, 'Quantity'), 10) || 0;
  const upc = findValueByKey(row, 'UPC') || '';
  const mpn = findValueByKey(row, 'MPN') || '';
  let condition = (findValueByKey(row, 'Condition') || 'new').toLowerCase();
  if (!['new', 'used', 'refurbished'].includes(condition)) condition = 'new';
  
  const color = findValueByKey(row, 'Color') || '';
  const size = findValueByKey(row, 'Size') || '';
  const gender = findValueByKey(row, 'Gender') || '';
  const ageGroup = findValueByKey(row, 'Age Group') || '';
  const material = findValueByKey(row, 'Material') || '';
  const pattern = findValueByKey(row, 'Pattern') || '';
  const itemGroupId = findValueByKey(row, 'Item Group ID') || '';
  const status = findValueByKey(row, 'Availability') || '';
  
  const availabilityDate = findValueByKey(row, 'Availability Date') || '';
  const expirationDate = findValueByKey(row, 'Expiration Date') || '';
  const salePriceEffectiveDate = findValueByKey(row, 'Sale Price Effective Date') || '';

  return {
    sku, name, price, brand, description, quantity, upc, mpn, condition, color, size, gender, ageGroup, material, pattern, itemGroupId, status,
    availabilityDate, expirationDate, salePriceEffectiveDate,
    salePrice: isNaN(salePrice) ? null : salePrice,
    imageUrls: Object.keys(row).filter(k => k.toLowerCase().startsWith('image url')).map(k => row[k]).filter(Boolean),
    googleProductCategory: ECOKART_TO_GOOGLE_CATEGORY_MAP[categoryName] || '',
  };
}


// ===================================================================================
// --- ✅ THE FIX: The order of the fields below now matches your template file. ---
// ===================================================================================
function generateGoogleData(internalData: InternalProduct[]): Record<string, any>[] {
    return internalData.map(p => {
      let availability = 'out_of_stock';
      const status = p.status.toLowerCase();
      if (status === 'preorder' || status === 'backorder') {
        availability = status;
      } else if (p.quantity > 0) {
        availability = 'in_stock';
      }

      const now = new Date();
      const thirtyDaysFromNow = new Date(new Date().setDate(now.getDate() + 30));
      const expirationDate = p.expirationDate || thirtyDaysFromNow.toISOString();

      let salePriceEffectiveDate = p.salePriceEffectiveDate || '';
      if (p.salePrice && !salePriceEffectiveDate) {
          const fourteenDaysFromNow = new Date(new Date().setDate(now.getDate() + 14));
          salePriceEffectiveDate = `${now.toISOString()}/${fourteenDaysFromNow.toISOString()}`;
      }

      return {
        'id': p.sku,
        'title': p.name.substring(0, 150),
        'description': p.description.substring(0, 5000),
        'availability': availability, // Correct Order
        'availability date': p.availabilityDate || '',
        'expiration date': "",
        'link': `https://ecokartuk.com/products/${generateSlug(p.name)}`, // Correct Order
        'image link': p.imageUrls[0] || '',
        'price': `${p.price.toFixed(2)} GBP`,
        'sale price': p.salePrice ? `${p.salePrice.toFixed(2)} GBP` : '',
        'sale price effective date': salePriceEffectiveDate,
        'identifier exists': p.upc || p.mpn ? 'yes' : 'no',
        'gtin': p.upc,
        'mpn': p.mpn,
        'brand': p.brand,
        'product highlight': '',
        'product detail': '',
        'additional image link': p.imageUrls.slice(1).join(','),
        'condition': p.condition,
        'adult': 'no',
        'color': p.color,
        'size': p.size,
        'gender': p.gender,
        'material': p.material,
        'pattern': p.pattern,
        'age group': p.ageGroup,
        'multipack': '',
        'is bundle': '',
        'unit pricing measure': '',
        'unit pricing base measure': '',
        'energy efficiency class': '',
        'min energy efficiency class': '',
        'max energy efficiency class': '', // Note: Google spec has this, not a duplicate
        'item group id': p.itemGroupId,
        'sell on google quantity': '',
        'google_product_category': p.googleProductCategory,
      }
    });
}


// --- MAIN API HANDLER ---
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });

    const rows = await parseFile(file);
    if (rows.length === 0) return NextResponse.json({ error: 'The uploaded file is empty.' }, { status: 400 });
    
    const errors: { row: number; field: string; message: string }[] = [];
    const internalData: InternalProduct[] = [];

    rows.forEach((row, index) => {
      try {
        internalData.push(mapEcokartToInternal(row, index + 2));
      } catch (e) {
        if (e instanceof ValidationError) errors.push({ row: e.row, field: e.field, message: e.message });
      }
    });

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Your Ecokart file could not be processed:', errors }, { status: 400 });
    }
    
    if (internalData.length === 0) {
      return NextResponse.json({ error: 'No valid products were found. Please check that your Ecokart file headers match the API code.' }, { status: 400 });
    }

    const templateCsvText = await getGoogleTemplateCsv();
    const outputData = generateGoogleData(internalData);
    const newDataAsCsv = Papa.unparse(outputData, { header: false });
    const templateLines = templateCsvText.trim().split('\n');
    const headerRows = templateLines.slice(0, 2).join('\n');
    const finalCsvString = `${headerRows}\n${newDataAsCsv}`;
    
    return new NextResponse(finalCsvString, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="google-merchant-corrected-${Date.now()}.csv"`,
      }
    });
  } catch (error: unknown)
 {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}