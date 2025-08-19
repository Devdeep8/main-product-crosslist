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
async function getFacebookTemplateCsv(): Promise<string> {
  try {
    const templatePath = path.join(process.cwd(), 'public', 'facebook-template.csv');
    return await fs.readFile(templatePath, 'utf-8');
  } catch (error) {
    throw new Error('The "facebook-template.csv" file was not found in your /public directory.');
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

function generateFacebookData(internalData: InternalProduct[]): Record<string, any>[] {
    return internalData.map(p => {
      let availability = 'out of stock';
      if (p.quantity > 0) {
        availability = 'in stock';
      }

      let condition = p.condition;
      if (condition === 'refurbished') {
          condition = 'used';
      }

      const now = new Date();
      let salePriceEffectiveDate = p.salePriceEffectiveDate || '';
      if (p.salePrice && !salePriceEffectiveDate) {
          const fourteenDaysFromNow = new Date(new Date().setDate(now.getDate() + 14));
          salePriceEffectiveDate = `${now.toISOString()}/${fourteenDaysFromNow.toISOString()}`;
      }

      return {
        'id': p.sku,
        'title': p.name.substring(0, 200),
        'description': p.description.substring(0, 9999),
        'availability': availability,
        'condition': condition,
        'price': `${p.price.toFixed(2)} GBP`,
        'link': `https://ecokartuk.com/products/${generateSlug(p.name)}`,
        'image_link': p.imageUrls[0] || '',
        'brand': p.brand,
        'google_product_category': p.googleProductCategory,
        'fb_product_category': '', // No direct mapping from Ecokart
        'quantity_to_sell_on_facebook': p.quantity,
        'sale_price': p.salePrice ? `${p.salePrice.toFixed(2)} GBP` : '',
        'sale_price_effective_date': salePriceEffectiveDate,
        'item_group_id': p.itemGroupId,
        'gender': p.gender,
        'color': p.color,
        'size': p.size,
        'age_group': p.ageGroup,
        'material': p.material,
        'pattern': p.pattern,
        'shipping': '', // No direct mapping from Ecokart
        'shipping_weight': '', // No direct mapping from Ecokart
        'gtin': p.upc,
        'video[0].url': '',
        'video[0].tag[0]': '',
        'product_tags[0]': '',
        'product_tags[1]': '',
        'style[0]': ''
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

    const templateCsvText = await getFacebookTemplateCsv();
    const outputData = generateFacebookData(internalData);
    const newDataAsCsv = Papa.unparse(outputData, { header: false });
    const templateLines = templateCsvText.trim().split('\n');
    const headerRows = templateLines.slice(0, 2).join('\n'); // Adjust if your template has a different number of header rows
    const finalCsvString = `${headerRows}\n${newDataAsCsv}`;
    
    return new NextResponse(finalCsvString, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="facebook-marketplace-products-${Date.now()}.csv"`,
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}