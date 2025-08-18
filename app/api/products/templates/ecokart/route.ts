import { NextResponse } from "next/server";
import * as xlsx from "xlsx";

function sanitizeField(text: string | null | undefined): string {
  if (!text) return "";

  // Step 1: Remove HTML tags
  let cleanedText = text.replace(/<\/?[^>]+(>|$)/g, " ");

  // Step 2: Fix common encoding errors and replace special characters
  cleanedText = cleanedText
    .replace(/â€™/g, "'") // Fix for incorrect apostrophe
    .replace(/â€“/g, "-") // Fix for en dash
    .replace(/\|/g, "-") // Replace pipe character
    .replace(/[–—]/g, "-"); // Replace en and em dashes with a simple hyphen

  // Step 3: Remove any remaining non-standard characters (keeps basic punctuation)
  cleanedText = cleanedText.replace(/[^a-zA-Z0-9\s.,'()\-&€$£%]/g, "");

  // Step 4: Clean up whitespace
  return cleanedText.replace(/\s+/g, " ").trim();
}

/**
 * Creates a URL-friendly "slug" from a product name.
 */
function generateSlug(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ===================================================================================
// --- This API fetches live products and generates a pre-filled Ecokart template ---
// ===================================================================================
export async function GET() {
  try {
    // --- Step 1: Fetch the latest 100 products from your live API ---
    const response = await fetch(
      "https://www.ecokartuk.com/api/products/enhanced?take=100"
    );
    if (!response.ok) {
      throw new Error(
        `Failed to fetch products from API. Status: ${response.status}`
      );
    }

    const apiResult = await response.json();

    // Check if the products are in a 'products' key or if the result is a direct array
    const liveProducts = Array.isArray(apiResult)
      ? apiResult
      : apiResult.products;

    if (!liveProducts || !Array.isArray(liveProducts)) {
      throw new Error("API response did not contain a valid products array.");
    }

    // --- Step 2: Map the live API data to the official Excel format ---
    const excelData = liveProducts.map((p: any) => ({
      SKU: p.sku,
      Name: sanitizeField(p.name), // <-- FIX APPLIED HERE
      Description: sanitizeField(p.description || p.name), // <-- FIX APPLIED HERE
      Price: parseFloat(p.price),
      Quantity: p.quantity || 1,
      "Category Name": p.category?.name || "",
      Brand: p.brand || "N/A",
      Condition: p.isNew === true ? "new" : "used",
      UPC: p.upc || "",
      Color: p.color || "",
      Size: p.size || "",
      "Image URL 1": p.images?.[0]?.url || "",
      "Image URL 2": p.images?.[1]?.url || "",
      MPN: p.mpn || "",
      "Item Group ID": p.itemGroupId || "",
      "Product Link": `https://ecokartuk.com/products/${p.slug}`, // Use the real slug
    }));

    // --- Step 3: Create the Excel file ---
    const worksheet = xlsx.utils.json_to_sheet(excelData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Products");

    // Set column widths for better readability
    worksheet["!cols"] = [
      { wch: 25 }, // SKU
      { wch: 60 }, // Name
      { wch: 70 }, // Description
      { wch: 10 }, // Price
      { wch: 10 }, // Quantity
      { wch: 20 }, // Category Name
      { wch: 20 }, // Brand
      { wch: 15 }, // Condition
      { wch: 15 }, // UPC
      { wch: 15 }, // Color
      { wch: 15 }, // Size
      { wch: 50 }, // Image URL 1
      { wch: 50 }, // Image URL 2
      { wch: 20 }, // MPN
      { wch: 20 }, // Item Group ID
      { wch: 60 }, // Product Link
    ];

    const buffer = xlsx.write(workbook, { bookType: "xlsx", type: "buffer" });

    // --- Step 4: Return the file for download ---
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Ecokart-Live-Products-${Date.now()}.xlsx"`,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
