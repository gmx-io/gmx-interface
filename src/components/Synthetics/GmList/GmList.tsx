import { Trans, t } from "@lingui/macro";
import { groupBy } from "lodash";
import Button from "components/Button/Button";
import {
  MarketInfo,
  MarketTokensAPRData,
  MarketsInfoData,
  getMarketIndexName,
  getMarketPoolName,
  getMintableMarketTokens,
} from "domain/synthetics/markets";
import { TokensData, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { importImage } from "lib/legacy";
import { bigNumberify, formatAmount, formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import AssetDropdown from "pages/Dashboard/AssetDropdown";
import { useMemo } from "react";
import { useMedia } from "react-use";
import { Operation } from "../GmSwap/GmSwapBox/GmSwapBox";
import "./GmList.scss";
import Tooltip from "components/Tooltip/Tooltip";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { getIcons } from "config/icons";
import PageTitle from "components/PageTitle/PageTitle";

type Props = {
  hideTitle?: boolean;
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  marketTokensData?: TokensData;
  marketsTokensAPRData?: MarketTokensAPRData;
  shouldScrollToTop?: boolean;
  buySellActionHandler?: () => void;
};

export function GmList({
  hideTitle,
  marketTokensData,
  marketsInfoData,
  tokensData,
  marketsTokensAPRData,
  shouldScrollToTop,
  buySellActionHandler,
}: Props) {
  const { chainId } = useChainId();
  const currentIcons = getIcons(chainId);
  const sortedMarketTokens = useMemo(() => {
    if (!marketsInfoData) {
      return [];
    }
    // Group markets by index token address
    const groupedMarketList: { [marketAddress: string]: MarketInfo[] } = groupBy(
      Object.values(marketsInfoData),
      (market) => market[market.isSpotOnly ? "marketTokenAddress" : "indexTokenAddress"]
    );

    const allMarkets = Object.values(groupedMarketList)
      .map((markets) => {
        return markets
          .filter((market) => {
            const marketInfoData = getByKey(marketsInfoData, market.marketTokenAddress)!;
            return !marketInfoData.isDisabled;
          })
          .map((market) => getByKey(marketTokensData, market.marketTokenAddress)!);
      })
      .filter((markets) => markets.length > 0);

    const sortedGroups = allMarkets!.sort((a, b) => {
      const totalMarketSupplyA = a.reduce((acc, market) => {
        const totalSupplyUsd = convertToUsd(market?.totalSupply, market?.decimals, market?.prices.minPrice);
        acc = acc.add(totalSupplyUsd || 0);
        return acc;
      }, bigNumberify(0)!);

      const totalMarketSupplyB = b.reduce((acc, market) => {
        const totalSupplyUsd = convertToUsd(market?.totalSupply, market?.decimals, market?.prices.minPrice);
        acc = acc.add(totalSupplyUsd || 0);
        return acc;
      }, bigNumberify(0)!);

      return totalMarketSupplyA.gt(totalMarketSupplyB) ? -1 : 1;
    });

    // Sort markets within each group by total supply
    const sortedMarkets = sortedGroups.map((markets: any) => {
      return markets.sort((a, b) => {
        const totalSupplyUsdA = convertToUsd(a.totalSupply, a.decimals, a.prices.minPrice)!;
        const totalSupplyUsdB = convertToUsd(b.totalSupply, b.decimals, b.prices.minPrice)!;
        return totalSupplyUsdA.gt(totalSupplyUsdB) ? -1 : 1;
      });
    });

    // Flatten the sorted markets array
    const flattenedMarkets = sortedMarkets.flat(Infinity);

    return flattenedMarkets;
  }, [marketsInfoData, marketTokensData]);

  const isMobile = useMedia("(max-width: 1100px)");

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
                    handle={<Trans>MINTABLE</Trans>}
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
                  <Trans>WALLET</Trans>
                </th>
                <th>
                  <Trans>APR</Trans>
                </th>

                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedMarketTokens.map((token) => {
                const market = getByKey(marketsInfoData, token?.address)!;

                const indexToken = getTokenData(tokensData, market?.indexTokenAddress, "native");
                const longToken = getTokenData(tokensData, market?.longTokenAddress);
                const shortToken = getTokenData(tokensData, market?.shortTokenAddress);
                const mintableInfo = market && token ? getMintableMarketTokens(market, token) : undefined;

                const apr = getByKey(marketsTokensAPRData, token?.address);

                if (!token || !indexToken || !longToken || !shortToken) {
                  return null;
                }

                const totalSupply = token?.totalSupply;
                const totalSupplyUsd = convertToUsd(totalSupply, token?.decimals, token?.prices?.minPrice);

                return (
                  <tr key={token.address}>
                    <td>
                      <div className="App-card-title-info">
                        <div className="App-card-title-info-icon">
                          <img
                            src={importImage(
                              "ic_" + (market.isSpotOnly ? "swap" : indexToken.symbol.toLocaleLowerCase()) + "_40.svg"
                            )}
                            alt={indexToken.symbol}
                            width="40"
                          />
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
                          <div className="App-card-info-subtitle">[{getMarketPoolName({ longToken, shortToken })}]</div>
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
                      {formatTokenAmount(token.balance, token.decimals, "GM", {
                        useCommas: true,
                        displayDecimals: 2,
                        fallbackToZero: true,
                      })}
                      <br />(
                      {formatUsd(convertToUsd(token.balance, token.decimals, token.prices?.minPrice), {
                        fallbackToZero: true,
                      }) || "..."}
                      )
                    </td>

                    <td>{apr ? `${formatAmount(apr, 2, 2)}%` : "..."}</td>

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
              })}
            </tbody>
          </table>
        </div>
      )}

      {isMobile && (
        <>
          {!hideTitle && <PageTitle title={t`GM Pools`} />}

          <div className="token-grid">
            {sortedMarketTokens.map((token) => {
              const apr = marketsTokensAPRData?.[token.address];

              const totalSupply = token?.totalSupply;
              const totalSupplyUsd = convertToUsd(totalSupply, token?.decimals, token?.prices?.minPrice);
              const market = getByKey(marketsInfoData, token?.address);
              const indexToken = getTokenData(tokensData, market?.indexTokenAddress, "native");
              const longToken = getTokenData(tokensData, market?.longTokenAddress);
              const shortToken = getTokenData(tokensData, market?.shortTokenAddress);
              const mintableInfo = market && token ? getMintableMarketTokens(market, token) : undefined;

              if (!indexToken) {
                return null;
              }
              const indexName = market && getMarketIndexName(market);
              const poolName = market && getMarketPoolName(market);

              return (
                <div className="App-card" key={token.address}>
                  <div className="App-card-title">
                    <div className="mobile-token-card">
                      <img
                        src={importImage(
                          "ic_" + (market?.isSpotOnly ? "swap" : indexToken?.symbol.toLocaleLowerCase()) + "_24.svg"
                        )}
                        alt={indexToken.symbol}
                        width="20"
                      />
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
                          handle={<Trans>Mintable</Trans>}
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
                        <Trans>Wallet</Trans>
                      </div>
                      <div>
                        {formatTokenAmount(token.balance, token.decimals, "GM", {
                          useCommas: true,
                          displayDecimals: 2,
                          fallbackToZero: true,
                        })}{" "}
                        (
                        {formatUsd(convertToUsd(token.balance, token.decimals, token.prices?.minPrice), {
                          fallbackToZero: true,
                        })}
                        )
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>APR</Trans>
                      </div>
                      <div>{apr ? `${formatAmount(apr, 2, 2)}%` : "..."}</div>
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
              {longToken.symbol} and {shortToken.symbol} can be used to mint GM tokens for this market up to the
              specified minting caps.
            </Trans>
          </p>
          <br />
          <StatsTooltipRow
            label={`Max ${longToken.symbol}`}
            value={[
              formatTokenAmount(mintableInfo?.longDepositCapacityAmount, longToken.decimals, longToken.symbol, {
                useCommas: true,
                displayDecimals: 0,
              }),
              `(${formatTokenAmount(market.longPoolAmount, longToken.decimals, "", {
                useCommas: true,
                displayDecimals: 0,
              })} / ${formatTokenAmount(market.maxLongPoolAmount, longToken.decimals, longToken.symbol, {
                useCommas: true,
                displayDecimals: 0,
              })})`,
            ]}
          />
          <StatsTooltipRow
            label={`Max ${shortToken.symbol}`}
            value={[
              formatTokenAmount(mintableInfo?.shortDepositCapacityAmount, shortToken.decimals, shortToken.symbol, {
                useCommas: true,
                displayDecimals: 0,
              }),
              `(${formatTokenAmount(market.shortPoolAmount, shortToken.decimals, "", {
                useCommas: true,
                displayDecimals: 0,
              })} / ${formatTokenAmount(market.maxShortPoolAmount, shortToken.decimals, shortToken.symbol, {
                useCommas: true,
                displayDecimals: 0,
              })})`,
            ]}
          />
        </>
      )}
    />
  );
}
