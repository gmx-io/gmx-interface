import { gql, useQuery as useGqlQuery } from "@apollo/client";
import { lightFormat } from "date-fns";
import { useMemo } from "react";
import type { Address } from "viem";

import { USD_DECIMALS } from "config/factors";
import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import type { FromOldToNewArray } from "domain/tradingview/types";
import { SECONDS_IN_DAY, formatDate, formatDateTime } from "lib/dates";
import { getSubsquidGraphClient } from "lib/indexers";
import { bigintToNumber } from "lib/numbers";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "lib/objects";

import { DEBUG_FIELDS, DEV_QUERY, type AccountPnlHistoryPointDebugFields } from "./dailyAndCumulativePnLDebug";

export type AccountPnlHistoryPoint = {
  date: string;
  dateCompact: string;
  pnlFloat: number;
  pnl: bigint;
  cumulativePnlFloat: number;
  cumulativePnl: bigint;
} & AccountPnlHistoryPointDebugFields;

export type PnlHistoricalData = FromOldToNewArray<AccountPnlHistoryPoint>;

const PROD_QUERY = gql`
  query AccountHistoricalPnlResolver($account: String!, $from: Int) {
    accountPnlHistoryStats(account: $account, from: $from) {
      cumulativePnl
      pnl
      timestamp
    }
  }
`;

const MINIMUM_DATA_POINTS = 7;

export function usePnlHistoricalData(chainId: number, account: Address, fromTimestamp: number | undefined) {
  const showDebugValues = useShowDebugValues();
  const res = useGqlQuery(showDebugValues ? DEV_QUERY : PROD_QUERY, {
    client: getSubsquidGraphClient(chainId)!,
    variables: { account: account, from: fromTimestamp },
  });

  const transformedData: PnlHistoricalData = useMemo(() => {
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
            ? formatDateTime(row.timestamp) + " - " + formatDateTime(row.timestamp + SECONDS_IN_DAY) + " local"
            : formatDate(row.timestamp),
          dateCompact: lightFormat(row.timestamp * 1000, "dd/MM"),
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

    if (dataPoints.length < MINIMUM_DATA_POINTS) {
      const lastTimestamp = dataPoints[0].timestamp;

      const pointsLength = dataPoints.length;
      for (let i = pointsLength; i < MINIMUM_DATA_POINTS; i++) {
        const newTimestamp = lastTimestamp - SECONDS_IN_DAY * (i - pointsLength + 1);
        const emptyPoint = {
          date: showDebugValues
            ? formatDateTime(newTimestamp) + " - " + formatDateTime(newTimestamp + SECONDS_IN_DAY) + " local"
            : formatDate(newTimestamp),
          dateCompact: lightFormat(newTimestamp * 1000, "dd/MM"),
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
  }, [res.data?.accountPnlHistoryStats, showDebugValues]);

  return { data: transformedData, error: res.error, loading: res.loading };
}
