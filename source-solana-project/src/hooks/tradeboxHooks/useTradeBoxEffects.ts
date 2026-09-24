import { selectAvailableIndexTokenAddresses } from '@/selectors/token/selectAvailableIndexTokenAddresses';
import { selectAvailableSwapTokenAddresses } from '@/selectors/token/selectAvailableSwapTokenAddresses';
import { selectAvailableTokenOptions } from '@/selectors/token/selectAvailableTokenOptions';
import {
  selectResetTradeOptions,
  selectSetTradeboxChainId,
  selectSetTradeboxFromTokenAddress,
  selectSetTradeboxToTokenAddress,
  selectSetTradeboxTradeMode,
  selectTradeboxTradeMode,
} from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxTradeOptions } from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxAvailableTradeModes } from '@/selectors/tradebox/selectTradeboxAvailableTradeModes';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import { selectTradeboxTradeOptionsAddresses } from '@/selectors/tradebox/selectTradeboxTradeOptionsAddresses';
import { useAppStore } from '@/zustand/useAppStore';
import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';

export const useTradeboxEffects = () => {
  // Update Chain Id.
  const { chainId, tradeboxChainId } = useAppStore(
    useShallow((state) => ({
      chainId: state.network.chainId,
      tradeboxChainId: state.tradebox.options.chainId,
    }))
  );
  const availableTokensOptions = useAppStore(selectAvailableTokenOptions);
  const availableIndexTokenAddresses = useAppStore(
    selectAvailableIndexTokenAddresses
  );
  const storedOptions = useAppStore(selectTradeboxTradeOptions);
  const setTradeboxChainId = useAppStore(selectSetTradeboxChainId);
  const resetTradeOptions = useAppStore(selectResetTradeOptions);

  const [indexAddressesLength, firstMarket, hasStoredIndex] = useMemo(() => {
    return [
      availableIndexTokenAddresses.length,
      availableTokensOptions.sortedAllMarkets?.at(0),
      storedOptions?.tokens.indexTokenAddress &&
        availableIndexTokenAddresses.includes(
          storedOptions.tokens.indexTokenAddress
        ),
    ];
  }, [
    availableIndexTokenAddresses,
    availableTokensOptions.sortedAllMarkets,
    storedOptions.tokens.indexTokenAddress,
  ]);

  useEffect(() => {
    if (chainId === tradeboxChainId || indexAddressesLength === 0) {
      return;
    }

    if (hasStoredIndex) {
      setTradeboxChainId(chainId);
      return;
    }

    if (!firstMarket) return;

    resetTradeOptions(firstMarket);
    setTradeboxChainId(chainId);
  }, [
    chainId,
    tradeboxChainId,
    indexAddressesLength,
    hasStoredIndex,
    firstMarket,
    resetTradeOptions,
    setTradeboxChainId,
  ]);

  // Update Trade Mode.
  const availalbleTradeModes = useAppStore(selectTradeboxAvailableTradeModes);
  const tradeMode = useAppStore(selectTradeboxTradeMode);
  const setTradeMode = useAppStore(selectSetTradeboxTradeMode);

  const [firstTradeMode, shouldUpdateTradeMode] = useMemo(() => {
    return [availalbleTradeModes[0], !availalbleTradeModes.includes(tradeMode)];
  }, [availalbleTradeModes, tradeMode]);

  useEffect(() => {
    if (shouldUpdateTradeMode) {
      setTradeMode(firstTradeMode);
    }
  }, [shouldUpdateTradeMode, firstTradeMode, setTradeMode]);

  // Update Swap Tokens.
  const swapTokens = useAppStore(selectAvailableSwapTokenAddresses);
  const { fromTokenAddress, toTokenAddress } = useAppStore(
    selectTradeboxTradeOptionsAddresses
  );
  const setFromTokenAddress = useAppStore(selectSetTradeboxFromTokenAddress);
  const setToTokenAddress = useAppStore(selectSetTradeboxToTokenAddress);
  const { isSwap } = useAppStore(selectTradeboxTradeFlags);

  const [swapTokensLength, firstSwapToken, needFromUpdate, needToUpdate] =
    useMemo(() => {
      return [
        swapTokens.length,
        swapTokens[0],
        !swapTokens.find((t) => isSameTokenAddress(t, fromTokenAddress)),
        !swapTokens.find((t) => isSameTokenAddress(t, toTokenAddress)),
      ];
    }, [swapTokens, fromTokenAddress, toTokenAddress]);

  useEffect(() => {
    if (!isSwap || !swapTokensLength) {
      return;
    }

    if (needFromUpdate) {
      setFromTokenAddress(firstSwapToken);
    }

    if (needToUpdate) {
      setToTokenAddress(firstSwapToken);
    }
  }, [
    isSwap,
    swapTokensLength,
    needFromUpdate,
    needToUpdate,
    firstSwapToken,
    setFromTokenAddress,
    setToTokenAddress,
  ]);
};
