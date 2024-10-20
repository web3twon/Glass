// components/WithdrawalForm.tsx

import React, { useState, useEffect, ChangeEvent } from 'react';
import { cn } from '../utils/utils';
import { motion } from 'framer-motion';
import * as ethers from 'ethers';
import { GHST_CONTRACT_ADDRESS, DIAMOND_ABI, CONTRACT_ADDRESS } from '../utils/constants';

interface WithdrawalFormProps {
  aavegotchis: Aavegotchi[];
  onWithdraw: (selectedGotchis: string[], amount: string, tokenAddress: string) => void;
  onCustomTokenChange: (address: string) => void;
  signer: ethers.Signer | null;
  onTokenSelection: (option: string) => void;
  tokenSymbol: string;
  onCustomTokenInvalid: () => void;
  tokenDecimals: number;
  isDarkMode: boolean;
  tokenOption: string;
  customTokenAddress: string;
}

interface Aavegotchi {
  tokenId: string;
  name: string;
  escrowWallet: string;
  ghstBalance: string;
  customTokenBalance?: string;
  isLent: boolean;
}

const WithdrawalForm: React.FC<WithdrawalFormProps> = ({
  aavegotchis,
  onWithdraw,
  onCustomTokenChange,
  signer,
  onTokenSelection,
  tokenSymbol,
  onCustomTokenInvalid,
  tokenDecimals,
  isDarkMode,
  tokenOption,
  customTokenAddress,
}) => {
  const [selectedGotchis, setSelectedGotchis] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ownedAavegotchis = aavegotchis.filter((gotchi) => !gotchi.isLent);

  useEffect(() => {
    if (ownedAavegotchis.length > 0 && selectedGotchis.length === 0) {
      setSelectedGotchis(ownedAavegotchis.map(gotchi => gotchi.tokenId));
    }
  }, [ownedAavegotchis]);

  const handleGotchiSelection = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === 'all') {
      setSelectedGotchis(ownedAavegotchis.map((gotchi) => gotchi.tokenId));
    } else {
      setSelectedGotchis([value]);
    }
    setAmount('');
  };

  const handleCustomTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;
    onCustomTokenChange(address);
  };

  const handleTokenSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onTokenSelection(e.target.value);
  };

  const handleMaxAmount = () => {
    let totalBalance = BigInt(0);
    const selectedGotchiData = ownedAavegotchis.filter((gotchi) =>
      selectedGotchis.includes(gotchi.tokenId)
    );

    totalBalance = selectedGotchiData.reduce((sum, gotchi) => {
      const balance = tokenOption.toLowerCase() === 'ghst' ? gotchi.ghstBalance : gotchi.customTokenBalance || '0';
      return sum + ethers.parseUnits(balance, tokenDecimals);
    }, BigInt(0));

    const formattedBalance = ethers.formatUnits(totalBalance, tokenDecimals);
    setAmount(formattedBalance);
    console.log(
      `Max amount set: ${formattedBalance} for ${selectedGotchis.length} Aavegotchi(s), Token Option: ${tokenOption}, Token Decimals: ${tokenDecimals}`
    );
  };

  const calculateProportionalWithdrawals = (
    selectedGotchiData: Aavegotchi[],
    totalAmount: bigint
  ): { tokenId: bigint; amount: bigint }[] => {
    const totalBalance = selectedGotchiData.reduce((sum, gotchi) => {
      const balanceStr =
        tokenOption.toLowerCase() === 'ghst' ? gotchi.ghstBalance : gotchi.customTokenBalance || '0';
      return sum + ethers.parseUnits(balanceStr, tokenDecimals);
    }, BigInt(0));

    if (totalBalance === BigInt(0)) {
      return selectedGotchiData.map(gotchi => ({
        tokenId: BigInt(gotchi.tokenId),
        amount: BigInt(0)
      }));
    }

    let remainingAmount = totalAmount;
    const withdrawals = selectedGotchiData.map((gotchi) => {
      const balanceStr =
        tokenOption.toLowerCase() === 'ghst' ? gotchi.ghstBalance : gotchi.customTokenBalance || '0';
      const gotchiBalance = ethers.parseUnits(balanceStr, tokenDecimals);
      
      // Use BigInt arithmetic for higher precision
      const withdrawAmount = (gotchiBalance * totalAmount) / totalBalance;

      if (withdrawAmount > remainingAmount) {
        return {
          tokenId: BigInt(gotchi.tokenId),
          amount: remainingAmount
        };
      }

      remainingAmount -= withdrawAmount;

      return {
        tokenId: BigInt(gotchi.tokenId),
        amount: withdrawAmount
      };
    });

    // Distribute any remaining amount due to rounding
    if (remainingAmount > 0) {
      for (let i = 0; i < withdrawals.length && remainingAmount > 0; i++) {
        const toAdd = BigInt(1);
        withdrawals[i].amount += toAdd;
        remainingAmount -= toAdd;
      }
    }

    return withdrawals;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!signer) {
      console.error('Signer not initialized');
      return;
    }

    setIsWithdrawing(true);
    setErrorMessage(null);

    try {
      const tokenAddress = tokenOption.toLowerCase() === 'ghst' ? GHST_CONTRACT_ADDRESS : customTokenAddress;
      const contract = new ethers.Contract(CONTRACT_ADDRESS, DIAMOND_ABI, signer);
      const userAddress = await signer.getAddress();

      const selectedGotchiData = ownedAavegotchis.filter((gotchi) =>
        selectedGotchis.includes(gotchi.tokenId)
      );
      const totalAmount = ethers.parseUnits(amount, tokenDecimals);

      if (selectedGotchiData.length === 0) {
        throw new Error('No Aavegotchis selected');
      }

      const totalAvailableBalance = selectedGotchiData.reduce((sum, gotchi) => {
        const balanceStr =
          tokenOption.toLowerCase() === 'ghst' ? gotchi.ghstBalance : gotchi.customTokenBalance || '0';
        const gotchiBalance = ethers.parseUnits(balanceStr, tokenDecimals);
        return sum + gotchiBalance;
      }, BigInt(0));

      if (totalAmount > totalAvailableBalance) {
        throw new Error('Not enough balance in selected Aavegotchis to withdraw the total amount requested.');
      }

      const withdrawals = calculateProportionalWithdrawals(selectedGotchiData, totalAmount);

      console.log('Attempting batch withdrawal:');
      withdrawals.forEach((w) =>
        console.log(`Aavegotchi ${w.tokenId}: ${ethers.formatUnits(w.amount, tokenDecimals)}`)
      );

      await contract.batchTransferEscrow(
        withdrawals.map((w) => w.tokenId),
        withdrawals.map(() => tokenAddress),
        withdrawals.map(() => userAddress),
        withdrawals.map((w) => w.amount)
      );

      setAmount('');
      await onWithdraw(tokenAddress, selectedGotchis, amount);
    } catch (error) {
      console.error('Error during withdrawal:', error);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('An unknown error occurred during withdrawal. Please try again.');
      }
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className={cn('p-4 glassmorphism')}>
      <h2 className={cn('text-xl md:text-2xl font-heading mb-4 text-glass text-center')}>Withdraw</h2>
      {errorMessage && (
        <div className="bg-red-500/50 text-white p-4 rounded mb-4 backdrop-blur-sm">
          <p className="font-bold mb-2">Error:</p>
          <p>{errorMessage}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          <div>
            <label className="block text-glass mb-2">Select Aavegotchi:</label>
            <select
              value={selectedGotchis.length === ownedAavegotchis.length ? 'all' : selectedGotchis[0]}
              onChange={handleGotchiSelection}
              className={cn('w-full bg-white/20 dark:bg-black/20 text-glass rounded p-2')}
            >
              <option value="all">All Owned Aavegotchi</option>
              {ownedAavegotchis.map((gotchi) => (
                <option key={gotchi.tokenId} value={gotchi.tokenId}>
                  {gotchi.name || `Aavegotchi #${gotchi.tokenId}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-glass mb-2">Token:</label>
            <select
              value={tokenOption}
              onChange={handleTokenSelection}
              className={cn('w-full bg-white/20 dark:bg-black/20 text-glass rounded p-2')}
            >
              <option value="ghst">GHST</option>
              <option value="custom">Custom Token</option>
            </select>
          </div>
          {tokenOption === 'custom' && (
            <div>
              <label className="block text-glass mb-2">Custom Token Address:</label>
              <input
                type="text"
                value={customTokenAddress}
                onChange={handleCustomTokenChange}
                placeholder="Enter token address"
                className={cn('w-full bg-white/20 dark:bg-black/20 text-glass rounded p-2')}
              />
            </div>
          )}
          <div>
            <label className="block text-glass mb-2">Amount:</label>
            <div className="flex items-center">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className={cn('flex-grow bg-white/20 dark:bg-black/20 text-glass rounded p-2')}
              />
              <motion.button
                type="button"
                onClick={handleMaxAmount}
                className={cn('ml-2 px-3 py-2 bg-white/20 dark:bg-black/20 text-glass rounded')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Max
              </motion.button>
            </div>
          </div>
        </div>
        <motion.button
          type="submit"
          disabled={isWithdrawing}
          className={cn('w-full bg-white/20 dark:bg-black/20 text-glass rounded p-2 mt-4')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
        </motion.button>
      </form>
    </div>
  );
};

export default WithdrawalForm;
