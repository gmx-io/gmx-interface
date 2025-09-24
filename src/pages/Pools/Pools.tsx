import cx from "classnames";
import { useMemo } from "react";

import { BOTANIX } from "config/chains";
import { selectAccount } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { isGlvEnabled } from "domain/synthetics/markets/glv";
import { useGlvMarketsInfo } from "domain/synthetics/markets/useGlvMarkets";
import { useGmGlvPerformance } from "domain/synthetics/markets/useGmGlvPerformance";
import { useGmMarketsApy } from "domain/synthetics/markets/useGmMarketsApy";
import { useMarketsInfoRequest } from "domain/synthetics/markets/useMarketsInfoRequest";
import { convertPoolsTimeRangeToApyPeriod, usePoolsTimeRange } from "domain/synthetics/markets/usePoolsTimeRange";
import { convertPoolsTimeRangeToPeriod } from "domain/synthetics/markets/usePoolsTimeRange";
import useV2Stats from "domain/synthetics/stats/useV2Stats";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatUsd } from "lib/numbers";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { ChainContentHeader } from "components/ChainContentHeader/ChainContentHeader";
import { GlvList } from "components/GmList/GlvList";
import { GmList } from "components/GmList/GmList";

import PoolsTimeRangeFilter from "./PoolsTimeRangeFilter";
import { usePoolsIsMobilePage } from "./usePoolsIsMobilePage";

export default function Pools() {
  const { timeRange, setTimeRange } = usePoolsTimeRange();

  const { chainId, srcChainId } = useChainId();

  const period = useMemo(() => convertPoolsTimeRangeToPeriod(timeRange), [timeRange]);

  const apyPeriod = useMemo(() => convertPoolsTimeRangeToApyPeriod(timeRange), [timeRange]);

  const {
    marketsTokensApyData,
    marketsTokensIncentiveAprData,
    glvTokensIncentiveAprData,
    marketsTokensLidoAprData,
    glvApyInfoData,
  } = useGmMarketsApy(chainId, srcChainId, { period: apyPeriod });

  const { tokensData } = useTokensDataRequest(chainId, srcChainId);
  const { marketsInfoData: onlyGmMarketsInfoData } = useMarketsInfoRequest(chainId, { tokensData });
  const enabledGlv = isGlvEnabled(chainId);
  const account = useSelector(selectAccount);

  const { glvData } = useGlvMarketsInfo(enabledGlv, {
    marketsInfoData: onlyGmMarketsInfoData,
    tokensData,
    chainId,
    account,
  });

  const { glvPerformance, gmPerformance, glvPerformanceSnapshots, gmPerformanceSnapshots } = useGmGlvPerformance({
    chainId,
    period,
    gmData: onlyGmMarketsInfoData,
    glvData,
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
            glvPerformance={glvPerformance}
            gmPerformance={gmPerformance}
            glvPerformanceSnapshots={glvPerformanceSnapshots}
            gmPerformanceSnapshots={gmPerformanceSnapshots}
            isDeposit
          />
        )}

        <GmList
          glvTokensApyData={glvApyInfoData}
          glvTokensIncentiveAprData={glvTokensIncentiveAprData}
          marketsTokensApyData={marketsTokensApyData}
          marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
          marketsTokensLidoAprData={marketsTokensLidoAprData}
          glvPerformance={glvPerformance}
          gmPerformance={gmPerformance}
          glvPerformanceSnapshots={glvPerformanceSnapshots}
          gmPerformanceSnapshots={gmPerformanceSnapshots}
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
