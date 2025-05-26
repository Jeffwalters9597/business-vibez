import React, { useRef } from 'react';
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
}

const QrCode: React.FC<QrCodeProps> = ({
  value,
  size = 256,
  level = 'H',
  includeMargin = true,
  className,
  onDownload
}) => {
  const qrRef = useRef<SVGSVGElement>(null);

  const handleDownload = () => {
    console.log('DOWNLOAD_HANDLER_ACTIVATED: Starting QR Code download process...');
    
    if (!qrRef.current) {
      console.error('DOWNLOAD_HANDLER_ERROR: No SVG reference found');
      return;
    }

    try {
      // Get the SVG element
      const svgElement = qrRef.current;
      console.log('DOWNLOAD_HANDLER_DEBUG: SVG element found:', svgElement.tagName);

      // Create a clean copy of the SVG
      const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
      
      // Ensure proper SVG attributes
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svgClone.setAttribute('version', '1.1');
      
      // Serialize to string
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgClone);
      console.log('DOWNLOAD_HANDLER_DEBUG: SVG string generated:', svgString.substring(0, 100));

      // Create blob with correct MIME type
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      console.log('DOWNLOAD_HANDLER_DEBUG: Blob created with type:', blob.type);

      // Generate filename
      const filename = `qr-code-${new Date().toISOString().slice(0, 10)}.svg`;
      
      // Create and trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      console.log('DOWNLOAD_HANDLER_DEBUG: Download link created with filename:', filename);
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Call custom download handler if provided
      if (onDownload) {
        onDownload();
      }
    } catch (error) {
      console.error('DOWNLOAD_HANDLER_ERROR:', error);
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
      <Button
        onClick={handleDownload}
        variant="outline"
        className="w-full mt-4"
        leftIcon={<Download size={16} />}
      >
        Download QR Code
      </Button>
    </div>
  );
};

export default QrCode;