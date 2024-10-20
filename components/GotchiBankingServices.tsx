// components/GotchiBankingServices.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import TopSection from './TopSection';
import WithdrawalForm, { Aavegotchi, WithdrawalFormProps } from './WithdrawalForm';
import { CONTRACT_ADDRESS, GHST_CONTRACT_ADDRESS, DIAMOND_ABI, ERC20_ABI } from '../utils/constants';
import { cn } from '../lib/utils';

interface TokenInfo {
  symbol: string;
  image: string;
}

const POLYGON_CHAIN_ID = '0x89'; // Polygon Mainnet

interface GotchiBankingServicesProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const GotchiBankingServices: React.FC<GotchiBankingServicesProps> = ({ isDarkMode, toggleDarkMode }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [aavegotchis, setAavegotchis] = useState<Aavegotchi[]>([]);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [customTokenSymbol, setCustomTokenSymbol] = useState<string>('GHST');
  const [isCustomToken, setIsCustomToken] = useState(false);
  const [customTokenAddress, setCustomTokenAddress] = useState('');
  const [tokenInfo, setTokenInfo] = useState<TokenInfo>({ symbol: 'GHST', image: '/images/default-token.png' });
  const [tokenOption, setTokenOption] = useState('GHST');
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);

  const switchToPolygon = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: POLYGON_CHAIN_ID }],
        });
        return true;
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: POLYGON_CHAIN_ID,
                  chainName: 'Polygon Mainnet',
                  nativeCurrency: {
                    name: 'MATIC',
                    symbol: 'MATIC',
                    decimals: 18
                  },
                  rpcUrls: ['https://polygon-rpc.com/'],
                  blockExplorerUrls: ['https://polygonscan.com/']
                },
              ],
            });
            return true;
          } catch (addError) {
            console.error('Failed to add Polygon network:', addError);
          }
        }
        console.error('Failed to switch to Polygon network:', switchError);
      }
    }
    return false;
  };

  const getTokenImageUrl = useCallback(
    async (
      contractAddress: string,
      platform: string = 'polygon-pos',
      imageSize: string = 'small'
    ): Promise<string> => {
      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${platform}/contract/${contractAddress.toLowerCase()}`
        );

        if (response.ok) {
          const data = await response.json();
          const imageInfo = data.image || {};
          return imageInfo[imageSize] || '/images/default-token.png';
        } else if (response.status === 404) {
          console.warn('Token not found. Using default image.');
          return '/images/default-token.png';
        } else {
          console.error(`Error: Received status code ${response.status} from CoinGecko API.`);
          return '/images/default-token.png';
        }
      } catch (error) {
        console.error('An error occurred while fetching token image:', error);
        return '/images/default-token.png';
      }
    },
    []
  );

  const fetchTokenInfo = useCallback(
    async (tokenAddress: string) => {
      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/polygon-pos/contract/${tokenAddress.toLowerCase()}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch token info');
        }
        const data = await response.json();
        const imageUrl = await getTokenImageUrl(tokenAddress);

        const provider =
          typeof window !== 'undefined' && window.ethereum
            ? new ethers.BrowserProvider(window.ethereum)
            : ethers.getDefaultProvider();

        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer || provider);

        let symbol: string;
        try {
          symbol = await tokenContract.symbol();
        } catch (error) {
          console.warn('Failed to fetch symbol, using address as symbol', error);
          symbol = tokenAddress.slice(0, 6) + '...';
        }

        let decimals: number;
        try {
          decimals = await tokenContract.decimals();
        } catch (error) {
          console.warn('Failed to fetch decimals, using 18 as default', error);
          decimals = 18;
        }
        setTokenDecimals(decimals);

        setTokenInfo({
          symbol: symbol.toUpperCase(),
          image: imageUrl,
        });
        setCustomTokenSymbol(symbol.toUpperCase());
      } catch (error) {
        console.error('Error fetching token info:', error);
        setTokenInfo({ symbol: 'Unknown', image: '/images/default-token.png' });
        setTokenDecimals(18);
      }
    },
    [getTokenImageUrl, signer]
  );

  useEffect(() => {
    fetchTokenInfo(GHST_CONTRACT_ADDRESS);
  }, [fetchTokenInfo]);

  const checkConnection = useCallback(async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== POLYGON_CHAIN_ID) {
          const switched = await switchToPolygon();
          if (!switched) {
            setIsCorrectNetwork(false);
            return;
          }
        }
        setIsCorrectNetwork(true);

        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          setAccount(address);
          setSigner(signer);
          const contract = new ethers.Contract(CONTRACT_ADDRESS, DIAMOND_ABI, signer);
          setContract(contract);
          fetchAavegotchis(address, contract);
        } else {
          setAccount(null);
          setSigner(null);
          setContract(null);
          setAavegotchis([]);
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  }, []);

  useEffect(() => {
    checkConnection();
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', checkConnection);
      window.ethereum.on('chainChanged', checkConnection);
    }
    return () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.removeListener('accountsChanged', checkConnection);
        window.ethereum.removeListener('chainChanged', checkConnection);
      }
    };
  }, [checkConnection]);

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        checkConnection();
      } catch (error) {
        console.error('Error connecting wallet:', error);
      }
    } else {
      alert('Please install MetaMask or another Ethereum wallet to use this dApp.');
    }
  };

  const fetchAavegotchis = async (address: string, contract: ethers.Contract) => {
    try {
      console.log('Fetching Aavegotchis for address:', address);

      const balance = await contract.balanceOf(address);
      console.log('Balance:', balance.toString());

      const tokenIds: string[] = [];
      for (let i = 0; i < balance; i++) {
        const tokenId = await contract.tokenOfOwnerByIndex(address, i);
        console.log(`Token ID ${i}:`, tokenId.toString());
        tokenIds.push(tokenId.toString());
      }

      const provider = contract.runner as ethers.Provider;
      const ghstContract = new ethers.Contract(GHST_CONTRACT_ADDRESS, ERC20_ABI, provider);
      const decimals = await ghstContract.decimals();

      const aavegotchisData = await Promise.all(
        tokenIds.map(async (tokenId) => {
          const aavegotchiInfo = await contract.getAavegotchi(tokenId);
          const escrowAddress = aavegotchiInfo.escrow;
          const escrowBalance = await ghstContract.balanceOf(escrowAddress);
          const isLent = await contract.isAavegotchiLent(tokenId);

          return {
            tokenId: tokenId,
            name: aavegotchiInfo.name,
            escrowWallet: escrowAddress,
            ghstBalance: ethers.formatUnits(escrowBalance, decimals),
            customTokenBalance: '0',
            isLent: isLent,
          };
        })
      );

      console.log('Processed Aavegotchi Data:', aavegotchisData);
      setAavegotchis(aavegotchisData);
    } catch (error) {
      console.error('Error fetching Aavegotchis:', error);
      setAavegotchis([]);
    }
  };

  const fetchBalances = useCallback(async () => {
    if (!contract || !signer || aavegotchis.length === 0) {
      return;
    }

    const updatedAavegotchis = await Promise.all(
      aavegotchis.map(async (gotchi) => {
        let ghstBalance: string = gotchi.ghstBalance;
        let customTokenBalance: string = gotchi.customTokenBalance || '0';

        try {
          const ghstContract = new ethers.Contract(GHST_CONTRACT_ADDRESS, ERC20_ABI, signer);
          const balance = await ghstContract.balanceOf(gotchi.escrowWallet);
          ghstBalance = ethers.formatUnits(balance, 18);
        } catch (error) {
          console.warn(`Failed to fetch GHST balance for Aavegotchi ${gotchi.tokenId}`, error);
          ghstBalance = '0';
        }

        if (isCustomToken && customTokenAddress && ethers.isAddress(customTokenAddress)) {
          try {
            const tokenContract = new ethers.Contract(customTokenAddress, ERC20_ABI, signer);
            const balance = await tokenContract.balanceOf(gotchi.escrowWallet);
            customTokenBalance = ethers.formatUnits(balance, tokenDecimals);
          } catch (error) {
            console.warn(`Failed to fetch custom token balance for Aavegotchi ${gotchi.tokenId}`, error);
            customTokenBalance = '0';
          }
        } else {
          customTokenBalance = '0';
        }

        return {
          ...gotchi,
          ghstBalance,
          customTokenBalance,
        };
      })
    );
    setAavegotchis(updatedAavegotchis);
  }, [contract, signer, aavegotchis, isCustomToken, customTokenAddress, tokenDecimals]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const handleCustomTokenChange = useCallback(
    async (tokenAddress: string) => {
      if (!contract || !signer || !tokenAddress || !ethers.isAddress(tokenAddress)) {
        setTokenInfo({ symbol: '', image: '/images/default-token.png' });
        setIsCustomToken(false);
        setCustomTokenAddress('');
        return;
      }

      try {
        await fetchTokenInfo(tokenAddress);
        setCustomTokenAddress(tokenAddress);
        setIsCustomToken(tokenAddress.toLowerCase() !== GHST_CONTRACT_ADDRESS.toLowerCase());

        console.log('Updating Aavegotchi balances...');
        await fetchBalances();
      } catch (error) {
        console.error('Error fetching custom token info:', error);
        setCustomTokenSymbol('');
        setTokenInfo({ symbol: '', image: '/images/default-token.png' });
        setIsCustomToken(false);
        setTokenDecimals(18);
        setCustomTokenAddress('');
      }
    },
    [contract, signer, fetchTokenInfo, fetchBalances]
  );

  const handleCustomTokenInvalid = useCallback(() => {
    setTokenInfo({ symbol: '', image: '/images/default-token.png' });
    setIsCustomToken(false);
    setTokenDecimals(18);
    setCustomTokenAddress('');
  }, []);

  const handleWithdraw = useCallback(
    async (tokenAddress: string, selectedGotchis: string[], amount: string) => {
      if (!contract || !signer) {
        console.error('Contract or signer not initialized');
        return;
      }

      try {
        console.log(`Attempting to withdraw ${amount} of token ${tokenAddress} from Aavegotchis:`, selectedGotchis);
        
        const amountInWei = ethers.parseUnits(amount, tokenDecimals);
        const userAddress = await signer.getAddress();

        const withdrawals = selectedGotchis.map(gotchiId => ({
          tokenId: gotchiId,
          amount: amountInWei
        }));

        console.log('Performing batch withdrawal:', withdrawals);
        const tx = await contract.batchTransferEscrow(
          withdrawals.map(w => w.tokenId),
          withdrawals.map(() => tokenAddress),
          withdrawals.map(() => userAddress),
          withdrawals.map(w => w.amount)
        );
        await tx.wait();
        console.log('Withdrawal transaction successful');

        // Refresh Aavegotchi balances
        await fetchBalances();
      } catch (error) {
        console.error('Error during withdrawal:', error);
        throw error; // Rethrow the error so it can be caught in the WithdrawalForm component
      }
    },
    [contract, signer, tokenDecimals, fetchBalances]
  );

  const handleTokenSelection = useCallback(
    async (selectedTokenOption: string) => {
      setTokenOption(selectedTokenOption);
      if (selectedTokenOption === 'GHST') {
        setIsCustomToken(false);
        setCustomTokenAddress(GHST_CONTRACT_ADDRESS);
        setTokenDecimals(18);
        await fetchTokenInfo(GHST_CONTRACT_ADDRESS);
        await fetchBalances();
      } else if (selectedTokenOption === 'custom') {
        setCustomTokenAddress('');
        setTokenInfo({ symbol: '', image: '/images/default-token.png' });
        setIsCustomToken(true);
      }
    },
    [fetchTokenInfo, fetchBalances]
  );

  const withdrawalFormProps: WithdrawalFormProps = {
    aavegotchis,
    onWithdraw: handleWithdraw,
    onCustomTokenChange: handleCustomTokenChange,
    signer,
    onTokenSelection: handleTokenSelection,
    tokenSymbol: tokenInfo.symbol,
    onCustomTokenInvalid: handleCustomTokenInvalid,
    tokenDecimals,
    isDarkMode,
    tokenOption,
    customTokenAddress,
  };

  return (
    <div
      className={cn(
        'min-h-screen p-4 md:p-6 overflow-x-hidden bg-gradient-radial from-white/10 via-white/20 to-white/10 dark:from-black/20 dark:via-black/40 dark:to-black/20',
        isDarkMode ? 'text-darkText' : 'text-text'
      )}
    >
      <div className="max-width-container">
        <TopSection
          contractAddress={CONTRACT_ADDRESS}
          network="Polygon Mainnet"
          walletAddress={account}
          onConnectWallet={connectWallet}
          aavegotchis={aavegotchis}
          customTokenSymbol={customTokenSymbol}
          isCustomToken={isCustomToken}
          tokenImage={tokenInfo.image}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          signer={signer}
          tableContainerClass="max-w-6xl mx-auto"
        />
        <WithdrawalForm {...withdrawalFormProps} />
      </div>
    </div>
  );
};

export default GotchiBankingServices;
