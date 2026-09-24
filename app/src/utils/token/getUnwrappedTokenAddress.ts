import {
  BTC_TOKEN_ADDRESS,
  ETH_TOKEN_ADDRESS,
  SOL_TOKEN_ADDRESS,
  WBTC_TOKEN_ADDRESS,
  WETH_TOKEN_ADDRESS,
  WSOL_TOKEN_ADDRESS,
} from '@/config/tokens';

import { isSameTokenAddress } from './isSameTokenAddress';

export const getUnwrappedTokenAddress = (tokenAddress: string): string => {
  if (isSameTokenAddress(tokenAddress, WSOL_TOKEN_ADDRESS)) {
    return SOL_TOKEN_ADDRESS.toBase58();
  }

  if (isSameTokenAddress(tokenAddress, WBTC_TOKEN_ADDRESS)) {
    return BTC_TOKEN_ADDRESS.toBase58();
  }

  if (isSameTokenAddress(tokenAddress, WETH_TOKEN_ADDRESS)) {
    return ETH_TOKEN_ADDRESS.toBase58();
  }

  return tokenAddress;
};
