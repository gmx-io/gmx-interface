import { useMemo } from "react";

import type { ContractsChainId } from "config/chains";
import { isDevelopment } from "config/env";
import { getPaxosTransitConfig } from "config/paxosTransit";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import type { MarketsInfoResult } from "domain/synthetics/markets";
import type { TokenData } from "domain/synthetics/tokens";
import { parseValue, USD_DECIMALS } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";
import { convertToTokenAmount, getMidPrice } from "sdk/utils/tokens";

// dev-only: the real pool takes ~1.45M USDC, so testers cap its free capacity to reach the instant limits on previews
export function useMarketsInfoWithDebugInstantLimit(chainId: ContractsChainId, marketsInfo: MarketsInfoResult) {
  const { debugSwapMarketsConfig } = useSettings();
  const limitInput = isDevelopment() ? debugSwapMarketsConfig?.usdcUsdgInstantLimitUsd : undefined;
  const swapMarketAddress = getPaxosTransitConfig(chainId)?.swapMarketAddress;

  return useMemo(() => {
    const limitUsd = limitInput ? parseValue(limitInput, USD_DECIMALS) : undefined;
    const marketInfo = swapMarketAddress ? marketsInfo.marketsInfoData?.[swapMarketAddress] : undefined;

    if (limitUsd === undefined || !swapMarketAddress || !marketInfo) {
      return marketsInfo;
    }

    const getCappedMaxPoolAmount = (token: TokenData, poolAmount: bigint, maxPoolAmount: bigint) =>
      bigMath.min(
        maxPoolAmount,
        poolAmount + convertToTokenAmount(limitUsd, token.decimals, getMidPrice(token.prices))!
      );

    return {
      ...marketsInfo,
      marketsInfoData: {
        ...marketsInfo.marketsInfoData,
        [swapMarketAddress]: {
          ...marketInfo,
          maxLongPoolAmount: getCappedMaxPoolAmount(
            marketInfo.longToken,
            marketInfo.longPoolAmount,
            marketInfo.maxLongPoolAmount
          ),
          maxShortPoolAmount: getCappedMaxPoolAmount(
            marketInfo.shortToken,
            marketInfo.shortPoolAmount,
            marketInfo.maxShortPoolAmount
          ),
        },
      },
    };
  }, [limitInput, marketsInfo, swapMarketAddress]);
}
