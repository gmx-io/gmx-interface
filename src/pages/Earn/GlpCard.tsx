import { Trans } from "@lingui/macro";

import { getConstant } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { getIcons } from "config/icons";
import { GLP_PRICE_DECIMALS } from "config/ui";
import { useChainId } from "lib/chains";
import { GLP_DECIMALS, ProcessedData } from "lib/legacy";
import { formatBalanceAmountWithUsd, formatKeyAmount } from "lib/numbers";

import { AmountWithUsdHuman } from "components/AmountWithUsd/AmountWithUsd";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";

export function GlpCard({ processedData }: { processedData: ProcessedData | undefined }) {
  const { chainId } = useChainId();

  const icons = getIcons(chainId);
  const hasInsurance = true;

  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");
  const wrappedTokenSymbol = getConstant(chainId, "wrappedTokenSymbol");

  return (
    <div className="App-card App-card-space-between">
      <div>
        <div className="App-card-title">
          <div className="inline-flex items-center">
            <img className="mr-5 h-20" alt="GLP" src={icons?.glp} height={20} />
            GLP
          </div>
        </div>
        <div className="App-card-divider"></div>
        <div className="App-card-content">
          <div className="App-card-row">
            <div className="label">
              <Trans>Price</Trans>
            </div>
            <div>${formatKeyAmount(processedData, "glpPrice", USD_DECIMALS, GLP_PRICE_DECIMALS, true)}</div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Wallet</Trans>
            </div>
            <div>
              {processedData?.glpBalance === undefined || processedData?.glpBalanceUsd === undefined
                ? "..."
                : formatBalanceAmountWithUsd(
                    processedData.glpBalance,
                    processedData.glpBalanceUsd,
                    GLP_DECIMALS,
                    "GLP",
                    true
                  )}
            </div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Staked</Trans>
            </div>
            <div>
              {processedData?.glpBalance === undefined || processedData?.glpBalanceUsd === undefined
                ? "..."
                : formatBalanceAmountWithUsd(
                    processedData.glpBalance,
                    processedData.glpBalanceUsd,
                    GLP_DECIMALS,
                    "GLP",
                    true
                  )}
            </div>
          </div>
          <div className="App-card-divider"></div>
          <div className="App-card-row">
            <div className="label">
              <Trans>APR</Trans>
            </div>
            <div>
              <Tooltip
                handle={`${formatKeyAmount(processedData, "glpAprTotal", 2, 2, true)}%`}
                position="bottom-end"
                content={
                  <>
                    <StatsTooltipRow
                      label={`${nativeTokenSymbol} (${wrappedTokenSymbol}) APR`}
                      value={`${formatKeyAmount(processedData, "glpAprForNativeToken", 2, 2, true)}%`}
                      showDollar={false}
                    />

                    {processedData?.glpAprForEsGmx && processedData.glpAprForEsGmx > 0 && (
                      <StatsTooltipRow
                        label="Escrowed GMX APR"
                        value={`${formatKeyAmount(processedData, "glpAprForEsGmx", 2, 2, true)}%`}
                        showDollar={false}
                      />
                    )}

                    <br />

                    <Trans>
                      APRs are updated weekly on Wednesday and will depend on the fees collected for the week. <br />
                      <br />
                      Historical GLP APRs can be checked in this{" "}
                      <ExternalLink href="https://dune.com/saulius/gmx-analytics">community dashboard</ExternalLink>.
                    </Trans>
                  </>
                }
              />
            </div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Rewards</Trans>
            </div>
            <div>
              <Tooltip
                handle={`$${formatKeyAmount(processedData, "totalGlpRewardsUsd", USD_DECIMALS, 2, true)}`}
                position="bottom-end"
                content={
                  <>
                    <StatsTooltipRow
                      label={`${nativeTokenSymbol} (${wrappedTokenSymbol})`}
                      value={
                        processedData?.feeGlpTrackerRewards === undefined ||
                        processedData?.feeGlpTrackerRewardsUsd === undefined
                          ? "..."
                          : formatBalanceAmountWithUsd(
                              processedData.feeGlpTrackerRewards,
                              processedData.feeGlpTrackerRewardsUsd,
                              18,
                              undefined,
                              true
                            )
                      }
                      showDollar={false}
                    />
                    <StatsTooltipRow
                      label="Escrowed GMX"
                      value={
                        processedData?.stakedGlpTrackerRewards === undefined ||
                        processedData?.stakedGlpTrackerRewardsUsd === undefined
                          ? "..."
                          : formatBalanceAmountWithUsd(
                              processedData.stakedGlpTrackerRewards,
                              processedData.stakedGlpTrackerRewardsUsd,
                              18,
                              undefined,
                              true
                            )
                      }
                      showDollar={false}
                    />
                  </>
                }
              />
            </div>
          </div>
          <div className="App-card-divider" />
          <div className="App-card-row">
            <div className="label">
              <Trans>Total Staked</Trans>
            </div>
            <div>
              <AmountWithUsdHuman amount={processedData?.glpSupply} decimals={18} usd={processedData?.glpSupplyUsd} />
            </div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Total Supply</Trans>
            </div>
            <div>
              <AmountWithUsdHuman amount={processedData?.glpSupply} decimals={18} usd={processedData?.glpSupplyUsd} />
            </div>
          </div>

          <div />
        </div>
      </div>
      <div>
        <div className="App-card-divider" />
        <div className="App-card-buttons glp-buttons m-0">
          <Button variant="secondary" to="/buy_glp">
            <Trans>Buy GLP</Trans>
          </Button>
          <Button variant="secondary" to="/buy_glp#redeem">
            <Trans>Sell GLP</Trans>
          </Button>
          {hasInsurance && (
            <Button
              variant="secondary"
              to="https://app.insurace.io/Insurance/Cart?id=124&referrer=545066382753150189457177837072918687520318754040"
            >
              <Trans>Purchase Insurance</Trans>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
