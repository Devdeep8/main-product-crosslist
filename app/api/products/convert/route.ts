import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import Papa from 'papaparse'; // Import PapaParse
import fs from 'fs/promises';
import path from 'path';
import { ca } from 'date-fns/locale';

// ==================================================================================
// --- CONFIGURATION ---
// ==================================================================================
const EBAY_ACTION_STRING = 'Action(SiteID=UK|Country=GB|Currency=GBP|Version=1193|CC=UTF-8)';

/**
 * A comprehensive mapping from internal ECOKART category names to eBay's top-level category IDs.
 */
const ECOKART_TO_EBAY_CATEGORY_MAP: Record<string, string> = {
  // == Clothing, Fashion & Accessories ==
  "Fashion": "11450",                   // Clothing, Shoes & Accessories
  "Men's Clothing": "11450",            // Clothing, Shoes & Accessories
  "Women's Clothing": "11450",          // Clothing, Shoes & Accessories
  "Kids Clothing": "11450",             // Clothing, Shoes & Accessories
  "Shoes & Footwear": "11450",          // Clothing, Shoes & Accessories
  "Accessories": "11450",               // Clothing, Shoes & Accessories
  "Jewelry": "281",                     // Jewelry & Watches
  "Watches": "281",                     // Jewelry & Watches

  // == Electronics & Media ==
  "Electronics": "293",                 // Consumer Electronics
  "Computers & Networking": "58058",    // Computers/Tablets & Networking
  "Cell Phones & Accessories": "15032", // Cell Phones & Accessories
  "Cameras & Photo": "625",             // Cameras & Photo
  "Video Games": "1249",                // Video Games & Consoles
  "Movies & TV": "11232",               // Movies & TV
  "Books & Magazines": "267",           // Books & Magazines
  "Music": "11233",                     // Music
  "Musical Instruments": "619",         // Musical Instruments & Gear

  // == Home, Garden & Lifestyle ==
  "Home & Garden": "11700",             // Home & Garden
  "Pottery & Glass": "870",             // Pottery & Glass
  "Pet Supplies": "1281",               // Pet Supplies
  "Health & Beauty": "26395",           // Health & Beauty
  "Baby Products": "2984",              // Baby

  // == Hobbies, Toys & Collectibles ==
  "Toys": "220",              // Toys & Hobbies
  "Dolls & Bears": "237",               // Dolls & Bears
  "Crafts": "14339",                    // Crafts
  "Antiques": "20081",                  // Antiques
  "Art": "550",                         // Art
  "Collectibles": "1",                  // Collectibles
  "Coins & Money": "11116",             // Coins & Paper Money
  "Stamps": "260",                      // Stamps
  "Entertainment Memorabilia": "45100", // Entertainment Memorabilia

  // == Sports & Travel ==
  "Sporting Goods": "888",              // Sporting Goods
  "Sports Memorabilia": "64482",        // Sports Mem, Cards & Fan Shop
  "Travel": "3252",                     // Travel
  "Perfume" : "21139",
  "School Supplies" : "16092",

  // == Business & Other Categories ==
  "Business & Industrial": "12576",     // Business & Industrial
  "Gift Cards & Coupons": "172008",     // Gift Cards & Coupons
  "Tickets & Experiences": "1305",      // Tickets & Experiences
  "Real Estate": "10542",               // Real Estate
  "Specialty Services": "316",          // Specialty Services
  "Everything Else": "99",              // Everything Else
};

// ==================================================================================
// --- Type Definitions, Error Class, and Helper Functions ---
// ==================================================================================
type InternalProduct = {
  sku: string; name: string; description: string; price: number; quantity: number;
  imageUrls: string[]; ebayCategoryId: string; upc: string; brand: string;
};

type ParsedRow = Record<string, any>;

class ValidationError extends Error {
  constructor(public row: number, public field: string, message: string) {
    super(message); this.name = 'ValidationError';
  }
}

async function getTemplateText(formData: FormData): Promise<string> {
  const templateFile = formData.get('templateFile') as File | null;
  if (templateFile) {
    return await templateFile.text();
  }
  try {
    const templatePath = path.join(process.cwd(), 'public', 'ebay-official-format.csv');
    return await fs.readFile(templatePath, 'utf-8');
  } catch (error) {
    throw new Error('TEMPLATE_NOT_FOUND');
  }
}

async function parseFile(file: File): Promise<ParsedRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  return rows.map(row => {
    const normalizedRow: ParsedRow = {};
    if (typeof row === 'object' && row !== null) {
      Object.keys(row).forEach(key => {
        normalizedRow[key.trim().toLowerCase()] = row[key];
      });
    }
    return normalizedRow;
  });
}

function findValueByKey(row: ParsedRow, key: string): any {
  const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '');
  for (const rowKey in row) {
    if (rowKey.replace(/\s+/g, '') === normalizedKey) {
      return row[rowKey];
    }
  }
  return "";
}

function validateHeaders(firstRow: ParsedRow, requiredHeaders: string[]): { isValid: boolean; missing: string[] } {
  const presentHeaders = Object.keys(firstRow);
  const missing = requiredHeaders.filter(rh => !presentHeaders.includes(rh.toLowerCase()));
  return { isValid: missing.length === 0, missing };
}

function mapEcokartToInternal(
  row: ParsedRow,
  rowIndex: number,
  cache: Record<string, string>
): InternalProduct {
  const name = findValueByKey(row, 'Name');
  const sku = findValueByKey(row, 'SKU');
  const price = parseFloat(findValueByKey(row, 'Price'));

  if (!name) throw new ValidationError(rowIndex, 'Name', '"Name" cannot be empty.');
  if (!sku) throw new ValidationError(rowIndex, 'SKU', '"SKU" cannot be empty.');
  if (isNaN(price)) throw new ValidationError(rowIndex, 'Price', '"Price" must be a valid number.');

  const brand = findValueByKey(row, 'brand');
  
const rawCategoryName = findValueByKey(row, 'categoryName') || 'Everything Else';
  const categoryName = rawCategoryName.trim(); // <-- ADD THIS

  let ebayCategoryId = cache[categoryName];
  if (ebayCategoryId === undefined) {
    ebayCategoryId = ECOKART_TO_EBAY_CATEGORY_MAP[categoryName] || ECOKART_TO_EBAY_CATEGORY_MAP['Everything Else'];
    cache[categoryName] = ebayCategoryId;
    console.log(categoryName, ebayCategoryId, "debug")
  }

  const imageUrls: string[] = [];
  const singleImageUrl = findValueByKey(row, 'image');
  if (singleImageUrl && typeof singleImageUrl === 'string') {
    imageUrls.push(singleImageUrl.trim());
  }
  const multipleImageUrls = findValueByKey(row, 'imageUrls');
  if (multipleImageUrls && typeof multipleImageUrls === 'string') {
    const urls = multipleImageUrls.split(',').map(url => url.trim()).filter(Boolean);
    imageUrls.push(...urls);
  }

  return {
    sku,
    name,
    price,
    description: findValueByKey(row, 'Description') || name,
    quantity: parseInt(findValueByKey(row, 'Quantity'), 10) || 1,
    imageUrls,
    ebayCategoryId,
    upc: findValueByKey(row, 'UPC') || '',
    brand: brand || ''
  };
}

function generateEbayCsvData(internalData: InternalProduct[]): Record<string, any>[] {
  return internalData.map(p => ({
    [EBAY_ACTION_STRING]: 'Draft',
    'Custom label (SKU)': p.sku,
    'Category ID': p.ebayCategoryId,
    'Title': p.name.substring(0, 80),
    'UPC': p.upc,
    'Price': p.price,
    'Quantity': p.quantity,
    'Item photo URL': p.imageUrls.join('|'),
    'Condition ID': '3000', // Used
    'Description': p.description,
    'Format': 'FixedPrice',
    'brand':p.brand
  }));
}

// ==================================================================================
// --- Main API Handler ---
// ==================================================================================
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const rows: ParsedRow[] = await parseFile(file);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'File is empty or could not be parsed.' }, { status: 400 });
    }

    const requiredHeaders = ['name', 'sku', 'price', 'categoryName', 'brand'];
    const validationResult = validateHeaders(rows[0], requiredHeaders);

    if (!validationResult.isValid) {
      return NextResponse.json({ error: `Missing required columns: ${validationResult.missing.join(', ')}` }, { status: 400 });
    }

    const errors: { row: number; field: string; message: string }[] = [];
    const internalData: InternalProduct[] = [];
    const categoryCache: Record<string, string> = {};

    rows.forEach((row, index) => {
      const rowIndex = index + 2;
      try {
        const mappedData = mapEcokartToInternal(row, rowIndex, categoryCache);
        internalData.push(mappedData);
      } catch (e: unknown) {
        if (e instanceof ValidationError) {
          errors.push({ row: e.row, field: e.field, message: e.message });
        } else if (e instanceof Error) {
          errors.push({ row: rowIndex, field: 'Unknown', message: e.message });
        }
      }
    });

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Your file contains validation errors.', errors }, { status: 400 });
    }

    const templateText = await getTemplateText(formData);
    const templateLines = templateText.split('\n');
    const infoHeaderLines = templateLines.slice(0, 4);
    const csvHeaderRow = templateLines.slice(4, 5).join('\n');

    const newDataForEbay = generateEbayCsvData(internalData);
    const newDataCsv = Papa.unparse(newDataForEbay, { header: false });

    const finalCsvString = [
      infoHeaderLines.join('\n'),
      csvHeaderRow.trim(),
      newDataCsv
    ].join('\n').trim();

    return new NextResponse(finalCsvString, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ebay-upload-${Date.now()}.csv"`,
      }
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    if (message === 'TEMPLATE_NOT_FOUND') {
      return NextResponse.json({ error: 'The base eBay template file was not found on the server.' }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}