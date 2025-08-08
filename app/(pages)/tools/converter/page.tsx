'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast, Toaster } from 'sonner';

/**
 * A client-side component for the file conversion interface.
 * Handles file selection, format selection, and API communication.
 * Includes robust error handling and a dynamic UI that prompts for a 
 * template file if the server cannot find it.
 */
export default function ConverterPage() {
  // State for the primary data file (Ecokart or eBay)
  const [file, setFile] = useState<File | null>(null);
  
  // State for the selected output format
  const [targetFormat, setTargetFormat] = useState<'ecokart' | 'ebay' | ''>('');
  
  // State to manage the UI during the conversion process
  const [isConverting, setIsConverting] = useState(false);
  
  // State to determine if the eBay template upload UI should be shown
  const [needsTemplate, setNeedsTemplate] = useState(false);
  
  // State for the user-provided eBay template file
  const [templateFile, setTemplateFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
      // Hide the template prompt if a new file is selected
      setNeedsTemplate(false); 
    }
  };
  
  const handleTemplateFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setTemplateFile(event.target.files[0]);
    }
  };

  /**
   * Handles the form submission, sending the file(s) to the backend API.
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !targetFormat) {
      toast.error('Please select a target format and a file.');
      return;
    }
    
    // If the UI is asking for the template, ensure it has been provided.
    if (needsTemplate && !templateFile) {
      toast.error('Please upload the official eBay template file to continue.');
      return;
    }

    setIsConverting(true);
    toast.info('Validating and converting your file...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetFormat', targetFormat);
    
    // Append the eBay template file to the request if it has been selected
    if (templateFile) {
      formData.append('templateFile', templateFile);
    }

    try {
      const response = await fetch('/api/products/convert', {
        method: 'POST',
        body: formData,
      });

      // Handle file download on success
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
        setNeedsTemplate(false); // Reset UI on success
        setTemplateFile(null);
        return;
      }
      
      // Handle errors from the API
      const result = await response.json();
      
      // Check for the specific "template not found" error code
      if (result.error === 'TEMPLATE_NOT_FOUND') {
        toast.error('Official eBay template not found. Please upload it below.');
        setNeedsTemplate(true); // Show the template upload input
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

            {/* Conditional UI for template upload */}
            {needsTemplate && (
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