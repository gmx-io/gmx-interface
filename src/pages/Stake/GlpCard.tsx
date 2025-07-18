import { Trans } from "@lingui/macro";

import { getConstant } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { getIcons } from "config/icons";
import { GLP_PRICE_DECIMALS } from "config/ui";
import { useChainId } from "lib/chains";
import { GLP_DECIMALS, ProcessedData } from "lib/legacy";
import { formatKeyAmount } from "lib/numbers";

import { AmountWithUsdBalance, AmountWithUsdHuman } from "components/AmountWithUsd/AmountWithUsd";
import Button from "components/Button/Button";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";

export function GlpCard({ processedData }: { processedData: ProcessedData | undefined }) {
  const { chainId } = useChainId();

  const icons = getIcons(chainId);

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
              <AmountWithUsdBalance
                amount={processedData?.glpBalance}
                decimals={GLP_DECIMALS}
                symbol="GLP"
                usd={processedData?.glpBalanceUsd}
              />
            </div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Staked</Trans>
            </div>
            <div>
              <AmountWithUsdBalance
                amount={processedData?.glpBalance}
                decimals={GLP_DECIMALS}
                symbol="GLP"
                usd={processedData?.glpBalanceUsd}
              />
            </div>
          </div>
          <div className="App-card-divider"></div>
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
                        <AmountWithUsdBalance
                          amount={processedData?.feeGlpTrackerRewards}
                          decimals={18}
                          usd={processedData?.feeGlpTrackerRewardsUsd}
                        />
                      }
                      showDollar={false}
                    />
                    <StatsTooltipRow
                      label="Escrowed GMX"
                      value={
                        <AmountWithUsdBalance
                          amount={processedData?.stakedGlpTrackerRewards}
                          decimals={18}
                          usd={processedData?.stakedGlpTrackerRewardsUsd}
                        />
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
          <Button variant="secondary" to="/buy_glp#redeem">
            <Trans>Sell GLP</Trans>
          </Button>
        </div>
      </div>
    </div>
  );
}
