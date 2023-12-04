import { useMemo } from "react";
import { Trans, t } from "@lingui/macro";
import Button from "components/Button/Button";
import {
  MarketTokensAPRData,
  MarketsInfoData,
  getMarketIndexName,
  getMarketPoolName,
  getMaxPoolAmountForDeposit,
  getMintableMarketTokens,
  getTotalGmInfo,
} from "domain/synthetics/markets";
import { TokensData, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import AssetDropdown from "pages/Dashboard/AssetDropdown";
import { useMedia } from "react-use";
import { Operation } from "../GmSwap/GmSwapBox/GmSwapBox";
import "./GmList.scss";
import Tooltip from "components/Tooltip/Tooltip";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { getIcons } from "config/icons";
import PageTitle from "components/PageTitle/PageTitle";
import useWallet from "lib/wallets/useWallet";
import { AprInfo } from "components/AprInfo/AprInfo";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { useDaysConsideredInMarketsApr } from "domain/synthetics/markets/useDaysConsideredInMarketsApr";
import useSortedMarketsWithIndexToken from "domain/synthetics/trade/useSortedMarketsWithIndexToken";
import { GmTokensBalanceInfo, GmTokensTotalBalanceInfo } from "components/GmTokensBalanceInfo/GmTokensBalanceInfo";
import { useUserEarnings } from "domain/synthetics/markets/useUserEarnings";
import { getNormalizedTokenSymbol } from "config/tokens";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { GMListSkeleton } from "components/Skeleton/Skeleton";

type Props = {
  hideTitle?: boolean;
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  marketTokensData?: TokensData;
  marketsTokensAPRData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
  shouldScrollToTop?: boolean;
  buySellActionHandler?: () => void;
};

export function GmList({
  hideTitle,
  marketTokensData,
  marketsInfoData,
  tokensData,
  marketsTokensAPRData,
  marketsTokensIncentiveAprData,
  shouldScrollToTop,
  buySellActionHandler,
}: Props) {
  const { chainId } = useChainId();
  const { active } = useWallet();
  const currentIcons = getIcons(chainId);
  const userEarnings = useUserEarnings(chainId);
  const isMobile = useMedia("(max-width: 1100px)");
  const daysConsidered = useDaysConsideredInMarketsApr();
  const { markets: sortedMarketsByIndexToken } = useSortedMarketsWithIndexToken(marketsInfoData, marketTokensData);

  const userTotalGmInfo = useMemo(() => {
    if (!active) return;
    return getTotalGmInfo(marketTokensData);
  }, [marketTokensData, active]);

  return (
    <div className="GMList">
      {!isMobile && (
        <div className="token-table-wrapper App-card">
          {!hideTitle && (
            <>
              <div className="App-card-title">
                <Trans>GM Pools</Trans>
                <img src={currentIcons.network} width="16" alt="Network Icon" />
              </div>
              <div className="App-card-divider"></div>
            </>
          )}

          <table className="token-table">
            <thead>
              <tr>
                <th>
                  <Trans>MARKET</Trans>
                </th>
                <th>
                  <Trans>PRICE</Trans>
                </th>
                <th>
                  <Trans>TOTAL SUPPLY</Trans>
                </th>
                <th>
                  <Tooltip
                    handle={<Trans>BUYABLE</Trans>}
                    className="text-none"
                    position="right-bottom"
                    renderContent={() => (
                      <p className="text-white">
                        <Trans>Available amount to deposit into the specific GM pool.</Trans>
                      </p>
                    )}
                  />
                </th>
                <th>
                  <GmTokensTotalBalanceInfo
                    balance={userTotalGmInfo?.balance}
                    balanceUsd={userTotalGmInfo?.balanceUsd}
                    userEarnings={userEarnings}
                  />
                </th>
                <th>
                  <Tooltip
                    handle={<Trans>APR</Trans>}
                    className="text-none"
                    position="right-bottom"
                    renderContent={() => (
                      <p className="text-white">
                        <Trans>
                          <p>
                            APR is based on the Fees collected for the past {daysConsidered} days. It is an estimate as
                            actual Fees are auto-compounded into the pool in real-time.
                          </p>
                          <p>
                            Check Pools performance against other LP Positions in{" "}
                            <ExternalLink newTab href="https://dune.com/gmx-io/gmx-analytics">
                              GMX Dune Dashboard
                            </ExternalLink>
                            .
                          </p>
                        </Trans>
                      </p>
                    )}
                  />
                </th>

                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedMarketsByIndexToken.length ? (
                sortedMarketsByIndexToken.map((token) => {
                  const market = getByKey(marketsInfoData, token?.address)!;

                  const indexToken = getTokenData(tokensData, market?.indexTokenAddress, "native");
                  const longToken = getTokenData(tokensData, market?.longTokenAddress);
                  const shortToken = getTokenData(tokensData, market?.shortTokenAddress);
                  const mintableInfo = market && token ? getMintableMarketTokens(market, token) : undefined;

                  const apr = getByKey(marketsTokensAPRData, token?.address);
                  const incentiveApr = getByKey(marketsTokensIncentiveAprData, token?.address);
                  const marketEarnings = getByKey(userEarnings?.byMarketAddress, token?.address);

                  if (!token || !indexToken || !longToken || !shortToken) {
                    return null;
                  }

                  const totalSupply = token?.totalSupply;
                  const totalSupplyUsd = convertToUsd(totalSupply, token?.decimals, token?.prices?.minPrice);
                  const tokenIconName = market.isSpotOnly
                    ? getNormalizedTokenSymbol(longToken.symbol) + getNormalizedTokenSymbol(shortToken.symbol)
                    : getNormalizedTokenSymbol(indexToken.symbol);

                  return (
                    <tr key={token.address}>
                      <td>
                        <div className="App-card-title-info">
                          <div className="App-card-title-info-icon">
                            <TokenIcon symbol={tokenIconName} displaySize={40} importSize={40} />
                          </div>

                          <div className="App-card-title-info-text">
                            <div className="App-card-info-title">
                              {getMarketIndexName({ indexToken, isSpotOnly: market?.isSpotOnly })}
                              {!market.isSpotOnly && (
                                <div className="Asset-dropdown-container">
                                  <AssetDropdown assetSymbol={indexToken.symbol} position="left" />
                                </div>
                              )}
                            </div>
                            <div className="App-card-info-subtitle">
                              [{getMarketPoolName({ longToken, shortToken })}]
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {formatUsd(token.prices?.minPrice, {
                          displayDecimals: 3,
                        })}
                      </td>

                      <td className="GmList-last-column">
                        {formatTokenAmount(totalSupply, token.decimals, "GM", {
                          useCommas: true,
                          displayDecimals: 2,
                        })}
                        <br />({formatUsd(totalSupplyUsd)})
                      </td>
                      <td className="GmList-last-column">
                        {renderMintableAmount({
                          mintableInfo,
                          market,
                          token,
                          longToken,
                          shortToken,
                        })}
                      </td>

                      <td>
                        <GmTokensBalanceInfo
                          token={token}
                          daysConsidered={daysConsidered}
                          oneLine={false}
                          earnedRecently={marketEarnings?.recent}
                          earnedTotal={marketEarnings?.total}
                        />
                      </td>

                      <td>
                        <AprInfo apr={apr} incentiveApr={incentiveApr} />
                      </td>

                      <td className="GmList-actions">
                        <Button
                          className="GmList-action"
                          variant="secondary"
                          to={`/pools?operation=${Operation.Deposit}&market=${token.address}&scroll=${
                            shouldScrollToTop ? "1" : "0"
                          }`}
                        >
                          <Trans>Buy</Trans>
                        </Button>
                        <Button
                          className="GmList-action GmList-last-action"
                          variant="secondary"
                          to={`/pools?operation=${Operation.Withdrawal}&market=${token.address}&scroll=${
                            shouldScrollToTop ? "1" : "0"
                          }`}
                        >
                          <Trans>Sell</Trans>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <GMListSkeleton />
              )}
            </tbody>
          </table>
        </div>
      )}

      {isMobile && (
        <>
          {!hideTitle && <PageTitle title={t`GM Pools`} />}

          <div className="token-grid">
            {sortedMarketsByIndexToken.map((token) => {
              const apr = marketsTokensAPRData?.[token.address];
              const incentiveApr = marketsTokensIncentiveAprData?.[token.address];
              const marketEarnings = getByKey(userEarnings?.byMarketAddress, token?.address);

              const totalSupply = token?.totalSupply;
              const totalSupplyUsd = convertToUsd(totalSupply, token?.decimals, token?.prices?.minPrice);
              const market = getByKey(marketsInfoData, token?.address);
              const indexToken = getTokenData(tokensData, market?.indexTokenAddress, "native");
              const longToken = getTokenData(tokensData, market?.longTokenAddress);
              const shortToken = getTokenData(tokensData, market?.shortTokenAddress);
              const mintableInfo = market && token ? getMintableMarketTokens(market, token) : undefined;

              if (!indexToken || !longToken || !shortToken || !market) {
                return null;
              }
              const indexName = market && getMarketIndexName(market);
              const poolName = market && getMarketPoolName(market);
              const tokenIconName = market.isSpotOnly
                ? getNormalizedTokenSymbol(longToken.symbol) + getNormalizedTokenSymbol(shortToken.symbol)
                : getNormalizedTokenSymbol(indexToken.symbol);

              return (
                <div className="App-card" key={token.address}>
                  <div className="App-card-title">
                    <div className="mobile-token-card">
                      <TokenIcon symbol={tokenIconName} displaySize={20} importSize={40} />
                      <div className="token-symbol-text">
                        <div className="items-center">
                          <span>{indexName && indexName}</span>
                          <span className="subtext">{poolName && `[${poolName}]`}</span>
                        </div>
                      </div>
                      <div>
                        <AssetDropdown assetSymbol={indexToken.symbol} position="left" />
                      </div>
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Price</Trans>
                      </div>
                      <div>
                        {formatUsd(token.prices?.minPrice, {
                          displayDecimals: 3,
                        })}
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Total Supply</Trans>
                      </div>
                      <div>
                        {" "}
                        {formatTokenAmount(totalSupply, token.decimals, "GM", {
                          useCommas: true,
                          displayDecimals: 2,
                        })}{" "}
                        ({formatUsd(totalSupplyUsd)})
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Tooltip
                          handle={<Trans>Buyable</Trans>}
                          className="text-none"
                          position="left-bottom"
                          renderContent={() => (
                            <p className="text-white">
                              <Trans>Available amount to deposit into the specific GM pool.</Trans>
                            </p>
                          )}
                        />
                      </div>
                      <div>
                        {renderMintableAmount({
                          mintableInfo,
                          market,
                          token,
                          longToken,
                          shortToken,
                        })}
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Tooltip
                          handle={<Trans>Wallet</Trans>}
                          className="text-none"
                          position="right-bottom"
                          renderContent={() => (
                            <p className="text-white">
                              <Trans>Available amount to deposit into the specific GM pool.</Trans>
                            </p>
                          )}
                        />
                      </div>
                      <div>
                        <GmTokensBalanceInfo
                          token={token}
                          daysConsidered={daysConsidered}
                          oneLine
                          earnedRecently={marketEarnings?.recent}
                          earnedTotal={marketEarnings?.total}
                        />
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>APR</Trans>
                      </div>
                      <div>
                        <AprInfo apr={apr} incentiveApr={incentiveApr} />
                      </div>
                    </div>

                    <div className="App-card-divider"></div>
                    <div className="App-card-buttons m-0" onClick={buySellActionHandler}>
                      <Button
                        variant="secondary"
                        to={`/pools?operation=${Operation.Deposit}&market=${token.address}&scroll=0`}
                      >
                        <Trans>Buy</Trans>
                      </Button>
                      <Button
                        variant="secondary"
                        to={`/pools?operation=${Operation.Withdrawal}&market=${token.address}&scroll=0`}
                      >
                        <Trans>Sell</Trans>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function renderMintableAmount({ mintableInfo, market, token, longToken, shortToken }) {
  return (
    <Tooltip
      handle={
        <>
          {formatTokenAmount(mintableInfo?.mintableAmount, token.decimals, "GM", {
            useCommas: true,
            displayDecimals: 0,
          })}
          <br />(
          {formatUsd(mintableInfo?.mintableUsd, {
            displayDecimals: 0,
          })}
          )
        </>
      }
      className="text-none"
      position="right-bottom"
      renderContent={() => (
        <>
          <p className="text-white">
            <Trans>
              {longToken.symbol} and {shortToken.symbol} can be used to buy GM tokens for this market up to the
              specified buying caps.
            </Trans>
          </p>
          <br />
          <StatsTooltipRow
            label={`Max ${longToken.symbol}`}
            value={[
              formatTokenAmount(mintableInfo?.longDepositCapacityAmount, longToken.decimals, longToken.symbol, {
                useCommas: true,
              }),
              `(${formatTokenAmount(market.longPoolAmount, longToken.decimals, "", {
                useCommas: true,
                displayDecimals: 0,
              })} / ${formatTokenAmount(
                getMaxPoolAmountForDeposit(market, true),
                longToken.decimals,
                longToken.symbol,
                {
                  useCommas: true,
                  displayDecimals: 0,
                }
              )})`,
            ]}
          />
          <StatsTooltipRow
            label={`Max ${shortToken.symbol}`}
            value={[
              formatTokenAmount(mintableInfo?.shortDepositCapacityAmount, shortToken.decimals, shortToken.symbol, {
                useCommas: true,
              }),
              `(${formatTokenAmount(market.shortPoolAmount, shortToken.decimals, "", {
                useCommas: true,
                displayDecimals: 0,
              })} / ${formatTokenAmount(
                getMaxPoolAmountForDeposit(market, false),
                shortToken.decimals,
                shortToken.symbol,
                {
                  useCommas: true,
                  displayDecimals: 0,
                }
              )})`,
            ]}
          />
        </>
      )}
    />
  );
}
