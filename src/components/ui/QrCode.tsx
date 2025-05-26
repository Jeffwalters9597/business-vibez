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
    if (!qrRef.current) return;

    // Serialize SVG to string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(qrRef.current);
    
    // Create blob with SVG content
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-code-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Call custom download handler if provided
    if (onDownload) {
      onDownload();
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