import { Trans, t } from "@lingui/macro";
import { CardRow } from "components/CardRow/CardRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
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
import { formatTokenAmount, formatTokenAmountWithUsd, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import "./MarketStats.scss";
import BridgingInfo from "../BridgingInfo/BridgingInfo";
import { getBridgingOptionsForToken } from "config/bridging";
import { BigNumber } from "ethers";
import { AprInfo } from "components/AprInfo/AprInfo";
import MarketTokenSelector from "../MarketTokenSelector/MarketTokenSelector";

type Props = {
  marketsInfoData?: MarketsInfoData;
  marketTokensData?: TokensData;
  marketInfo?: MarketInfo;
  marketToken?: TokenData;
  marketsTokensAPRData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
};

export function MarketStats(p: Props) {
  const {
    marketInfo,
    marketToken,
    marketsTokensAPRData,
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

  const apr = getByKey(marketsTokensAPRData, marketInfo?.marketTokenAddress);
  const incentiveApr = getByKey(marketsTokensIncentiveAprData, marketInfo?.marketTokenAddress);
  const indexName = marketInfo && getMarketIndexName(marketInfo);
  const poolName = marketInfo && getMarketPoolName(marketInfo);

  const bridgingOprionsForToken = getBridgingOptionsForToken(longToken?.symbol);
  const shouldShowMoreInfo = Boolean(bridgingOprionsForToken);

  return (
    <div className="App-card MarketStats-card">
      <MarketTokenSelector
        marketTokensData={marketTokensData}
        marketsInfoData={marketsInfoData}
        marketsTokensAPRData={marketsTokensAPRData}
        marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
        currentMarketInfo={marketInfo}
      />
      <div className="App-card-divider" />
      <div className="App-card-content">
        <CardRow
          label={t`Market`}
          value={
            indexName && poolName ? (
              <div className="items-top">
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
              position="right-bottom"
              renderContent={() => {
                return (
                  <div>
                    <Trans>GM Token pricing includes positions' Pending PnL, Impact Pool Amount and Borrow Fees.</Trans>
                  </div>
                );
              }}
            />
          }
        />

        <CardRow
          label={t`Wallet`}
          value={formatTokenAmountWithUsd(
            marketBalance || BigNumber.from(0),
            marketBalanceUsd || BigNumber.from(0),
            "GM",
            marketToken?.decimals ?? 18
          )}
        />

        <CardRow label={t`APR`} value={<AprInfo apr={apr} incentiveApr={incentiveApr} />} />

        <CardRow
          label={t`Total Supply`}
          value={
            marketTotalSupply && marketTotalSupplyUsd
              ? formatTokenAmountWithUsd(marketTotalSupply, marketTotalSupplyUsd, "GM", marketToken?.decimals, {
                  displayDecimals: 0,
                })
              : "..."
          }
        />

        <CardRow
          label={t`Buyable`}
          value={
            mintableInfo && marketTotalSupplyUsd && marketToken ? (
              <Tooltip
                handle={formatTokenAmountWithUsd(
                  mintableInfo.mintableAmount,
                  mintableInfo.mintableUsd,
                  "GM",
                  marketToken?.decimals,
                  {
                    displayDecimals: 0,
                  }
                )}
                position="right-bottom"
                renderContent={() => {
                  return (
                    <div>
                      {marketInfo?.isSameCollaterals ? (
                        <Trans>
                          {marketInfo?.longToken.symbol} can be used to buy GM for this market up to the specified
                          buying caps.
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
                        value={[
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
                        ]}
                        showDollar={false}
                      />

                      <br />

                      {!marketInfo?.isSameCollaterals && (
                        <StatsTooltipRow
                          label={t`Max ${marketInfo?.shortToken.symbol}`}
                          value={[
                            formatTokenAmount(
                              mintableInfo?.shortDepositCapacityAmount,
                              marketInfo?.shortToken.decimals,
                              marketInfo?.shortToken.symbol,
                              {
                                useCommas: true,
                              }
                            ),
                            `(${formatTokenAmount(
                              marketInfo?.shortPoolAmount,
                              marketInfo?.shortToken.decimals,
                              undefined,
                              { displayDecimals: 0, useCommas: true }
                            )} / ${formatTokenAmount(
                              marketInfo?.maxShortPoolAmount,
                              marketInfo?.shortToken.decimals,
                              marketInfo?.shortToken.symbol,
                              { displayDecimals: 0, useCommas: true }
                            )})`,
                          ]}
                          showDollar={false}
                        />
                      )}
                    </div>
                  );
                }}
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
              handle={formatTokenAmountWithUsd(
                sellableInfo?.totalAmount,
                sellableInfo?.totalUsd,
                "GM",
                marketToken?.decimals,
                {
                  displayDecimals: 0,
                }
              )}
              position="right-bottom"
              renderContent={() => (
                <div>
                  <Trans>
                    GM can be sold for {longToken?.symbol} and {shortToken?.symbol} for this market up to the specified
                    selling caps. The remaining tokens in the pool are reserved for currently open Positions.
                  </Trans>
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
                </div>
              )}
            />
          }
        />

        <div className="App-card-divider" />

        <CardRow label={t`Long Collateral`} value={longToken?.symbol || "..."} />
        <CardRow
          label={t`Pool Amount`}
          value={formatTokenAmountWithUsd(longPoolAmount, longPoolAmountUsd, longToken?.symbol, longToken?.decimals)}
        />
        {shouldShowMoreInfo && (
          <CardRow label={t`More Info`} value={<BridgingInfo chainId={chainId} tokenSymbol={longToken?.symbol} />} />
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
      </div>
    </div>
  );
}
