// get account swapList from solana account
import { useAppStore } from '@/zustand/useAppStore';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import useSocketStore from '@/zustand/socketStore';
import { BN } from '@coral-xyz/anchor';
import { useShallow } from 'zustand/react/shallow';
import { formatLeverage } from '../utils/formatLeverage';
import { useWallet } from '@solana/wallet-adapter-react';
import { formatUsd, formatParseUsdToBN } from '@/utils/legacy/format';
import { useEffect, useCallback, useMemo, useRef } from 'react';
import { BN_ZERO } from '@/config/constants';
import { useTokenBalances } from '@/hooks/fetchHooks/useTokenBalances';
import { TokenBalances } from '@/selectors/token/types';
import { PublicKey } from '@solana/web3.js';

function isTokenBalancesLoading(
  publicKey: PublicKey | null,
  tokenAddresses: string[],
  tokenBalances: TokenBalances
): boolean {
  return (
    !!publicKey &&
    tokenAddresses.length > 0 &&
    Object.keys(tokenBalances).length === 0
  );
}

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
  const payerSwapListSignatureRef = useRef('');
  const currentSolBalanceRef = useRef<string | null>(null);
  const { leverage } = useAppStore((state) => state.TradeboxNew);
  const { setPayerSwapList, setCurrentSolBalance, setTokenBalancesLoaded } =
    useAppStore((state) => state.payerSwapTokens);
  const { collateralToken } = useAppStore(
    useShallow((state) => state.collateralTokens)
  );
  const { tokenPriceMap } = useAppStore(
    useShallow((state) => ({
      tokenPriceMap: state.tickersState.tokenPriceMap,
    }))
  );
  const lastTokenPriceMapRef = useRef(new Map<string, any>());
  const getStableTokenPrice = useCallback(
    (tokenAddress?: string) => {
      if (!tokenAddress) return undefined;
      const tokenPrice = tokenPriceMap.get(tokenAddress);
      if (tokenPrice) {
        lastTokenPriceMapRef.current.set(tokenAddress, tokenPrice);
        return tokenPrice;
      }
      return lastTokenPriceMapRef.current.get(tokenAddress);
    },
    [tokenPriceMap]
  );
  // const {
  //     indexToken,
  // } = useAppStore((state) => state.indexTokens);
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
  const payerTokenAddresses = useMemo(
    () =>
      Array.from(
        new Set([...tokenAddresses, collateralToken].filter(Boolean))
      ),
    [collateralToken, tokenAddresses]
  );
  const tokenBalances = useTokenBalances(
    payerTokenAddresses,
    payerTokenAddresses
  );

  const sortPayerSwapList = useCallback((list: SwapItem[]): SwapItem[] => {
    return [...list].sort((a, b) => {
      const aAmount = new BN(a.value);
      const bAmount = new BN(b.value);

      if (aAmount.isZero() && bAmount.isZero()) {
        if (a.tokenName.toUpperCase() === 'USDC') return -1;
        if (b.tokenName.toUpperCase() === 'USDC') return 1;
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
    const buildSwapItem = (item: SwapItem): SwapItem | undefined => {
      const tokenMeta =
        GMX_SOLANA_TOKENS_RAW[
          item.tokenAddress as keyof typeof GMX_SOLANA_TOKENS_RAW
        ];

      if (!tokenMeta) {
        return undefined;
      }

      const avgPrice = new BN(
        getStableTokenPrice(item.tokenAddress)?.unitPrice || '0'
      );
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
        defaultMaxTradeMoney: amountBN
          .mul(avgPrice)
          .mul(formatLeverage(leverage))
          .div(new BN(10))
          .toString(),
        payAmount: BN_ZERO,
        paySizeInUsd: BN_ZERO,
        limitAmount: BN_ZERO,
      };
    };
    const combinedList: SwapItem[] = swapList
      .map((item: SwapItem) => buildSwapItem(item))
      .filter((item): item is SwapItem => Boolean(item))
      .sort((a, b) => {
        const aValue = new BN(a.value);
        const bValue = new BN(b.value);
        if (aValue.eq(bValue)) return 0;
        return bValue.cmp(aValue);
      });
    if (
      collateralToken &&
      !combinedList.some((item) => item.tokenAddress === collateralToken)
    ) {
      const collateralItem = buildSwapItem({
        tokenAddress: collateralToken,
      } as SwapItem);
      if (collateralItem) {
        combinedList.push(collateralItem);
      }
    }
    return sortPayerSwapList(combinedList);
  }, [
    collateralToken,
    leverage,
    publicKey,
    sortPayerSwapList,
    getStableTokenPrice,
    swapList,
    tokenBalances,
  ]);

  useEffect(() => {
    if (!publicKey) {
      setTokenBalancesLoaded(false);
      currentSolBalanceRef.current = null;
      setCurrentSolBalance(null);
      const payerSwapListSignature = payerSwapList
        .map(
          (item: SwapItem) =>
            `${item.tokenAddress}:${item.amount}:${item.value}:${item.defaultMaxTradeMoney}`
        )
        .join('|');
      if (payerSwapListSignatureRef.current !== payerSwapListSignature) {
        payerSwapListSignatureRef.current = payerSwapListSignature;
        setPayerSwapList(payerSwapList);
      }
      return;
    }

    if (
      isTokenBalancesLoading(publicKey, payerTokenAddresses, tokenBalances)
    ) {
      setTokenBalancesLoaded(false);
      return;
    }

    const currentSolBalance =
      payerSwapList.find(
        (item: SwapItem) =>
          item.tokenAddress === 'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH'
      )?.amount || null;
    const payerSwapListSignature = payerSwapList
      .map(
        (item: SwapItem) =>
          `${item.tokenAddress}:${item.amount}:${item.value}:${item.defaultMaxTradeMoney}`
      )
      .join('|');

    if (currentSolBalanceRef.current !== currentSolBalance) {
      currentSolBalanceRef.current = currentSolBalance;
      setCurrentSolBalance(currentSolBalance);
    }
    if (payerSwapListSignatureRef.current !== payerSwapListSignature) {
      payerSwapListSignatureRef.current = payerSwapListSignature;
      setPayerSwapList(payerSwapList);
    }
    if (publicKey) {
      setTokenBalancesLoaded(true);
    }
  }, [
    payerSwapList,
    publicKey,
    setCurrentSolBalance,
    setPayerSwapList,
    setTokenBalancesLoaded,
    payerTokenAddresses,
    tokenBalances,
  ]);
};
