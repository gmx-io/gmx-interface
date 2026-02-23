import { t, Trans } from "@lingui/macro";
import groupBy from "lodash/groupBy";
import { useMemo } from "react";

import { BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "config/factors";
import { getIcons } from "config/icons";
import {
  getMarketIndexName,
  getMarketPoolName,
  useMarketTokensData,
  useMarketsInfoRequest,
} from "domain/synthetics/markets";
import { convertToUsd, useTokensDataRequest } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { BN_ZERO, formatAmountHuman } from "lib/numbers";
import { EMPTY_OBJECT } from "lib/objects";
import { TOKEN_COLOR_MAP } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";

import { AppCard, AppCardSection, AppCardSplit } from "components/AppCard/AppCard";
import Button from "components/Button/Button";
import InteractivePieChart from "components/InteractivePieChart/InteractivePieChart";

export function GmCard() {
  const { chainId, srcChainId } = useChainId();
  const currentIcons = getIcons(chainId)!;
  const { marketTokensData } = useMarketTokensData(chainId, srcChainId, { isDeposit: true, withGlv: false });
  const { tokensData } = useTokensDataRequest(chainId, srcChainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId, { tokensData });

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
    <AppCard>
      <AppCardSplit
        className="grid h-full grid-cols-[1fr_minmax(250px,auto)] max-md:grid-cols-1"
        leftClassName="max-md:border-b-1/2 max-md:border-r-0"
        left={
          <>
            <AppCardSection>
              <div className="flex flex-wrap items-center justify-between gap-8">
                <div className="flex items-center gap-8">
                  <div className="App-card-title-mark-icon">
                    <img src={currentIcons.gm} width="40" alt={t`GM icon`} />
                  </div>
                  <div>
                    <div className="text-body-medium font-medium">
                      <Trans>GM</Trans>
                    </div>
                  </div>
                </div>
                <div className="h-32">
                  <Button size="small" variant="secondary" to="/pools">
                    <img src={currentIcons.gm} width="16" alt={t`GMX icon`} />
                    <Trans>Buy GM</Trans>
                  </Button>
                </div>
              </div>
              <div className="text-13 text-typography-secondary">
                <Trans>
                  GM is the liquidity provider token for GMX V2 markets. Accrues 63% of the V2 markets generated fees.
                </Trans>
              </div>
            </AppCardSection>
            <AppCardSection>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Supply</Trans>
                </div>
                <div>
                  <span className="numbers">{formatAmountHuman(totalGMSupply?.amount, 18, false, 2)}</span>
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Market cap</Trans>
                </div>
                <div>
                  <span className="numbers">{formatAmountHuman(totalGMSupply?.usd, USD_DECIMALS, true, 2)}</span>
                </div>
              </div>
            </AppCardSection>
          </>
        }
        right={
          <AppCardSection>
            <InteractivePieChart data={chartData} label={t`GM markets`} />
          </AppCardSection>
        }
      />
    </AppCard>
  );
}
