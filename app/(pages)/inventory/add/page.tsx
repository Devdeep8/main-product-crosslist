'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast, Toaster } from 'sonner';

// --- Updated Single Product Form Component ---
const SingleProductForm = () => {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    // Convert FormData to a plain object
    const productData: { [key: string]: any } = {};
    formData.forEach((value, key) => {
      productData[key] = value;
    });

    toast.info('Creating single product with eBay details...');

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create product');
      
      toast.success('Product and eBay draft created successfully!');
      (event.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Core Product Details */}
      <div className="space-y-4 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold">Item Details</h3>
        <div className="space-y-2">
          <Label htmlFor="picTitle">Pic Title (Main Title)</Label>
          <Input id="picTitle" name="picTitle" placeholder="The main title for your product" required />
        </div>
         <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" name="sku" placeholder="Unique Product Identifier" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="image">Image URL</Label>
          <Input id="image" name="image" placeholder="https://example.com/image.jpg" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" placeholder="Full product description" />
        </div>
      </div>

      {/* Section 2: Pricing & Category Details */}
      <div className="space-y-4 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold">Pricing & Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minSoldPrice">Min Sold Price</Label>
            <Input id="minSoldPrice" name="minSoldPrice" type="number" step="0.01" placeholder="e.g., 50.00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="averageSoldPrice">Average Sold Price (Main Price)</Label>
            <Input id="averageSoldPrice" name="averageSoldPrice" type="number" step="0.01" placeholder="e.g., 75.00" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxSoldPrice">Max Sold Price</Label>
            <Input id="maxSoldPrice" name="maxSoldPrice" type="number" step="0.01" placeholder="e.g., 100.00" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="generalCategories">General Categories</Label>
          <Input id="generalCategories" name="generalCategories" placeholder="e.g., Clothing, Jackets" />
        </div>
      </div>
      
      {/* Section 3: eBay-Specific Details */}
      <div className="space-y-4 p-4 border rounded-lg bg-secondary/20">
        <h3 className="text-lg font-semibold">eBay Listing Details</h3>
        <p className="text-sm text-muted-foreground">This will create a draft listing for your connected eBay shop.</p>
        <div className="space-y-2">
          <Label htmlFor="ebayTitle">eBay Title (80 characters)</Label>
          <Input id="ebayTitle" name="ebayTitle" maxLength={80} placeholder="A specific, keyword-rich title for eBay" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ebayCategory">eBay Category ID</Label>
          <Input id="ebayCategory" name="ebayCategory" placeholder="e.g., 175772 for Men's Coats & Jackets" />
        </div>
      </div>
      
      <Button type="submit" size="lg">Create Product and eBay Draft</Button>
    </form>
  );
};


// --- Bulk Upload Form Component ---
const BulkUploadForm = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast.error('Please select a CSV or XLSX file to upload.');
      return;
    }

    setIsUploading(true);
    toast.info('Uploading and processing file...');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/products/bulk', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Bulk upload failed');

      toast.success(result.message);
      setFile(null);
      (event.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bulk-file">CSV or Excel File</Label>
        <Input id="bulk-file" type="file" accept=".csv,.xlsx" onChange={handleFileChange} />
        <p className="text-sm text-muted-foreground">Upload a CSV or XLSX file with your product data.</p>
      </div>
      <Button type="submit" disabled={!file || isUploading}>
        {isUploading ? 'Uploading...' : 'Upload and Create Products'}
      </Button>
    </form>
  );
};


// --- Main Page Component ---
export default function AddInventoryPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
       <Toaster position="top-center" richColors />
      <header>
        <h1 className="text-3xl font-bold">Add to Inventory</h1>
        <p className="text-muted-foreground">Add a single product or upload a file for bulk creation.</p>
      </header>
      
      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single">Single Listing</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
        </TabsList>
        <TabsContent value="single">
          <Card>
            <CardHeader>
              <CardTitle>Create a Single Product</CardTitle>
              <CardDescription>Fill out the details below to add one product to your inventory.</CardDescription>
            </CardHeader>
            <CardContent>
              <SingleProductForm />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Upload Products</CardTitle>
              <CardDescription>Upload a CSV or Excel file to add multiple products at once.</CardDescription>
            </CardHeader>
            <CardContent>
              <BulkUploadForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}