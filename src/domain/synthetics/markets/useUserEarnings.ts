import { gql } from "@apollo/client";
import { expandDecimals } from "lib/numbers";
import { getSyntheticsGraphClient } from "lib/subgraph";
import useWallet from "lib/wallets/useWallet";
import { useMemo } from "react";
import useSWR from "swr";
import { UserEarningsData } from "./types";
import { useDaysConsideredInMarketsApr } from "./useDaysConsideredInMarketsApr";
import { useMarketTokensData } from "./useMarketTokensData";
import { useMarketsInfoRequest } from "./useMarketsInfoRequest";
import { bigMath } from "lib/bigmath";
import { GMX_DECIMALS, USD_DECIMALS } from "lib/legacy";
import { useGmMarketsApy } from "./useGmMarketsApy";

type RawBalanceChange = {
  cumulativeIncome: string;
  cumulativeFeeUsdPerGmToken: string;
  tokensBalance: string;
};

type BalanceChange = {
  tokensBalance: bigint;
  cumulativeIncome: bigint;
  cumulativeFeeUsdPerGmToken: bigint;
};

type RawCollectedMarketFeesInfo = {
  cumulativeFeeUsdPerGmToken: string;
};

export const useUserEarnings = (chainId: number) => {
  const { marketsInfoData } = useMarketsInfoRequest(chainId);
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
  const marketsTokensAPRData = useGmMarketsApy(chainId).marketsTokensApyData;

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
        ) {
            cumulativeIncome
            tokensBalance
            cumulativeFeeUsdPerGmToken
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
          ) {
            cumulativeIncome
            tokensBalance
            cumulativeFeeUsdPerGmToken
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
            }
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
        byMarketAddress: {},
        allMarkets: {
          total: 0n,
          recent: 0n,
          expected365d: 0n,
        },
      };

      marketAddresses.forEach((marketAddress) => {
        const rawBalanceChanges = response[`_${marketAddress}_balanceChanges`] as RawBalanceChange[];
        const prevRawBalanceChange = response[`_${marketAddress}_balanceChange_before`][0] as RawBalanceChange;
        const feesStart = response[`_${marketAddress}_fees_start`][0] as RawCollectedMarketFeesInfo;
        const feesRecent = response[`_${marketAddress}_fees_recent`][0] as RawCollectedMarketFeesInfo;

        const balanceChanges = rawBalanceChanges.map(rawBalanceChangeToBalanceChange);
        const balanceChangesTotal = prevRawBalanceChange
          ? [rawBalanceChangeToBalanceChange(prevRawBalanceChange), ...balanceChanges]
          : [...balanceChanges];

        const balanceChangesRecent = prevRawBalanceChange
          ? [
              rawBalanceChangeToBalanceChange({
                ...prevRawBalanceChange,
                cumulativeFeeUsdPerGmToken: feesStart.cumulativeFeeUsdPerGmToken,
              }),
              ...balanceChanges,
            ]
          : [...balanceChanges];

        if (balanceChangesRecent.length === 0 || balanceChangesTotal.length === 0) return;

        const lastChangeTotal = balanceChangesTotal[balanceChangesTotal.length - 1];
        const lastChangeRecent = balanceChangesRecent[balanceChangesRecent.length - 1];

        if (!lastChangeTotal) throw new Error("balanceChangesTotal is undefined");
        if (!lastChangeRecent) throw new Error("balanceChangesRecent is undefined");

        const latestFeeUsdPerGmToken = BigInt(feesRecent.cumulativeFeeUsdPerGmToken);

        const endOfPeriodIncomeRecent = calcEndOfPeriodIncome(lastChangeRecent, latestFeeUsdPerGmToken);
        const endOfPeriodIncomeTotal = calcEndOfPeriodIncome(lastChangeTotal, latestFeeUsdPerGmToken);
        const recentIncome = calcRecentIncome(balanceChangesRecent) + endOfPeriodIncomeRecent;
        const totalIncome = lastChangeTotal.cumulativeIncome + endOfPeriodIncomeTotal;

        result.byMarketAddress[marketAddress] = {
          total: totalIncome,
          recent: recentIncome,
        };

        result.allMarkets.total = result.allMarkets.total + totalIncome;
        result.allMarkets.recent = result.allMarkets.recent + recentIncome;

        if (marketsTokensAPRData && marketTokensData) {
          const apy = marketsTokensAPRData[marketAddress];
          const token = marketTokensData[marketAddress];
          const balance = token.balance;

          if (balance === undefined || balance == 0n) return;

          const price = token.prices.maxPrice;

          const expected365d = bigMath.mulDiv(apy * balance, price, expandDecimals(1, GMX_DECIMALS + USD_DECIMALS));
          result.allMarkets.expected365d = result.allMarkets.expected365d + expected365d;
        }
      });

      return result;
    },
  });
  return data ?? null;
};

function calcEndOfPeriodIncome(latestBalanceChange: BalanceChange, latestCumulativeFeeUsdPerGmToken: bigint): bigint {
  if (latestBalanceChange.tokensBalance == 0n) return 0n;

  const feeUsdPerGmTokenDelta = latestCumulativeFeeUsdPerGmToken - latestBalanceChange.cumulativeFeeUsdPerGmToken;

  return bigMath.mulDiv(feeUsdPerGmTokenDelta, latestBalanceChange.tokensBalance, expandDecimals(1, 18));
}

function calcRecentIncome(balanceChanges: BalanceChange[]): bigint {
  let cumulativeIncome = 0n;

  for (let i = 1; i < balanceChanges.length; i++) {
    const prevChange = balanceChanges[i - 1];
    const change = balanceChanges[i];
    const income = bigMath.mulDiv(
      change.cumulativeFeeUsdPerGmToken - prevChange.cumulativeFeeUsdPerGmToken,
      prevChange.tokensBalance,
      expandDecimals(1, 18)
    );

    cumulativeIncome = cumulativeIncome + income;
  }

  return cumulativeIncome;
}

function rawBalanceChangeToBalanceChange(rawBalanceChange: RawBalanceChange): BalanceChange {
  return {
    cumulativeFeeUsdPerGmToken: BigInt(rawBalanceChange.cumulativeFeeUsdPerGmToken),
    cumulativeIncome: BigInt(rawBalanceChange.cumulativeIncome),
    tokensBalance: BigInt(rawBalanceChange.tokensBalance),
  };
}
