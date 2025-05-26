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
    // Set ready state when QR code is rendered
    if (qrRef.current) {
      setIsReady(true);
    }
  }, [qrRef.current]);

  const handleDownload = () => {
    if (!qrRef.current || !isReady) {
      console.error('QR code is not ready for download');
      return;
    }

    try {
      const svgElement = qrRef.current;
      const clonedSvgElement = svgElement.cloneNode(true) as SVGElement;
      clonedSvgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      const svgString = new XMLSerializer().serializeToString(clonedSvgElement);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `qr-code-${new Date().toISOString().slice(0, 10)}.svg`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      if (onDownload) {
        onDownload();
      }
    } catch (error) {
      console.error('Error downloading QR code:', error);
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
          onLoad={() => setIsReady(true)}
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