import { Trans } from "@lingui/macro";
import cx from "classnames";
import { QRCodeSVG } from "qrcode.react";
import { forwardRef, useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { getHomeUrl } from "lib/legacy";
import { formatPercentage, formatUsd } from "lib/numbers";
import { useBreakpoints } from "lib/useBreakpoints";

import SpinningLoader from "components/Loader/SpinningLoader";

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
    const { isMobile } = useBreakpoints();
    const homeURL = getHomeUrl();
    const style = useMemo(() => ({ backgroundImage: `url(${sharePerformanceBgImg})` }), [sharePerformanceBgImg]);

    const pnlClassName = cx({
      "text-[#0FDE8D]": pnlBps > 0n,
      "text-[#FF506A]": pnlBps < 0n,
      "text-white": pnlBps === 0n,
    });

    const qrCodeUrl = code ? `${homeURL}/#/?ref=${code}` : `${homeURL}`;

    return (
      <div className="relative max-w-[460px] grow overflow-hidden rounded-9">
        <div
          ref={ref}
          className="flex aspect-[460/240] w-full flex-col rounded-9 bg-contain bg-no-repeat p-20 pb-28 max-md:p-16"
          style={style}
        >
          <div className="flex grow justify-between gap-12">
            <div className="relative -ml-20 grow max-md:-ml-16">
              <div className="absolute inset-x-0 bottom-0 top-[25%]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={pnlHistory} margin={CHART_MARGIN}>
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
                      dot={false}
                      baseValue="dataMin"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <QRCodeSVG size={isMobile ? 40 : 52} value={qrCodeUrl} className="shrink-0 rounded-4 bg-white p-4" />
          </div>

          <div className="flex flex-col gap-12 max-md:gap-4 max-smallMobile:gap-0">
            <div className="flex items-end gap-6">
              <h3 className={cx("text-[40px] font-medium max-md:text-[32px]", pnlClassName)}>
                {formatPercentage(pnlBps, { signed: true })}
              </h3>
              {showPnlAmounts && (
                <p className={cx("pb-8 text-14 font-medium", pnlClassName)}>
                  {formatUsd(pnlUsd, { displayPlus: true })}
                </p>
              )}
            </div>
            <div className="flex gap-20 max-md:gap-10">
              <div className="flex flex-col gap-4">
                <p className="text-11 font-medium uppercase tracking-[0.08em] text-[#A0A3C4]">
                  <Trans>Period</Trans>
                </p>
                <p className="whitespace-nowrap text-13 font-medium text-white">{periodLabel}</p>
              </div>
              <div className="flex flex-col gap-4">
                <p className="text-11 font-medium uppercase tracking-[0.08em] text-[#A0A3C4]">
                  <Trans>Win rate</Trans>
                </p>
                <p className="whitespace-nowrap text-13 font-medium text-white">
                  {formatPercentage(winsLossesRatioBps ?? 0n)}
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <p className="text-11 font-medium uppercase tracking-[0.08em] text-[#A0A3C4]">
                  <Trans>Trades</Trans>
                </p>
                <p className="whitespace-nowrap text-13 font-medium text-white">{tradesCount}</p>
              </div>

              {referralCodeOwnerKind && code && (
                <div className="flex flex-col gap-4">
                  <p className="text-11 font-medium uppercase tracking-[0.08em] text-[#A0A3C4]">
                    {referralCodeOwnerKind === "created" ? (
                      <Trans>Referral code</Trans>
                    ) : (
                      <Trans>Used referral code</Trans>
                    )}
                  </p>
                  <p className="whitespace-nowrap text-13 font-medium text-white">{code}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        {loading && (
          <div className="absolute left-1/2 top-0 z-10 flex -translate-x-1/2 items-center gap-8 rounded-b-8 bg-[#22243a] px-8 py-6 text-12">
            <SpinningLoader className="size-14" />
            <p className="font-medium text-white">
              <Trans>Generating shareable image...</Trans>
            </p>
          </div>
        )}
      </div>
    );
  }
);
