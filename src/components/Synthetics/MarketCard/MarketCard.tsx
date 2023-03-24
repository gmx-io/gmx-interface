import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { SLIPPAGE_BPS_KEY } from "config/localStorage";
import {
  getAvailableUsdLiquidityForPosition,
  getMarket,
  getMarketName,
  getMaxReservedUsd,
  getReservedUsd,
  useMarketsData,
  useMarketsPoolsData,
} from "domain/synthetics/markets";
import { useOpenInterestData } from "domain/synthetics/markets/useOpenInterestData";
import { getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { DEFAULT_SLIPPAGE_AMOUNT } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmount, formatUsd } from "lib/numbers";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import "./MarketCard.scss";
import { useMarketsFeesConfigs } from "domain/synthetics/fees/useMarketsFeesConfigs";
import { getBorrowingFeeFactor, getFundingFeeFactor } from "domain/synthetics/fees";

export type Props = {
  marketAddress?: string;
  isLong: boolean;
};

export function MarketCard(p: Props) {
  const { chainId } = useChainId();

  const [savedSlippageAmount] = useLocalStorageSerializeKey([chainId, SLIPPAGE_BPS_KEY], DEFAULT_SLIPPAGE_AMOUNT);

  const { marketsData } = useMarketsData(chainId);
  const { openInterestData } = useOpenInterestData(chainId);
  const { poolsData } = useMarketsPoolsData(chainId);
  const { tokensData } = useAvailableTokensData(chainId);
  const { marketsFeesConfigs } = useMarketsFeesConfigs(chainId);

  const market = getMarket(marketsData, p.marketAddress);
  const marketName = getMarketName(marketsData, tokensData, market?.marketTokenAddress, true, false);

  const indexToken = getTokenData(tokensData, market?.indexTokenAddress, "native");

  const entryPrice = p.isLong ? indexToken?.prices?.maxPrice : indexToken?.prices?.minPrice;
  const exitPrice = p.isLong ? indexToken?.prices?.minPrice : indexToken?.prices?.maxPrice;

  const longShortText = p.isLong ? t`Long` : t`Short`;

  const liquidity = getAvailableUsdLiquidityForPosition(
    marketsData,
    poolsData,
    openInterestData,
    tokensData,
    p.marketAddress,
    p.isLong
  );

  const maxReservedUsd = getMaxReservedUsd(marketsData, poolsData, tokensData, p.marketAddress, p.isLong);
  const reservedUsd = getReservedUsd(marketsData, openInterestData, tokensData, p.marketAddress, p.isLong);

  const borrowingRate = getBorrowingFeeFactor(marketsFeesConfigs, p.marketAddress, p.isLong, 60 * 60)?.mul(100);
  const fundigRate = getFundingFeeFactor(marketsFeesConfigs, p.marketAddress, p.isLong, 60 * 60)?.mul(100);

  return (
    <div className="Exchange-swap-market-box App-box App-box-border">
      <div className="App-card-title">
        {longShortText}&nbsp;{indexToken?.symbol}
      </div>
      <div className="App-card-divider" />
      <div>
        <ExchangeInfoRow label={t`Market`} value={marketName || "..."} />
        <ExchangeInfoRow
          label={t`Entry Price`}
          value={
            <Tooltip
              handle={formatUsd(entryPrice) || "..."}
              position="right-bottom"
              renderContent={() => (
                <Trans>
                  The position will be opened at {formatUsd(entryPrice)} with a max slippage of{" "}
                  {(savedSlippageAmount! / 100.0).toFixed(2)}%.
                  <br />
                  <br />
                  The slippage amount can be configured under Settings, found by clicking on your address at the top
                  right of the page after connecting your wallet.
                  <br />
                  <br />
                  <ExternalLink href="https://gmxio.gitbook.io/gmx/trading#opening-a-position">More Info</ExternalLink>
                </Trans>
              )}
            />
          }
        />

        <ExchangeInfoRow
          label={t`Exit Price`}
          value={
            <Tooltip
              handle={formatUsd(exitPrice) || "..."}
              position="right-bottom"
              renderContent={() => (
                <Trans>
                  If you have an existing position, the position will be closed at {formatUsd(entryPrice)}.
                  <br />
                  <br />
                  This exit price will change with the price of the asset.
                  <br />
                  <br />
                  <ExternalLink href="https://gmxio.gitbook.io/gmx/trading#opening-a-position">More Info</ExternalLink>
                </Trans>
              )}
            />
          }
        />

        <ExchangeInfoRow
          label={t`Borrow Fee`}
          value={
            borrowingRate ? `-${formatAmount(borrowingRate, 30, 4)}% / 1h` : "..."
            // <Tooltip
            //   handle={borrowingRate ? `${formatAmount(borrowingRate, 30, 4)}% / 1h` : "..."}
            //   position="right-bottom"
            //   renderContent={() => (
            //     <Trans>
            //       The borrow fee is calculated as:
            //       <br />
            //       <br />
            //       {p.isLong
            //         ? "a * (open interest in usd + pending pnl) ^ exp / (pool usd)"
            //         : "a * (open interest in usd) ^ exp / (pool usd)"}
            //       <br />
            //       <br />
            //       a - borrowing fee factor
            //       <br />
            //       exp - exponent factor
            //       {/* <ExternalLink href="https://gmxio.gitbook.io/gmx/trading#opening-a-position">More Info</ExternalLink> */}
            //     </Trans>
            //   )}
            // />
          }
        />

        <ExchangeInfoRow
          label={t`Funding Fee`}
          value={
            fundigRate ? `${fundigRate.gt(0) ? "+" : "-"}${formatAmount(fundigRate.abs(), 30, 4)}% / 1h` : "..."
            // <Tooltip
            //   handle={borrowingRate ? `${formatAmount(borrowingRate, 30, 4)}% / 1h` : "..."}
            //   position="right-bottom"
            //   renderContent={() => (
            //     <Trans>
            //       The borrow fee is calculated as:
            //       <br />
            //       <br />
            //       {p.isLong
            //         ? "a * (open interest in usd + pending pnl) ^ exp / (pool usd)"
            //         : "a * (open interest in usd) ^ exp / (pool usd)"}
            //       <br />
            //       <br />
            //       a - borrowing fee factor
            //       <br />
            //       exp - exponent factor
            //       {/* <ExternalLink href="https://gmxio.gitbook.io/gmx/trading#opening-a-position">More Info</ExternalLink> */}
            //     </Trans>
            //   )}
            // />
          }
        />

        <ExchangeInfoRow
          label={t`Available liquidity`}
          value={
            <Tooltip
              handle={formatUsd(liquidity) || "..."}
              position="right-bottom"
              renderContent={() => (
                <div>
                  <StatsTooltipRow
                    label={t`Max ${indexToken?.symbol} ${longShortText.toLocaleLowerCase()} capacity`}
                    value={formatUsd(maxReservedUsd) || "..."}
                    showDollar={false}
                  />

                  <StatsTooltipRow
                    label={t`Current ${indexToken?.symbol} ${longShortText.toLocaleLowerCase()}`}
                    value={formatUsd(reservedUsd) || "..."}
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
