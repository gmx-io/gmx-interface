import { gql } from "@apollo/client";
import { BigNumber } from "ethers";
import { formatDateTime } from "lib/dates";
import { expandDecimals } from "lib/numbers";
import { getSyntheticsGraphClient } from "lib/subgraph";
import useWallet from "lib/wallets/useWallet";
import { useMemo } from "react";
import useSWR from "swr";
import { UserEarningsData } from "./types";
import { useDaysConsideredInMarketsApr } from "./useDaysConsideredInMarketsApr";
import { useMarketTokensData } from "./useMarketTokensData";
import { useMarketsInfo } from "./useMarketsInfo";

type RawBalanceChange = {
  cumulativeIncome: string;
  cumulativeFeeUsdPerGmToken: string;
  tokensBalance: string;
  timestamp: number;
};

type BalanceChange = {
  tokensBalance: BigNumber;
  cumulativeIncome: BigNumber;
  cumulativeFeeUsdPerGmToken: BigNumber;
  timestamp: number;
};

type RawCollectedMarketFeesInfo = {
  cumulativeFeeUsdPerGmToken: string;
};

export const useUserEarnings = (chainId: number) => {
  const { marketsInfoData } = useMarketsInfo(chainId);
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: false });

  const client = getSyntheticsGraphClient(chainId);
  const marketAddresses = useMemo(
    () => Object.keys(marketsInfoData || {}).filter((address) => !marketsInfoData![address].isDisabled),
    [marketsInfoData]
  );

  const key = marketAddresses.length && marketTokensData && client ? marketAddresses.join(",") : null;

  const daysConsidered = useDaysConsideredInMarketsApr();
  const { account } = useWallet();

  const { data } = useSWR<UserEarningsData | null>(key, {
    fetcher: async (): Promise<UserEarningsData | null> => {
      if (!account) {
        return null;
      }

      const startOfPeriod = Math.floor(Date.now() / 1000) - daysConsidered * 24 * 60 * 60;
      const createQuery = (marketAddress: string) =>
        `
        _${marketAddress}_balanceChanges: userGmTokensBalanceChanges(
            orderBy: timestamp
            orderDirection: asc
            where:{
                account: "${account.toLowerCase()}"
                marketAddress: "${marketAddress.toLowerCase()}"
                timestamp_gte: ${startOfPeriod}
            }
        ) {
            cumulativeIncome
            tokensBalance
            cumulativeFeeUsdPerGmToken
            timestamp
        }
        _${marketAddress}_balanceChange_before: userGmTokensBalanceChanges(
            first: 1
            orderBy: timestamp
            orderDirection: desc
            where: {
              account: "${account.toLowerCase()}"
              marketAddress: "${marketAddress.toLowerCase()}"
              timestamp_lt: ${startOfPeriod}
            }
          ) {
            cumulativeIncome
            tokensBalance
            cumulativeFeeUsdPerGmToken
            timestamp
          }
        _${marketAddress}_fees_start: collectedMarketFeesInfos(
            first: 1
            orderBy: timestampGroup
            orderDirection: desc
            where: {
                marketAddress: "${marketAddress.toLowerCase()}"
                period: "1h"
                timestampGroup_lte: ${startOfPeriod}
            },
        ) {
            cumulativeFeeUsdPerGmToken
        }

        _${marketAddress}_fees_recent: collectedMarketFeesInfos(
            first: 1
            orderBy: timestampGroup
            orderDirection: desc
            where: {
                marketAddress: "${marketAddress.toLowerCase()}"
                period: "1h"
            },
        ) {
            cumulativeFeeUsdPerGmToken
        }
      `;

      let queryBody = "";

      marketAddresses.forEach((marketAddress) => {
        queryBody += createQuery(marketAddress);
      });

      let responseOrNull: Record<string, [RawCollectedMarketFeesInfo] | RawBalanceChange[]> | null = null;
      try {
        responseOrNull = (
          await client!.query({
            query: gql(`{${queryBody}}`),
            fetchPolicy: "no-cache",
          })
        ).data;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }

      if (!responseOrNull) {
        return null;
      }

      const response = responseOrNull;

      const result: UserEarningsData = {
        total: BigNumber.from(0),
        byMarketAddress: {},
        expected365d: BigNumber.from(0),
      };

      marketAddresses.forEach((marketAddress) => {
        const rawBalanceChanges = response[`_${marketAddress}_balanceChanges`] as RawBalanceChange[];
        const prevRawBalanceChange = response[`_${marketAddress}_balanceChange_before`][0] as RawBalanceChange;
        const feesStart = response[`_${marketAddress}_fees_start`][0] as RawCollectedMarketFeesInfo;
        const feesRecent = response[`_${marketAddress}_fees_recent`][0] as RawCollectedMarketFeesInfo;

        if (prevRawBalanceChange) {
          rawBalanceChanges.unshift({
            cumulativeFeeUsdPerGmToken: feesStart.cumulativeFeeUsdPerGmToken,
            cumulativeIncome: prevRawBalanceChange.cumulativeIncome,
            tokensBalance: prevRawBalanceChange.tokensBalance,
            timestamp: startOfPeriod,
          });
        }

        if (rawBalanceChanges.length === 0) return;

        const balanceChanges: BalanceChange[] = rawBalanceChanges.map((rawBalanceChange) => ({
          cumulativeFeeUsdPerGmToken: BigNumber.from(rawBalanceChange.cumulativeFeeUsdPerGmToken),
          cumulativeIncome: BigNumber.from(rawBalanceChange.cumulativeIncome),
          timestamp: rawBalanceChange.timestamp,
          tokensBalance: BigNumber.from(rawBalanceChange.tokensBalance),
        }));

        const latestChange = balanceChanges[balanceChanges.length - 1];

        if (!latestChange) throw new Error("latestChange is undefined");

        const recentPseudoChange: BalanceChange = {
          cumulativeFeeUsdPerGmToken: BigNumber.from(feesRecent.cumulativeFeeUsdPerGmToken),
          cumulativeIncome: latestChange.cumulativeIncome,
          tokensBalance: latestChange.tokensBalance,
          timestamp: Math.floor(Date.now() / 1000),
        };

        const income = calcEndOfPeriodIncome(latestChange, recentPseudoChange);
        recentPseudoChange.cumulativeIncome = latestChange.cumulativeIncome.add(income);

        balanceChanges.push(recentPseudoChange);

        const recentIncome = calcRecentIncome(balanceChanges);
        result.byMarketAddress[marketAddress] = {
          total: recentPseudoChange.cumulativeIncome,
          recent: recentIncome,
          comment: buildComment(
            balanceChanges,
            startOfPeriod,
            daysConsidered,
            BigNumber.from(feesStart.cumulativeFeeUsdPerGmToken),
            Boolean(prevRawBalanceChange)
          ),
        };

        const yearMultiplier = Math.floor(365 / daysConsidered);

        result.total = result.total.add(recentPseudoChange.cumulativeIncome);
        result.expected365d = result.expected365d.add(recentIncome.mul(yearMultiplier));
      });

      return result;
    },
  });
  return data ?? null;
};

function calcEndOfPeriodIncome(prevBalanceChange: BalanceChange, balanceChange: BalanceChange): BigNumber {
  if (prevBalanceChange.tokensBalance.eq(0)) return BigNumber.from(0);

  const feeUsdPerGmTokenDelta = balanceChange.cumulativeFeeUsdPerGmToken.sub(
    prevBalanceChange.cumulativeFeeUsdPerGmToken
  );

  return feeUsdPerGmTokenDelta.mul(prevBalanceChange.tokensBalance).div(expandDecimals(1, 18));
}

function calcRecentIncome(balanceChanges: BalanceChange[]): BigNumber {
  let cumulativeIncome = BigNumber.from(0);

  for (let i = 1; i < balanceChanges.length; i++) {
    const prevChange = balanceChanges[i - 1];
    const change = balanceChanges[i];

    const income = change.cumulativeFeeUsdPerGmToken
      .sub(prevChange.cumulativeFeeUsdPerGmToken)
      .mul(prevChange.tokensBalance)
      .div(expandDecimals(1, 18));
    cumulativeIncome = cumulativeIncome.add(income);
  }

  return cumulativeIncome;
}

function buildComment(
  balanceChanges: BalanceChange[],
  startOfPeriod: number,
  daysConsidered: number,
  startOfPeriodFee: BigNumber,
  hadBalanceBeforePeriodStart: boolean
): string | undefined {
  if (balanceChanges.length === 0) return "Nothing to calculate";
  const strs = [
    `hadBalanceBeforePeriodStart=${hadBalanceBeforePeriodStart}`,
    `startOfPeriod ${formatDateTime(startOfPeriod)}: fee=${startOfPeriodFee.toString()}`,
    `currentBalance=${balanceChanges[balanceChanges.length - 1].tokensBalance.toString()}`,
    "",
    `balance changes in last ${daysConsidered} days`,
    "",
  ];

  balanceChanges.forEach((balanceChange) => {
    strs.push(`
${formatDateTime(balanceChange.timestamp)}: 
totalFeePerGmToken=${balanceChange.cumulativeFeeUsdPerGmToken.toString()} 
balance=${balanceChange.tokensBalance.toString()}`);
  });

  return strs.join("\n");
}
