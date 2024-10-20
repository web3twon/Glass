import * as ethers from 'ethers';

declare module 'ethers' {
  export * from '@ethersproject/providers';
  export * from '@ethersproject/contracts';
  export * from '@ethersproject/wallet';
  export * from '@ethersproject/utils';
}
