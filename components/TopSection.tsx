// components/TopSection.tsx

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../utils/utils';
import { formatNumberWithCommas } from '../utils/formatters';
import { Moon, Sun } from 'lucide-react';
import AavegotchiThumbnail from './AavegotchiThumbnail';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';

interface TopSectionProps {
  contractAddress: string;
  network: string;
  walletAddress: string | null;
  onConnectWallet: () => void;
  aavegotchis: Aavegotchi[];
  customTokenSymbol: string;
  isCustomToken: boolean;
  tokenImage: string;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  signer: ethers.Signer | null;
  tableContainerClass?: string;
}

interface Aavegotchi {
  tokenId: string;
  name: string;
  escrowWallet: string;
  ghstBalance: string;
  customTokenBalance?: string;
  isLent: boolean;
}

const TopSection: React.FC<TopSectionProps> = ({
  contractAddress,
  network,
  walletAddress,
  onConnectWallet,
  aavegotchis,
  customTokenSymbol,
  isCustomToken,
  tokenImage,
  isDarkMode,
  toggleDarkMode,
  signer,
}) => {
  const [toast, setToast] = useState({ show: false, message: '' });
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [localTokenImage, setLocalTokenImage] = useState('/images/default-token.png');

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobileView = windowWidth <= 830;

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setToast({ show: true, message: 'Copied to clipboard!' });
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
        setToast({ show: true, message: 'Failed to copy' });
      });
  };

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const processImage = (src: string, callback: (processedSrc: string) => void) => {
    const proxiedSrc = `/api/proxy-image?url=${encodeURIComponent(src)}`;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // If pixel is white or very close to white, make it transparent
        if (r > 250 && g > 250 && b > 250) {
          data[i + 3] = 0; // Set alpha to 0
        }
      }

      ctx.putImageData(imageData, 0, 0);
      callback(canvas.toDataURL());
    };
    img.src = proxiedSrc;
  };

  useEffect(() => {
    if (tokenImage) {
      const img = new Image();
      img.onload = () => setLocalTokenImage(tokenImage);
      img.onerror = () => setLocalTokenImage('/images/default-token.png');
      img.src = tokenImage;
    }
  }, [tokenImage]);

  return (
    <div className={cn('space-y-4 w-full')}>
      <div className="relative flex items-center justify-center">
        <h1 className={cn('text-2xl md:text-4xl font-heading text-glass text-center px-4')}>
          Aavegotchi Banking Services
        </h1>
        <motion.button
          onClick={toggleDarkMode}
          className={cn(
            'absolute right-0 p-2 rounded-full bg-white/20 dark:bg-black/20 mr-0',
            'shadow-glass'
          )}
          aria-label="Toggle Dark Mode"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.1 }}
        >
          {isDarkMode ? <Sun className="w-6 h-6 text-yellow-400" /> : <Moon className="w-6 h-6 text-gray-800" />}
        </motion.button>
      </div>

      <div className={cn('p-4 glassmorphism')}>
        <p className="font-base text-glass break-words">Network: {network}</p>
        <p className="font-base text-glass break-all">Contract: {contractAddress}</p>
      </div>

      <div className={cn('p-4 glassmorphism')}>
        {walletAddress ? (
          <p className="font-base text-glass">
            Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </p>
        ) : (
          <motion.button
            className={cn(
              'w-full bg-white/20 dark:bg-black/20 px-4 py-2 font-base text-glass border border-white/30 dark:border-black/30 rounded-xl shadow-glass',
              'hover:bg-white/30 dark:hover:bg-black/30 transition-all'
            )}
            onClick={onConnectWallet}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.1 }}
          >
            Connect Wallet
          </motion.button>
        )}
      </div>

      <div className={cn('p-4 glassmorphism')}>
        <h2 className={cn('text-xl md:text-2xl font-heading mb-4 text-glass text-center')}>Aavegotchi Tokens</h2>
        <div className="table-container">
          <table className={cn('responsive-table w-full')}>
            <thead>
              <tr className="bg-white/20 dark:bg-black/20">
                <th className="p-2 font-base text-glass text-center">GOTCHI</th>
                <th className="p-2 font-base text-glass text-center">NAME</th>
                <th className="p-2 font-base text-glass text-center">ESCROW WALLET</th>
                <th className="p-2 font-base text-glass text-center">
                  <div className="flex items-center justify-center">
                    <span>{isCustomToken && customTokenSymbol ? customTokenSymbol : 'GHST'} BALANCE</span>
                    {localTokenImage && (
                      <div className="ml-2 w-6 h-6 overflow-hidden rounded-full">
                        <img
                          src={localTokenImage}
                          alt={isCustomToken ? customTokenSymbol : 'GHST'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </th>
                <th className="p-2 font-base text-glass text-center">OWNERSHIP</th>
              </tr>
            </thead>
            <tbody>
              {aavegotchis.map((gotchi, index) => (
                <tr
                  key={gotchi.tokenId}
                  className={index % 2 === 0 ? 'bg-white/10 dark:bg-black/10' : 'bg-white/20 dark:bg-black/20'}
                >
                  <td className="p-2 font-base text-glass text-center">
                    <div className="flex items-center justify-center">
                      <AavegotchiThumbnail
                        tokenId={gotchi.tokenId}
                        signer={signer}
                        displayMode="thumbnail"
                        size={56} // You can adjust this number as needed
                      />
                    </div>
                  </td>
                  <td className="p-2 font-base text-glass text-center" data-label="NAME">
                    {gotchi.name || `Aavegotchi #${gotchi.tokenId}`}
                  </td>
                  <td className="p-2 font-base text-glass text-center" data-label="ESCROW WALLET">
                    {gotchi.escrowWallet.slice(0, 6)}...{gotchi.escrowWallet.slice(-4)}
                    <motion.button
                      onClick={() => copyToClipboard(gotchi.escrowWallet)}
                      className={cn(
                        'ml-2 bg-white/20 dark:bg-black/20 px-2 py-1 font-base text-glass',
                        'border border-white/30 dark:border-black/30 rounded',
                        'shadow-glass',
                        'hover:bg-white/30 dark:hover:bg-black/30 transition-all'
                      )}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ duration: 0.1 }}
                    >
                      Copy
                    </motion.button>
                  </td>
                  <td className="p-2 font-base text-glass text-center" data-label={`${isCustomToken && customTokenSymbol ? customTokenSymbol : 'GHST'} BALANCE`}>
                    {formatNumberWithCommas(
                      parseFloat(isCustomToken ? gotchi.customTokenBalance || '0' : gotchi.ghstBalance).toFixed(4)
                    )}
                  </td>
                  <td className="p-2 font-base text-glass text-center" data-label="OWNERSHIP">
                    <span
                      className={cn(
                        'px-2 py-1 rounded',
                        gotchi.isLent ? 'bg-white/20 dark:bg-black/20' : 'bg-white/10 dark:bg-black/10'
                      )}
                    >
                      {gotchi.isLent ? '🔑 Rented' : '🏠 Owned'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toast.show && (
        <div className={cn('fixed bottom-4 right-4 p-4 glassmorphism z-50')}>
          <p className="font-base text-glass">{toast.message}</p>
        </div>
      )}
    </div>
  );
};

export default TopSection;
