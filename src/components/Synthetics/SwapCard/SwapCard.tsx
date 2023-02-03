import { Trans, t } from "@lingui/macro";
import { InfoRow } from "components/InfoRow/InfoRow";
import {
  getAvailableUsdLiquidityForCollateral,
  getMarket,
  getMarketName,
  useMarketsData,
  useMarketsPoolsData,
} from "domain/synthetics/markets";
import { useOpenInterestData } from "domain/synthetics/markets/useOpenInterestData";
import { TokensData, convertToTokenAmount, getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatAmount, formatTokenAmountWithUsd, formatUsd } from "lib/numbers";
import Tooltip from "components/Tooltip/Tooltip";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { convertTokenAddress } from "config/tokens";
import { TokensRatio } from "domain/synthetics/exchange";
import { USD_DECIMALS } from "lib/legacy";
import { useMemo } from "react";

import "./SwapCard.scss";

export type Props = {
  marketAddress?: string;
  fromTokenAddress?: string;
  toTokenAddress?: string;
  markRatio?: TokensRatio;
};

export function SwapCard(p: Props) {
  const { chainId } = useChainId();

  const { marketsData } = useMarketsData(chainId);
  const { openInterestData } = useOpenInterestData(chainId);
  const { poolsData } = useMarketsPoolsData(chainId);
  const { tokensData } = useAvailableTokensData(chainId);

  const market = getMarket(marketsData, p.marketAddress);
  const marketName = getMarketName(marketsData, tokensData, market?.marketTokenAddress, true, false);

  const fromToken = getTokenData(tokensData, p.fromTokenAddress);
  const toToken = getTokenData(tokensData, p.toTokenAddress);

  const maxLiquidityUsd = getAvailableUsdLiquidityForCollateral(
    marketsData,
    poolsData,
    openInterestData,
    tokensData,
    p.marketAddress,
    p.toTokenAddress ? convertTokenAddress(chainId, p.toTokenAddress, "wrapped") : undefined
  );

  const maxLiquidityAmount = convertToTokenAmount(maxLiquidityUsd, toToken?.decimals, toToken?.prices?.maxPrice);

  const ratioStr = useMemo(() => {
    if (!p.markRatio) return "...";

    const smallest = getTokenData(tokensData, p.markRatio.smallestAddress);
    const largest = getTokenData(tokensData, p.markRatio.largestAddress);

    return `${formatAmount(p.markRatio.ratio, USD_DECIMALS, 4)} ${smallest?.symbol} / ${largest?.symbol}`;
  }, [p.markRatio, tokensData]);

  return (
    <div className="App-card">
      <div className="App-card-title">
        <Trans>Swap</Trans>
      </div>
      <div className="App-card-divider" />

      <div className="App-card-content">
        <InfoRow className="info-row" label={t`Market`} value={marketName || "..."} />

        <InfoRow
          className="info-row"
          label={t`${fromToken?.symbol} Price`}
          value={formatUsd(fromToken?.prices?.minPrice) || "..."}
        />

        <InfoRow
          className="info-row"
          label={t`${toToken?.symbol} Price`}
          value={formatUsd(toToken?.prices?.maxPrice) || "..."}
        />

        <InfoRow
          className="info-row"
          label={t`Available liquidity`}
          value={
            <Tooltip
              handle={formatUsd(maxLiquidityUsd) || "..."}
              position="right-bottom"
              renderContent={() => (
                <div>
                  <StatsTooltipRow
                    label={t`Max ${toToken?.symbol} out`}
                    value={
                      formatTokenAmountWithUsd(
                        maxLiquidityAmount,
                        maxLiquidityUsd,
                        toToken?.symbol,
                        toToken?.decimals
                      ) || "..."
                    }
                    showDollar={false}
                  />
                </div>
              )}
            />
          }
        />

        <InfoRow className="info-row" label={t`Price`} value={ratioStr} />
      </div>
    </div>
  );
}
