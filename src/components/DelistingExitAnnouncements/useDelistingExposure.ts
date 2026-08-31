import { useMemo } from "react";

import { hasDelistingMarkets } from "config/static/markets";
import { useMarketsInfoRequest, useMarketTokensDataRequest } from "domain/synthetics/markets";
import { usePositions } from "domain/synthetics/positions";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";

import { DelistingExposure, getDelistingExposure } from "./delistingExitAnnouncementsLogic";

const EMPTY_EXPOSURE: DelistingExposure = {
  positionMarkets: [],
  positionNames: [],
  positionCount: 0,
  liquidityMarkets: [],
  liquidityNames: [],
};

export function useDelistingExposure(): DelistingExposure & {
  account: string | undefined;
} {
  const { account } = useWallet();
  const { chainId, srcChainId } = useChainId();
  const enabled = Boolean(account) && hasDelistingMarkets(chainId);

  const { tokensData } = useTokensDataRequest(chainId, srcChainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId, { tokensData });

  const positions = usePositions(chainId, {
    marketsData: marketsInfoData,
    tokensData,
    account,
    enabled,
  });

  const { marketTokensData } = useMarketTokensDataRequest(chainId, srcChainId, {
    isDeposit: true,
    account,
    withGlv: false,
    enabled,
  });

  const exposure = useMemo(
    () =>
      enabled
        ? getDelistingExposure({
            chainId,
            positionsInfoData: positions.positionsData,
            depositMarketTokensData: marketTokensData,
            marketsInfoData,
          })
        : EMPTY_EXPOSURE,
    [chainId, enabled, marketTokensData, marketsInfoData, positions.positionsData]
  );

  return { account, ...exposure };
}
