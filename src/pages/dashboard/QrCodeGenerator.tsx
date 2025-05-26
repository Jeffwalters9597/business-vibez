import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { QrCode, Download, Copy, Link } from 'lucide-react';

const QrCodeGenerator = () => {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateQrUrl = (qrId: string, adSpaceId?: string) => {
    const params = new URLSearchParams();
    params.append('qr', qrId);
    if (adSpaceId) {
      params.append('ad', adSpaceId);
    }
    return `https://bizvibez.netlify.app/view?${params.toString()}`;
  };

  const handleGenerate = async () => {
    if (!url || !name) return;
    
    setIsGenerating(true);
    try {
      // QR code generation logic will go here
      // For now, just simulating the generation
      await new Promise(resolve => setTimeout(resolve, 1000));
      setQrCode('dummy-qr-code-url');
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">QR Code Generator</h1>
      
      <div className="grid md:grid-cols-2 gap-8">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Create New QR Code</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                QR Code Name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Enter a name for your QR code"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                Destination URL
              </label>
              <Input
                id="url"
                type="url"
                placeholder="Enter the URL to encode"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            
            <Button
              onClick={handleGenerate}
              disabled={!url || !name || isGenerating}
              className="w-full"
            >
              <QrCode className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate QR Code'}
            </Button>
          </div>
        </Card>
        
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Preview</h2>
          
          {qrCode ? (
            <div className="space-y-4">
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                {/* QR code image will go here */}
                <QrCode className="w-32 h-32 text-gray-400" />
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" className="flex-1">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button variant="outline" className="flex-1">
                  <Link className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          ) : (
            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-500 text-center">
                Generated QR code will appear here
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default QrCodeGenerator;