"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast, Toaster } from 'sonner';

export default function ToEcokartConverterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceFormat, setSourceFormat] = useState<'' | 'ebay' | 'google' | 'facebook'>('');
  const [isConverting, setIsConverting] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast.error('Please upload a source file (eBay, Google or Facebook).');
      return;
    }

    setIsConverting(true);
    toast.info('Validating and converting your file to Ecokart...');

    const formData = new FormData();
    formData.append('file', file);
    if (sourceFormat) formData.append('sourceFormat', sourceFormat);

    try {
      const response = await fetch('/api/products/to-ecokart', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const header = response.headers.get('Content-Disposition');
        const filename = header ? header.split('filename=')[1].replace(/"/g, '') : 'ecokart-converted.xlsx';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success('File converted to Ecokart format and download started!');
        return;
      }

      const result = await response.json();
      if (result.errors) {
        const errorMessages = result.errors.map((e: any) => `- Row ${e.row}: ${e.message}`).join('\n');
        toast.error(`Please fix these errors in your file:\n${errorMessages}`, { duration: 10000 });
      } else {
        throw new Error(result.error || 'Conversion failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Conversion failed.');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Toaster position="top-center" richColors theme="light" />

      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Convert to Ecokart</h1>
          <p className="text-muted-foreground">Upload your eBay, Google Merchant, or Facebook file and convert it into Ecokart template.</p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Start Conversion</CardTitle>
          <CardDescription>Upload source file (eBay/Google/Facebook). Optionally choose the source to skip auto-detection.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="source-file">1. Upload Source File</Label>
              <Input id="source-file" type="file" accept=".csv,.xlsx" onChange={handleFileChange} required />
            </div>

            <div className="space-y-2">
              <Label>2. Source Format (optional)</Label>
              <Select onValueChange={(v) => setSourceFormat(v as any)} value={sourceFormat}>
                <SelectTrigger><SelectValue placeholder="Auto-detect" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ebay">eBay</SelectItem>
                  <SelectItem value="google">Google Merchant</SelectItem>
                  <SelectItem value="facebook">Facebook Marketplace</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Leave empty to auto-detect by headers.</p>
            </div>

            <Button type="submit" size="lg" disabled={!file || isConverting}>
              {isConverting ? 'Converting...' : 'Convert to Ecokart (.xlsx)'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}