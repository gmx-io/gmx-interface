import { Trans, t } from "@lingui/macro";

import { BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "config/factors";
import { getIcons } from "config/icons";
import { getWhitelistedV1Tokens } from "sdk/configs/tokens";
import { InfoTokens } from "domain/tokens";
import { bigMath } from "sdk/utils/bigmath";
import { DEFAULT_MAX_USDG_AMOUNT } from "lib/legacy";
import { formatAmount, formatKeyAmount, formatUsdPrice } from "lib/numbers";

import PageTitle from "components/PageTitle/PageTitle";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipComponent from "components/Tooltip/Tooltip";
import AssetDropdown from "./AssetDropdown";
import { WeightText } from "./WeightText";

export function MarketsListV1({
  chainId,
  infoTokens,
  totalTokenWeights,
  adjustedUsdgSupply,
}: {
  chainId: number;
  infoTokens: InfoTokens;
  totalTokenWeights: bigint | undefined;
  adjustedUsdgSupply: bigint;
}) {
  const currentIcons = getIcons(chainId)!;

  const whitelistedTokens = getWhitelistedV1Tokens(chainId);
  const tokenList = whitelistedTokens.filter((t) => !t.isWrapped);
  const visibleTokens = tokenList.filter((t) => !t.isTempHidden);

  if (visibleTokens.length === 0) {
    return null;
  }

  return (
    <>
      <div className="token-table-wrapper App-box">
        <div className="text-body-large flex items-center p-16">
          <Trans>GLP Index Composition</Trans>{" "}
          <img src={currentIcons.network} className="ml-5" width="16" alt="Network Icon" />
        </div>
        <table className="w-full">
          <thead>
            <TableTheadTr bordered>
              <TableTh>
                <Trans>TOKEN</Trans>
              </TableTh>
              <TableTh>
                <Trans>PRICE</Trans>
              </TableTh>
              <TableTh>
                <Trans>POOL</Trans>
              </TableTh>
              <TableTh>
                <Trans>WEIGHT</Trans>
              </TableTh>
              <TableTh>
                <Trans>UTILIZATION</Trans>
              </TableTh>
            </TableTheadTr>
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
                <TableTr key={token.address} bordered={false} hoverable={false}>
                  <TableTd>
                    <div className="token-symbol-wrapper">
                      <div className="App-card-title-info">
                        <div className="App-card-title-info-icon">
                          <TokenIcon symbol={token.symbol} displaySize={40} importSize={40} />
                        </div>
                        <div>
                          <div className="App-card-info-title text-body-large">{token.name}</div>
                          <div className="App-card-info-subtitle text-body-small">{token.symbol}</div>
                        </div>
                        <div>
                          <AssetDropdown token={token} />
                        </div>
                      </div>
                    </div>
                  </TableTd>
                  <TableTd>{formatUsdPrice(tokenInfo?.minPrice)}</TableTd>
                  <TableTd>
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
                  </TableTd>
                  <TableTd>
                    <WeightText
                      tokenInfo={tokenInfo}
                      adjustedUsdgSupply={adjustedUsdgSupply}
                      totalTokenWeights={totalTokenWeights}
                    />
                  </TableTd>
                  <TableTd>{formatAmount(utilization, 2, 2, false)}%</TableTd>
                </TableTr>
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
