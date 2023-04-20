import { Trans } from "@lingui/macro";
import Button from "components/Button/Button";
import { getChainName } from "config/chains";
import { getMarketIndexName, getMarketPoolName, useMarketTokensData, useMarkets } from "domain/synthetics/markets";
import { useMarketTokensAPR } from "domain/synthetics/markets/useMarketTokensAPR";
import { convertToUsd, getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatAmount, formatTokenAmount, formatUsd } from "lib/numbers";
import { useMemo } from "react";
import { useMedia } from "react-use";
import { Operation } from "../GmSwap/GmSwapBox/GmSwapBox";
import "./GmList.scss";
import { getByKey } from "lib/objects";

export function GmList() {
  const { chainId } = useChainId();

  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: false });
  const { marketsData } = useMarkets(chainId);
  const { tokensData } = useAvailableTokensData(chainId);
  const { marketsTokensAPRData } = useMarketTokensAPR(chainId);

  const marketTokens = useMemo(() => {
    if (!marketTokensData || !marketsData) {
      return [];
    }

    return Object.values(marketTokensData).sort((a, b) => {
      const market1 = getByKey(marketsData, a.address)!;
      const market2 = getByKey(marketsData, b.address)!;
      const indexToken1 = getTokenData(tokensData, market1.indexTokenAddress, "native")!;
      const indexToken2 = getTokenData(tokensData, market2.indexTokenAddress, "native")!;

      return indexToken1.symbol.localeCompare(indexToken2.symbol);
    });
  }, [marketTokensData, marketsData, tokensData]);

  const isMobile = useMedia("(max-width: 1100px)");

  return (
    <div className="GMList">
      {!isMobile && (
        <div className="token-table-wrapper App-card">
          <div className="App-card-title">
            <Trans>GM ({getChainName(chainId)})</Trans>
          </div>
          <div className="App-card-divider"></div>
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
                const market = getByKey(marketsData, token.address)!;

                const indexToken = getTokenData(tokensData, market?.indexTokenAddress, "native")!;
                const longToken = getTokenData(tokensData, market?.longTokenAddress)!;
                const shortToken = getTokenData(tokensData, market?.shortTokenAddress)!;

                const apr = marketsTokensAPRData?.[token.address];

                const totalSupply = token.totalSupply;
                const totalSupplyUsd = convertToUsd(totalSupply, token.decimals, token.prices?.minPrice);

                return (
                  <tr key={token.address}>
                    <td>
                      <div className="App-card-title-info">
                        <div className="App-card-title-info-text">
                          <div className="App-card-info-title">
                            {getMarketIndexName({ indexToken, isSpotOnly: market?.isSpotOnly })}
                          </div>
                          <div className="App-card-info-subtitle">{getMarketPoolName({ longToken, shortToken })}</div>
                        </div>
                      </div>
                    </td>
                    <td>{formatUsd(token.prices?.minPrice)}</td>

                    <td>
                      {formatTokenAmount(token.balance, token.decimals, "GM")}
                      <br />
                      {formatUsd(convertToUsd(token.balance, token.decimals, token.prices?.minPrice))}
                    </td>

                    <td>{apr ? `${formatAmount(apr, 2, 2)}%` : "..."}</td>

                    <td>
                      {formatTokenAmount(totalSupply, token.decimals, "GM")}
                      <br />
                      {formatUsd(totalSupplyUsd)}
                    </td>

                    <td>
                      <Button variant="semi-clear" to={`/pools?operation=${Operation.Deposit}&market=${token.address}`}>
                        <Trans>Buy GM</Trans>
                      </Button>
                    </td>
                    <td>
                      <Button
                        variant="semi-clear"
                        to={`/pools?operation=${Operation.Withdrawal}&market=${token.address}`}
                      >
                        <Trans>Sell GM</Trans>
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
          <div className="App-card-title">
            <span>
              <Trans>GM ({getChainName(chainId)})</Trans>
            </span>
          </div>

          <div className="token-grid">
            {marketTokens.map((token) => {
              const apr = marketsTokensAPRData?.[token.address];

              const totalSupply = token.totalSupply;
              const totalSupplyUsd = convertToUsd(totalSupply, token.decimals, token.prices?.minPrice);
              const market = getByKey(marketsData, token.address);

              return (
                <div className="App-card" key={token.address}>
                  <div className="App-card-title">
                    <div className="mobile-token-card">
                      <div className="token-symbol-text">GM: {market?.name}</div>
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
