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

import Footer from "components/Footer/Footer";
import { GlvList } from "components/Synthetics/GmList/GlvList";
import { GmList } from "components/Synthetics/GmList/GmList";

import PoolsTimeRangeFilter from "./PoolsTimeRangeFilter";
import { usePoolsIsMobilePage } from "./usePoolsIsMobilePage";

export default function Pools() {
  const { timeRange, setTimeRange } = usePoolsTimeRange();

  const { chainId } = useChainId();

  const period = useMemo(() => convertPoolsTimeRangeToPeriod(timeRange), [timeRange]);

  const apyPeriod = useMemo(() => convertPoolsTimeRangeToApyPeriod(timeRange), [timeRange]);

  const {
    marketsTokensApyData,
    marketsTokensIncentiveAprData,
    glvTokensIncentiveAprData,
    marketsTokensLidoAprData,
    glvApyInfoData,
  } = useGmMarketsApy(chainId, { period: apyPeriod });

  const { tokensData } = useTokensDataRequest(chainId);
  const { marketsInfoData: onlyGmMarketsInfoData } = useMarketsInfoRequest(chainId);
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
    <div className="default-container page-layout">
      <div
        className={cx("mb-24 grid", {
          "grid-cols-1": isMobile,
          "grid-cols-2": !isMobile,
        })}
      >
        <PoolsTvl />

        <div
          className={cx("", {
            "ml-0 mt-28": isMobile,
            "ml-auto mt-auto": !isMobile,
          })}
        >
          <PoolsTimeRangeFilter timeRange={timeRange} setTimeRange={setTimeRange} />
        </div>
      </div>

      <div className="flex flex-col gap-16">
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

      <Footer />
    </div>
  );
}

function PoolsTvl() {
  const { chainId } = useChainId();
  const v2Stats = useV2Stats(chainId);

  const tvl = v2Stats?.totalGMLiquidity;

  return (
    <div className="flex flex-col">
      <span className="text-h1">{formatUsd(tvl, { displayDecimals: 0 })}</span>
      <span className="text-body-medium text-slate-100">TVL in vaults and pools.</span>
    </div>
  );
}
