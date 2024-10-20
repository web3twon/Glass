// hooks/useMetaMask.tsx

import { useState, useEffect, createContext, PropsWithChildren, useContext, useCallback } from 'react';
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';
import { formatBalance } from '../utils/utils';

interface WalletState {
  accounts: string[];
  balance: string;
  chainId: string;
}

interface MetaMaskContextData {
  wallet: WalletState;
  hasProvider: boolean | null;
  error: boolean;
  errorMessage: string;
  isConnecting: boolean;
  connectMetaMask: () => void;
  clearError: () => void;
}

const disconnectedState: WalletState = { accounts: [], balance: '', chainId: '' };

const MetaMaskContext = createContext<MetaMaskContextData>({} as MetaMaskContextData);

export const MetaMaskContextProvider = ({ children }: PropsWithChildren) => {
  const [hasProvider, setHasProvider] = useState<boolean | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [wallet, setWallet] = useState(disconnectedState);

  const clearError = () => setErrorMessage('');

  const _updateWallet = useCallback(async (providedAccounts?: string[]) => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = providedAccounts || (await window.ethereum.request({ method: 'eth_accounts' }));

        if (accounts.length === 0) {
          setWallet(disconnectedState);
          return;
        }

        const balance = formatBalance(
          await window.ethereum.request({
            method: 'eth_getBalance',
            params: [accounts[0], 'latest'],
          })
        );
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });

        setWallet({ accounts, balance, chainId });
      } catch (error) {
        console.error('Failed to update wallet:', error);
        setWallet(disconnectedState);
      }
    } else {
      setWallet(disconnectedState);
    }
  }, []);

  const updateWalletAndAccounts = useCallback(() => {
    _updateWallet();
  }, [_updateWallet]);

  const updateWallet = useCallback(
    (accounts: string[]) => {
      _updateWallet(accounts);
    },
    [_updateWallet]
  );

  useEffect(() => {
    const getProvider = async () => {
      const provider = await detectEthereumProvider({ silent: true });
      setHasProvider(Boolean(provider));

      if (provider) {
        updateWalletAndAccounts();
        if (typeof window !== 'undefined' && window.ethereum) {
          window.ethereum.on('accountsChanged', updateWallet);
          window.ethereum.on('chainChanged', updateWalletAndAccounts);
        }
      } else {
        setHasProvider(false);
      }
    };

    if (typeof window !== 'undefined') {
      getProvider();

      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener('accountsChanged', updateWallet);
          window.ethereum.removeListener('chainChanged', updateWalletAndAccounts);
        }
      };
    }
  }, [updateWallet, updateWalletAndAccounts]);

  const connectMetaMask = async () => {
    setIsConnecting(true);

    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        clearError();
        updateWallet(accounts);
      } else {
        setErrorMessage('MetaMask is not available');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    }

    setIsConnecting(false);
  };

  return (
    <MetaMaskContext.Provider
      value={{
        wallet,
        hasProvider,
        error: !!errorMessage,
        errorMessage,
        isConnecting,
        connectMetaMask,
        clearError,
      }}
    >
      {children}
    </MetaMaskContext.Provider>
  );
};

export const useMetaMask = () => {
  const context = useContext(MetaMaskContext);
  if (context === undefined) {
    throw new Error('useMetaMask must be used within a MetaMaskContextProvider');
  }
  return context;
};
