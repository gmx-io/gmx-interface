import { t } from "@lingui/macro";
import { ReactNode, useMemo } from "react";

import { usePoolsTimeRange } from "domain/synthetics/markets/poolsTimeRange";
import { convertPoolsTimeRangeToPeriod } from "domain/synthetics/markets/poolsTimeRange";
import { useGmMarketsApy } from "domain/synthetics/markets/useGmMarketsApy";
import { usePools } from "domain/synthetics/markets/usePools";
import { usePoolsTvl } from "domain/synthetics/markets/usePoolsTvl";
import { useChainId } from "lib/chains";
import { formatUsd } from "lib/numbers";

import Footer from "components/Footer/Footer";
import { GlvList } from "components/Synthetics/GmList/GlvList";
import { GmList } from "components/Synthetics/GmList/GmList";

import PoolsTimeRangeFilter from "./PoolsTimeRangeFilter";


export default function Pools() {
  const { timeRange, setTimeRange } = usePoolsTimeRange();

  const { chainId } = useChainId();

  const period = useMemo(() => convertPoolsTimeRangeToPeriod(timeRange), [timeRange]);

  const {
    marketsTokensApyData,
    marketsTokensIncentiveAprData,
    glvTokensIncentiveAprData,
    marketsTokensLidoAprData,
    glvApyInfoData,
  } = useGmMarketsApy(chainId);

  return (
    <div className="default-container page-layout">
      <div className="mb-24 grid grid-cols-2">
        <PoolsTvl />

        <div className="ml-auto mt-auto">
          <PoolsTimeRangeFilter timeRange={timeRange} setTimeRange={setTimeRange} />
        </div>
      </div>

      <div className="flex flex-col gap-16">
        <PoolsCard
          title={t`GLV Vault`}
          description={t`Yield-optimized vaults supporting trading across multiple GMX markets`}
        >
          <GlvList
            marketsTokensApyData={marketsTokensApyData}
            marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
            glvTokensIncentiveAprData={glvTokensIncentiveAprData}
            marketsTokensLidoAprData={marketsTokensLidoAprData}
            glvTokensApyData={glvApyInfoData}
            shouldScrollToTop
            isDeposit
          />
        </PoolsCard>

        <PoolsCard
          title={t`GM Pool`}
          description={t`Pools allowing provision of liquidity including single and native asset opportunities`}
        >
          <GmList
            glvTokensApyData={glvApyInfoData}
            glvTokensIncentiveAprData={glvTokensIncentiveAprData}
            marketsTokensApyData={marketsTokensApyData}
            marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
            marketsTokensLidoAprData={marketsTokensLidoAprData}
            shouldScrollToTop
            isDeposit
          />
        </PoolsCard>
      </div>

      <Footer />
    </div>
  );
}

function PoolsTvl() {
  const { chainId } = useChainId();
  const tvl = usePoolsTvl({ chainId });

  return (
    <div className="flex flex-col">
      <span className="text-h1">{formatUsd(tvl, { displayDecimals: 0 })}</span>
      <span className="text-body-medium text-slate-100">TVL in Vaults and Pools</span>
    </div>
  );
}

function PoolsCard({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: ReactNode;
  description: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-6 bg-slate-900 p-16">
      <span className="text-body-large mb-8">{title}</span>
      <span className="text-body-medium mb-16 text-slate-100">{description}</span>
      <div>{children}</div>
    </div>
  );
}
