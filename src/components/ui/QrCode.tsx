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
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if QR code is ready when ref or value changes
    if (qrRef.current && value) {
      setIsReady(true);
    } else {
      setIsReady(false);
    }
  }, [qrRef, value]);

  const handleDownload = () => {
    // Early return if SVG is not ready
    if (!qrRef.current || !isReady) {
      console.warn('QR code is not ready yet');
      return;
    }

    try {
      // Get the SVG element
      const svgElement = qrRef.current;
      
      // Create a deep clone of the SVG
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      
      // Add required SVG attributes
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      
      // Convert SVG to string
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      
      // Create blob and object URL
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      
      // Create and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-code-${Date.now()}.svg`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Call onDownload callback if provided
      if (onDownload) {
        onDownload();
      }
    } catch (error) {
      console.error('Failed to download QR code:', error);
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
          disabled={!isReady}
        >
          Download QR Code
        </Button>
      )}
    </div>
  );
};

export default QrCode;