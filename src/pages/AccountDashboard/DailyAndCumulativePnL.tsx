import { gql, useQuery as useGqlQuery } from "@apollo/client";
import { Trans } from "@lingui/macro";
import { useCallback, useMemo, useRef, useState } from "react";
import type { Address } from "viem";

import { USD_DECIMALS } from "config/factors";
import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import type { FromOldToNewArray } from "domain/tradingview/types";
import {
  SECONDS_IN_DAY,
  formatDateTime,
  toUtcDayStartByCalendarDate,
  type DateRange,
  type SetDateRange,
} from "lib/dates";
import downloadImage from "lib/downloadImage";
import { helperToast } from "lib/helperToast";
import { getSubsquidGraphClient } from "lib/indexers";
import { bigintToNumber, formatUsd } from "lib/numbers";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "lib/objects";
import { useBreakpoints } from "lib/useBreakpoints";
import { getPositiveOrNegativeClass } from "lib/utils";

import {
  formatPnlChartCompactDate,
  formatPnlChartDate,
  getDefaultPnlChartGrouping,
  groupPnlHistoryData,
  type BasePnlHistoryPoint,
  type PnlChartGrouping,
} from "./DailyAndCumulativePnL.utils";
import { DailyAndCumulativePnLChart } from "./DailyAndCumulativePnLChart";
import { DailyAndCumulativePnLControls } from "./DailyAndCumulativePnLControls";
import {
  DEBUG_FIELDS,
  DEV_QUERY_WITH_TO,
  DebugLegend,
  type AccountPnlHistoryPointDebugFields,
} from "./dailyAndCumulativePnLDebug";

import "./DailyAndCumulativePnL.css";

export function DailyAndCumulativePnL({
  chainId,
  account,
  dateRange,
  setDateRange,
}: {
  chainId: number;
  account: Address;
  dateRange: DateRange;
  setDateRange: SetDateRange;
}) {
  const [fromDate, toDate] = dateRange;
  const fromTimestamp = useMemo(() => fromDate && toUtcDayStartByCalendarDate(fromDate), [fromDate]);
  const toTimestamp = useMemo(() => toDate && toUtcDayStartByCalendarDate(toDate), [toDate]);
  const [userGrouping, setUserGrouping] = useState<PnlChartGrouping | undefined>(undefined);

  const {
    data: historicalPnlData,
    error,
    loading,
  } = usePnlHistoricalData(chainId, account, fromTimestamp, toTimestamp);
  const grouping = userGrouping ?? getDefaultPnlChartGrouping(historicalPnlData);
  const groupedPnlData = useMemo(() => groupPnlHistoryData(historicalPnlData, grouping), [grouping, historicalPnlData]);
  const chartResetKey = `${chainId}:${account}:${fromTimestamp ?? ""}:${toTimestamp ?? ""}:${grouping}`;

  const { cardRef, handleImageDownload } = useImageDownload();
  const { isMobile } = useBreakpoints();

  const controls = (
    <DailyAndCumulativePnLControls
      startDate={fromDate}
      endDate={toDate}
      grouping={grouping}
      isMobile={isMobile}
      onDateRangeChange={setDateRange}
      onGroupingChange={setUserGrouping}
      onImageDownload={handleImageDownload}
    />
  );

  return (
    <div className="flex flex-col rounded-8 bg-slate-900" ref={cardRef}>
      <div className="flex items-center justify-between px-20 py-15">
        <div className="text-20 font-medium">
          <Trans>Daily and cumulative PnL</Trans>
        </div>
        {isMobile ? null : (
          <div data-exclude className="py-8">
            {controls}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-24 px-16 pt-16 text-typography-secondary">
        <div className="flex items-center gap-8 text-13 font-medium">
          <div className="inline-block size-4 rounded-full bg-green-500" /> <Trans>Period profit</Trans>
        </div>
        <div className="flex items-center gap-8 text-13 font-medium">
          <div className="inline-block size-4 rounded-full bg-red-500" /> <Trans>Period loss</Trans>
        </div>
        <div className="flex items-center gap-8 text-13 font-medium">
          <div className="inline-block size-4 rounded-full bg-blue-300" />{" "}
          <Trans>
            Cumulative PnL{" "}
            <span className={getPositiveOrNegativeClass(groupedPnlData.at(-1)?.cumulativePnl)}>
              {formatUsd(groupedPnlData.at(-1)?.cumulativePnl)}
            </span>
          </Trans>
        </div>
        <DebugLegend lastPoint={groupedPnlData.at(-1)} />
      </div>

      <DailyAndCumulativePnLChart
        groupedPnlData={groupedPnlData}
        grouping={grouping}
        isMobile={isMobile}
        loading={loading}
        error={error}
        resetKey={chartResetKey}
      />

      {isMobile && (
        <div data-exclude className="flex flex-wrap justify-between gap-8 border-t-1/2 border-slate-600 px-16 py-12">
          {controls}
        </div>
      )}
    </div>
  );
}

export type AccountPnlHistoryPoint = BasePnlHistoryPoint & AccountPnlHistoryPointDebugFields;

type PnlHistoricalData = FromOldToNewArray<AccountPnlHistoryPoint>;

const PROD_QUERY = gql`
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
  const query = showDebugValues ? DEV_QUERY_WITH_TO : PROD_QUERY;
  const res = useGqlQuery(query, {
    client: getSubsquidGraphClient(chainId)!,
    variables: { account: account, from: fromTimestamp, to: toTimestamp },
  });

  const transformedData: PnlHistoricalData = useMemo(() => {
    let dataPoints =
      res.data?.accountPnlHistoryStats
        ?.filter((row: any) => toTimestamp === undefined || row.timestamp <= toTimestamp)
        ?.map((row: any) => {
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
              ? formatDateTime(row.timestamp) + " - " + formatDateTime(row.timestamp + SECONDS_IN_DAY) + " local"
              : formatPnlChartDate(row.timestamp),
            dateCompact: formatPnlChartCompactDate(row.timestamp),
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

    if (!fromTimestamp && !toTimestamp && dataPoints.length < MINIMUM_DATA_POINTS) {
      const lastTimestamp = dataPoints.length > 0 ? dataPoints[0].timestamp : Math.floor(Date.now() / 1000);

      const pointsLength = dataPoints.length;
      for (let i = pointsLength; i < MINIMUM_DATA_POINTS; i++) {
        const newTimestamp = lastTimestamp - SECONDS_IN_DAY * (i - pointsLength + 1);
        const emptyPoint = {
          date: showDebugValues
            ? formatDateTime(newTimestamp) + " - " + formatDateTime(newTimestamp + SECONDS_IN_DAY) + " local"
            : formatPnlChartDate(newTimestamp),
          dateCompact: formatPnlChartCompactDate(newTimestamp),
          timestamp: newTimestamp,
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
