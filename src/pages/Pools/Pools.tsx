import cx from "classnames";

import { BOTANIX } from "config/chains";
import { useGmGlvPerformanceAnnualized } from "domain/synthetics/markets/useGmGlvPerformanceAnnualized";
import { useGmGlvPerformanceSnapshots } from "domain/synthetics/markets/useGmGlvPerformanceSnapshots";
import { useGmMarketsApy } from "domain/synthetics/markets/useGmMarketsApy";
import { usePoolsTimeRange } from "domain/synthetics/markets/usePoolsTimeRange";
import useV2Stats from "domain/synthetics/stats/useV2Stats";
import { useChainId } from "lib/chains";
import { formatUsd } from "lib/numbers";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { ChainContentHeader } from "components/Synthetics/ChainContentHeader/ChainContentHeader";
import { GlvList } from "components/Synthetics/GmList/GlvList";
import { GmList } from "components/Synthetics/GmList/GmList";

import PoolsTimeRangeFilter from "./PoolsTimeRangeFilter";
import { usePoolsIsMobilePage } from "./usePoolsIsMobilePage";

export default function Pools() {
  const { timeRange, setTimeRange } = usePoolsTimeRange();

  const { chainId, srcChainId } = useChainId();

  const {
    marketsTokensApyData,
    marketsTokensIncentiveAprData,
    glvTokensIncentiveAprData,
    marketsTokensLidoAprData,
    glvApyInfoData,
  } = useGmMarketsApy(chainId, srcChainId, { period: timeRange });

  const { performance } = useGmGlvPerformanceAnnualized({
    chainId,
    period: timeRange,
  });

  const { performanceSnapshots } = useGmGlvPerformanceSnapshots({
    chainId,
    period: timeRange,
  });

  const isMobile = usePoolsIsMobilePage();

  const isBotanix = chainId === BOTANIX;

  return (
    <AppPageLayout header={<ChainContentHeader />}>
      <div
        className={cx("mb-24 grid w-full flex-col", {
          "grid-cols-1": isMobile,
          "grid-cols-2": !isMobile,
        })}
      >
        <PoolsTvl />

        <div
          className={cx("flex-end flex", {
            "ml-0 mt-28": isMobile,
            "ml-auto mt-auto": !isMobile,
          })}
        >
          <PoolsTimeRangeFilter timeRange={timeRange} setTimeRange={setTimeRange} />
        </div>
      </div>

      <div className="flex grow flex-col gap-16 lg:overflow-hidden">
        {!isBotanix && (
          <GlvList
            marketsTokensApyData={marketsTokensApyData}
            marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
            glvTokensIncentiveAprData={glvTokensIncentiveAprData}
            marketsTokensLidoAprData={marketsTokensLidoAprData}
            glvTokensApyData={glvApyInfoData}
            performance={performance}
            performanceSnapshots={performanceSnapshots}
            isDeposit
          />
        )}

        <GmList
          glvTokensApyData={glvApyInfoData}
          glvTokensIncentiveAprData={glvTokensIncentiveAprData}
          marketsTokensApyData={marketsTokensApyData}
          marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
          marketsTokensLidoAprData={marketsTokensLidoAprData}
          performance={performance}
          performanceSnapshots={performanceSnapshots}
          isDeposit
        />
      </div>
    </AppPageLayout>
  );
}

function PoolsTvl() {
  const { chainId } = useChainId();
  const v2Stats = useV2Stats(chainId);

  const tvl = v2Stats?.totalGMLiquidity;

  return (
    <div className="flex flex-col gap-8">
      <span className="text-h1 normal-nums">{formatUsd(tvl, { displayDecimals: 0 })}</span>
      <span className="text-body-medium font-medium text-typography-secondary">TVL in vaults and pools.</span>
    </div>
  );
}
