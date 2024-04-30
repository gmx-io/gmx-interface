import { gql } from "@apollo/client";
import { addDays, set, startOfWeek } from "date-fns";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { getSyntheticsGraphClient } from "lib/subgraph";
import { useMemo } from "react";
import useSWR from "swr";
import { RawIncentivesStats, useOracleKeeperFetcher } from "../tokens";

export default function useIncentiveStats(overrideChainId?: number) {
  const { chainId: defaultChainId } = useChainId();
  const chainId = overrideChainId ?? defaultChainId;
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);

  return (
    useSWR<RawIncentivesStats | null>(["incentiveStats", chainId], async () => {
      if (!oracleKeeperFetcher) {
        return null;
      }
      const res = await oracleKeeperFetcher.fetchIncentivesRewards();
      return res;
    }).data ?? null
  );
}

type RawResponse = {
  tradingIncentivesStat: {
    eligibleFeesInArb: string;
  };
};

export type TradingIncentives = ReturnType<typeof useTradingIncentives>;

export const useTradingIncentives = () => {
  const { chainId } = useChainId();
  const incentiveStats = useIncentiveStats(chainId);

  const startOfPeriod = useMemo(() => {
    const currentDate = new Date();
    const thisWeekWednesday = addDays(startOfWeek(currentDate), 3);
    const wednesday =
      currentDate.valueOf() > thisWeekWednesday.valueOf() ? thisWeekWednesday : addDays(thisWeekWednesday, -7);
    const timezoneOffset = currentDate.getTimezoneOffset() * 60;

    return (
      Math.floor(set(wednesday, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 }).valueOf() / 1000) -
      timezoneOffset
    );
  }, []);

  const { data: burnedTokens } = useSWR<BigNumber>(
    ["trading-incentives", chainId, incentiveStats?.trading.isActive ? "on" : "off"],
    {
      fetcher: async (): Promise<BigNumber> => {
        if (!incentiveStats?.trading.isActive) return BigInt(0);

        const client = getSyntheticsGraphClient(chainId);
        const res = (
          await client!.query({
            query: gql(`{
                tradingIncentivesStat(
                  id:"1w:${startOfPeriod}"
                ) {
                  eligibleFeesInArb
                }
            }`),
            fetchPolicy: "no-cache",
          })
        ).data as RawResponse;

        if (!res || !res.tradingIncentivesStat || !res.tradingIncentivesStat.eligibleFeesInArb) {
          return BigInt(0);
        }

        return BigInt(res.tradingIncentivesStat.eligibleFeesInArb);
      },
    }
  );

  return useMemo(() => {
    const raw = incentiveStats?.trading;
    if (!raw || !raw.isActive || !burnedTokens) {
      return null;
    }

    const rebatePercent = BigInt(raw.rebatePercent);
    if (rebatePercent.eq(0)) return null;

    const allocation = BigInt(raw.allocation);
    const nextPeriodStart = addDays(new Date(startOfPeriod * 1000), 7);

    return {
      allocation,
      period: raw.period,
      nextPeriodStart,
      rebatePercent,
    };
  }, [burnedTokens, incentiveStats?.trading, startOfPeriod]);
};
