import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useMemo } from "react";

import {
  GlvAndGmMarketsInfoData,
  GlvOrMarketInfo,
  MarketTokensAPRData,
  getGlvDisplayName,
  getMarketIndexName,
  getGlvOrMarketAddress,
  getMarketPoolName,
  getMaxPoolUsd,
  getPoolUsdWithoutPnl,
} from "domain/synthetics/markets";
import { TokenData, TokensData, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatTokenAmountWithUsd, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import MarketTokenSelector from "../MarketTokenSelector/MarketTokenSelector";

import { CardRow } from "components/CardRow/CardRow";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { BridgingInfo } from "../BridgingInfo/BridgingInfo";

import { AprInfo } from "components/AprInfo/AprInfo";
import { MARKET_STATS_DECIMALS } from "config/ui";
import { getMintableInfoGlv, getTotalSellableInfoGlv, isGlvInfo } from "domain/synthetics/markets/glv";
import { useMedia } from "react-use";
import { zeroAddress } from "viem";
import { formatDateTime } from "../../../lib/dates";
import { bigintToNumber } from "../../../lib/numbers";

import { CompositionBar } from "./components/CompositionBar";
import { CompositionTableGm } from "./components/CompositionTable";
import { MarketDescription } from "./components/MarketDescription";
import { useMarketMintableTokens } from "./hooks/useMarketMintableTokens";
import { useMarketSellableToken } from "./hooks/useMarketSellableToken";

import "./MarketStats.scss";

type Props = {
  marketsInfoData?: GlvAndGmMarketsInfoData;
  marketTokensData?: TokensData;
  marketInfo?: GlvOrMarketInfo;
  marketToken?: TokenData;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
  marketsTokensLidoAprData: MarketTokensAPRData | undefined;
  glvTokensApyData: MarketTokensAPRData | undefined;
};

export function MarketStatsWithComposition(p: Props) {
  const {
    marketInfo,
    marketToken,
    marketsTokensApyData,
    marketsInfoData,
    marketTokensData,
    marketsTokensIncentiveAprData,
    marketsTokensLidoAprData,
    glvTokensApyData,
  } = p;
  const { chainId } = useChainId();

  const isGlv = marketInfo && isGlvInfo(marketInfo);

  const marketPrice = marketToken?.prices?.maxPrice;
  const marketBalance = marketToken?.balance;
  const marketBalanceUsd = convertToUsd(marketBalance, marketToken?.decimals, marketPrice);

  const marketTotalSupply = marketToken?.totalSupply;
  const marketTotalSupplyUsd = convertToUsd(marketTotalSupply, marketToken?.decimals, marketPrice);

  const { longToken, shortToken } = marketInfo || {};

  const mintableInfo = useMarketMintableTokens(marketInfo, marketToken);
  const sellableInfo = useMarketSellableToken(marketInfo, marketToken);

  const maxLongSellableTokenAmount = convertToTokenAmount(
    sellableInfo?.maxLongSellableUsd,
    longToken?.decimals,
    longToken?.prices.minPrice
  );

  const maxShortSellableTokenAmount = convertToTokenAmount(
    sellableInfo?.maxShortSellableUsd,
    shortToken?.decimals,
    shortToken?.prices.minPrice
  );

  const apy = getByKey(marketsTokensApyData, marketInfo && getGlvOrMarketAddress(marketInfo));
  const incentiveApr = getByKey(marketsTokensIncentiveAprData, marketInfo && getGlvOrMarketAddress(marketInfo));
  const lidoApr = getByKey(marketsTokensLidoAprData, marketInfo && getGlvOrMarketAddress(marketInfo));

  const indexName = marketInfo && getMarketIndexName(marketInfo);
  const poolName = marketInfo && getMarketPoolName(marketInfo);

  const maxLongTokenValue = useMemo(
    () =>
      isGlv
        ? []
        : [
            formatTokenAmountWithUsd(
              mintableInfo?.longDepositCapacityAmount,
              mintableInfo?.longDepositCapacityUsd,
              longToken?.symbol,
              longToken?.decimals
            ),
            marketInfo
              ? `(${formatUsd(getPoolUsdWithoutPnl(marketInfo, true, "midPrice"))} / ${formatUsd(getMaxPoolUsd(marketInfo, true))})`
              : "",
          ],
    [
      isGlv,
      longToken?.decimals,
      longToken?.symbol,
      marketInfo,
      mintableInfo?.longDepositCapacityAmount,
      mintableInfo?.longDepositCapacityUsd,
    ]
  );
  const maxShortTokenValue = useMemo(
    () =>
      isGlv
        ? []
        : [
            formatTokenAmountWithUsd(
              mintableInfo?.shortDepositCapacityAmount,
              mintableInfo?.shortDepositCapacityUsd,
              shortToken?.symbol,
              shortToken?.decimals
            ),
            marketInfo
              ? `(${formatUsd(getPoolUsdWithoutPnl(marketInfo, false, "midPrice"))} / ${formatUsd(getMaxPoolUsd(marketInfo, false))})`
              : "",
          ],
    [
      isGlv,
      marketInfo,
      mintableInfo?.shortDepositCapacityAmount,
      mintableInfo?.shortDepositCapacityUsd,
      shortToken?.decimals,
      shortToken?.symbol,
    ]
  );

  const buyableRow = useMemo(() => {
    const mintable = isGlv ? getMintableInfoGlv(marketInfo, marketTokensData) : mintableInfo;
    const buyableInfo = mintable
      ? formatTokenAmountWithUsd(
          mintable.mintableAmount,
          mintable.mintableUsd,
          isGlv ? marketToken?.symbol : marketToken?.symbol,
          marketToken?.decimals,
          {
            displayDecimals: 0,
          }
        )
      : "...";

    if (isGlv) {
      return <CardRow label={t`Buyable`} value={buyableInfo} />;
    }

    return (
      <CardRow
        label={t`Buyable`}
        value={
          mintableInfo && marketTotalSupplyUsd !== undefined && marketToken ? (
            <Tooltip
              disabled={isGlv}
              maxAllowedWidth={350}
              handle={buyableInfo}
              position="bottom-end"
              content={
                <div>
                  {marketInfo?.isSameCollaterals ? (
                    <Trans>
                      {marketInfo?.longToken.symbol} can be used to buy GM for this market up to the specified buying
                      caps.
                    </Trans>
                  ) : (
                    <Trans>
                      {marketInfo?.longToken.symbol} and {marketInfo?.shortToken.symbol} can be used to buy GM for this
                      market up to the specified buying caps.
                    </Trans>
                  )}

                  <br />
                  <br />

                  <StatsTooltipRow
                    label={t`Max ${marketInfo?.longToken.symbol}`}
                    value={maxLongTokenValue}
                    showDollar={false}
                  />
                  <br />
                  <StatsTooltipRow
                    label={t`Max ${marketInfo?.shortToken.symbol}`}
                    value={maxShortTokenValue}
                    showDollar={false}
                  />
                </div>
              }
            />
          ) : (
            "..."
          )
        }
      />
    );
  }, [
    isGlv,
    marketInfo,
    marketToken,
    marketTotalSupplyUsd,
    mintableInfo,
    maxLongTokenValue,
    maxShortTokenValue,
    marketTokensData,
  ]);

  const sellableRow = useMemo(() => {
    const sellable = isGlv ? getTotalSellableInfoGlv(marketInfo, marketsInfoData, marketTokensData) : sellableInfo;
    const sellableValue = sellable
      ? formatTokenAmountWithUsd(
          sellable?.totalAmount,
          sellable?.totalUsd,
          marketToken?.symbol,
          marketToken?.decimals,
          {
            displayDecimals: 0,
          }
        )
      : "...";

    if (isGlv) {
      return <CardRow label={t`Sellable`} value={sellableValue} />;
    }

    return (
      <CardRow
        label={t`Sellable`}
        value={
          <Tooltip
            maxAllowedWidth={300}
            handle={sellableValue}
            position="bottom-end"
            content={
              <div>
                {marketInfo?.isSameCollaterals ? (
                  <Trans>
                    GM can be sold for {longToken?.symbol} for this market up to the specified selling caps. The
                    remaining tokens in the pool are reserved for currently open positions.
                  </Trans>
                ) : (
                  <Trans>
                    GM can be sold for {longToken?.symbol} and {shortToken?.symbol} for this market up to the specified
                    selling caps. The remaining tokens in the pool are reserved for currently open positions.
                  </Trans>
                )}
                <br />
                <br />
                <StatsTooltipRow
                  label={t`Max ${marketInfo?.longToken.symbol}`}
                  value={formatTokenAmountWithUsd(
                    maxLongSellableTokenAmount,
                    sellableInfo?.maxLongSellableUsd,
                    longToken?.symbol,
                    longToken?.decimals
                  )}
                  showDollar={false}
                />
                {!marketInfo?.isSameCollaterals && (
                  <StatsTooltipRow
                    label={t`Max ${marketInfo?.shortToken.symbol}`}
                    value={formatTokenAmountWithUsd(
                      maxShortSellableTokenAmount,
                      sellableInfo?.maxShortSellableUsd,
                      shortToken?.symbol,
                      shortToken?.decimals
                    )}
                    showDollar={false}
                  />
                )}
              </div>
            }
          />
        }
      />
    );
  }, [
    marketInfo,
    longToken,
    shortToken,
    marketToken,
    sellableInfo,
    maxLongSellableTokenAmount,
    maxShortSellableTokenAmount,
    marketTokensData,
    marketsInfoData,
    isGlv,
  ]);

  const canFitCompositionOnRow = useMedia("(min-width: 1200px)");

  return (
    <div
      className={cx("flex flex-grow bg-slate-800", {
        "flex-row": canFitCompositionOnRow,
        "flex-col": !canFitCompositionOnRow,
      })}
    >
      <div
        className={cx("p-20", {
          "min-w-[30rem] max-w-[36.6rem]": canFitCompositionOnRow,
          "w-[100%]": !canFitCompositionOnRow,
        })}
      >
        <MarketTokenSelector
          chainId={chainId}
          marketTokensData={marketTokensData}
          marketsInfoData={marketsInfoData}
          marketsTokensAPRData={marketsTokensApyData}
          marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
          currentMarketInfo={marketInfo}
          glvTokensApyData={glvTokensApyData}
        />
        <div className="App-card-divider !-mx-20" />
        <div className="App-card-content">
          <MarketDescription marketInfo={marketInfo} />
          {isGlv ? (
            <CardRow
              label={t`Vault`}
              value={
                poolName ? (
                  <div className="flex items-start">
                    <span>{getGlvDisplayName(marketInfo)}</span>
                    <span className="subtext gm-market-name">[{poolName}]</span>
                  </div>
                ) : (
                  "..."
                )
              }
            />
          ) : (
            <CardRow
              label={t`Market`}
              value={
                indexName && poolName ? (
                  <div className="flex items-start">
                    <span>{indexName}</span>
                    <span className="subtext gm-market-name">[{poolName}]</span>
                  </div>
                ) : (
                  "..."
                )
              }
            />
          )}

          <CardRow
            label={t`Price`}
            value={
              <Tooltip
                handle={
                  formatUsd(marketPrice, {
                    displayDecimals: MARKET_STATS_DECIMALS,
                  }) || "..."
                }
                position="bottom-end"
                renderContent={() => {
                  if (isGlv) {
                    return (
                      <div>
                        <Trans>
                          GLV token pricing is affected by the underlying GM tokens it is composed of and their prices.
                        </Trans>
                      </div>
                    );
                  }

                  return (
                    <div>
                      <Trans>
                        GM token pricing includes price impact pool amounts, the pending PnL of open positions, and
                        borrowing fees. It excludes funding fees, which are exchanged between traders.
                        <br />
                        <br />
                        <ExternalLink href="https://docs.gmx.io/docs/providing-liquidity/v2/#token-pricing">
                          Read more about GM token pricing
                        </ExternalLink>
                        .
                      </Trans>
                    </div>
                  );
                }}
              />
            }
          />

          <CardRow
            label={t`Wallet`}
            value={
              marketToken
                ? formatTokenAmountWithUsd(
                    marketBalance ?? 0n,
                    marketBalanceUsd ?? 0n,
                    isGlv ? "GLV" : "GM",
                    marketToken?.decimals ?? 18
                  )
                : "..."
            }
          />

          <CardRow
            label={t`APY`}
            value={
              <AprInfo
                apy={isGlv ? glvTokensApyData?.[getGlvOrMarketAddress(marketInfo)] : apy}
                incentiveApr={incentiveApr}
                lidoApr={lidoApr}
                marketAddress={marketToken?.address ?? zeroAddress}
              />
            }
          />

          <CardRow
            label={t`Total Supply`}
            value={
              marketTotalSupply !== undefined && marketTotalSupplyUsd !== undefined
                ? formatTokenAmountWithUsd(
                    marketTotalSupply,
                    marketTotalSupplyUsd,
                    isGlv ? "GLV" : "GM",
                    marketToken?.decimals,
                    {
                      displayDecimals: 0,
                    }
                  )
                : "..."
            }
          />

          {buyableRow}
          {sellableRow}

          {isGlv && (
            <>
              <CardRow
                label={t`Last Rebalance`}
                value={
                  marketInfo?.shiftLastExecutedAt
                    ? marketInfo?.shiftLastExecutedAt === 0n
                      ? "-"
                      : formatDateTime(bigintToNumber(marketInfo.shiftLastExecutedAt, 0))
                    : "..."
                }
              />
            </>
          )}

          <div className="App-card-divider" />
          <BridgingInfo chainId={chainId} tokenSymbol={longToken?.symbol} />
          {!marketInfo?.isSameCollaterals && <BridgingInfo chainId={chainId} tokenSymbol={shortToken?.symbol} />}
        </div>
      </div>
      <div
        className={cx("flex-grow", {
          "w-[100%] border-l border-l-slate-700": canFitCompositionOnRow,
          "mt-20 border-t border-t-slate-700": !canFitCompositionOnRow,
        })}
      >
        <div className="px-16 pt-16">
          <p>Composition</p>
          <CompositionBar
            marketInfo={marketInfo}
            marketsInfoData={marketsInfoData}
            marketTokensData={marketTokensData}
          />
        </div>
        <CompositionTableGm marketInfo={marketInfo} />
      </div>
    </div>
  );
}
