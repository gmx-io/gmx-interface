import { Trans, t } from "@lingui/macro";
import { useMemo } from "react";

import { getBridgingOptionsForToken } from "config/bridging";
import useIncentiveStats from "domain/synthetics/common/useIncentiveStats";
import {
  MarketInfo,
  MarketTokensAPRData,
  MarketsInfoData,
  getMarketIndexName,
  getMarketPoolName,
  getMintableMarketTokens,
  getPoolUsdWithoutPnl,
  getSellableMarketToken,
} from "domain/synthetics/markets";
import { TokenData, TokensData, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { BN_ZERO, formatTokenAmount, formatTokenAmountWithUsd, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import MarketTokenSelector from "../MarketTokenSelector/MarketTokenSelector";

import { AprInfo } from "components/AprInfo/AprInfo";
import { CardRow } from "components/CardRow/CardRow";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import BridgingInfo from "../BridgingInfo/BridgingInfo";

import "./MarketStats.scss";

type Props = {
  marketsInfoData?: MarketsInfoData;
  marketTokensData?: TokensData;
  marketInfo?: MarketInfo;
  marketToken?: TokenData;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
};

export function MarketStats(p: Props) {
  const {
    marketInfo,
    marketToken,
    marketsTokensApyData,
    marketsInfoData,
    marketTokensData,
    marketsTokensIncentiveAprData,
  } = p;
  const { chainId } = useChainId();

  const marketPrice = marketToken?.prices?.maxPrice;
  const marketBalance = marketToken?.balance;
  const marketBalanceUsd = convertToUsd(marketBalance, marketToken?.decimals, marketPrice);

  const marketTotalSupply = marketToken?.totalSupply;
  const marketTotalSupplyUsd = convertToUsd(marketTotalSupply, marketToken?.decimals, marketPrice);

  const { longToken, shortToken, longPoolAmount, shortPoolAmount } = marketInfo || {};

  const mintableInfo = marketInfo && marketToken ? getMintableMarketTokens(marketInfo, marketToken) : undefined;
  const sellableInfo = marketInfo && marketToken ? getSellableMarketToken(marketInfo, marketToken) : undefined;

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

  const longPoolAmountUsd = marketInfo ? getPoolUsdWithoutPnl(marketInfo, true, "midPrice") : undefined;
  const shortPoolAmountUsd = marketInfo ? getPoolUsdWithoutPnl(marketInfo, false, "midPrice") : undefined;

  const apy = getByKey(marketsTokensApyData, marketInfo?.marketTokenAddress);
  const incentiveApr = getByKey(marketsTokensIncentiveAprData, marketInfo?.marketTokenAddress);
  const isLpIncentiveActive = useIncentiveStats()?.lp?.isActive ?? false;
  const indexName = marketInfo && getMarketIndexName(marketInfo);
  const poolName = marketInfo && getMarketPoolName(marketInfo);

  const bridgingOprionsForToken = getBridgingOptionsForToken(longToken?.symbol);
  const shouldShowMoreInfo = Boolean(bridgingOprionsForToken);

  const maxLongTokenValue = useMemo(
    () => [
      formatTokenAmount(
        mintableInfo?.longDepositCapacityAmount,
        marketInfo?.longToken.decimals,
        marketInfo?.longToken.symbol,
        {
          useCommas: true,
        }
      ),
      `(${formatTokenAmount(marketInfo?.longPoolAmount, marketInfo?.longToken.decimals, undefined, {
        displayDecimals: 0,
        useCommas: true,
      })} / ${formatTokenAmount(
        marketInfo?.maxLongPoolAmount,
        marketInfo?.longToken.decimals,
        marketInfo?.longToken.symbol,
        { displayDecimals: 0, useCommas: true }
      )})`,
    ],
    [
      marketInfo?.longPoolAmount,
      marketInfo?.longToken.decimals,
      marketInfo?.longToken.symbol,
      marketInfo?.maxLongPoolAmount,
      mintableInfo?.longDepositCapacityAmount,
    ]
  );

  const maxShortTokenValue = useMemo(
    () => [
      formatTokenAmount(
        mintableInfo?.shortDepositCapacityAmount,
        marketInfo?.shortToken.decimals,
        marketInfo?.shortToken.symbol,
        {
          useCommas: true,
        }
      ),
      `(${formatTokenAmount(marketInfo?.shortPoolAmount, marketInfo?.shortToken.decimals, undefined, {
        displayDecimals: 0,
        useCommas: true,
      })} / ${formatTokenAmount(
        marketInfo?.maxShortPoolAmount,
        marketInfo?.shortToken.decimals,
        marketInfo?.shortToken.symbol,
        { displayDecimals: 0, useCommas: true }
      )})`,
    ],
    [
      marketInfo?.maxShortPoolAmount,
      marketInfo?.shortPoolAmount,
      marketInfo?.shortToken.decimals,
      marketInfo?.shortToken.symbol,
      mintableInfo?.shortDepositCapacityAmount,
    ]
  );

  return (
    <div className="App-card MarketStats-card">
      <MarketTokenSelector
        marketTokensData={marketTokensData}
        marketsInfoData={marketsInfoData}
        marketsTokensAPRData={marketsTokensApyData}
        marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
        currentMarketInfo={marketInfo}
      />
      <div className="App-card-divider" />
      <div className="App-card-content">
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
        <CardRow
          label={t`Price`}
          value={
            <Tooltip
              handle={
                formatUsd(marketPrice, {
                  displayDecimals: 3,
                }) || "..."
              }
              position="bottom-end"
              renderContent={() => {
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
          value={formatTokenAmountWithUsd(
            marketBalance ?? 0n,
            marketBalanceUsd ?? 0n,
            "GM",
            marketToken?.decimals ?? 18
          )}
        />

        <CardRow
          label={t`APY`}
          value={<AprInfo apy={apy} incentiveApr={incentiveApr} isIncentiveActive={isLpIncentiveActive} />}
        />

        <CardRow
          label={t`Total Supply`}
          value={
            marketTotalSupply !== undefined && marketTotalSupplyUsd !== undefined
              ? formatTokenAmountWithUsd(marketTotalSupply, marketTotalSupplyUsd, "GM", marketToken?.decimals, {
                  displayDecimals: 0,
                })
              : "..."
          }
        />

        <CardRow
          label={t`Buyable`}
          value={
            mintableInfo && marketTotalSupplyUsd !== undefined && marketToken ? (
              <Tooltip
                maxAllowedWidth={350}
                handle={formatTokenAmountWithUsd(
                  mintableInfo.mintableAmount,
                  mintableInfo.mintableUsd,
                  "GM",
                  marketToken?.decimals,
                  {
                    displayDecimals: 0,
                  }
                )}
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
                        {marketInfo?.longToken.symbol} and {marketInfo?.shortToken.symbol} can be used to buy GM for
                        this market up to the specified buying caps.
                      </Trans>
                    )}

                    <br />
                    <br />

                    <StatsTooltipRow
                      label={t`Max ${marketInfo?.longToken.symbol}`}
                      value={maxLongTokenValue}
                      showDollar={false}
                    />

                    {!marketInfo?.isSameCollaterals && (
                      <>
                        <br />
                        <StatsTooltipRow
                          label={t`Max ${marketInfo?.shortToken.symbol}`}
                          value={maxShortTokenValue}
                          showDollar={false}
                        />
                      </>
                    )}
                  </div>
                }
              />
            ) : (
              "..."
            )
          }
        />

        <CardRow
          label={t`Sellable`}
          value={
            <Tooltip
              maxAllowedWidth={300}
              handle={formatTokenAmountWithUsd(
                sellableInfo?.totalAmount,
                sellableInfo?.totalUsd,
                "GM",
                marketToken?.decimals,
                {
                  displayDecimals: 0,
                }
              )}
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
                      GM can be sold for {longToken?.symbol} and {shortToken?.symbol} for this market up to the
                      specified selling caps. The remaining tokens in the pool are reserved for currently open
                      positions.
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

        <div className="App-card-divider" />
        {marketInfo?.isSameCollaterals ? (
          <>
            <CardRow label={t`Collateral`} value={longToken?.symbol || "..."} />
            <CardRow
              label={t`Pool Amount`}
              value={formatTokenAmountWithUsd(
                (longPoolAmount ?? BN_ZERO) + (shortPoolAmount ?? BN_ZERO),
                (longPoolAmountUsd ?? BN_ZERO) + (shortPoolAmountUsd ?? BN_ZERO),
                longToken?.symbol,
                longToken?.decimals
              )}
            />
            {shouldShowMoreInfo && (
              <CardRow
                label={t`Read more`}
                value={<BridgingInfo chainId={chainId} tokenSymbol={longToken?.symbol} />}
              />
            )}
          </>
        ) : (
          <>
            <CardRow label={t`Long Collateral`} value={longToken?.symbol || "..."} />
            <CardRow
              label={t`Pool Amount`}
              value={formatTokenAmountWithUsd(
                longPoolAmount,
                longPoolAmountUsd,
                longToken?.symbol,
                longToken?.decimals
              )}
            />
            {shouldShowMoreInfo && (
              <CardRow
                label={t`Read more`}
                value={<BridgingInfo chainId={chainId} tokenSymbol={longToken?.symbol} />}
              />
            )}
            <div className="App-card-divider" />
            <CardRow label={t`Short Collateral`} value={shortToken?.symbol || "..."} />
            <CardRow
              label={t`Pool Amount`}
              value={formatTokenAmountWithUsd(
                shortPoolAmount,
                shortPoolAmountUsd,
                shortToken?.symbol,
                shortToken?.decimals
              )}
            />
          </>
        )}
      </div>
    </div>
  );
}
