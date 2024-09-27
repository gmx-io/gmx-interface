import { Trans, t } from "@lingui/macro";
import PageTitle from "components/PageTitle/PageTitle";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipComponent from "components/Tooltip/Tooltip";
import { BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "config/factors";
import { getIcons } from "config/icons";
import { getWhitelistedV1Tokens } from "config/tokens";
import { InfoTokens } from "domain/tokens";
import { bigMath } from "lib/bigmath";
import { DEFAULT_MAX_USDG_AMOUNT } from "lib/legacy";
import { BN_ZERO, formatAmount, formatKeyAmount, formatUsdPrice } from "lib/numbers";
import AssetDropdown from "./AssetDropdown";
import { WeightText } from "./WeightText";

export function V1Table({
  chainId,

  infoTokens,
  totalTokenWeights,
}: {
  chainId: number;

  infoTokens: InfoTokens;
  totalTokenWeights: bigint | undefined;
}) {
  const currentIcons = getIcons(chainId)!;

  const whitelistedTokens = getWhitelistedV1Tokens(chainId);
  const tokenList = whitelistedTokens.filter((t) => !t.isWrapped);
  const visibleTokens = tokenList.filter((t) => !t.isTempHidden);

  if (visibleTokens.length === 0) {
    return null;
  }

  let adjustedUsdgSupply = BN_ZERO;
  for (let i = 0; i < tokenList.length; i++) {
    const token = tokenList[i];
    const tokenInfo = infoTokens[token.address];
    if (tokenInfo && tokenInfo.usdgAmount !== undefined) {
      adjustedUsdgSupply = adjustedUsdgSupply + tokenInfo.usdgAmount;
    }
  }

  return (
    <>
      <div className="token-table-wrapper App-card">
        <div className="App-card-title">
          <Trans>GLP Index Composition</Trans> <img src={currentIcons.network} width="16" alt="Network Icon" />
        </div>
        <div className="App-card-divider" />
        <table className="token-table">
          <thead>
            <tr>
              <th>
                <Trans>TOKEN</Trans>
              </th>
              <th>
                <Trans>PRICE</Trans>
              </th>
              <th>
                <Trans>POOL</Trans>
              </th>
              <th>
                <Trans>WEIGHT</Trans>
              </th>
              <th>
                <Trans>UTILIZATION</Trans>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleTokens.map((token) => {
              const tokenInfo = infoTokens[token.address];
              let utilization = 0n;
              if (
                tokenInfo &&
                tokenInfo.reservedAmount !== undefined &&
                tokenInfo.poolAmount !== undefined &&
                tokenInfo.poolAmount > 0
              ) {
                utilization = bigMath.mulDiv(
                  tokenInfo.reservedAmount,
                  BASIS_POINTS_DIVISOR_BIGINT,
                  tokenInfo.poolAmount
                );
              }
              let maxUsdgAmount = DEFAULT_MAX_USDG_AMOUNT;
              if (tokenInfo.maxUsdgAmount !== undefined && tokenInfo.maxUsdgAmount > 0) {
                maxUsdgAmount = tokenInfo.maxUsdgAmount;
              }

              return (
                <tr key={token.address}>
                  <td>
                    <div className="token-symbol-wrapper">
                      <div className="App-card-title-info">
                        <div className="App-card-title-info-icon">
                          <TokenIcon symbol={token.symbol} displaySize={40} importSize={40} />
                        </div>
                        <div>
                          <div className="App-card-info-title">{token.name}</div>
                          <div className="App-card-info-subtitle">{token.symbol}</div>
                        </div>
                        <div>
                          <AssetDropdown token={token} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{formatUsdPrice(tokenInfo?.minPrice)}</td>
                  <td>
                    <TooltipComponent
                      handle={`$${formatKeyAmount(tokenInfo, "managedUsd", USD_DECIMALS, 0, true)}`}
                      position="bottom-end"
                      className="whitespace-nowrap"
                      renderContent={() => {
                        return (
                          <>
                            <StatsTooltipRow
                              label={t`Pool Amount`}
                              value={`${formatKeyAmount(
                                tokenInfo,
                                "managedAmount",
                                token.decimals,
                                0,
                                true
                              )} ${token.symbol}`}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label={t`Target Min Amount`}
                              value={`${formatKeyAmount(
                                tokenInfo,
                                "bufferAmount",
                                token.decimals,
                                0,
                                true
                              )} ${token.symbol}`}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label={t`Max ${tokenInfo.symbol} Capacity`}
                              value={formatAmount(maxUsdgAmount, 18, 0, true)}
                              showDollar={true}
                            />
                          </>
                        );
                      }}
                    />
                  </td>
                  <td>
                    <WeightText
                      tokenInfo={tokenInfo}
                      adjustedUsdgSupply={adjustedUsdgSupply}
                      totalTokenWeights={totalTokenWeights}
                    />
                  </td>
                  <td>{formatAmount(utilization, 2, 2, false)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="glp-composition-small">
        <PageTitle title={t`GLP Index Composition`} />
      </div>

      <div className="token-grid">
        {visibleTokens.map((token) => {
          const tokenInfo = infoTokens[token.address];
          let utilization = 0n;
          if (
            tokenInfo &&
            tokenInfo.reservedAmount !== undefined &&
            tokenInfo.poolAmount !== undefined &&
            tokenInfo.poolAmount > 0
          ) {
            utilization = bigMath.mulDiv(tokenInfo.reservedAmount, BASIS_POINTS_DIVISOR_BIGINT, tokenInfo.poolAmount);
          }
          let maxUsdgAmount = DEFAULT_MAX_USDG_AMOUNT;
          if (tokenInfo.maxUsdgAmount !== undefined && tokenInfo.maxUsdgAmount > 0) {
            maxUsdgAmount = tokenInfo.maxUsdgAmount;
          }

          return (
            <div className="App-card" key={token.symbol}>
              <div className="App-card-title">
                <div className="mobile-token-card">
                  <TokenIcon symbol={token.symbol} importSize={24} displaySize={24} />
                  <div className="token-symbol-text">{token.symbol}</div>
                  <div>
                    <AssetDropdown token={token} />
                  </div>
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Price</Trans>
                  </div>
                  <div>{formatUsdPrice(tokenInfo.minPrice)}</div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Pool</Trans>
                  </div>
                  <div>
                    <TooltipComponent
                      handle={`$${formatKeyAmount(tokenInfo, "managedUsd", USD_DECIMALS, 0, true)}`}
                      position="bottom-end"
                      renderContent={() => {
                        return (
                          <>
                            <StatsTooltipRow
                              label={t`Pool Amount`}
                              value={`${formatKeyAmount(
                                tokenInfo,
                                "managedAmount",
                                token.decimals,
                                0,
                                true
                              )} ${token.symbol}`}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label={t`Target Min Amount`}
                              value={`${formatKeyAmount(
                                tokenInfo,
                                "bufferAmount",
                                token.decimals,
                                0,
                                true
                              )} ${token.symbol}`}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label={t`Max ${tokenInfo.symbol} Capacity`}
                              value={formatAmount(maxUsdgAmount, 18, 0, true)}
                            />
                          </>
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Weight</Trans>
                  </div>
                  <div>
                    <WeightText
                      tokenInfo={tokenInfo}
                      adjustedUsdgSupply={adjustedUsdgSupply}
                      totalTokenWeights={totalTokenWeights}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Utilization</Trans>
                  </div>
                  <div>{formatAmount(utilization, 2, 2, false)}%</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
