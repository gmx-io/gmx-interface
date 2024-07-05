import { Trans, t } from "@lingui/macro";
import { entries, values } from "lodash";
import { useMemo } from "react";
import { useMedia } from "react-use";
import type { Address } from "viem";
import { useAccount } from "wagmi";

import { getIcons } from "config/icons";
import { getNormalizedTokenSymbol } from "config/tokens";
import { GM_POOL_PRICE_DECIMALS } from "config/ui";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useMarketsInfoData, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  MarketTokensAPRData,
  MarketsInfoData,
  getMarketIndexName,
  getMarketPoolName,
  getMaxPoolUsd,
  getMintableMarketTokens,
  getPoolUsdWithoutPnl,
  getTotalGmInfo,
  useMarketTokensData,
} from "domain/synthetics/markets";
import { useDaysConsideredInMarketsApr } from "domain/synthetics/markets/useDaysConsideredInMarketsApr";
import { useUserEarnings } from "domain/synthetics/markets/useUserEarnings";
import { TokenData, TokensData, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { formatTokenAmount, formatTokenAmountWithUsd, formatUsd, formatUsdPrice } from "lib/numbers";
import { getByKey } from "lib/objects";

import { AprInfo } from "components/AprInfo/AprInfo";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { GmTokensBalanceInfo, GmTokensTotalBalanceInfo } from "components/GmTokensBalanceInfo/GmTokensBalanceInfo";
import PageTitle from "components/PageTitle/PageTitle";
import { GMListSkeleton } from "components/Skeleton/Skeleton";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TokenIcon from "components/TokenIcon/TokenIcon";
import Tooltip from "components/Tooltip/Tooltip";
import GmAssetDropdown from "../GmAssetDropdown/GmAssetDropdown";

import "./GmList.scss";

type Props = {
  hideTitle?: boolean;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
  shouldScrollToTop?: boolean;
  buySellActionHandler?: () => void;
  isDeposit: boolean;
};

const tokenAddressStyle = { fontSize: 5 };

/**
 * Sorts GM tokens by:
 * 1. Non-zero / zero balance
 * 2. If non-zero balance, by balance descending
 * 3. If zero balance, by total supply USD descending
 */
function sortGmTokens(marketsInfoData: MarketsInfoData, marketTokensData: TokensData) {
  if (marketsInfoData === undefined || marketTokensData === undefined) {
    return [];
  }

  const groupedTokens: {
    [group in Address | "nonZero"]: {
      tokens: { tokenData: TokenData; totalSupplyUsd: bigint }[];
      totalSupplyUsd: bigint;
    };
  } = {} as any;

  for (const market of values(marketsInfoData)) {
    if (market.isDisabled) {
      continue;
    }

    const marketTokenData = marketTokensData[market.marketTokenAddress];

    if (!marketTokenData) {
      continue;
    }

    const totalSupplyUsd = convertToUsd(
      marketTokenData.totalSupply,
      marketTokenData.decimals,
      marketTokenData.prices.minPrice
    )!;

    let groupKey: Address | "nonZero";
    if (marketTokenData.balance !== undefined && marketTokenData.balance !== 0n) {
      groupKey = "nonZero";
    } else if (market.isSpotOnly) {
      groupKey = market.marketTokenAddress as Address;
    } else {
      groupKey = market.indexTokenAddress as Address;
    }

    if (market.isSpotOnly) {
      groupedTokens[groupKey] = {
        tokens: [
          {
            tokenData: marketTokenData,
            totalSupplyUsd: totalSupplyUsd,
          },
        ],
        totalSupplyUsd: totalSupplyUsd,
      };
      continue;
    }

    if (!groupedTokens[groupKey]) {
      groupedTokens[groupKey] = {
        tokens: [],
        totalSupplyUsd: 0n,
      };
    }

    groupedTokens[groupKey].tokens.push({
      tokenData: marketTokenData,
      totalSupplyUsd: totalSupplyUsd,
    });
    groupedTokens[groupKey].totalSupplyUsd += totalSupplyUsd;
  }

  // sort withing each group

  for (const [groupKey, indexTokenGroup] of entries(groupedTokens)) {
    if (groupKey === "nonZero") {
      // by balance descending
      indexTokenGroup.tokens.sort((a, b) => {
        return a.tokenData.balance! > b.tokenData.balance! ? -1 : 1;
      });
      continue;
    }

    // by total supply descending

    indexTokenGroup.tokens.sort((a, b) => {
      return a.totalSupplyUsd > b.totalSupplyUsd ? -1 : 1;
    });
  }

  // sort and unwrap groups

  const sortedTokens = values(groupedTokens)
    .sort((a, b) => {
      return a.totalSupplyUsd > b.totalSupplyUsd ? -1 : 1;
    })
    .flatMap((group) => group.tokens)
    .map((token) => token.tokenData);

  return sortedTokens;
}

export function GmList({
  hideTitle,
  marketsTokensApyData,
  marketsTokensIncentiveAprData,
  shouldScrollToTop,
  buySellActionHandler,
  isDeposit,
}: Props) {
  const chainId = useSelector(selectChainId);
  const marketsInfoData = useMarketsInfoData();
  const tokensData = useTokensData();
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit });
  const { isConnected: active } = useAccount();
  const currentIcons = getIcons(chainId);
  const userEarnings = useUserEarnings(chainId);
  const isMobile = useMedia("(max-width: 1100px)");
  const daysConsidered = useDaysConsideredInMarketsApr();

  const sortedMarketsByIndexToken = useMemo(
    () => (marketsInfoData && marketTokensData ? sortGmTokens(marketsInfoData, marketTokensData) : []),
    [marketTokensData, marketsInfoData]
  );
  const { showDebugValues } = useSettings();

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
                    className="normal-case"
                    position="bottom-end"
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
                    label={t`WALLET`}
                  />
                </th>
                <th>
                  <Tooltip
                    handle={t`APY`}
                    className="normal-case"
                    position="bottom-end"
                    renderContent={ApyTooltipContent}
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

                  const apy = getByKey(marketsTokensApyData, token?.address);
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
                            <TokenIcon
                              symbol={tokenIconName}
                              displaySize={40}
                              importSize={40}
                              className="min-h-40 min-w-40"
                            />
                          </div>

                          <div className="App-card-title-info-text">
                            <div className="App-card-info-title">
                              {getMarketIndexName({ indexToken, isSpotOnly: market?.isSpotOnly })}

                              <div className="Asset-dropdown-container">
                                <GmAssetDropdown
                                  token={token}
                                  marketsInfoData={marketsInfoData}
                                  tokensData={tokensData}
                                />
                              </div>
                            </div>
                            <div className="App-card-info-subtitle">
                              [{getMarketPoolName({ longToken, shortToken })}]
                            </div>
                          </div>
                        </div>
                        {showDebugValues && <span style={tokenAddressStyle}>{market.marketTokenAddress}</span>}
                      </td>
                      <td>
                        {formatUsd(token.prices?.minPrice, {
                          displayDecimals: GM_POOL_PRICE_DECIMALS,
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
                        <MintableAmount
                          mintableInfo={mintableInfo}
                          market={market}
                          token={token}
                          longToken={longToken}
                          shortToken={shortToken}
                        />
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
                        <AprInfo apy={apy} incentiveApr={incentiveApr} />
                      </td>

                      <td className="GmList-actions">
                        <Button
                          className="GmList-action"
                          variant="secondary"
                          to={`/pools/?market=${market.marketTokenAddress}&operation=buy&scroll=${
                            shouldScrollToTop ? "1" : "0"
                          }`}
                        >
                          <Trans>Buy</Trans>
                        </Button>
                        <Button
                          className="GmList-action GmList-last-action"
                          variant="secondary"
                          to={`/pools/?market=${market.marketTokenAddress}&operation=sell&scroll=${
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
            {sortedMarketsByIndexToken.map((token, index) => {
              const apr = marketsTokensApyData?.[token.address];
              const incentiveApr = getByKey(marketsTokensIncentiveAprData, token?.address);
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
                        <div className="flex items-center">
                          <span>{indexName && indexName}</span>
                          <span className="subtext">{poolName && `[${poolName}]`}</span>
                        </div>
                      </div>
                      <div>
                        <GmAssetDropdown
                          token={token}
                          tokensData={tokensData}
                          marketsInfoData={marketsInfoData}
                          position={index % 2 !== 0 ? "left" : "right"}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Price</Trans>
                      </div>
                      <div>{formatUsdPrice(token.prices?.minPrice)}</div>
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
                          className="normal-case"
                          position="bottom-start"
                          renderContent={() => (
                            <p className="text-white">
                              <Trans>Available amount to deposit into the specific GM pool.</Trans>
                            </p>
                          )}
                        />
                      </div>
                      <div>
                        <MintableAmount
                          mintableInfo={mintableInfo}
                          market={market}
                          token={token}
                          longToken={longToken}
                          shortToken={shortToken}
                        />
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <GmTokensTotalBalanceInfo
                          balance={userTotalGmInfo?.balance}
                          balanceUsd={userTotalGmInfo?.balanceUsd}
                          userEarnings={userEarnings}
                          tooltipPosition="bottom-start"
                          label={t`Wallet`}
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
                        <Tooltip
                          handle={t`APY`}
                          className="normal-case"
                          position="bottom-start"
                          renderContent={ApyTooltipContent}
                        />
                      </div>
                      <div>
                        <AprInfo apy={apr} incentiveApr={incentiveApr} />
                      </div>
                    </div>

                    <div className="App-card-divider"></div>
                    <div className="App-card-buttons m-0" onClick={buySellActionHandler}>
                      <Button
                        variant="secondary"
                        to={`/pools/?market=${market.marketTokenAddress}&operation=buy&scroll=0`}
                      >
                        <Trans>Buy</Trans>
                      </Button>
                      <Button
                        variant="secondary"
                        to={`/pools/?market=${market.marketTokenAddress}&operation=sell&scroll=0`}
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

function MintableAmount({
  mintableInfo,
  market,
  token,
  longToken,
  shortToken,
}: {
  mintableInfo:
    | {
        mintableAmount: bigint;
        mintableUsd: bigint;
        longDepositCapacityUsd: bigint;
        shortDepositCapacityUsd: bigint;
        longDepositCapacityAmount: bigint;
        shortDepositCapacityAmount: bigint;
      }
    | undefined;
  market: any;
  token: any;
  longToken: any;
  shortToken: any;
}) {
  const longTokenMaxValue = useMemo(
    () => [
      mintableInfo
        ? formatTokenAmountWithUsd(
            mintableInfo.longDepositCapacityAmount,
            mintableInfo.longDepositCapacityUsd,
            longToken.symbol,
            longToken.decimals
          )
        : "-",
      `(${formatUsd(getPoolUsdWithoutPnl(market, true, "midPrice"))} / ${formatUsd(getMaxPoolUsd(market, true))})`,
    ],
    [longToken.decimals, longToken.symbol, market, mintableInfo]
  );
  const shortTokenMaxValue = useMemo(
    () => [
      mintableInfo
        ? formatTokenAmountWithUsd(
            mintableInfo.shortDepositCapacityAmount,
            mintableInfo.shortDepositCapacityUsd,
            shortToken.symbol,
            shortToken.decimals
          )
        : "-",
      `(${formatUsd(getPoolUsdWithoutPnl(market, false, "midPrice"))} / ${formatUsd(getMaxPoolUsd(market, false))})`,
    ],
    [market, mintableInfo, shortToken.decimals, shortToken.symbol]
  );

  return (
    <Tooltip
      maxAllowedWidth={350}
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
      className="normal-case"
      position="bottom-end"
      renderContent={() => (
        <>
          <p className="text-white">
            {market?.isSameCollaterals ? (
              <Trans>{longToken.symbol} can be used to buy GM for this market up to the specified buying caps.</Trans>
            ) : (
              <Trans>
                {longToken.symbol} and {shortToken.symbol} can be used to buy GM for this market up to the specified
                buying caps.
              </Trans>
            )}
          </p>
          <br />
          <StatsTooltipRow label={`Max ${longToken.symbol}`} value={longTokenMaxValue} />
          <StatsTooltipRow label={`Max ${shortToken.symbol}`} value={shortTokenMaxValue} />
        </>
      )}
    />
  );
}

function ApyTooltipContent() {
  return (
    <p className="text-white">
      <Trans>
        <p className="mb-12">
          The APY is an estimate based on the fees collected for the past seven days, extrapolating the current
          borrowing fee. It excludes:
        </p>
        <ul className="mb-8 list-disc">
          <li className="p-2">price changes of the underlying token(s)</li>
          <li className="p-2">traders' PnL, which is expected to be neutral in the long term</li>
          <li className="p-2">funding fees, which are exchanged between traders</li>
        </ul>
        <p className="mb-12">
          <ExternalLink href="https://docs.gmx.io/docs/providing-liquidity/v2/#token-pricing">
            Read more about GM token pricing
          </ExternalLink>
          .
        </p>
        <p>
          Check GM pools' performance against other LP Positions in the{" "}
          <ExternalLink href="https://dune.com/gmx-io/gmx-analytics">GMX Dune Dashboard</ExternalLink>.
        </p>
      </Trans>
    </p>
  );
}
