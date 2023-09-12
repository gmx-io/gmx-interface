import { Trans, t } from "@lingui/macro";
import { CardRow } from "components/CardRow/CardRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getIcon } from "config/icons";
import {
  MarketInfo,
  MarketTokensAPRData,
  getMarketIndexName,
  getMarketPoolName,
  getMintableMarketTokens,
  getPoolUsdWithoutPnl,
} from "domain/synthetics/markets";
import { TokenData, convertToUsd } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatAmount, formatTokenAmount, formatTokenAmountWithUsd, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import AssetDropdown from "pages/Dashboard/AssetDropdown";
import "./MarketStats.scss";
import BridgingInfo from "../BridgingInfo/BridgingInfo";
import { getBridgingOptionsForToken } from "config/bridging";

type Props = {
  marketInfo?: MarketInfo;
  marketToken?: TokenData;
  marketsTokensAPRData?: MarketTokensAPRData;
};

export function MarketStats(p: Props) {
  const { marketInfo, marketToken, marketsTokensAPRData } = p;
  const { chainId } = useChainId();

  const marketPrice = marketToken?.prices?.maxPrice;
  const marketBalance = marketToken?.balance;
  const marketBalanceUsd = convertToUsd(marketBalance, marketToken?.decimals, marketPrice);

  const marketTotalSupply = marketToken?.totalSupply;
  const marketTotalSupplyUsd = convertToUsd(marketTotalSupply, marketToken?.decimals, marketPrice);

  const mintableInfo = marketInfo && marketToken ? getMintableMarketTokens(marketInfo, marketToken) : undefined;

  const { longToken, shortToken, longPoolAmount, shortPoolAmount } = marketInfo || {};

  const longPoolAmountUsd = marketInfo ? getPoolUsdWithoutPnl(marketInfo, true, "midPrice") : undefined;
  const shortPoolAmountUsd = marketInfo ? getPoolUsdWithoutPnl(marketInfo, false, "midPrice") : undefined;

  const apr = getByKey(marketsTokensAPRData, marketInfo?.marketTokenAddress);
  const indexName = marketInfo && getMarketIndexName(marketInfo);
  const poolName = marketInfo && getMarketPoolName(marketInfo);

  const bridgingOprionsForToken = getBridgingOptionsForToken(longToken?.symbol);
  const shouldShowMoreInfo = Boolean(bridgingOprionsForToken);

  return (
    <div className="App-card MarketStats-card">
      <div className="MarketStats-title">
        <div className="App-card-title-mark">
          <div className="App-card-title-mark-icon">
            <img className="MarketStats-gm-icon" src={getIcon(chainId, "gm")} alt="GM" />
          </div>
          <div className="App-card-title-mark-info">
            <div className="App-card-title-mark-title Gm-stats-title items-center">
              <span>GM{indexName && `: ${indexName}`}</span>
              <span className="subtext">{poolName && `[${poolName}]`}</span>
            </div>
            <div className="App-card-title-mark-subtitle">GMX Market Tokens</div>
          </div>
          <div>
            <AssetDropdown assetSymbol={"GM"} token={marketToken} position="left" />
          </div>
        </div>
      </div>
      <div className="App-card-divider" />
      <div className="App-card-content">
        <CardRow
          label={t`Market`}
          value={
            indexName && poolName ? (
              <div className="items-top">
                <span>{indexName}</span>
                <span className="subtext gm-market-name">{poolName}</span>
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
          value={
            marketBalance && marketBalanceUsd
              ? formatTokenAmountWithUsd(marketBalance, marketBalanceUsd, "GM", marketToken.decimals)
              : "..."
          }
        />

        <CardRow label={t`APR`} value={apr ? `${formatAmount(apr, 2, 2)}%` : "..."} />

        <CardRow
          label={t`Total Supply`}
          value={
            marketTotalSupply && marketTotalSupplyUsd
              ? formatTokenAmountWithUsd(marketTotalSupply, marketTotalSupplyUsd, "GM", marketToken.decimals)
              : "..."
          }
        />

        <CardRow
          label={t`Mintable`}
          value={
            mintableInfo && marketTotalSupplyUsd && marketToken ? (
              <Tooltip
                handle={formatTokenAmountWithUsd(
                  mintableInfo.mintableAmount,
                  mintableInfo.mintableUsd,
                  "GM",
                  marketToken.decimals
                )}
                position="right-bottom"
                renderContent={() => {
                  return (
                    <div>
                      {marketInfo?.isSameCollaterals ? (
                        <Trans>
                          {marketInfo?.longToken.symbol} can be used to mint GM for this market up to the specified
                          minting caps.
                        </Trans>
                      ) : (
                        <Trans>
                          {marketInfo?.longToken.symbol} and {marketInfo?.shortToken.symbol} can be used to mint GM for
                          this market up to the specified minting caps.
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
                            marketInfo?.longToken.symbol
                          ),
                          `(${formatTokenAmount(marketInfo?.longPoolAmount, marketInfo?.longToken.decimals, undefined, {
                            displayDecimals: 0,
                          })} / ${formatTokenAmount(
                            marketInfo?.maxLongPoolAmount,
                            marketInfo?.longToken.decimals,
                            marketInfo?.longToken.symbol,
                            { displayDecimals: 0 }
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
                              marketInfo?.shortToken.symbol
                            ),
                            `(${formatTokenAmount(
                              marketInfo?.shortPoolAmount,
                              marketInfo?.shortToken.decimals,
                              undefined,
                              { displayDecimals: 0 }
                            )} / ${formatTokenAmount(
                              marketInfo?.maxShortPoolAmount,
                              marketInfo?.shortToken.decimals,
                              marketInfo?.shortToken.symbol,
                              { displayDecimals: 0 }
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
