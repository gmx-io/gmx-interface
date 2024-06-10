import { gql, useQuery as useGqlQuery } from "@apollo/client";
import { Trans, t } from "@lingui/macro";
import { lightFormat } from "date-fns";
import { toPng } from "html-to-image";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Bar,
  Cell,
  ComposedChart,
  Line,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import type { Address } from "viem";

import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import type { FromOldToNewArray } from "domain/tradingview/types";
import { formatDate, formatDateTime, toUtcDayStart } from "lib/dates";
import downloadImage from "lib/downloadImage";
import { helperToast } from "lib/helperToast";
import { USD_DECIMALS } from "lib/legacy";
import { bigintToNumber, formatUsd } from "lib/numbers";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "lib/objects";
import { getSubsquidGraphClient } from "lib/subgraph";
import { getPositiveOrNegativeClass } from "lib/utils";

import Button from "components/Button/Button";
import Loader from "components/Common/Loader";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { DateSelect } from "components/Synthetics/DateRangeSelect/DateRangeSelect";

import {
  DEBUG_FIELDS,
  DEV_QUERY,
  DebugLegend,
  DebugLines,
  DebugTooltip,
  type AccountPnlHistoryPointDebugFields,
} from "./dailyAndCumulativePnLDebug";

import downloadIcon from "img/ic_download_simple.svg";

import "./DailyAndCumulativePnL.css";

const CSV_ICON_INFO = {
  src: downloadIcon,
};

const CHART_TOOLTIP_WRAPPER_STYLE: React.CSSProperties = { zIndex: 10000 };

const getInitialDate = () => undefined;

const CHART_TICK_PROPS: React.SVGProps<SVGTextElement> = { fill: "var(--color-gray-400)" };

export function DailyAndCumulativePnL({ chainId, account }: { chainId: number; account: Address }) {
  const [fromDate, setFromDate] = useState<Date | undefined>(getInitialDate);
  const fromTimestamp = useMemo(() => fromDate && toUtcDayStart(fromDate), [fromDate]);

  const { data: clusteredPnlData, error, loading } = usePnlHistoricalData(chainId, account, fromTimestamp);

  const { cardRef, handleImageDownload } = useImageDownload();

  return (
    <div className="flex flex-col rounded-4 bg-slate-800" ref={cardRef}>
      <div className="flex items-center justify-between border-b border-b-gray-950 px-16">
        <div className="py-16">
          <Trans>Daily and Cumulative PnL</Trans>
        </div>
        <div className="flex flex-wrap items-stretch justify-end gap-8 py-10">
          <Button
            variant="secondary"
            data-exclude
            className="!px-10 !py-6"
            imgInfo={CSV_ICON_INFO}
            onClick={handleImageDownload}
          >
            PNG
          </Button>
          <DateSelect
            date={fromDate}
            onChange={setFromDate}
            handleClassName="!px-10 !py-6"
            buttonTextPrefix={t`From`}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-24 px-16 pt-16 text-gray-300">
        <div>
          <div className="inline-block size-10 rounded-full bg-green-500" /> <Trans>Daily Profit</Trans>
        </div>
        <div>
          <div className="inline-block size-10 rounded-full bg-red-500" /> <Trans>Daily Loss</Trans>
        </div>
        <div>
          <div className="inline-block size-10 rounded-full bg-[#468AE3]" />{" "}
          <Trans>
            Cumulative PnL:{" "}
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
            <ComposedChart width={500} height={300} data={clusteredPnlData} barGap={0}>
              <RechartsTooltip content={ChartTooltip} wrapperStyle={CHART_TOOLTIP_WRAPPER_STYLE} />
              <Bar dataKey="pnlFloat" minPointSize={1}>
                {clusteredPnlData.map(renderPnlBar)}
              </Bar>
              <Line type="monotone" dataKey="cumulativePnlFloat" stroke="#468AE3" strokeWidth={2} dot={false} />
              <XAxis
                dataKey="dateCompact"
                axisLine={false}
                tickLine={false}
                angle={-90}
                fontSize={12}
                tickMargin={25}
                height={50}
                dx={-4}
                minTickGap={10}
                tick={CHART_TICK_PROPS}
              />
              <YAxis
                mirror
                type="number"
                allowDecimals={false}
                markerWidth={0}
                tickMargin={-6}
                axisLine={false}
                tickLine={false}
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
          <div className="absolute grid size-full place-items-center text-gray-300">
            <Trans>No data available</Trans>
          </div>
        )}
      </div>
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
  if (value === 0 || !isFinite(value)) return "";

  return formatUsd(BigInt(value as number) * 10n ** 30n, { displayDecimals: 0 })!;
}

function ChartTooltip({ active, payload }: TooltipProps<number | string, "pnl" | "cumulativePnl" | "date">) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const stats = payload[0].payload as PnlHistoricalData[number];

  return (
    <div className="z-50 rounded-4 border border-gray-950 bg-slate-800 p-8 text-14">
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

const PROD_QUERY = gql`
  query AccountHistoricalPnlResolver($account: String!, $from: Int) {
    accountPnlHistoryStats(account: $account, from: $from) {
      cumulativePnl
      pnl
      timestamp
    }
  }
`;

function usePnlHistoricalData(chainId: number, account: Address, fromTimestamp: number | undefined) {
  const showDebugValues = useShowDebugValues();
  const res = useGqlQuery(showDebugValues ? DEV_QUERY : PROD_QUERY, {
    client: getSubsquidGraphClient(chainId)!,
    variables: { account: account, from: fromTimestamp },
  });

  const transformedData: PnlHistoricalData = useMemo(() => {
    return (
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
            ? formatDateTime(row.timestamp) + " - " + formatDateTime(row.timestamp + 86400) + " local"
            : formatDate(row.timestamp),
          dateCompact: lightFormat(row.timestamp * 1000, "dd/MM"),
          pnl: BigInt(row.pnl),
          pnlFloat: bigintToNumber(BigInt(row.pnl), USD_DECIMALS),
          cumulativePnl: BigInt(row.cumulativePnl),
          cumulativePnlFloat: bigintToNumber(BigInt(row.cumulativePnl), USD_DECIMALS),
          ...parsedDebugFields,
        };
      }) || EMPTY_ARRAY
    );
  }, [res.data?.accountPnlHistoryStats, showDebugValues]);

  return { data: transformedData, error: res.error, loading: res.loading };
}

function useImageDownload() {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleImageDownload = useCallback(() => {
    if (!cardRef.current) {
      helperToast.error("Error in downloading image");
      return;
    }

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
