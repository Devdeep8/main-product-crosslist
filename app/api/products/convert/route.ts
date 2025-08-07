import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';

// ==================================================================================
// --- CONFIGURATION: This is the "brain" of your converter. Tune it here. ---
// ==================================================================================
const MAX_FILE_SIZE_MB = 10;

// --- eBay UK Listing Defaults ---
const EBAY_ACTION_STRING = 'Action(SiteID=UK|Country=GB|Currency=GBP|Version=1191)';
const EBAY_LOCATION = 'Chhindwara';
const EBAY_DISPATCH_TIME = '3';
const EBAY_SHIPPING_SERVICE = 'UK_RoyalMail48';
const EBAY_SHIPPING_COST = '3.99';

const ECOKART_TO_EBAY_CATEGORY_MAP: { [key: string]: string } = {
  'Shoes & Footwear': '15709',
  'Toys & Games': '220',
  'Fashion & Apparel': '11450',
  "Men's Clothing": '1059',
  'Boys Clothes': '260067',
  'Electronics & Tech': '9355',
  'Home & Living': '11700',
  'Kids': '220',
};
const ECOKART_TO_EBAY_CONDITION_MAP: { [key: string]: number } = {
  'NEW_WITH_TAGS': 1000, 'NEW_WITHOUT_TAGS': 1500, 'VERY_GOOD_USED_CONDITION': 2500,
  'GOOD': 3000, 'SATISFACTORY': 4000,
};
const EBAY_BUSINESS_POLICIES = {
  payment: 'ManagedPayments', shipping: 'DefaultShipping', return: '30DayReturns',
};

// ==================================================================================
// --- Type Definitions, Error Class, and Main Handler ---
// ==================================================================================
type InternalProduct = {
  sku: string; name: string; description: string; price: number; quantity: number;
  brand: string; condition: string; ecokartCategory: string; imageUrls: string[];
  ebayCategoryId: string; ebayConditionId: number; itemSpecifics: { [key: string]: string };
  listingType: 'FixedPrice' | 'Auction';
  duration: string;
  allowOffers: boolean;
  vatPercent?: number;
};

class ValidationError extends Error {
    constructor(public row: number, public field: string, message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const targetFormat = formData.get('targetFormat') as 'ecokart' | 'ebay';

    if (!file || !targetFormat) {
      return NextResponse.json({ error: 'Missing file or target format.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `File size cannot exceed ${MAX_FILE_SIZE_MB}MB.` }, { status: 413 });
    }

    const rows = await parseFile(file);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'File is empty or could not be parsed.' }, { status: 400 });
    }

    const isEbaySource = Object.keys(rows[0]).some(key => key.startsWith('*'));
    
    const requiredHeaders = isEbaySource ? ['*title', '*category', '*startprice', 'custom label (sku)'] : ['name', 'sku', 'price', 'condition', 'categoryname'];
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
      } catch (e: any) {
        if (e instanceof ValidationError) {
            errors.push({ row: e.row, field: e.field, message: e.message });
        } else {
            errors.push({ row: rowIndex, field: 'Unknown', message: e.message });
        }
      }
    });

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Your file contains errors.', errors }, { status: 400 });
    }

    const outputData = (targetFormat === 'ebay') ? generateEbayData(internalData) : generateEcokartData(internalData);
    const buffer = generateExcelBuffer(outputData);
    
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set('Content-Disposition', `attachment; filename="${targetFormat}-upload-ready.xlsx"`);

    return new NextResponse(buffer, { headers });

  } catch (error: any) {
    console.error('Conversion error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

// ==================================================================================
// --- Helper Functions ---
// ==================================================================================
async function parseFile(file: File): Promise<any[]> {
    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows: any[] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

    return rows.map(row => {
        const normalizedRow: { [key: string]: any } = {};
        if (typeof row === 'object' && row !== null) {
            Object.keys(row).forEach(key => {
                normalizedRow[key.trim().toLowerCase()] = row[key];
            });
        }
        return normalizedRow;
    });
}

function findValueByKey(row: any, key: string): any {
    const normalizedKey = key.toLowerCase().trim();
    return row[normalizedKey] || "";
}

function validateHeaders(firstRow: any, requiredHeaders: string[]): { isValid: boolean, missing: string[] } {
    const presentHeaders = Object.keys(firstRow);
    const missing = requiredHeaders.filter(rh => !presentHeaders.includes(rh.toLowerCase()));
    return { isValid: missing.length === 0, missing };
}

function mapEcokartToInternal(row: any, rowIndex: number): InternalProduct {
    const name = findValueByKey(row, 'Name');
    const sku = findValueByKey(row, 'SKU');
    const price = parseFloat(findValueByKey(row, 'Price'));
    
    if (!name) throw new ValidationError(rowIndex, 'Name', '"Name" cannot be empty.');
    if (!sku) throw new ValidationError(rowIndex, 'SKU', '"SKU" cannot be empty.');
    if (isNaN(price)) throw new ValidationError(rowIndex, 'Price', '"Price" must be a valid number.');
    
    const listingType = findValueByKey(row, 'ListingType') === 'Auction' ? 'Auction' : 'FixedPrice';
    const duration = findValueByKey(row, 'Duration');
    const allowOffers = findValueByKey(row, 'AllowOffers')?.toUpperCase() === 'TRUE';
    const vatPercent = findValueByKey(row, 'VATPercent');
    const categoryName = findValueByKey(row, 'CategoryName') || '';
    const condition = findValueByKey(row, 'Condition') || 'GOOD';
    const imageUrls = Object.keys(row).filter(k => k.startsWith('imageurl')).map(k => row[k]).filter(Boolean);
    
    const itemSpecifics: { [key: string]: string } = {};
    const brand = findValueByKey(row, 'Brand');
    if (brand) itemSpecifics['Brand'] = brand;
    Object.keys(row).filter(k => k.startsWith('itemspecific_')).forEach(k => {
        const aspectName = k.replace('itemspecific_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        itemSpecifics[aspectName] = row[k];
    });

    return {
        sku, name, price,
        description: findValueByKey(row, 'Description') || '',
        shortDescription: findValueByKey(row, 'ShortDescription') || '',
        quantity: parseInt(findValueByKey(row, 'Quantity')) || 1,
        brand, condition, ecokartCategory: categoryName, imageUrls,
        weight: parseFloat(findValueByKey(row, 'Weight(kg)')) || 0,
        ebayCategoryId: ECOKART_TO_EBAY_CATEGORY_MAP[categoryName] || '',
        ebayConditionId: ECOKART_TO_EBAY_CONDITION_MAP[condition] || 3000,
        itemSpecifics,
        listingType,
        duration: listingType === 'Auction' ? `Days_${duration || 7}` : 'GTC',
        allowOffers,
        vatPercent: vatPercent ? parseFloat(vatPercent) : undefined,
    };
}

function mapEbayToInternal(row: any, rowIndex: number): InternalProduct {
    const name = findValueByKey(row, '*Title');
    const sku = findValueByKey(row, 'Custom label (SKU)');
    const price = parseFloat(findValueByKey(row, '*StartPrice'));

    if (!name) throw new ValidationError(rowIndex, '*Title', '"*Title" cannot be empty.');
    if (!sku) throw new ValidationError(rowIndex, 'Custom label (SKU)', '"Custom label (SKU)" cannot be empty.');
    if (isNaN(price)) throw new ValidationError(rowIndex, '*StartPrice', '"*StartPrice" must be a valid number.');

    const conditionId = parseInt(findValueByKey(row, '*ConditionID'));
    const categoryId = findValueByKey(row, '*Category');
    const ecokartCondition = Object.keys(ECOKART_TO_EBAY_CONDITION_MAP).find(k => ECOKART_TO_EBAY_CONDITION_MAP[k] === conditionId) || 'GOOD';
    const ecokartCategory = Object.keys(ECOKART_TO_EBAY_CATEGORY_MAP).find(k => ECOKART_TO_EBAY_CATEGORY_MAP[k] === categoryId) || 'Imported';
    
    const itemSpecifics: { [key: string]: string } = {};
    Object.keys(row).filter(k => k.startsWith('c:')).forEach(k => {
        itemSpecifics[k.replace('c:', '')] = row[k];
    });

    return {
        sku, name, price,
        description: findValueByKey(row, 'Description') || '', shortDescription: '',
        quantity: parseInt(findValueByKey(row, '*Quantity')) || 1,
        brand: findValueByKey(row, 'C:Brand') || '',
        condition: ecokartCondition, ecokartCategory: ecokartCategory,
        imageUrls: (findValueByKey(row, 'PicURL') || '').split('|'),
        weight: 0, ebayCategoryId: categoryId, ebayConditionId: conditionId,
        itemSpecifics,
        listingType: findValueByKey(row, '*Format') === 'Auction' ? 'Auction' : 'FixedPrice',
        duration: findValueByKey(row, '*Duration') || 'GTC',
        allowOffers: findValueByKey(row, 'BestOfferEnabled') === '1',
        vatPercent: parseFloat(findValueByKey(row, 'VATPercent')) || undefined,
    };
}

function generateEbayData(internalData: InternalProduct[]): any[] {
    return internalData.map(p => {
        const ebayRow: { [key: string]: any } = {};
        ebayRow[EBAY_ACTION_STRING] = 'Add';
        ebayRow['*Category'] = p.ebayCategoryId;
        ebayRow['*Title'] = p.name.substring(0, 80);
        ebayRow['Subtitle'] = '';
        ebayRow['Relationship'] = '';
        ebayRow['RelationshipDetails'] = '';
        ebayRow['Custom label (SKU)'] = p.sku;
        ebayRow['*StartPrice'] = p.price;
        ebayRow['Buy It Now Price'] = p.listingType === 'Auction' ? (p.price * 1.4).toFixed(2) : '';
        ebayRow['*Quantity'] = p.quantity;
        ebayRow['PicURL'] = p.imageUrls.join('|');
        ebayRow['*ConditionID'] = p.ebayConditionId;
        ebayRow['Description'] = p.description || p.name;
        ebayRow['*Format'] = p.listingType;
        ebayRow['*Duration'] = p.duration;
        ebayRow['*Location'] = EBAY_LOCATION;
        ebayRow['ShippingService-1:Option'] = EBAY_SHIPPING_SERVICE;
        ebayRow['ShippingService-1:Cost'] = EBAY_SHIPPING_COST;
        ebayRow['DispatchTimeMax'] = EBAY_DISPATCH_TIME;
        ebayRow['PaymentProfileName'] = EBAY_BUSINESS_POLICIES.payment;
        ebayRow['ReturnProfileName'] = EBAY_BUSINESS_POLICIES.return;
        ebayRow['ShippingProfileName'] = EBAY_BUSINESS_POLICIES.shipping;
        ebayRow['BestOfferEnabled'] = p.allowOffers ? '1' : '0';
        if (p.vatPercent) { ebayRow['VATPercent'] = p.vatPercent; }

        for (const key in p.itemSpecifics) {
            ebayRow[`C:${key}`] = p.itemSpecifics[key];
        }
        return ebayRow;
    });
}

function generateEcokartData(internalData: InternalProduct[]): any[] {
    return internalData.map(p => {
        const row: { [key: string]: any } = {
          'SKU': p.sku, 'Name': p.name, 'Description': p.description,
          'Price': p.price, 'Quantity': p.quantity,
          'Brand': p.brand, 'Condition': p.condition, 'CategoryName': p.ecokartCategory,
          'ListingType': p.listingType, 'Duration': p.duration.replace('Days_', ''),
          'AllowOffers': p.allowOffers ? 'TRUE' : 'FALSE',
          'VATPercent': p.vatPercent || '',
        };
        p.imageUrls.forEach((url, i) => { row[`ImageURL${i + 1}`] = url; });
        for (const key in p.itemSpecifics) { row[`ItemSpecific_${key}`] = p.itemSpecifics[key]; }
        return row;
    });
}

function generateExcelBuffer(data: any[]): Buffer {
    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Products');
    return xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
}