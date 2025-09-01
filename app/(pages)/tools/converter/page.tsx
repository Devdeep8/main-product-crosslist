'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast, Toaster } from 'sonner';
import { Download } from 'lucide-react';

export default function ConverterPage() {
  const [file, setFile] = useState<File | null>(null);
  // State now includes 'facebook'
  const [targetFormat, setTargetFormat] = useState<'ecokart' | 'ebay' | 'google' | 'facebook' | ''>('');
  const [isConverting, setIsConverting] = useState(false);
  const [needsTemplate, setNeedsTemplate] = useState(false);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
      setNeedsTemplate(false);
    }
  };

  const handleTemplateFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setTemplateFile(event.target.files[0]);
    }
  };

  const handleDirectDownload = async () => {
    setIsDownloading(true);

    const downloadPromise = fetch('/api/products/templates/ecokart').then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'An unexpected server error occurred.',
        }));
        throw new Error(errorData.error || 'Failed to download the file.');
      }

      // If response is OK, process the file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const header = response.headers.get('Content-Disposition');
      const filename = header ? header.split('filename=')[1].replace(/"/g, '') : 'Ecokart-Live-Products.xlsx';

      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    });

    try {
      await toast.promise(downloadPromise, {
        loading: 'Generating your live product template...',
        success: 'File download has started!',
        error: (err) => err.message, // Display the specific error message on failure
      });
    } catch (error) {
      // Catch block to prevent unhandled promise rejection warnings.
      // The toast will have already displayed the error.
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !targetFormat) {
      toast.error('Please select a target format and a file.');
      return;
    }

    // This check is specific to the eBay flow
    if (targetFormat === 'ebay' && needsTemplate && !templateFile) {
      toast.error('Please upload the official eBay template file to continue.');
      return;
    }

    setIsConverting(true);
    toast.info('Validating and converting your file...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetFormat', targetFormat);

    if (templateFile && targetFormat === 'ebay') {
      formData.append('templateFile', templateFile);
    }

    // --- Dynamic Endpoint Logic ---
    // Determines which API to call based on the selected format.
    let apiEndpoint = '';
    if (targetFormat === 'ecokart') {
      apiEndpoint = '/api/products/to-ecokart';
    }else if (targetFormat === 'ebay') {
      apiEndpoint = '/api/products/convert';
    } else if (targetFormat === 'google') { 
      apiEndpoint = '/api/products/bulk-google';
    } else if (targetFormat === 'facebook') {
      apiEndpoint = '/api/products/facebook-bulk';
    } else {
      // Fallback or handle other cases if necessary
      toast.error("Invalid target format selected for conversion.");
      setIsConverting(false);
      return;
    }

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const header = response.headers.get('Content-Disposition');
        const filename = header ? header.split('filename=')[1].replace(/"/g, '') : 'converted-file.xlsx';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        toast.success('File converted and download started!');
        setNeedsTemplate(false);
        setTemplateFile(null);
        return;
      }

      const result = await response.json();

      // This error is specific to the eBay flow
      if (result.error === 'TEMPLATE_NOT_FOUND' && targetFormat === 'ebay') {
        toast.error('Official eBay template not found. Please upload it below.');
        setNeedsTemplate(true);
      } else if (result.errors) {
        const errorMessages = result.errors.map((e: any) => `- Row ${e.row}: ${e.message}`).join('\n');
        toast.error(`Please fix these errors in your file:\n${errorMessages}`, { duration: 10000 });
      } else {
        throw new Error(result.error || 'Conversion failed');
      }

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Toaster position="top-center" richColors theme="light" />

      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Product Data Converter</h1>
          <p className="text-muted-foreground">Upload your Ecokart file and choose a format to convert it to.</p>
        </div>
        <Button onClick={handleDirectDownload} disabled={isDownloading} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          {isDownloading ? 'Generating...' : 'Download Live Products'}
        </Button>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Start Conversion</CardTitle>
          <CardDescription>Upload your source file and select the format you want to convert it to.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="source-file">1. Upload Source File (Ecokart)</Label>
              <Input id="source-file" type="file" accept=".csv,.xlsx" onChange={handleFileChange} required />
            </div>

            <div className="space-y-2">
              <Label>2. Select Target Format</Label>
              <Select onValueChange={(v) => setTargetFormat(v as any)} value={targetFormat}>
                <SelectTrigger><SelectValue placeholder="Convert file to..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ecokart">Ecokart Format</SelectItem>
                  <SelectItem value="ebay">eBay Format</SelectItem>
                  <SelectItem value="google">Google Merchant Format</SelectItem>
                  {/* New option for Facebook */}
                  <SelectItem value="facebook">Facebook Marketplace Format</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional UI for eBay template upload */}
            {targetFormat === 'ebay' && needsTemplate && (
              <div className="p-4 border-l-4 border-yellow-400 bg-yellow-50 space-y-2 rounded-md">
                <Label htmlFor="template-file" className="font-bold text-yellow-800">3. Upload Official eBay Template</Label>
                <Input id="template-file" type="file" accept=".csv" onChange={handleTemplateFileChange} required />
                <p className="text-sm text-yellow-700">Please provide the `ebay-official-format.csv` file.</p>
              </div>
            )}

            <Button type="submit" size="lg" disabled={!file || !targetFormat || isConverting}>
              {isConverting ? 'Converting...' : 'Convert and Download File'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}