import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import Papa from 'papaparse';
import fs from 'fs/promises';
import path from 'path';

// ==================================================================================
// --- CONFIGURATION ---
// ==================================================================================
const EBAY_ACTION_STRING = 'Action(SiteID=UK|Country=GB|Currency=GBP|Version=1193|CC=UTF-8)';

const ECOKART_TO_EBAY_CATEGORY_MAP: Record<string, string> = {
  'Shoes & Footwear': '15709',
  'Toys & Games': '220',
  'Fashion & Apparel': '11450',
  "Men's Clothing": '1059',
  'Boys Clothes': '260067',
  'Electronics & Tech': '9355',
  'Home & Living': '11700',
  'Kids': '220',
};

// ==================================================================================
// --- Type Definitions, Error Class, and Helper Functions ---
// ==================================================================================
type InternalProduct = {
  sku: string; name: string; description: string; price: number; quantity: number;
  imageUrls: string[]; ebayCategoryId: string; upc: string; ecokartCategory: string;
  brand: string; condition: string;
};

type ParsedRow = Record<string, any>;

class ValidationError extends Error {
  constructor(public row: number, public field: string, message: string) {
    super(message); this.name = 'ValidationError';
  }
}

/**
 * Gets the eBay template text. Prioritizes the user-uploaded file,
 * then falls back to reading from the local filesystem.
 * @throws {Error} with code 'TEMPLATE_NOT_FOUND' if neither source is available.
 */
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

// (All other helper functions like parseFile, findValueByKey, etc. are included below)
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

function mapEcokartToInternal(row: ParsedRow, rowIndex: number): InternalProduct {
  const name = findValueByKey(row, 'Name');
  const sku = findValueByKey(row, 'SKU');
  const price = parseFloat(findValueByKey(row, 'Price'));

  if (!name) throw new ValidationError(rowIndex, 'Name', '"Name" cannot be empty.');
  if (!sku) throw new ValidationError(rowIndex, 'SKU', '"SKU" cannot be empty.');
  if (isNaN(price)) throw new ValidationError(rowIndex, 'Price', '"Price" must be a valid number.');

  const categoryName = findValueByKey(row, 'CategoryName') || '';
  return {
    sku, name, price,
    description: findValueByKey(row, 'Description') || '',
    quantity: parseInt(findValueByKey(row, 'Quantity'), 10) || 1,
    imageUrls: Object.keys(row).filter(k => k.startsWith('imageurl')).map(k => row[k]).filter(Boolean),
    ebayCategoryId: ECOKART_TO_EBAY_CATEGORY_MAP[categoryName] || '',
    upc: findValueByKey(row, 'UPC') || '',
    ecokartCategory: categoryName,
    brand: findValueByKey(row, 'Brand') || '',
    condition: findValueByKey(row, 'Condition') || 'GOOD',
  };
}

function mapEbayToInternal(row: ParsedRow, rowIndex: number): InternalProduct {
  const name = findValueByKey(row, 'Title');
  const sku = findValueByKey(row, 'Custom label (SKU)');
  const price = parseFloat(findValueByKey(row, 'Price'));

  if (!name) throw new ValidationError(rowIndex, 'Title', '"Title" cannot be empty.');
  if (!sku) throw new ValidationError(rowIndex, 'Custom label (SKU)', '"Custom label (SKU)" cannot be empty.');
  if (isNaN(price)) throw new ValidationError(rowIndex, 'Price', '"Price" must be a valid number.');

  const categoryId = findValueByKey(row, 'Category ID');
  const ecokartCategory = Object.keys(ECOKART_TO_EBAY_CATEGORY_MAP).find(k => ECOKART_TO_EBAY_CATEGORY_MAP[k] === categoryId) || 'Imported';
  
  return {
    sku, name, price,
    description: findValueByKey(row, 'Description') || '',
    quantity: parseInt(findValueByKey(row, 'Quantity'), 10) || 1,
    imageUrls: (findValueByKey(row, 'Item photo URL') || '').split('|').filter(Boolean),
    ebayCategoryId: categoryId,
    upc: findValueByKey(row, 'UPC') || '',
    ecokartCategory,
    brand: '',
    condition: findValueByKey(row, 'Condition ID') === 'NEW' ? 'NEW' : 'USED',
  };
}

function generateEbayData(internalData: InternalProduct[]): Record<string, any>[] {
  return internalData.map(p => ({
    [EBAY_ACTION_STRING]: 'Draft',
    'Custom label (SKU)': p.sku,
    'Category ID': p.ebayCategoryId,
    'Title': p.name.substring(0, 80),
    'UPC': p.upc,
    'Price': p.price,
    'Quantity': p.quantity,
    'Item photo URL': p.imageUrls.join('|'),
    'Condition ID': 'NEW',
    'Description': p.description || p.name,
    'Format': 'FixedPrice',
  }));
}

function generateEcokartData(internalData: InternalProduct[]): Record<string, any>[] {
  return internalData.map(p => {
    const row: Record<string, any> = {
      'SKU': p.sku, 'Name': p.name, 'Description': p.description,
      'Price': p.price, 'Quantity': p.quantity, 'Brand': p.brand,
      'Condition': p.condition, 'CategoryName': p.ecokartCategory, 'UPC': p.upc,
    };
    p.imageUrls.forEach((url, i) => { row[`ImageURL${i + 1}`] = url; });
    return row;
  });
}

function generateExcelBuffer(data: any[]): Buffer {
  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Products');
  return xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
}


// ==================================================================================
// --- Main API Handler ---
// ==================================================================================
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const targetFormat = formData.get('targetFormat') as 'ecokart' | 'ebay' | null;

    if (!file || !targetFormat) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const rows: ParsedRow[] = await parseFile(file);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'File is empty or could not be parsed.' }, { status: 400 });
    }

    const isEbaySource = Object.keys(rows[0]).some(key => key.startsWith('action(siteid'));
    const requiredHeaders = isEbaySource ? ['category id', 'title', 'custom label (sku)'] : ['name', 'sku', 'price', 'condition', 'categoryname'];
    const validationResult = validateHeaders(rows[0], requiredHeaders);

    if (!validationResult.isValid) {
      return NextResponse.json({ error: `Missing required columns: ${validationResult.missing.join(', ')}` }, { status: 400 });
    }
    
    const errors: { row: number; field: string; message: string }[] = [];
    const internalData: InternalProduct[] = [];

    rows.forEach((row, index) => {
      const rowIndex = index + 2;
      try {
        const mappedData = isEbaySource ? mapEbayToInternal(row, rowIndex) : mapEcokartToInternal(row, rowIndex);
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
      return NextResponse.json({ error: 'Your file contains errors.', errors }, { status: 400 });
    }

    if (targetFormat === 'ebay') {
      const templateText = await getTemplateText(formData);
      
      const templateLines = templateText.split('\n');
      const infoHeaderLines = templateLines.slice(0, 4);
      const existingDataCsvWithHeader = templateLines.slice(4).join('\n');
      
      const newDataForEbay = generateEbayData(internalData);
      const newDataCsv = Papa.unparse(newDataForEbay, { header: false });
      
      const finalCsvString = [
        infoHeaderLines.join('\n'),
        existingDataCsvWithHeader.trim(),
        newDataCsv
      ].join('\n').trim();

      return new NextResponse(finalCsvString, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="ebay-upload-ready-${Date.now()}.csv"`,
        }
      });
    } else { // targetFormat is 'ecokart'
      const outputData = generateEcokartData(internalData);
      const buffer = generateExcelBuffer(outputData);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="ecokart-upload-ready-${Date.now()}.xlsx"`,
        }
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    // Handle the specific template not found error
    if (message === 'TEMPLATE_NOT_FOUND') {
        return NextResponse.json({ error: 'TEMPLATE_NOT_FOUND' }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}