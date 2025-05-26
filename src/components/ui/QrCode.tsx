import React, { useRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download } from 'lucide-react';
import Button from './Button';

interface QrCodeProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  className?: string;
  onDownload?: () => void;
  hideDownload?: boolean;
}

const QrCode: React.FC<QrCodeProps> = ({
  value,
  size = 256,
  level = 'H',
  includeMargin = true,
  className,
  onDownload,
  hideDownload = false
}) => {
  const qrRef = useRef<SVGSVGElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!qrRef.current) return;
    
    setIsDownloading(true);
    
    try {
      // Get the SVG element
      const svgElement = qrRef.current;
      
      // Create a canvas with a white background
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      // Fill white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const DOMURL = window.URL || window.webkitURL || window;
      const url = DOMURL.createObjectURL(svgBlob);
      
      // Create image and draw to canvas when loaded
      const img = new Image();
      img.src = url;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      
      // Draw QR code on top of white background
      ctx.drawImage(img, 0, 0);
      
      // Convert to PNG and download
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `qr-code-${Date.now()}.png`;
      link.href = pngUrl;
      link.click();
      
      // Cleanup
      DOMURL.revokeObjectURL(url);
      
      if (onDownload) {
        onDownload();
      }
    } catch (error) {
      console.error('Failed to download QR code:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={className}>
      <div className="bg-white p-4 rounded-lg inline-block">
        <QRCodeSVG
          ref={qrRef}
          value={value}
          size={size}
          level={level}
          includeMargin={includeMargin}
        />
      </div>
      {!hideDownload && (
        <Button
          onClick={handleDownload}
          variant="outline"
          className="w-full mt-4"
          leftIcon={<Download size={16} />}
          isLoading={isDownloading}
        >
          Download QR Code
        </Button>
      )}
    </div>
  );
};

export default QrCode;