import { gql, useQuery as useGqlQuery } from "@apollo/client";
import { useMemo } from "react";
import type { Address } from "viem";

import { isDevelopment } from "config/env";
import { USD_DECIMALS } from "config/factors";
import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import type { FromOldToNewArray } from "domain/tradingview/types";
import { SECONDS_IN_DAY, formatDateTime } from "lib/dates";
import { getSubsquidGraphClient } from "lib/indexers";
import { bigintToNumber } from "lib/numbers";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "lib/objects";

import { formatPnlChartCompactDate, formatPnlChartDate } from "./DailyAndCumulativePnL.utils";
import { DEBUG_FIELDS, DEV_QUERY_WITH_TO, type AccountPnlHistoryPointDebugFields } from "./dailyAndCumulativePnLDebug";

export type AccountPnlHistoryPoint = {
  timestamp: number;
  date: string;
  dateCompact: string;
  pnlFloat: number | undefined;
  pnl: bigint | undefined;
  cumulativePnlFloat: number | undefined;
  cumulativePnl: bigint | undefined;
} & AccountPnlHistoryPointDebugFields;

export type PnlHistoricalData = FromOldToNewArray<AccountPnlHistoryPoint>;

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

type RawAccountPnlHistoryPoint = {
  cumulativePnl: string;
  pnl: string;
  timestamp: number;
} & Partial<Record<(typeof DEBUG_FIELDS)[number], string>>;

export function usePnlHistoricalData(
  chainId: number,
  account: Address,
  fromTimestamp: number | undefined,
  toTimestamp?: number
) {
  const showDebugValuesSetting = useShowDebugValues();
  const showDebugValues = isDevelopment() && showDebugValuesSetting;
  const res = useGqlQuery(showDebugValues ? DEV_QUERY_WITH_TO : PROD_QUERY, {
    client: getSubsquidGraphClient(chainId)!,
    variables: { account: account, from: fromTimestamp, to: toTimestamp },
  });

  const transformedData: PnlHistoricalData = useMemo(() => {
    let dataPoints =
      res.data?.accountPnlHistoryStats
        ?.filter((row: RawAccountPnlHistoryPoint) => toTimestamp === undefined || row.timestamp <= toTimestamp)
        .map((row: RawAccountPnlHistoryPoint) => {
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
      const lastTimestamp = dataPoints[0].timestamp;

      const pointsLength = dataPoints.length;
      for (let i = pointsLength; i < MINIMUM_DATA_POINTS; i++) {
        const newTimestamp = lastTimestamp - SECONDS_IN_DAY * (i - pointsLength + 1);
        const emptyPoint = {
          timestamp: newTimestamp,
          date: showDebugValues
            ? formatDateTime(newTimestamp) + " - " + formatDateTime(newTimestamp + SECONDS_IN_DAY) + " local"
            : formatPnlChartDate(newTimestamp),
          dateCompact: formatPnlChartCompactDate(newTimestamp),
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
