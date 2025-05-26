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
  const qrContainerRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    try {
      const qrContainer = qrContainerRef.current;
      if (!qrContainer) return;

      // Get the QR code SVG element
      const qrSvg = qrContainer.querySelector('svg');
      if (!qrSvg) {
        console.error('QR code SVG not found');
        return;
      }

      // Create a new SVG with white background
      const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
          <rect width="100%" height="100%" fill="white"/>
          ${qrSvg.innerHTML}
        </svg>
      `;

      // Create a Blob from the SVG string
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-code-${Date.now()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      URL.revokeObjectURL(url);

      if (onDownload) {
        onDownload();
      }
    } catch (error) {
      console.error('Failed to download QR code:', error);
    }
  };

  return (
    <div className={className}>
      <div ref={qrContainerRef} className="bg-white p-4 rounded-lg inline-block">
        <QRCodeSVG
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
        >
          Download QR Code
        </Button>
      )}
    </div>
  );
};

export default QrCode;