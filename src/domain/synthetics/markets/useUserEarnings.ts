import { gql } from "@apollo/client";
import { BigNumber } from "ethers";
import { expandDecimals, formatUsd } from "lib/numbers";
import { getSyntheticsGraphClient } from "lib/subgraph";
import useWallet from "lib/wallets/useWallet";
import { useMemo } from "react";
import useSWR from "swr";
import { UserEarningsData } from "./types";
import { useDaysConsideredInMarketsApr } from "./useDaysConsideredInMarketsApr";
import { useMarketTokensAPR } from "./useMarketTokensAPR";
import { useMarketTokensData } from "./useMarketTokensData";
import { useMarketsInfo } from "./useMarketsInfo";

type RawBalanceChange = {
  cumulativeIncome: string;
  prevCumulativeFeeUsdPerGmToken: string;
  cumulativeFeeUsdPerGmToken: string;
  tokensBalance: string;
  timestamp: number;
};

type BalanceChange = {
  tokensBalance: BigNumber;
  cumulativeIncome: BigNumber;
  prevCumulativeFeeUsdPerGmToken: BigNumber;
  cumulativeFeeUsdPerGmToken: BigNumber;
  timestamp: number;
};

type RawCollectedMarketFeesInfo = {
  cumulativeFeeUsdPerGmToken: string;
  prevCumulativeFeeUsdPerGmToken: string;
};

export const useUserEarnings = (chainId: number) => {
  const { marketsInfoData } = useMarketsInfo(chainId);
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: true });

  const client = getSyntheticsGraphClient(chainId);
  const marketAddresses = useMemo(
    () => Object.keys(marketsInfoData || {}).filter((address) => !marketsInfoData![address].isDisabled),
    [marketsInfoData]
  );

  const key =
    marketAddresses.length && marketTokensData && client ? marketAddresses.concat("userEarnings").join(",") : null;

  const daysConsidered = useDaysConsideredInMarketsApr();
  const { account } = useWallet();
  const marketsTokensAPRData = useMarketTokensAPR(chainId).marketsTokensAPRData;

  const { data } = useSWR<UserEarningsData | null>(key, {
    fetcher: async (): Promise<UserEarningsData | null> => {
      if (!account) {
        return null;
      }

      const startOfPeriod = Math.floor(Date.now() / 1000) - daysConsidered * 24 * 60 * 60;
      const createQuery = (marketAddress: string) =>
        `
        _${marketAddress}_balanceChanges: userGmTokensBalanceChanges(
            orderBy: index
            orderDirection: asc
            where: {
                account: "${account.toLowerCase()}"
                marketAddress: "${marketAddress.toLowerCase()}"
                timestamp_gte: ${startOfPeriod}
            }
            #block: {
            #  number: 27976334
            #}
        ) {
            cumulativeIncome
            tokensBalance
            prevCumulativeFeeUsdPerGmToken
            cumulativeFeeUsdPerGmToken
            timestamp
        }
        _${marketAddress}_balanceChange_before: userGmTokensBalanceChanges(
            first: 1
            orderBy: index
            orderDirection: desc
            where: {
              account: "${account.toLowerCase()}"
              marketAddress: "${marketAddress.toLowerCase()}"
              timestamp_lt: ${startOfPeriod}
            }
            #block: {
            #  number: 27976334
            #}
          ) {
            cumulativeIncome
            tokensBalance
            prevCumulativeFeeUsdPerGmToken
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
            }
            #block: {
            #  number: 27976334
            #}
        ) {
            cumulativeFeeUsdPerGmToken
            prevCumulativeFeeUsdPerGmToken
        }

        _${marketAddress}_fees_recent: collectedMarketFeesInfos(
            first: 1
            orderBy: timestampGroup
            orderDirection: desc
            where: {
                marketAddress: "${marketAddress.toLowerCase()}"
                period: "1h"
            }
            #block: {
            #  number: 27976334
            #}
        ) {
            cumulativeFeeUsdPerGmToken
            prevCumulativeFeeUsdPerGmToken
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
        byMarketAddress: {},
        allMarkets: {
          total: BigNumber.from(0),
          recent: BigNumber.from(0),
          expected365d: BigNumber.from(0),
        },
      };

      marketAddresses.forEach((marketAddress) => {
        const rawBalanceChanges = response[`_${marketAddress}_balanceChanges`] as RawBalanceChange[];
        const prevRawBalanceChange = response[`_${marketAddress}_balanceChange_before`][0] as RawBalanceChange;
        const feesStart = response[`_${marketAddress}_fees_start`][0] as RawCollectedMarketFeesInfo;
        const feesRecent = response[`_${marketAddress}_fees_recent`][0] as RawCollectedMarketFeesInfo;

        if (prevRawBalanceChange) {
          rawBalanceChanges.unshift({
            prevCumulativeFeeUsdPerGmToken: feesStart.prevCumulativeFeeUsdPerGmToken,
            cumulativeFeeUsdPerGmToken: feesStart.cumulativeFeeUsdPerGmToken,
            cumulativeIncome: prevRawBalanceChange.cumulativeIncome,
            tokensBalance: prevRawBalanceChange.tokensBalance,
            timestamp: startOfPeriod,
          });
        }

        if (rawBalanceChanges.length === 0) return;

        const balanceChanges: BalanceChange[] = rawBalanceChanges.map((rawBalanceChange) => ({
          prevCumulativeFeeUsdPerGmToken: BigNumber.from(rawBalanceChange.prevCumulativeFeeUsdPerGmToken),
          cumulativeFeeUsdPerGmToken: BigNumber.from(rawBalanceChange.cumulativeFeeUsdPerGmToken),
          cumulativeIncome: BigNumber.from(rawBalanceChange.cumulativeIncome),
          timestamp: rawBalanceChange.timestamp,
          tokensBalance: BigNumber.from(rawBalanceChange.tokensBalance),
        }));

        const latestChange = balanceChanges[balanceChanges.length - 1];

        if (!latestChange) throw new Error("latestChange is undefined");

        console.log(
          formatUsd(
            BigNumber.from(feesRecent.cumulativeFeeUsdPerGmToken)
              .sub(BigNumber.from(latestChange.cumulativeFeeUsdPerGmToken))
              .mul(latestChange.tokensBalance)
              .div(expandDecimals(1, 18))
          ),
          "<- fees since last balance change"
        );
        const recentPseudoChange: BalanceChange = {
          prevCumulativeFeeUsdPerGmToken: BigNumber.from(feesRecent.prevCumulativeFeeUsdPerGmToken),
          cumulativeFeeUsdPerGmToken: BigNumber.from(feesRecent.cumulativeFeeUsdPerGmToken),
          cumulativeIncome: BigNumber.from(0),
          tokensBalance: latestChange.tokensBalance,
          timestamp: Math.floor(Date.now() / 1000),
        };

        recentPseudoChange.cumulativeIncome = latestChange.cumulativeIncome.add(
          calcEndOfPeriodIncome(latestChange, recentPseudoChange)
        );

        console.table({
          cumulativeFees: formatUsd(
            recentPseudoChange.cumulativeIncome.sub(calcEndOfPeriodIncome(latestChange, recentPseudoChange))
          ),
          cumulativeFeesInclEndOfPeriod: formatUsd(recentPseudoChange.cumulativeIncome),
          diff: formatUsd(calcEndOfPeriodIncome(latestChange, recentPseudoChange)),
        });

        balanceChanges.push(recentPseudoChange);

        const recentIncome = calcRecentIncome(balanceChanges);

        result.byMarketAddress[marketAddress] = {
          total: recentPseudoChange.cumulativeIncome,
          recent: recentIncome,
        };

        result.allMarkets.total = result.allMarkets.total.add(recentPseudoChange.cumulativeIncome);
        result.allMarkets.recent = result.allMarkets.recent.add(recentIncome);

        if (marketsTokensAPRData && marketTokensData) {
          const apr = marketsTokensAPRData[marketAddress];
          const token = marketTokensData[marketAddress];
          const balance = token.balance;

          if (!balance || balance.eq(0)) return;

          const price = token.prices.maxPrice;
          const expected365d = apr.mul(balance).mul(price).div(expandDecimals(1, 22));
          result.allMarkets.expected365d = result.allMarkets.expected365d.add(expected365d);
        }
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
      .sub(
        i === balanceChanges.length - 1
          ? prevChange.cumulativeFeeUsdPerGmToken
          : prevChange.prevCumulativeFeeUsdPerGmToken
      )
      .mul(prevChange.tokensBalance)
      .div(expandDecimals(1, 18));
    cumulativeIncome = cumulativeIncome.add(income);
  }

  return cumulativeIncome;
}
