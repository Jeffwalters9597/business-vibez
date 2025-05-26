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
    alert('DEBUG: ENTERING FORCED SVG DOWNLOAD HANDLER!');
    console.log('DEBUG_SVG_DOWNLOAD: Handler started.');

    try {
      if (!qrRef.current) {
        console.error('DEBUG_SVG_DOWNLOAD: CRITICAL ERROR - SVG ref is null');
        alert('DEBUG_SVG_DOWNLOAD: CRITICAL ERROR - SVG ref is null');
        return;
      }

      // Step 1: Get the SVG element
      const svgElement = qrRef.current;
      if (!svgElement || svgElement.tagName.toLowerCase() !== 'svg') {
        console.error('DEBUG_SVG_DOWNLOAD: CRITICAL ERROR - Not an SVG element. Found:', svgElement);
        alert('DEBUG_SVG_DOWNLOAD: CRITICAL ERROR - Not an SVG element!');
        return;
      }
      console.log('DEBUG_SVG_DOWNLOAD: SVG Element obtained:', svgElement);

      // Step 2: Create a clean clone
      const clonedSvgElement = svgElement.cloneNode(true) as SVGElement;
      clonedSvgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      console.log('DEBUG_SVG_DOWNLOAD: SVG Element cloned.');

      // Step 3: Serialize the cloned SVG to a string
      const svgString = new XMLSerializer().serializeToString(clonedSvgElement);
      console.log('DEBUG_SVG_DOWNLOAD: Serialized SVG String (first 300 chars):', svgString.substring(0, 300));
      if (!svgString.toLowerCase().includes('<svg')) {
        console.error('DEBUG_SVG_DOWNLOAD: CRITICAL ERROR - Serialized string does not appear to be SVG!');
        alert('DEBUG_SVG_DOWNLOAD: CRITICAL ERROR - Serialized string is not SVG!');
        return;
      }

      // Step 4: Create a Blob with the correct SVG MIME type
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      console.log('DEBUG_SVG_DOWNLOAD: Blob created. Type:', blob.type, 'Size:', blob.size);

      // Step 5: Create a download link and trigger the download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const fileName = `qr-code-${new Date().toISOString().slice(0, 10)}.svg`;
      link.download = fileName;
      console.log('DEBUG_SVG_DOWNLOAD: Download link created. Href:', link.href, 'Download attr:', link.download);

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      console.log('DEBUG_SVG_DOWNLOAD: Download triggered for', fileName);
      alert('DEBUG_SVG_DOWNLOAD: SVG Download attempt finished. Check downloaded file.');

      if (onDownload) {
        onDownload();
      }
    } catch (error) {
      console.error('DEBUG_SVG_DOWNLOAD: UNEXPECTED ERROR in handler:', error);
      alert('DEBUG_SVG_DOWNLOAD: UNEXPECTED ERROR - Check console!');
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