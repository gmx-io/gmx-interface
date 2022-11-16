import { Trans } from "@lingui/macro";
import { GLP_DECIMALS, USD_DECIMALS } from "lib/legacy";
import Tooltip from "../../Tooltip/Tooltip";
import glp40Icon from "img/ic_glp_40.svg";
import arbitrum16Icon from "img/ic_arbitrum_16.svg";
import avalanche16Icon from "img/ic_avalanche_16.svg";
import { ARBITRUM } from "config/chains";
import { useChainId } from "lib/chains";
import { bigNumberify, formatAmount } from "lib/numbers";
import AssetDropdown from "pages/Dashboard/AssetDropdown";
import { SyntheticsMarket } from "domain/synthetics/types";

import "./GMStats.scss";

type Props = {
  market: SyntheticsMarket;
};

export function GMStats(p: Props) {
  const { chainId } = useChainId();

  return (
    <div className="App-card GMMarketInfo-card">
      <div className="App-card-title">
        <div className="App-card-title-mark">
          <div className="App-card-title-mark-icon">
            <img src={glp40Icon} alt="glp40Icon" />
            {chainId === ARBITRUM ? (
              <img src={arbitrum16Icon} alt="arbitrum16Icon" className="selected-network-symbol" />
            ) : (
              <img src={avalanche16Icon} alt="avalanche16Icon" className="selected-network-symbol" />
            )}
          </div>
          <div className="App-card-title-mark-info">
            <div className="App-card-title-mark-title">GM</div>
            <div className="App-card-title-mark-subtitle">GMX Market tokens</div>
          </div>
          <div>
            <AssetDropdown assetSymbol="GM" assetInfo={{}} />
          </div>
        </div>
      </div>
      <div className="App-card-divider" />
      <div className="App-card-content">
        <div className="App-card-row">
          <div className="label">
            <Trans>Perp</Trans>
          </div>
          <div className="value">{p.market.perp}</div>
        </div>

        <div className="App-card-row">
          <div className="label">
            <Trans>Long Collateral</Trans>
          </div>
          <div className="value">{p.market.longCollateralSymbol}</div>
        </div>

        <div className="App-card-row">
          <div className="label">
            <Trans>Short Collateral</Trans>
          </div>
          <div className="value">{p.market.shortCollateralSymbol}</div>
        </div>

        <div className="App-card-divider" />

        <div className="App-card-row">
          <div className="label">
            <Trans>Price</Trans>
          </div>
          <div className="value">$100.000</div>
        </div>

        <div className="App-card-row">
          <div className="label">
            <Trans>Wallet</Trans>
          </div>
          <div className="value">
            {formatAmount(bigNumberify(100000), GLP_DECIMALS, 4, true)} GM ($
            {formatAmount(bigNumberify(100000), USD_DECIMALS, 2, true)})
          </div>
        </div>

        <div className="App-card-row">
          <div className="label">
            <Trans>Market worth</Trans>
          </div>
          <div className="value">
            {formatAmount(bigNumberify(100000), GLP_DECIMALS, 4, true)} GM ($
            {formatAmount(bigNumberify(100000), USD_DECIMALS, 2, true)})
          </div>
        </div>
      </div>
      <div className="App-card-divider" />
      <div className="App-card-content">
        <div className="App-card-row">
          <div className="label">
            <Trans>APR</Trans>
          </div>
          <div className="value">
            <Tooltip
              handle={`${formatAmount(bigNumberify(1000000), 2, 2, true)}%`}
              position="right-bottom"
              renderContent={() => {
                return (
                  <>
                    {/* <StatsTooltipRow
                      label={t`${nativeTokenSymbol} (${wrappedTokenSymbol}) APR`}
                      value={`${formatAmount(feeGlpTrackerApr, 2, 2, false)}%`}
                      showDollar={false}
                    />
                    <StatsTooltipRow
                      label={t`Escrowed GMX APR`}
                      value={`${formatAmount(stakedGlpTrackerApr, 2, 2, false)}%`}
                      showDollar={false}
                    /> */}
                  </>
                );
              }}
            />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Total Supply</Trans>
          </div>
          <div className="value">
            <Trans>
              {formatAmount(bigNumberify(1000000), GLP_DECIMALS, 4, true)} GM ($
              {formatAmount(bigNumberify(1000000), USD_DECIMALS, 2, true)})
            </Trans>
          </div>
        </div>
      </div>
    </div>
  );
}
