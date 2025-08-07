'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast, Toaster } from 'sonner';

export default function ConverterPage() {
  const [targetFormat, setTargetFormat] = useState<'ecokart' | 'ebay' | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) setFile(event.target.files[0]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !targetFormat) {
      toast.error('Please select a target format and a file.');
      return;
    }

    setIsConverting(true);
    toast.info('Validating and converting your file...');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetFormat', targetFormat);

    try {
      const response = await fetch('/api/products/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const result = await response.json();
        // Display detailed validation errors if they exist
        if (result.errors) {
          const errorMessages = result.errors.map((e: any) => `- Row ${e.row}: ${e.message}`).join('\n');
          toast.error(`Please fix these errors in your file:\n${errorMessages}`, { duration: 10000 });
        } else {
          throw new Error(result.error || 'Conversion failed');
        }
        return; 
      }

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
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Toaster position="top-center" richColors theme="light" />
      <header>
        <h1 className="text-3xl font-bold">Product Data Converter</h1>
        <p className="text-muted-foreground">
          Upload your Ecokart or eBay file to get the converted version.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Start Conversion</CardTitle>
          <CardDescription>Upload your source file and select the format you want to convert it to.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="source-file">1. Upload Source File</Label>
              <Input id="source-file" type="file" accept=".csv,.xlsx" onChange={handleFileChange} required />
               <p className="text-sm text-muted-foreground">The system will auto-detect if it's an Ecokart or eBay file.</p>
            </div>
            
            <div className="space-y-2">
              <Label>2. Select Target Format</Label>
              <Select onValueChange={(v) => setTargetFormat(v as any)} value={targetFormat}>
                <SelectTrigger><SelectValue placeholder="Convert file to..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ecokart">Ecokart Format</SelectItem>
                  <SelectItem value="ebay">eBay Format</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button type="submit" size="lg" disabled={!file || !targetFormat || isConverting}>
              {isConverting ? 'Converting...' : 'Convert and Download File'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}