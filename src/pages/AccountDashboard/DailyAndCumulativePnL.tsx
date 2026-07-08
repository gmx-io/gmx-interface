import { Trans, t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import type { Address } from "viem";

import type { ContractsChainId } from "config/chains";
import { toUtcDayStart } from "lib/dates";
import downloadImage from "lib/downloadImage";
import { helperToast } from "lib/helperToast";
import { formatUsd } from "lib/numbers";
import { useBreakpoints } from "lib/useBreakpoints";
import { userAnalytics } from "lib/userAnalytics";
import { SharePositionClickEvent } from "lib/userAnalytics/types";
import { getPositiveOrNegativeClass } from "lib/utils";
import useWallet from "lib/wallets/useWallet";

import Button from "components/Button/Button";
import { DateSelect } from "components/DateRangeSelect/DateRangeSelect";
import Loader from "components/Loader/Loader";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

import DownloadIcon from "img/ic_download2.svg?react";
import ShareArrowOutlineIcon from "img/ic_share_arrow_outline.svg?react";

import { DebugLegend, DebugLines, DebugTooltip } from "./dailyAndCumulativePnLDebug";
import { PerformanceShare } from "./PerformanceShare";
import { usePnlHistoricalData, type AccountPnlHistoryPoint, type PnlHistoricalData } from "./usePnlHistoricalData";

import "./DailyAndCumulativePnL.css";

const CHART_TOOLTIP_WRAPPER_STYLE: React.CSSProperties = { zIndex: 10000 };

const getInitialDate = () => undefined;

const CHART_TICK_PROPS: React.SVGProps<SVGTextElement> = {
  fill: "var(--color-slate-100)",
  fontSize: 11,
  fontWeight: 500,
};

const X_AXIS_LINE_PROPS: React.SVGProps<SVGLineElement> = {
  stroke: "var(--color-slate-600)",
  strokeWidth: 0.5,
};

const CHART_CURSOR_PROPS = {
  stroke: "var(--color-slate-500)",
  strokeWidth: 1,
  strokeDasharray: "2 2",
};

const ACTIVE_DOT_PROPS = {
  r: 4,
  strokeWidth: 2,
  stroke: "var(--color-blue-300)",
  fill: "var(--color-slate-900)",
};

const CHART_MARGIN = { top: 16, right: 16, bottom: 16, left: 0 };

export function DailyAndCumulativePnL({ chainId, account }: { chainId: ContractsChainId; account: Address }) {
  const [fromDate, setFromDate] = useState<Date | undefined>(getInitialDate);
  const fromTimestamp = useMemo(() => fromDate && toUtcDayStart(fromDate), [fromDate]);

  const { data: clusteredPnlData, error, loading } = usePnlHistoricalData(chainId, account, fromTimestamp);

  const { cardRef, handleImageDownload } = useImageDownload();

  const { account: connectedAccount } = useWallet();
  const isOwnAccount = connectedAccount === account;

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isShareModalMounted, setIsShareModalMounted] = useState(false);

  const handleShareClick = useCallback(() => {
    userAnalytics.pushEvent<SharePositionClickEvent>({
      event: "SharePositionAction",
      data: {
        action: "SharePositionClick",
      },
    });

    setIsShareModalMounted(true);
    setIsShareModalOpen(true);
  }, []);

  // Unmount the share modal once it has closed so its data hooks (referral polling, PnL
  // queries) stop running in the background. The delay lets the close animation finish, and
  // remounting on reopen recomputes the period bucket against the current time.
  useEffect(() => {
    if (isShareModalOpen || !isShareModalMounted) {
      return;
    }
    const timeoutId = setTimeout(() => setIsShareModalMounted(false), 300);
    return () => clearTimeout(timeoutId);
  }, [isShareModalOpen, isShareModalMounted]);

  // Reset when viewing someone else's account (e.g. wallet disconnect) so the modal does not
  // linger or auto-reopen when the account becomes own again.
  useEffect(() => {
    if (!isOwnAccount) {
      setIsShareModalOpen(false);
      setIsShareModalMounted(false);
    }
  }, [isOwnAccount]);

  const { isMobile } = useBreakpoints();

  const buttons = (
    <>
      <Button variant="ghost" className="gap-4" data-exclude onClick={handleImageDownload}>
        <DownloadIcon className="size-16" />

        <Trans>PNG</Trans>
      </Button>
      {isOwnAccount && (
        <Button variant="ghost" className="gap-4" data-exclude onClick={handleShareClick}>
          <ShareArrowOutlineIcon className="size-16" />

          <Trans>Share PnL</Trans>
        </Button>
      )}
      <DateSelect date={fromDate} onChange={setFromDate} buttonTextPrefix={t`From`} />
    </>
  );

  const chartMargin = useMemo(() => {
    const maxValue = Math.max(...clusteredPnlData.map((point) => Math.max(point.cumulativePnlFloat, point.pnlFloat)));
    const stringValue = Math.ceil(maxValue).toString();
    return { ...CHART_MARGIN, left: stringValue.length * 4 };
  }, [clusteredPnlData]);

  return (
    <div className="flex flex-col rounded-8 bg-slate-900" ref={cardRef}>
      <div className="flex items-center justify-between px-20 py-15">
        <div className="text-20 font-medium">
          <Trans>Daily and cumulative PnL</Trans>
        </div>
        {isMobile ? null : <div className="flex flex-wrap items-stretch justify-end gap-8 py-8">{buttons}</div>}
      </div>

      <div className="flex flex-wrap gap-24 px-16 pt-16 text-typography-secondary">
        <div className="flex items-center gap-8 text-13 font-medium">
          <div className="inline-block size-4 rounded-full bg-green-500" /> <Trans>Daily profit</Trans>
        </div>
        <div className="flex items-center gap-8 text-13 font-medium">
          <div className="inline-block size-4 rounded-full bg-red-500" /> <Trans>Daily loss</Trans>
        </div>
        <div className="flex items-center gap-8 text-13 font-medium">
          <div className="inline-block size-4 rounded-full bg-blue-300" />{" "}
          <Trans>
            Cumulative PnL{" "}
            <span className={getPositiveOrNegativeClass(clusteredPnlData.at(-1)?.cumulativePnl)}>
              {formatUsd(clusteredPnlData.at(-1)?.cumulativePnl)}
            </span>
          </Trans>
        </div>
        <DebugLegend lastPoint={clusteredPnlData.at(-1)} />
      </div>

      <div className="relative min-h-[250px] grow">
        <div className="DailyAndCumulativePnL-hide-last-tick absolute size-full">
          <ResponsiveContainer debounce={500}>
            <ComposedChart
              width={500}
              height={300}
              data={clusteredPnlData}
              barCategoryGap="25%"
              margin={chartMargin}
              // @ts-expect-error
              overflow="visible"
            >
              <RechartsTooltip
                cursor={CHART_CURSOR_PROPS}
                content={ChartTooltip}
                wrapperStyle={CHART_TOOLTIP_WRAPPER_STYLE}
              />
              <CartesianGrid vertical={false} strokeDasharray="5 3" strokeWidth={0.5} stroke="var(--color-slate-600)" />
              <Bar dataKey="pnlFloat" minPointSize={1} radius={2}>
                {clusteredPnlData.map(renderPnlBar)}
              </Bar>

              <defs>
                <linearGradient id="cumulative-pnl-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="-45%" stopColor="var(--color-blue-300)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-blue-300)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="cumulativePnlFloat"
                stroke="var(--color-blue-300)"
                fill="url(#cumulative-pnl-gradient)"
                strokeWidth={2}
                dot={false}
                baseValue="dataMin"
                activeDot={ACTIVE_DOT_PROPS}
              />
              <XAxis
                dataKey="dateCompact"
                tickLine={false}
                axisLine={X_AXIS_LINE_PROPS}
                minTickGap={isMobile ? 20 : 32}
                tick={CHART_TICK_PROPS}
                tickMargin={10}
              />
              <YAxis
                type="number"
                allowDecimals={false}
                markerWidth={0}
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                tickFormatter={yAxisTickFormatter}
                tick={CHART_TICK_PROPS}
              />
              {DebugLines()}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {error && (
          <div className="absolute grid size-full max-h-full place-items-center overflow-auto">
            <div className="whitespace-pre-wrap font-mono text-red-500">{JSON.stringify(error, null, 2)}</div>
          </div>
        )}
        {loading && (
          <div className="absolute grid size-full place-items-center">
            <Loader />
          </div>
        )}
        {!loading && !error && clusteredPnlData.length === 0 && (
          <div className="absolute grid size-full place-items-center text-typography-secondary">
            <Trans>No data available</Trans>
          </div>
        )}
      </div>

      {isMobile && <div className="flex justify-around border-t-1/2 border-slate-600 px-16 py-12">{buttons}</div>}

      {isOwnAccount && isShareModalMounted && (
        <PerformanceShare
          chainId={chainId}
          account={account}
          fromDate={fromDate}
          isOpen={isShareModalOpen}
          setIsOpen={setIsShareModalOpen}
        />
      )}
    </div>
  );
}

function renderPnlBar(entry: AccountPnlHistoryPoint) {
  let fill: string;
  if (entry.pnl > 0n) {
    fill = "var(--color-green-500)";
  } else if (entry.pnl < 0n) {
    fill = "var(--color-red-500)";
  } else {
    fill = "var(--color-gray-900)";
  }
  return <Cell key={entry.date} fill={fill} />;
}

function yAxisTickFormatter(value: number) {
  if (!isFinite(value)) return "0";

  return formatUsd(BigInt(value as number) * 10n ** 30n, { displayDecimals: 0 })!;
}

function ChartTooltip({ active, payload }: TooltipProps<number | string, "pnl" | "cumulativePnl" | "date">) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const stats = payload[0].payload as PnlHistoricalData[number];

  return (
    <div
      className={`backdrop-blur-100 text-body-small z-50 flex flex-col rounded-4 bg-[rgba(160,163,196,0.1)]
      bg-slate-800 px-12 pt-8 bg-blend-overlay mix-blend-overlay shadow-lg`}
    >
      <StatsTooltipRow label={t`Date`} value={stats.date} showDollar={false} />
      <StatsTooltipRow
        label={t`PnL`}
        value={formatUsd(stats.pnl)}
        showDollar={false}
        textClassName={getPositiveOrNegativeClass(stats.pnl)}
      />
      <StatsTooltipRow
        label={t`Cumulative PnL`}
        value={formatUsd(stats.cumulativePnl)}
        showDollar={false}
        textClassName={getPositiveOrNegativeClass(stats.cumulativePnl)}
      />
      <DebugTooltip stats={stats} />
    </div>
  );
}

function useImageDownload() {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleImageDownload = useCallback(async () => {
    if (!cardRef.current) {
      helperToast.error("Error in downloading image");
      return;
    }

    const { toPng } = await import("html-to-image");
    toPng(cardRef.current, {
      filter: (element) => {
        if (element.dataset?.exclude) {
          return false;
        }
        return true;
      },
    }).then((dataUri) => {
      downloadImage(dataUri, "daily-and-cumulative-pnl.png");
    });
  }, []);

  return { cardRef, handleImageDownload };
}
