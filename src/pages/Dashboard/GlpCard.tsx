import { Trans, t } from "@lingui/macro";
import { USD_DECIMALS } from "config/factors";
import { GLP_DECIMALS } from "lib/legacy";
import InteractivePieChart from "components/InteractivePieChart/InteractivePieChart";
import { getIcons } from "config/icons";
import { GLP_PRICE_DECIMALS } from "config/ui";
import { formatAmount } from "lib/numbers";
import AssetDropdown from "./AssetDropdown";

export function GlpCard({
  chainId,
  glpPrice,
  glpSupply,
  glpMarketCap,
  stablePercentage,
  glpPool,
}: {
  chainId: number;
  glpPrice: bigint;
  glpSupply: bigint | undefined;
  glpMarketCap: bigint | undefined;
  stablePercentage: string;
  glpPool: any;
}) {
  const currentIcons = getIcons(chainId)!;

  return (
    <div className="App-card">
      <div className="stats-block">
        <div className="App-card-title">
          <div className="App-card-title-mark">
            <div className="App-card-title-mark-icon">
              <img src={currentIcons.glp} width="40" alt="GLP Icon" />
            </div>
            <div className="App-card-title-mark-info">
              <div className="App-card-title-mark-title">GLP</div>
              <div className="App-card-title-mark-subtitle">GLP</div>
            </div>
            <div>
              <AssetDropdown assetSymbol="GLP" />
            </div>
          </div>
        </div>
        <div className="App-card-divider"></div>
        <div className="App-card-content">
          <div className="App-card-row">
            <div className="label">
              <Trans>Price</Trans>
            </div>
            <div>${formatAmount(glpPrice, USD_DECIMALS, GLP_PRICE_DECIMALS, true)}</div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Supply</Trans>
            </div>
            <div>{formatAmount(glpSupply, GLP_DECIMALS, 0, true)} GLP</div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Total Staked</Trans>
            </div>
            <div>${formatAmount(glpMarketCap, USD_DECIMALS, 0, true)}</div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Market Cap</Trans>
            </div>
            <div>${formatAmount(glpMarketCap, USD_DECIMALS, 0, true)}</div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Stablecoin Percentage</Trans>
            </div>
            <div>{stablePercentage}%</div>
          </div>
        </div>
      </div>
      <InteractivePieChart data={glpPool} label={t`GLP Pool`} />
    </div>
  );
}
