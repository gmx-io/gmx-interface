import { getGmw385Enabled } from '@/config/featureFlagEnable';
import { useRef } from 'react';

export function useStableOrderTicker<TTicker>(
  indexTokenAddress: string | undefined,
  tokenPriceMap: Map<string, TTicker>
) {
  const ticker = indexTokenAddress
    ? tokenPriceMap.get(indexTokenAddress)
    : undefined;
  const lastTickerRef = useRef<{
    indexTokenAddress: string;
    ticker: TTicker;
  } | null>(null);

  if (getGmw385Enabled() && indexTokenAddress && ticker) {
    lastTickerRef.current = { indexTokenAddress, ticker };
  }

  return (
    ticker ??
    (getGmw385Enabled() &&
    lastTickerRef.current?.indexTokenAddress === indexTokenAddress
      ? lastTickerRef.current.ticker
      : undefined)
  );
}
