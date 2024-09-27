import { Trans, t } from "@lingui/macro";
import groupBy from "lodash/groupBy";
import { useMemo } from "react";

import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { getIcons } from "config/icons";
import { TOKEN_COLOR_MAP } from "config/tokens";
import {
  getMarketIndexName,
  getMarketPoolName,
  useMarketTokensData,
  useMarketsInfoRequest,
} from "domain/synthetics/markets";
import { convertToUsd } from "domain/synthetics/tokens";
import { bigMath } from "lib/bigmath";
import { useChainId } from "lib/chains";
import { BN_ZERO, formatTokenAmount, formatUsd } from "lib/numbers";
import { EMPTY_OBJECT } from "lib/objects";

import InteractivePieChart from "components/InteractivePieChart/InteractivePieChart";
import AssetDropdown from "./AssetDropdown";

export function GmCard() {
  const { chainId } = useChainId();
  const currentIcons = getIcons(chainId)!;
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: true, withGlv: false });
  const { marketsInfoData } = useMarketsInfoRequest(chainId);

  const totalGMSupply = useMemo(
    () =>
      Object.values(marketTokensData || {}).reduce(
        (acc, { totalSupply, decimals, prices }) => ({
          amount: acc.amount + (totalSupply ?? 0n),
          usd: acc.usd + (convertToUsd(totalSupply, decimals, prices?.maxPrice) ?? 0n),
        }),
        { amount: BN_ZERO, usd: BN_ZERO }
      ),
    [marketTokensData]
  );

  const chartData = useMemo(() => {
    if (totalGMSupply?.amount === undefined || totalGMSupply?.amount <= 0 || !marketsInfoData) return [];

    const poolsByIndexToken = groupBy(
      Object.values(marketsInfoData || EMPTY_OBJECT),
      (market) => market[market.isSpotOnly ? "marketTokenAddress" : "indexTokenAddress"]
    );

    return Object.values(poolsByIndexToken || EMPTY_OBJECT).map((pools) => {
      const totalMarketUSD = pools.reduce((acc, pool) => acc + pool.poolValueMax, BN_ZERO);

      const marketInfo = pools[0];
      const indexToken = marketInfo.isSpotOnly ? marketInfo.shortToken : marketInfo.indexToken;
      const marketSupplyPercentage =
        Number(bigMath.mulDiv(totalMarketUSD, BASIS_POINTS_DIVISOR_BIGINT, totalGMSupply.usd)) / 100;

      return {
        fullName: marketInfo.name,
        name: marketInfo.isSpotOnly ? getMarketPoolName(marketInfo) : getMarketIndexName(marketInfo),
        value: marketSupplyPercentage,
        color: TOKEN_COLOR_MAP[indexToken.baseSymbol ?? indexToken.symbol ?? "default"] ?? TOKEN_COLOR_MAP.default,
      };
    });
  }, [marketsInfoData, totalGMSupply]);

  return (
    <div className="App-card">
      <div className="stats-block">
        <div className="App-card-title">
          <div className="App-card-title-mark">
            <div className="App-card-title-mark-icon">
              <img src={currentIcons.gm} width="40" alt="GM Icon" />
            </div>
            <div className="App-card-title-mark-info">
              <div className="App-card-title-mark-title">GM</div>
              <div className="App-card-title-mark-subtitle">GM</div>
            </div>
            <div>
              <AssetDropdown assetSymbol="GM" />
            </div>
          </div>
        </div>
        <div className="App-card-divider"></div>
        <div className="App-card-content">
          <div className="App-card-row">
            <div className="label">
              <Trans>Supply</Trans>
            </div>

            <div>
              {formatTokenAmount(totalGMSupply?.amount, 18, "GM", {
                useCommas: true,
                fallbackToZero: true,
                displayDecimals: 0,
              })}
            </div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Market Cap</Trans>
            </div>
            <div>
              {formatUsd(totalGMSupply?.usd, {
                displayDecimals: 0,
              })}
            </div>
          </div>
        </div>
      </div>
      <InteractivePieChart data={chartData} label={t`GM Markets`} />
    </div>
  );
}
