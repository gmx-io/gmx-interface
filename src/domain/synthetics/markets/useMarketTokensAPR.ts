import { gql } from "@apollo/client";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { differenceInHours, startOfDay, sub } from "date-fns";
import { BigNumber } from "ethers";
import { bigNumberify } from "lib/numbers";
import { getSyntheticsGraphClient } from "lib/subgraph";
import { useMemo } from "react";
import useSWR from "swr";
import { useMarketsInfo } from ".";
import { MarketTokensAPRData } from "./types";
import { useMarketTokensData } from "./useMarketTokensData";
import { useDaysConsideredInMarketsApr } from "./useDaysConsideredInMarketsApr";

type TimeIntervalQuery = {
  period: "1d" | "1h";
  timestampGroup_lt?: number;
  timestampGroup_gte?: number;
};

type RawCollectedFees = {
  id: string;
  period: string;
  marketAddress: string;
  tokenAddress: string;
  timestampGroup: number;
  feeUsdPerPoolValue: string;
};

type MarketTokensAPRResult = {
  marketsTokensAPRData?: MarketTokensAPRData;
  avgMarketsAPR?: BigNumber;
};

export function useMarketTokensAPR(chainId: number): MarketTokensAPRResult {
  const { marketsInfoData } = useMarketsInfo(chainId);
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: false });

  const client = getSyntheticsGraphClient(chainId);
  const marketAddresses = useMemo(
    () => Object.keys(marketsInfoData || {}).filter((address) => !marketsInfoData![address].isDisabled),
    [marketsInfoData]
  );

  const key = marketAddresses.length && marketTokensData && client ? marketAddresses.join(",") : null;

  const daysConsidered = useDaysConsideredInMarketsApr();

  const { data } = useSWR(key, {
    fetcher: async () => {
      const intervals = getIntervalsByTime(new Date(), daysConsidered);

      const marketFeesQuery = (marketAddress: string, interval: TimeIntervalQuery, intervalIndex: number) => {
        return `
            _${marketAddress}_${intervalIndex}_${interval.period}: collectedMarketFeesInfos(
               where: {
                marketAddress: "${marketAddress.toLowerCase()}"
                period: "${interval.period}"
                ${interval.timestampGroup_lt ? `timestampGroup_lt: ${interval.timestampGroup_lt}` : ""}
                ${interval.timestampGroup_gte ? `timestampGroup_gte: ${interval.timestampGroup_gte}` : ""}
               },
                orderBy: timestampGroup,
                orderDirection: desc,
                first: 1000
            ) {
                id
                period
                marketAddress
                feeUsdPerPoolValue
                timestampGroup
            }
        `;
      };

      const queryBody = marketAddresses.reduce((acc, marketAddress) => {
        intervals.forEach((interval, intervalIndex) => {
          acc += marketFeesQuery(marketAddress, interval, intervalIndex);
        });

        return acc;
      }, "");

      const { data: response } = await client!.query({ query: gql(`{${queryBody}}`), fetchPolicy: "no-cache" });

      const feeItemsEntries = Object.entries(response) as [string, RawCollectedFees[]][];
      const feeItemsByMarket = feeItemsEntries.reduce((acc, [rawKey, feeItems]) => {
        const [, key] = rawKey.split("_");
        const arr = acc[key] || [];
        acc[key] = arr;
        arr.push(...feeItems);
        return acc;
      }, {} as Record<string, RawCollectedFees[]>);

      const marketTokensAPRData: MarketTokensAPRData = marketAddresses.reduce((acc, marketAddress) => {
        const marketToken = marketTokensData![marketAddress]!;
        const feeItems = feeItemsByMarket[marketAddress] || [];

        const feeUsdPerPoolValueForPeriod = feeItems.reduce((acc, rawCollectedFees) => {
          return acc.add(bigNumberify(rawCollectedFees.feeUsdPerPoolValue)!);
        }, BigNumber.from(0));

        const yearMultiplier = Math.floor(365 / daysConsidered);

        if (marketToken.totalSupply?.gt(0)) {
          let e30 = BigNumber.from(10).pow(30);
          const apr = feeUsdPerPoolValueForPeriod.mul(BASIS_POINTS_DIVISOR).mul(yearMultiplier).div(e30);

          acc[marketAddress] = apr;
        } else {
          acc[marketAddress] = BigNumber.from(0);
        }

        return acc;
      }, {} as MarketTokensAPRData);

      const avgMarketsAPR = Object.values(marketTokensAPRData)
        .reduce((acc, apr) => {
          return acc.add(apr);
        }, BigNumber.from(0))
        .div(marketAddresses.length);

      return {
        marketsTokensAPRData: marketTokensAPRData,
        avgMarketsAPR: avgMarketsAPR,
      };
    },
  });

  return {
    marketsTokensAPRData: data?.marketsTokensAPRData,
    avgMarketsAPR: data?.avgMarketsAPR,
  };
}

export function getIntervalsByTime(origin: Date, daysNumber = 30): TimeIntervalQuery[] {
  const dayStart = startOfDay(origin);
  const dayStartInSeconds = Math.floor(dayStart.valueOf() / 1000);
  const hoursPassed = differenceInHours(origin, dayStart);
  const secondsInDayBeforeFullPeriod = 60 * 60 * 24 * (daysNumber - 1);
  const secondsInFullPeriod = 60 * 60 * 24 * daysNumber;

  if (hoursPassed === 0) {
    return [
      {
        period: "1d",
        timestampGroup_gte: dayStartInSeconds - secondsInFullPeriod,
      },
    ];
  }

  return [
    {
      period: "1h",
      timestampGroup_gte: dayStartInSeconds,
    },
    {
      period: "1d",
      timestampGroup_lt: dayStartInSeconds,
      timestampGroup_gte: dayStartInSeconds - secondsInDayBeforeFullPeriod,
    },
    {
      period: "1h",
      timestampGroup_lt: dayStartInSeconds - secondsInDayBeforeFullPeriod,
      timestampGroup_gte: Math.floor(sub(origin, { days: daysNumber }).valueOf() / 1000),
    },
  ];
}
