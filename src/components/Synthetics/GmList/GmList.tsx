import { Trans } from "@lingui/macro";
import Button from "components/Button/Button";
import { getChainName } from "config/chains";
import { MarketTokensAPRData, MarketsInfoData, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { TokensData, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { importImage } from "lib/legacy";
import { formatAmount, formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import AssetDropdown from "pages/Dashboard/AssetDropdown";
import { useMemo } from "react";
import { useMedia } from "react-use";
import { Operation } from "../GmSwap/GmSwapBox/GmSwapBox";
import "./GmList.scss";

type Props = {
  hideTitle?: boolean;
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  marketTokensData?: TokensData;
  marketsTokensAPRData?: MarketTokensAPRData;
};

export function GmList({ hideTitle, marketTokensData, marketsInfoData, tokensData, marketsTokensAPRData }: Props) {
  const { chainId } = useChainId();

  const marketTokens = useMemo(() => {
    if (!marketTokensData || !marketsInfoData) {
      return [];
    }

    return Object.values(marketTokensData)
      .filter((marketToken) => {
        const market = getByKey(marketsInfoData, marketToken.address);
        return market && !market.isDisabled;
      })
      .sort((a, b) => {
        const market1 = getByKey(marketsInfoData, a.address)!;
        const market2 = getByKey(marketsInfoData, b.address)!;
        const indexToken1 = getTokenData(tokensData, market1.indexTokenAddress, "native");
        const indexToken2 = getTokenData(tokensData, market2.indexTokenAddress, "native");

        if (!indexToken1 || !indexToken2) {
          return 0;
        }

        return indexToken1.symbol.localeCompare(indexToken2.symbol);
      });
  }, [marketTokensData, marketsInfoData, tokensData]);

  const isMobile = useMedia("(max-width: 1100px)");

  return (
    <div className="GMList">
      {!isMobile && (
        <div className="token-table-wrapper App-card">
          {!hideTitle && (
            <>
              <div className="App-card-title">
                <Trans>GM ({getChainName(chainId)})</Trans>
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
                  <Trans>WALLET</Trans>
                </th>
                <th>
                  <Trans>APR</Trans>
                </th>
                <th>
                  <Trans>TOTAL SUPPLY</Trans>
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {marketTokens.map((token) => {
                const market = getByKey(marketsInfoData, token.address)!;

                const indexToken = getTokenData(tokensData, market?.indexTokenAddress, "native");
                const longToken = getTokenData(tokensData, market?.longTokenAddress);
                const shortToken = getTokenData(tokensData, market?.shortTokenAddress);

                const apr = getByKey(marketsTokensAPRData, token.address);

                const totalSupply = token.totalSupply;
                const totalSupplyUsd = convertToUsd(totalSupply, token.decimals, token.prices?.minPrice);

                if (!indexToken || !longToken || !shortToken) {
                  return null;
                }

                return (
                  <tr key={token.address}>
                    <td>
                      <div className="App-card-title-info">
                        <div className="App-card-title-info-icon">
                          <img
                            src={importImage(
                              "ic_" + (market.isSpotOnly ? "spot" : indexToken.symbol.toLocaleLowerCase()) + "_40.svg"
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
                                <AssetDropdown assetSymbol={indexToken.symbol} assetInfo={indexToken} />
                              </div>
                            )}
                          </div>
                          <div className="App-card-info-subtitle">[{getMarketPoolName({ longToken, shortToken })}]</div>
                        </div>
                      </div>
                    </td>
                    <td>{formatUsd(token.prices?.minPrice)}</td>

                    <td>
                      {formatTokenAmount(token.balance, token.decimals, "GM")}
                      <br />
                      {formatUsd(convertToUsd(token.balance, token.decimals, token.prices?.minPrice)) || "..."}
                    </td>

                    <td>{apr ? `${formatAmount(apr, 2, 2)}%` : "..."}</td>

                    <td className="GmList-last-column">
                      {formatTokenAmount(totalSupply, token.decimals, "GM", {
                        useCommas: true,
                      })}
                      <br />
                      {formatUsd(totalSupplyUsd)}
                    </td>

                    <td className="GmList-actions">
                      <Button
                        className="GmList-action"
                        variant="semi-clear"
                        to={`/pools?operation=${Operation.Deposit}&market=${token.address}`}
                      >
                        <Trans>Buy</Trans>
                      </Button>
                      <Button
                        className="GmList-action GmList-last-action"
                        variant="semi-clear"
                        to={`/pools?operation=${Operation.Withdrawal}&market=${token.address}`}
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
          {!hideTitle && (
            <div className="App-card-title">
              <span>
                <Trans>GM ({getChainName(chainId)})</Trans>
              </span>
            </div>
          )}

          <div className="token-grid">
            {marketTokens.map((token) => {
              const apr = marketsTokensAPRData?.[token.address];

              const totalSupply = token.totalSupply;
              const totalSupplyUsd = convertToUsd(totalSupply, token.decimals, token.prices?.minPrice);
              const market = getByKey(marketsInfoData, token.address);
              const indexToken = getTokenData(tokensData, market?.indexTokenAddress, "native");

              if (!indexToken) {
                return null;
              }

              return (
                <div className="App-card" key={token.address}>
                  <div className="App-card-title">
                    <div className="mobile-token-card">
                      <img
                        src={importImage(
                          "ic_" + (market?.isSpotOnly ? "spot" : indexToken?.symbol.toLocaleLowerCase()) + "_40.svg"
                        )}
                        alt={indexToken.symbol}
                        width="40"
                      />
                      <div className="token-symbol-text">{market?.name}</div>
                      <div>
                        <AssetDropdown assetSymbol={indexToken.symbol} assetInfo={indexToken} />
                      </div>
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Price</Trans>
                      </div>
                      <div>{formatUsd(token.prices?.minPrice)}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Wallet</Trans>
                      </div>
                      <div>
                        {formatTokenAmount(token.balance, token.decimals, "GM")} (
                        {formatUsd(convertToUsd(token.balance, token.decimals, token.prices?.minPrice))})
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>APR</Trans>
                      </div>
                      <div>{apr ? `${formatAmount(apr, 2, 2)}%` : "..."}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Total Supply</Trans>
                      </div>
                      <div>
                        {" "}
                        {formatTokenAmount(totalSupply, token.decimals, "GM")} ({formatUsd(totalSupplyUsd)})
                      </div>
                    </div>
                    <div className="App-card-divider"></div>
                    <div className="App-card-buttons m-0">
                      <Button variant="semi-clear" to={`/pools?operation=${Operation.Deposit}&market=${token.address}`}>
                        <Trans>Buy</Trans>
                      </Button>
                      <Button
                        variant="semi-clear"
                        to={`/pools?operation=${Operation.Withdrawal}&market=${token.address}`}
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
