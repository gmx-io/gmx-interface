import { gql, useQuery as useGqlQuery } from "@apollo/client";
import { Trans, t } from "@lingui/macro";
import { useCallback, useMemo, useRef } from "react";
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

import { USD_DECIMALS } from "config/factors";
import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import type { FromOldToNewArray } from "domain/tradingview/types";
import {
  SECONDS_IN_DAY,
  formatDate,
  formatDateCompact,
  formatDateTime,
  normalizeDateRangeToUtcBucketDays,
} from "lib/dates";
import downloadImage from "lib/downloadImage";
import { helperToast } from "lib/helperToast";
import { getSubsquidGraphClient } from "lib/indexers";
import { bigintToNumber, formatUsd } from "lib/numbers";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "lib/objects";
import { useBreakpoints } from "lib/useBreakpoints";
import { getPositiveOrNegativeClass } from "lib/utils";

import Button from "components/Button/Button";
import { DateRangeSelect } from "components/DateRangeSelect/DateRangeSelect";
import Loader from "components/Loader/Loader";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

import DownloadIcon from "img/ic_download2.svg?react";

import {
  DEBUG_FIELDS,
  DEV_QUERY,
  DebugLegend,
  DebugLines,
  DebugTooltip,
  type AccountPnlHistoryPointDebugFields,
} from "./dailyAndCumulativePnLDebug";

import "./DailyAndCumulativePnL.css";

const CHART_TOOLTIP_WRAPPER_STYLE: React.CSSProperties = { zIndex: 10000 };

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

export function DailyAndCumulativePnL({
  chainId,
  account,
  startDate,
  endDate,
  onDateRangeChange,
}: {
  chainId: number;
  account: Address;
  startDate: Date | undefined;
  endDate: Date | undefined;
  onDateRangeChange: (dateRange: [Date | undefined, Date | undefined]) => void;
}) {
  const [fromTimestamp, toTimestamp] = useMemo(
    () => normalizeDateRangeToUtcBucketDays(startDate, endDate),
    [startDate, endDate]
  );

  const { data: clusteredPnlData, error, loading } = usePnlHistoricalData(chainId, account, fromTimestamp, toTimestamp);

  const { cardRef, handleImageDownload } = useImageDownload();

  const { isMobile } = useBreakpoints();

  const buttons = (
    <>
      <Button variant="ghost" className="gap-4" data-exclude onClick={handleImageDownload}>
        <div className="size-16">
          <DownloadIcon />
        </div>

        <Trans>PNG</Trans>
      </Button>
      <DateRangeSelect startDate={startDate} endDate={endDate} onChange={onDateRangeChange} />
    </>
  );

  const chartMargin = useMemo(() => {
    const values = clusteredPnlData
      .flatMap((point) => [point.cumulativePnlFloat, point.pnlFloat])
      .filter((value): value is number => Number.isFinite(value));

    if (values.length === 0) {
      return CHART_MARGIN;
    }

    const maxValue = Math.max(...values);
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
        {loading && (
          <div className="absolute grid size-full place-items-center">
            <Loader />
          </div>
        )}
        {!loading && (error || clusteredPnlData.length === 0) && (
          <div className="absolute grid size-full place-items-center text-typography-secondary">
            {error ? <Trans>Data is currently unavailable</Trans> : <Trans>No data available</Trans>}
          </div>
        )}
      </div>

      {isMobile && <div className="flex justify-around border-t-1/2 border-slate-600 px-16 py-12">{buttons}</div>}
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

export type AccountPnlHistoryPoint = {
  date: string;
  dateCompact: string;
  pnlFloat: number;
  pnl: bigint;
  cumulativePnlFloat: number;
  cumulativePnl: bigint;
} & AccountPnlHistoryPointDebugFields;

type PnlHistoricalData = FromOldToNewArray<AccountPnlHistoryPoint>;

const QUERY = gql`
  query AccountHistoricalPnlResolver($account: String!, $from: Int, $to: Int) {
    accountPnlHistoryStats(account: $account, from: $from, to: $to) {
      cumulativePnl
      pnl
      timestamp
    }
  }
`;

const MINIMUM_DATA_POINTS = 7;

function usePnlHistoricalData(
  chainId: number,
  account: Address,
  fromTimestamp: number | undefined,
  toTimestamp: number | undefined
) {
  const showDebugValues = useShowDebugValues();
  const query = showDebugValues ? DEV_QUERY : QUERY;
  const res = useGqlQuery(query, {
    client: getSubsquidGraphClient(chainId)!,
    variables: { account: account, from: fromTimestamp, to: toTimestamp },
  });

  const transformedData: PnlHistoricalData = useMemo(() => {
    const hasExplicitDateRange = fromTimestamp !== undefined || toTimestamp !== undefined;
    let dataPoints =
      res.data?.accountPnlHistoryStats?.map((row: any) => {
        const parsedDebugFields = showDebugValues
          ? DEBUG_FIELDS.reduce(
              (acc, key) => {
                const raw = row[key];

                const bn = raw ? BigInt(raw) : 0n;
                acc[key] = bn;
                acc[`${key}Float`] = bigintToNumber(bn, USD_DECIMALS);
                return acc;
              },
              {} as Record<string, bigint | number>
            )
          : EMPTY_OBJECT;

        return {
          date: showDebugValues
            ? formatDateTime(row.timestamp, { timezone: "utc" }) +
              " - " +
              formatDateTime(row.timestamp + SECONDS_IN_DAY, { timezone: "utc" }) +
              " UTC"
            : formatDate(row.timestamp, { timezone: "utc" }),
          dateCompact: formatDateCompact(row.timestamp, { timezone: "utc" }),
          timestamp: row.timestamp,
          pnl: BigInt(row.pnl),
          pnlFloat: bigintToNumber(BigInt(row.pnl), USD_DECIMALS),
          cumulativePnl: BigInt(row.cumulativePnl),
          cumulativePnlFloat: bigintToNumber(BigInt(row.cumulativePnl), USD_DECIMALS),
          ...parsedDebugFields,
        };
      }) || EMPTY_ARRAY;

    if (dataPoints.length === 0) {
      return EMPTY_ARRAY;
    }

    if (!hasExplicitDateRange && dataPoints.length < MINIMUM_DATA_POINTS) {
      const lastTimestamp = dataPoints.length > 0 ? dataPoints[0].timestamp : Math.floor(Date.now() / 1000);

      const pointsLength = dataPoints.length;
      for (let i = pointsLength; i < MINIMUM_DATA_POINTS; i++) {
        const newTimestamp = lastTimestamp - SECONDS_IN_DAY * (i - pointsLength + 1);
        const emptyPoint = {
          date: showDebugValues
            ? formatDateTime(newTimestamp, { timezone: "utc" }) +
              " - " +
              formatDateTime(newTimestamp + SECONDS_IN_DAY, { timezone: "utc" }) +
              " UTC"
            : formatDate(newTimestamp, { timezone: "utc" }),
          dateCompact: formatDateCompact(newTimestamp, { timezone: "utc" }),
          pnl: undefined,
          pnlFloat: undefined,
          cumulativePnl: undefined,
          cumulativePnlFloat: undefined,
          ...(showDebugValues
            ? DEBUG_FIELDS.reduce(
                (acc, key) => {
                  acc[key] = 0n;
                  acc[`${key}Float`] = 0;
                  return acc;
                },
                {} as Record<string, bigint | number>
              )
            : EMPTY_OBJECT),
        };

        dataPoints = [emptyPoint].concat(dataPoints);
      }
    }

    return dataPoints;
  }, [fromTimestamp, res.data?.accountPnlHistoryStats, showDebugValues, toTimestamp]);

  return { data: transformedData, error: res.error, loading: res.loading };
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
