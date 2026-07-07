import { Trans } from "@lingui/macro";
import { forwardRef, useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { formatPercentage } from "lib/numbers";

import { ShareCardFrame } from "components/ShareModal/ShareCardFrame";
import { ShareCardPnlValue } from "components/ShareModal/ShareCardPnlValue";
import { ShareCardQRCode } from "components/ShareModal/ShareCardQRCode";
import { ShareCardReferralCodeStat } from "components/ShareModal/ShareCardReferralCodeStat";
import { ShareCardStat } from "components/ShareModal/ShareCardStat";

import type { PnlHistoricalData } from "./usePnlHistoricalData";

type Props = {
  pnlBps: bigint;
  pnlUsd: bigint;
  winsLossesRatioBps: bigint | undefined;
  tradesCount: number;
  periodLabel: string;
  pnlHistory: PnlHistoricalData;
  loading: boolean;
  sharePerformanceBgImg: string | null;
  referralCodeOwnerKind: "created" | "used" | undefined;
  code: string | undefined;
  showPnlAmounts: boolean;
};

const CHART_MARGIN = { top: 0, right: 0, bottom: 0, left: 0 };

export const PerformanceShareCard = forwardRef<HTMLDivElement, Props>(
  (
    {
      pnlBps,
      pnlUsd,
      winsLossesRatioBps,
      tradesCount,
      periodLabel,
      pnlHistory,
      loading,
      sharePerformanceBgImg,
      referralCodeOwnerKind,
      code,
      showPnlAmounts,
    },
    ref
  ) => {
    // padding points have no values and would prevent rendering a lone data point
    const chartPoints = useMemo(
      () => pnlHistory.filter((point) => point.cumulativePnlFloat !== undefined),
      [pnlHistory]
    );

    return (
      <ShareCardFrame ref={ref} bgImgUrl={sharePerformanceBgImg} loading={loading} cardClassName="flex flex-col">
        <div className="flex grow justify-between gap-12">
          <div className="relative -ml-20 grow max-md:-ml-16">
            <div className="absolute inset-x-0 bottom-0 top-[25%]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartPoints} margin={CHART_MARGIN}>
                  <defs>
                    <linearGradient id="performance-share-pnl-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="-45%" stopColor="#A4C3F9" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#A4C3F9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="cumulativePnlFloat"
                    stroke="#A4C3F9"
                    fill="url(#performance-share-pnl-gradient)"
                    strokeWidth={2}
                    dot={chartPoints.length === 1}
                    baseValue="dataMin"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <ShareCardQRCode code={code} className="shrink-0" />
        </div>

        <div className="flex flex-col gap-12 max-md:gap-4 max-smallMobile:gap-0">
          <ShareCardPnlValue
            pnlPercentage={pnlBps}
            pnlUsd={pnlUsd}
            showPnlAmounts={showPnlAmounts}
            zeroClassName="text-white"
          />
          <div className="flex gap-20 max-md:gap-10">
            <ShareCardStat label={<Trans>Period</Trans>}>{periodLabel}</ShareCardStat>
            <ShareCardStat label={<Trans>Win rate</Trans>}>{formatPercentage(winsLossesRatioBps ?? 0n)}</ShareCardStat>
            <ShareCardStat label={<Trans>Trades</Trans>}>{tradesCount}</ShareCardStat>

            <ShareCardReferralCodeStat referralCodeOwnerKind={referralCodeOwnerKind} code={code} />
          </div>
        </div>
      </ShareCardFrame>
    );
  }
);
