// get account swapList from solana account
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import useSocketStore from '@/zustand/socketStore';
import { BN } from '@coral-xyz/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import { useTokenPriceMap } from '../Hooks/useTokenPriceMap';
import { formatUsd, formatParseUsdToBN } from '@/utils/legacy/format';
import { useCallback, useMemo } from 'react';
import { BN_ZERO } from '@/config/constants';
import { useTokenBalances } from './useTokenBalances';

interface SwapItem {
  tokenAddress: string;
  lpAmount?: string;
  maxPrice: BN;
  minPrice: BN;
  percentChange24h: string;
  tokenName: string;
  amount: string;
  value: string;
  decimals: number;
  defaultMaxTradeMoney: string;
  limitAmount?: BN;
  payAmount?: BN;
  paySizeInUsd?: BN;
  price?: BN;
  unitPrice?: string;
}

export const usePayerSwapList = () => {
  const { tokenPriceMap } = useTokenPriceMap();
  const { swapList } = useSocketStore();
  const wallet = useWallet();
  const { publicKey } = wallet;
  const tokenAddressKey = useMemo(
    () =>
      publicKey
        ? Array.from(
            new Set(swapList.map((item: SwapItem) => item.tokenAddress))
          )
            .sort()
            .join('|')
        : '',
    [publicKey, swapList]
  );
  const tokenAddresses = useMemo(
    () => (tokenAddressKey ? tokenAddressKey.split('|') : []),
    [tokenAddressKey]
  );
  const tokenBalances = useTokenBalances(tokenAddresses, tokenAddresses);

  const sortPayerSwapList = useCallback((list: SwapItem[]): SwapItem[] => {
    return [...list].sort((a, b) => {
      const aAmount = new BN(a.value);
      const bAmount = new BN(b.value);

      if (aAmount.isZero() && bAmount.isZero()) {
        if (a.tokenName.toUpperCase() === 'SOL') return -1;
        if (b.tokenName.toUpperCase() === 'SOL') return 1;
        return a.tokenName.localeCompare(b.tokenName, 'en', {
          sensitivity: 'base',
        });
      }

      const cmpAmount = bAmount.cmp(aAmount);
      if (cmpAmount !== 0) return cmpAmount;

      return a.tokenName.localeCompare(b.tokenName, 'en', {
        sensitivity: 'base',
      });
    });
  }, []);

  const payerSwapList = useMemo(() => {
    const combinedList: SwapItem[] = swapList
      .map((item: SwapItem) => {
        const tokenMeta =
          GMX_SOLANA_TOKENS_RAW[
            item.tokenAddress as keyof typeof GMX_SOLANA_TOKENS_RAW
          ];
        if (!tokenMeta) {
          return undefined;
        }

        const priceData = tokenPriceMap[item.tokenAddress];
        const avgPrice = new BN(priceData?.unitPrice || '0');
        const amountBN = publicKey
          ? tokenBalances[item.tokenAddress] || BN_ZERO
          : BN_ZERO;
        const value = amountBN.mul(avgPrice).toString();
        return {
          ...item,
          tokenName: tokenMeta.symbol,
          decimals: tokenMeta.decimals,
          amount: amountBN.toString(),
          value,
          price: avgPrice,
          unitPrice: formatUsd(
            formatParseUsdToBN('1', tokenMeta.decimals).mul(avgPrice),
            {
              displayPlus: false,
              signed: false,
              showDollarSign: false,
              showUseCommas: false,
            }
          ),
          payAmount: BN_ZERO,
          paySizeInUsd: BN_ZERO,
          limitAmount: BN_ZERO,
        };
      })
      .filter((item): item is SwapItem => Boolean(item))
      .sort((a, b) => {
        const aValue = new BN(a.value);
        const bValue = new BN(b.value);
        if (aValue.eq(bValue)) return 0;
        return bValue.cmp(aValue);
      });
    return sortPayerSwapList(combinedList);
  }, [publicKey, sortPayerSwapList, swapList, tokenBalances, tokenPriceMap]);

  return payerSwapList;
};
