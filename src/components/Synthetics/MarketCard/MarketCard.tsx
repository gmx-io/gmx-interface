import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { SLIPPAGE_BPS_KEY } from "config/localStorage";
import {
  getAvailableUsdLiquidityForPosition,
  getMaxReservedUsd,
  getReservedUsd,
  useMarketsInfo,
} from "domain/synthetics/markets";
import { getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { DEFAULT_SLIPPAGE_AMOUNT } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmount, formatPercentage, formatUsd, getBasisPoints } from "lib/numbers";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { getBorrowingFeeFactor, getFundingFeeFactor } from "domain/synthetics/fees";
import { getByKey } from "lib/objects";
import { useMemo } from "react";
import "./MarketCard.scss";
import { ShareBar } from "components/ShareBar/ShareBar";

export type Props = {
  marketAddress?: string;
  isLong: boolean;
};

export function MarketCard(p: Props) {
  const { chainId } = useChainId();

  const [savedSlippageAmount] = useLocalStorageSerializeKey([chainId, SLIPPAGE_BPS_KEY], DEFAULT_SLIPPAGE_AMOUNT);

  const { marketsInfoData } = useMarketsInfo(chainId);
  const { tokensData } = useAvailableTokensData(chainId);

  const market = getByKey(marketsInfoData, p.marketAddress);
  const marketName = market?.name || "...";

  const indexToken = getTokenData(tokensData, market?.indexTokenAddress, "native");

  const entryPrice = p.isLong ? indexToken?.prices?.maxPrice : indexToken?.prices?.minPrice;
  const exitPrice = p.isLong ? indexToken?.prices?.minPrice : indexToken?.prices?.maxPrice;

  const longShortText = p.isLong ? t`Long` : t`Short`;

  const { liquidity, maxReservedUsd, reservedUsd, borrowingRate, fundingRate } = useMemo(() => {
    if (!market) return {};

    return {
      liquidity: getAvailableUsdLiquidityForPosition(market, p.isLong),
      maxReservedUsd: getMaxReservedUsd(market, p.isLong),
      reservedUsd: getReservedUsd(market, p.isLong),
      borrowingRate: getBorrowingFeeFactor(market, p.isLong, 60 * 60),
      fundingRate: getFundingFeeFactor(market, p.isLong, 60 * 60),
    };
  }, [market, p.isLong]);

  const totalInterestUsd = market?.longInterestUsd.add(market.shortInterestUsd);

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
            fundingRate ? `${fundingRate.gt(0) ? "+" : "-"}${formatAmount(fundingRate.abs(), 30, 4)}% / 1h` : "..."
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
              className="al-swap"
              handle={formatUsd(liquidity) || "..."}
              position="right-bottom"
              renderContent={() => (
                <div>
                  <StatsTooltipRow
                    label={t`Max ${indexToken?.symbol} ${longShortText.toLocaleLowerCase()} capacity`}
                    value={formatUsd(maxReservedUsd, { displayDecimals: 0 }) || "..."}
                    showDollar={false}
                  />

                  <StatsTooltipRow
                    label={t`Current ${indexToken?.symbol} ${longShortText.toLocaleLowerCase()}`}
                    value={formatUsd(reservedUsd, { displayDecimals: 0 }) || "..."}
                    showDollar={false}
                  />
                </div>
              )}
            />
          }
        />

        <ExchangeInfoRow
          label={t`Open Interest Balance`}
          value={
            <div className="MarketCard-pool-balance">
              <Tooltip
                position="right-bottom"
                handle={
                  totalInterestUsd?.gt(0) ? (
                    <ShareBar
                      className="MarketCard-pool-balance-bar"
                      share={market?.longInterestUsd}
                      total={totalInterestUsd}
                    />
                  ) : (
                    "..."
                  )
                }
                renderContent={() => (
                  <div>
                    {market && totalInterestUsd && (
                      <>
                        <StatsTooltipRow
                          label={t`Long Open Interest`}
                          value={
                            <span>
                              {formatUsd(market.longInterestUsd, { displayDecimals: 0 })} <br />
                              {totalInterestUsd.gt(0) &&
                                `(${formatPercentage(getBasisPoints(market.longInterestUsd, totalInterestUsd))})`}
                            </span>
                          }
                          showDollar={false}
                        />
                        <br />
                        <StatsTooltipRow
                          label={t`Short Open Interest`}
                          value={
                            <span>
                              {formatUsd(market.shortInterestUsd, { displayDecimals: 0 })} <br />
                              {totalInterestUsd.gt(0) &&
                                `(${formatPercentage(getBasisPoints(market.shortInterestUsd, totalInterestUsd))})`}
                            </span>
                          }
                          showDollar={false}
                        />
                      </>
                    )}
                  </div>
                )}
              />
            </div>
          }
        />
      </div>
    </div>
  );
}
