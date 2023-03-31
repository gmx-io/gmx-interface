import { Trans, t } from "@lingui/macro";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { convertTokenAddress } from "config/tokens";
import {
  getAvailableUsdLiquidityForCollateral,
  getMarket,
  getMarketName,
  useMarketsData,
  useMarketsPoolsData,
} from "domain/synthetics/markets";
import { useOpenInterestData } from "domain/synthetics/markets/useOpenInterestData";
import { TokensRatio, convertToTokenAmount, getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { USD_DECIMALS } from "lib/legacy";
import { formatAmount, formatTokenAmount, formatUsd } from "lib/numbers";
import { useMemo } from "react";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";

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
    <div className="Exchange-swap-market-box App-box App-box-border">
      <div className="App-card-title">
        <Trans>Swap</Trans>
      </div>
      <div className="App-card-divider" />

      <div>
        <ExchangeInfoRow label={t`Market`} value={marketName || "..."} />

        <ExchangeInfoRow
          label={t`${fromToken?.symbol} Price`}
          value={formatUsd(fromToken?.prices?.minPrice) || "..."}
        />

        <ExchangeInfoRow label={t`${toToken?.symbol} Price`} value={formatUsd(toToken?.prices?.maxPrice) || "..."} />

        <ExchangeInfoRow
          label={t`Available liquidity`}
          value={
            <Tooltip
              handle={formatUsd(maxLiquidityUsd) || "..."}
              position="right-bottom"
              renderContent={() => (
                <div>
                  <StatsTooltipRow
                    className="al-swap"
                    label={t`Max ${toToken?.symbol} out`}
                    value={[
                      formatTokenAmount(maxLiquidityAmount, toToken?.decimals, toToken?.symbol),
                      formatUsd(maxLiquidityUsd),
                    ]}
                    showDollar={false}
                  />
                </div>
              )}
            />
          }
        />

        <ExchangeInfoRow label={t`Price`} value={ratioStr} />
      </div>
    </div>
  );
}
