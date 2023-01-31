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
import { convertToTokenAmount, getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatTokenAmountWithUsd, formatUsd } from "lib/numbers";
import Tooltip from "components/Tooltip/Tooltip";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

import "./SwapCard.scss";
import { convertTokenAddress } from "config/tokens";

export type Props = {
  swapPath: string[];
  mostAbundantMarketAddress: string;
  fromTokenAddress: string;
  toTokenAddress: string;
};

export function SwapCard(p: Props) {
  const { chainId } = useChainId();

  const { marketsData } = useMarketsData(chainId);
  const { openInterestData } = useOpenInterestData(chainId);
  const { poolsData } = useMarketsPoolsData(chainId);
  const { tokensData } = useAvailableTokensData(chainId);

  const marketAddress = p.swapPath[p.swapPath.length - 1] || p.mostAbundantMarketAddress;
  const market = getMarket(marketsData, marketAddress);
  const marketName = getMarketName(marketsData, tokensData, market?.marketTokenAddress, true, false);

  const fromToken = getTokenData(tokensData, p.fromTokenAddress);
  const toToken = getTokenData(tokensData, p.toTokenAddress);

  const maxLiquidityUsd = getAvailableUsdLiquidityForCollateral(
    marketsData,
    poolsData,
    openInterestData,
    tokensData,
    p.mostAbundantMarketAddress,
    p.toTokenAddress ? convertTokenAddress(chainId, p.toTokenAddress, "wrapped") : undefined
  );

  const maxLiquidityAmount = convertToTokenAmount(maxLiquidityUsd, toToken?.decimals, toToken?.prices?.maxPrice);

  return (
    <div className="App-card">
      <div className="App-card-title">
        <Trans>Swap</Trans>
      </div>
      <div className="App-card-divider" />

      <div className="App-card-content">
        {fromToken && (
          <InfoRow
            className="info-row"
            label={t`${fromToken?.symbol} Price`}
            value={formatUsd(fromToken?.prices?.minPrice) || "..."}
          />
        )}

        {toToken && (
          <InfoRow
            className="info-row"
            label={t`${toToken?.symbol} Price`}
            value={formatUsd(toToken?.prices?.maxPrice) || "..."}
          />
        )}

        <InfoRow className="info-row" label={t`Market`} value={marketName || "..."} />

        <InfoRow
          className="info-row"
          label={t`Available liquidity`}
          value={
            <Tooltip
              handle={formatUsd(maxLiquidityUsd)}
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
      </div>
    </div>
  );
}
