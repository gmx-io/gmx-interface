import { useInitializeTokenAccounts } from '@/hooks/initializeHooks';
import { selectMarketsInfo } from '@/selectors/market/selectMarketsInfo';
import { MarketInfo } from '@/selectors/market/types';
import { selectMarketTokensData } from '@/selectors/token/selectMarketTokensData';
import { selectTokensData } from '@/selectors/token/selectTokensData';
import { useAppStore } from '@/zustand/useAppStore';
import { Address, translateAddress } from '@coral-xyz/anchor';
import { ConfirmOptions } from '@solana/web3.js';
import { useCallback, useMemo } from 'react';

export function useNeedToInitializeTokenAccounts(
  filter?: Address[],
  opts?: ConfirmOptions
) {
  const translatedFilter = useMemo(
    () => new Set(filter?.map((address) => address.toString())),
    [filter]
  );

  const tokens = useAppStore(selectTokensData);
  const { needToInitializeTokenAddresses, needToInitializeTokens } =
    useMemo(() => {
      const needToInitializeTokenAddresses = Object.keys(tokens).filter(
        (address) => {
          if (!translatedFilter) return true;
          return (
            translatedFilter.has(address) && tokens[address].balance === null
          );
        }
      );
      const needToInitializeTokens = needToInitializeTokenAddresses.map(
        (address) => tokens[address]
      );
      return { needToInitializeTokenAddresses, needToInitializeTokens };
    }, [tokens, translatedFilter]);

  const marketTokens = useAppStore(selectMarketTokensData);
  const marketInfos = useAppStore(selectMarketsInfo);
  const { needToInitializeMarketTokenAddresses, needToInitializeMarketTokens } =
    useMemo(() => {
      const needToInitializeMarketTokenAddresses = Object.keys(
        marketTokens
      ).filter((address) => {
        if (!translatedFilter) return true;
        return (
          translatedFilter.has(address) &&
          marketTokens[address].balance === null
        );
      });
      const needToInitializeMarketTokens = needToInitializeMarketTokenAddresses
        .map((address) => {
          const marketInfo = marketInfos[address];
          if (!marketInfo || !marketInfo.indexToken) {
            console.warn(
              `Market info for address ${address} is missing indexToken.`
            );
            return null;
          }
          return marketInfo;
        })
        .filter((marketInfo): marketInfo is MarketInfo => marketInfo !== null);

      return {
        needToInitializeMarketTokenAddresses,
        needToInitializeMarketTokens,
      };
    }, [marketInfos, marketTokens, translatedFilter]);

  const { trigger, isSending } = useInitializeTokenAccounts(opts);
  const initialize = useCallback(async () => {
    return await trigger(
      needToInitializeTokenAddresses
        .concat(needToInitializeMarketTokenAddresses)
        .map((address) => translateAddress(address))
    );
  }, [
    needToInitializeMarketTokenAddresses,
    needToInitializeTokenAddresses,
    trigger,
  ]);

  const needToInitialize =
    needToInitializeTokens.length + needToInitializeMarketTokens.length > 0;

  return {
    needToInitialize,
    needToInitializeTokens,
    needToInitializeMarketTokens,
    isSending,
    initialize,
  };
}
