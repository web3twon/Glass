import * as ethers from 'ethers';

export interface Aavegotchi {
  tokenId: string;
  name: string;
  escrowWallet: string;
  ghstBalance: string;
  customTokenBalance?: string;
  isLent: boolean;
}

export interface WithdrawalFormProps {
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
