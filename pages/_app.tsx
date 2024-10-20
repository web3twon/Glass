// pages/_app.tsx

import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { MetaMaskContextProvider } from '../hooks/useMetaMask';
import { useState, useEffect } from 'react';

function MyApp({ Component, pageProps }: AppProps) {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    // Apply dark mode class to html element
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <MetaMaskContextProvider>
      <div className="floating-orbs">
        <div className="orb"></div>
        <div className="orb"></div>
        <div className="orb"></div>
      </div>
      <Component {...pageProps} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
    </MetaMaskContextProvider>
  );
}

export default MyApp;
