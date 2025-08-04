import { Trans, t } from "@lingui/macro";
import { useMemo } from "react";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { getIcons } from "config/icons";
import { GMX_PRICE_DECIMALS } from "config/ui";
import { useTotalGmxStaked } from "domain/legacy";
import { GMX_DECIMALS } from "lib/legacy";
import { expandDecimals, formatAmount, formatAmountHuman } from "lib/numbers";
import { sumBigInts } from "lib/sumBigInts";
import { bigMath } from "sdk/utils/bigmath";

import { AmountWithUsdHuman } from "components/AmountWithUsd/AmountWithUsd";
import { AppCard, AppCardSection, AppCardSplit } from "components/AppCard/AppCard";
import Button from "components/Button/Button";
import InteractivePieChart from "components/InteractivePieChart/InteractivePieChart";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipComponent from "components/Tooltip/Tooltip";

export function GmxCard({
  chainId,
  gmxPrice,
  gmxPriceFromArbitrum,
  gmxPriceFromAvalanche,
  totalGmxSupply,
  gmxMarketCap,
  totalGmxInLiquidity,
}: {
  chainId: number;
  gmxPrice: bigint | undefined;
  gmxPriceFromArbitrum: bigint | undefined;
  gmxPriceFromAvalanche: bigint | undefined;
  totalGmxSupply: bigint | undefined;
  gmxMarketCap: bigint | undefined;
  totalGmxInLiquidity: bigint;
}) {
  const currentIcons = getIcons(chainId)!;

  let { [AVALANCHE]: stakedGmxAvalanche, [ARBITRUM]: stakedGmxArbitrum, total: totalStakedGmx } = useTotalGmxStaked();

  const stakedGmxArbitrumUsd =
    gmxPriceFromArbitrum !== undefined && stakedGmxArbitrum !== undefined
      ? bigMath.mulDiv(stakedGmxArbitrum, gmxPriceFromArbitrum, expandDecimals(1, GMX_DECIMALS))
      : undefined;
  const stakedGmxAvalancheUsd =
    gmxPriceFromAvalanche !== undefined && stakedGmxAvalanche !== undefined
      ? bigMath.mulDiv(stakedGmxAvalanche, gmxPriceFromAvalanche, expandDecimals(1, GMX_DECIMALS))
      : undefined;
  const totalStakedGmxUsd = sumBigInts(stakedGmxArbitrumUsd, stakedGmxAvalancheUsd);

  let stakedPercent = 0;

  if (totalGmxSupply !== undefined && totalGmxSupply !== 0n && totalStakedGmx !== 0n) {
    stakedPercent = Number(bigMath.mulDiv(totalStakedGmx, 100n, totalGmxSupply));
  }

  let liquidityPercent = 0;

  if (totalGmxSupply !== undefined && totalGmxSupply !== 0n && totalGmxInLiquidity !== undefined) {
    liquidityPercent = Number(bigMath.mulDiv(totalGmxInLiquidity, 100n, totalGmxSupply));
  }

  let notStakedPercent = 100 - stakedPercent - liquidityPercent;

  const gmxDistributionData = useMemo(() => {
    let arr = [
      {
        name: t`staked`,
        value: stakedPercent,
        color: "#4353fa",
      },
      {
        name: t`in liquidity`,
        value: liquidityPercent,
        color: "#0598fa",
      },
      {
        name: t`not staked`,
        value: notStakedPercent,
        color: "#5c0af5",
      },
    ];

    return arr;
  }, [liquidityPercent, notStakedPercent, stakedPercent]);

  const formattedTotalStakedGmxUsd = formatAmountHuman(totalStakedGmxUsd, USD_DECIMALS, true, 2);

  return (
    <AppCard>
      <AppCardSplit
        className="grid grid-cols-[1fr_auto] max-md:grid-cols-1"
        leftClassName="max-md:border-b max-md:border-r-0"
        left={
          <>
            <AppCardSection>
              <div className="flex items-center justify-between">
                <div className="App-card-title-mark">
                  <div className="App-card-title-mark-icon">
                    <img src={currentIcons.gmx} width="40" alt="GMX Token Icon" />
                  </div>
                  <div className="App-card-title-mark-info">
                    <div className="App-card-title-mark-title">GMX</div>
                    <div className="App-card-title-mark-subtitle">GMX</div>
                  </div>
                </div>
                <div className="h-32">
                  <Button size="small" variant="secondary" to="/buy_gmx">
                    <img src={currentIcons.gmx} width="16" alt="GMX Icon" />
                    <Trans>Buy GMX</Trans>
                  </Button>
                </div>
              </div>
              <div className="text-13 text-slate-100">
                GMX is the utility and governance token. Accrues 30% and 27% of V1 and V2 markets generated fees,
                respectively.
              </div>
            </AppCardSection>

            <AppCardSection>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Price</Trans>
                </div>
                <div>
                  {gmxPrice === undefined || gmxPrice === 0n ? (
                    "..."
                  ) : (
                    <TooltipComponent
                      position="bottom-end"
                      className="whitespace-nowrap"
                      handle={
                        <span className="numbers">
                          {"$" + formatAmount(gmxPrice, USD_DECIMALS, GMX_PRICE_DECIMALS, true)}
                        </span>
                      }
                      content={
                        <>
                          <StatsTooltipRow
                            label={t`Price on Arbitrum`}
                            value={formatAmount(gmxPriceFromArbitrum, USD_DECIMALS, GMX_PRICE_DECIMALS, true)}
                            showDollar={true}
                          />
                          <StatsTooltipRow
                            label={t`Price on Avalanche`}
                            value={formatAmount(gmxPriceFromAvalanche, USD_DECIMALS, GMX_PRICE_DECIMALS, true)}
                            showDollar={true}
                          />
                        </>
                      }
                    />
                  )}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Total Supply</Trans>
                </div>
                <div>
                  <TooltipComponent
                    position="bottom-end"
                    handle={
                      <span className="numbers">{formatAmountHuman(totalGmxSupply, GMX_DECIMALS, false, 2)}</span>
                    }
                    content={t`Total circulating supply of GMX tokens.`}
                  />
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Total Staked</Trans>
                </div>
                <div>
                  <TooltipComponent
                    position="bottom-end"
                    tooltipClassName="!max-w-[450px]"
                    handle={<span className="numbers">{formattedTotalStakedGmxUsd}</span>}
                    content={
                      <>
                        <StatsTooltipRow
                          label={t`Staked on Arbitrum`}
                          value={
                            <AmountWithUsdHuman
                              amount={stakedGmxArbitrum}
                              usd={stakedGmxArbitrumUsd}
                              decimals={GMX_DECIMALS}
                              symbol="GMX"
                            />
                          }
                          showDollar={false}
                        />
                        <StatsTooltipRow
                          label={t`Staked on Avalanche`}
                          value={
                            <AmountWithUsdHuman
                              amount={stakedGmxAvalanche}
                              usd={stakedGmxAvalancheUsd}
                              decimals={GMX_DECIMALS}
                              symbol="GMX"
                            />
                          }
                          showDollar={false}
                        />
                        <div className="!my-8 h-1 bg-gray-800" />
                        <StatsTooltipRow
                          label={t`Total`}
                          value={
                            <AmountWithUsdHuman
                              amount={totalStakedGmx}
                              usd={totalStakedGmxUsd}
                              decimals={GMX_DECIMALS}
                              symbol="GMX"
                            />
                          }
                          showDollar={false}
                        />
                      </>
                    }
                  />
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Market Cap</Trans>
                </div>
                <div>
                  <span className="numbers">{formatAmountHuman(gmxMarketCap, USD_DECIMALS, true, 2)}</span>
                </div>
              </div>
            </AppCardSection>
          </>
        }
        right={
          <AppCardSection>
            <InteractivePieChart data={gmxDistributionData} label={t`Distribution`} />
          </AppCardSection>
        }
      ></AppCardSplit>
    </AppCard>
  );
}
