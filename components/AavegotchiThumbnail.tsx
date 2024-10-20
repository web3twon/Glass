// components/AavegotchiThumbnail.tsx

import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, AAVEGOTCHI_ABI } from '../utils/constants';
import { cn } from '../utils/utils';
import ReactDOM from 'react-dom';

interface AavegotchiThumbnailProps {
  tokenId: string;
  signer: ethers.Signer | null;
  displayMode: 'thumbnail' | 'full';
  size?: number; // Change this to accept a number
}

const AavegotchiThumbnail: React.FC<AavegotchiThumbnailProps> = ({ tokenId, signer, displayMode, size = 56 }) => {
  const [svgUrl, setSvgUrl] = useState<string | null>(null);
  const [showLarge, setShowLarge] = useState(false);
  const [previewPosition, setPreviewPosition] = useState({ top: 0, left: 0 });
  const [isClient, setIsClient] = useState(false);
  const thumbnailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const fetchSvg = async () => {
      if (tokenId && signer) {
        const contract = new ethers.Contract(CONTRACT_ADDRESS, AAVEGOTCHI_ABI, signer);
        try {
          const svg = await contract.getAavegotchiSvg(tokenId);
          const blob = new Blob([svg], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          setSvgUrl(url);
        } catch (error) {
          console.error(`Error fetching Aavegotchi SVG for token ID ${tokenId}:`, error);
        }
      } else {
        setSvgUrl(null);
      }
    };

    fetchSvg();

    return () => {
      if (svgUrl) {
        URL.revokeObjectURL(svgUrl);
      }
    };
  }, [tokenId, signer]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const offset = 10;
    const { clientX, clientY } = e;
    setPreviewPosition({
      top: clientY + offset,
      left: clientX + offset,
    });
  };

  const thumbnailStyle = {
    width: `${size}px`,
    height: `${size}px`,
  };

  const hoverPreview = showLarge && svgUrl && (
    <div
      className={cn(
        'fixed p-2 border border-white/20 rounded-xl shadow-glass bg-white/10 backdrop-blur-lg',
        'pointer-events-none',
        'z-50'
      )}
      style={{
        top: `${previewPosition.top}px`,
        left: `${previewPosition.left}px`,
      }}
    >
      <img src={svgUrl} alt={`Aavegotchi ${tokenId}`} className={cn('w-32 h-32 object-contain rounded-full')} />
    </div>
  );

  return (
    <>
      <div
        ref={thumbnailRef}
        className={cn('inline-block relative')}
        style={thumbnailStyle}
        onMouseEnter={() => setShowLarge(true)}
        onMouseLeave={() => setShowLarge(false)}
        onMouseMove={handleMouseMove}
      >
        {svgUrl ? (
          <img
            src={svgUrl}
            alt={`Aavegotchi ${tokenId}`}
            className={cn('w-full h-full object-contain rounded-full border border-white/20')}
          />
        ) : (
          <div className={cn('w-full h-full bg-gray-200 flex items-center justify-center text-xs')}>Loading...</div>
        )}
      </div>
      {isClient && ReactDOM.createPortal(hoverPreview, document.body)}
    </>
  );
};

export default AavegotchiThumbnail;
