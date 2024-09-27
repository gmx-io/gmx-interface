import { Trans, t } from "@lingui/macro";
import TooltipComponent from "components/Tooltip/Tooltip";
import { useMemo } from "react";
import { USD_DECIMALS } from "config/factors";
import { GMX_DECIMALS } from "lib/legacy";
import InteractivePieChart from "components/InteractivePieChart/InteractivePieChart";
import ChainsStatsTooltipRow from "components/StatsTooltip/ChainsStatsTooltipRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { getIcons } from "config/icons";
import { GMX_PRICE_DECIMALS } from "config/ui";
import { bigMath } from "lib/bigmath";
import { formatAmount } from "lib/numbers";
import AssetDropdown from "./AssetDropdown";

export function GmxCard({
  chainId,
  gmxPrice,
  gmxPriceFromArbitrum,
  gmxPriceFromAvalanche,
  totalGmxSupply,
  stakedGmxSupplyUsd,
  stakedGmxArbitrum,
  stakedGmxAvalanche,
  gmxMarketCap,
  totalStakedGmx,
  totalGmxInLiquidity,
}: {
  chainId: number;
  gmxPrice: bigint | undefined;
  gmxPriceFromArbitrum: bigint | undefined;
  gmxPriceFromAvalanche: bigint | undefined;
  totalGmxSupply: bigint | undefined;
  stakedGmxSupplyUsd: bigint | undefined;
  stakedGmxArbitrum: bigint | undefined;
  stakedGmxAvalanche: bigint | undefined;
  gmxMarketCap: bigint | undefined;
  totalStakedGmx: bigint;
  totalGmxInLiquidity: bigint;
}) {
  const currentIcons = getIcons(chainId)!;

  const stakedEntries = useMemo(
    () => ({
      "Staked on Arbitrum": stakedGmxArbitrum,
      "Staked on Avalanche": stakedGmxAvalanche,
    }),
    [stakedGmxArbitrum, stakedGmxAvalanche]
  );

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

  return (
    <div className="App-card">
      <div className="stats-block">
        <div className="App-card-title">
          <div className="App-card-title-mark">
            <div className="App-card-title-mark-icon">
              <img src={currentIcons.gmx} width="40" alt="GMX Token Icon" />
            </div>
            <div className="App-card-title-mark-info">
              <div className="App-card-title-mark-title">GMX</div>
              <div className="App-card-title-mark-subtitle">GMX</div>
            </div>
            <div>
              <AssetDropdown assetSymbol="GMX" />
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
              {gmxPrice === undefined || gmxPrice === 0n ? (
                "..."
              ) : (
                <TooltipComponent
                  position="bottom-end"
                  className="whitespace-nowrap"
                  handle={"$" + formatAmount(gmxPrice, USD_DECIMALS, GMX_PRICE_DECIMALS, true)}
                  renderContent={() => (
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
                  )}
                />
              )}
            </div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Supply</Trans>
            </div>
            <div>{formatAmount(totalGmxSupply, GMX_DECIMALS, 0, true)} GMX</div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Total Staked</Trans>
            </div>
            <div>
              <TooltipComponent
                position="bottom-end"
                className="whitespace-nowrap"
                handle={`$${formatAmount(stakedGmxSupplyUsd, USD_DECIMALS, 0, true)}`}
                renderContent={() => (
                  <ChainsStatsTooltipRow
                    decimalsForConversion={GMX_DECIMALS}
                    showDollar={false}
                    entries={stakedEntries}
                  />
                )}
              />
            </div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Market Cap</Trans>
            </div>
            <div>${formatAmount(gmxMarketCap, USD_DECIMALS, 0, true)}</div>
          </div>
        </div>
      </div>
      <InteractivePieChart data={gmxDistributionData} label={t`Distribution`} />
    </div>
  );
}
