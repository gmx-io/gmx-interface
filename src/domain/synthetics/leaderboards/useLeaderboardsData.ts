import { useMemo } from "react";
import { BigNumber } from "ethers";
import { USD_DECIMALS } from "lib/legacy";
import { expandDecimals } from "lib/numbers";
import { useOpenPositions, useAccountPerf } from ".";
import {
  PerfPeriod,
  OpenPosition,
  LiveAccountPerformance,
  AccountPositionsSummary,
  PositionsSummaryByAccount,
} from "./types";

const defaultSummary = (account: string): AccountPositionsSummary => ({
  account,
  unrealizedPnl: BigNumber.from(0),
  sumMaxSize: BigNumber.from(0),
  closingFeeUsd: BigNumber.from(0),
  pendingFundingFeesUsd: BigNumber.from(0),
  pendingClaimableFundingFeesUsd: BigNumber.from(0),
  pendingBorrowingFeesUsd: BigNumber.from(0),
  openPositionsCount: 0,
});

const groupPositionsByAccount = (positions: OpenPosition[]): PositionsSummaryByAccount => {
  const groupping: PositionsSummaryByAccount = {};

  for (const p of positions) {
    const { account } = p;

    if (!groupping[account]) {
      groupping[account] = defaultSummary(account);
    }

    const summary = groupping[account];

    summary.openPositionsCount++;
    summary.unrealizedPnl = summary.unrealizedPnl.add(p.unrealizedPnl);
    summary.sumMaxSize = summary.sumMaxSize.add(p.maxSize);
    summary.pendingFundingFeesUsd = summary.pendingFundingFeesUsd.add(p.pendingFundingFeesUsd);
    summary.pendingClaimableFundingFeesUsd = summary.pendingClaimableFundingFeesUsd.add(
      p.pendingClaimableFundingFeesUsd
    );
    summary.pendingBorrowingFeesUsd = summary.pendingBorrowingFeesUsd.add(p.pendingBorrowingFeesUsd);
    summary.closingFeeUsd = summary.closingFeeUsd.add(p.closingFeeUsd);
  }

  return groupping;
};

export function useLeaderboardsData(period: PerfPeriod = PerfPeriod.TOTAL) {
  const accountPerf = useAccountPerf(period);
  const positions = useOpenPositions(accountPerf.data?.map(({ account }) => account.toLowerCase()) || []);
  const { data, updatedAt } = useMemo(() => {
    if (!accountPerf.data?.length || !positions.data?.length) {
      return { data: undefined, updatedAt: 0 };
    }

    const openPositionsByAccount: Record<string, AccountPositionsSummary> = groupPositionsByAccount(positions.data);
    const data: LiveAccountPerformance[] = [];

    for (let i = 0; i < accountPerf.data.length; i++) {
      const perf = accountPerf.data[i];
      const openPositions = openPositionsByAccount[perf.account] || defaultSummary(perf.account);
      const realizedPnl = perf.totalPnl
        .sub(perf.borrowingFeeUsd)
        .sub(perf.fundingFeeUsd)
        .sub(perf.positionFeeUsd)
        .add(perf.priceImpactUsd);

      const unrealizedPnl = openPositions.unrealizedPnl
        .sub(openPositions.pendingBorrowingFeesUsd)
        .sub(openPositions.pendingFundingFeesUsd)
        .sub(openPositions.closingFeeUsd);

      const absProfit = realizedPnl.add(unrealizedPnl);
      const maxCollateral = perf.maxCollateral;
      if (maxCollateral.isZero()) {
        throw new Error(`Account ${perf.account} max collateral is 0, please verify data integrity`);
      }
      const relProfit = absProfit.mul(expandDecimals(1, USD_DECIMALS)).div(maxCollateral);
      const cumsumCollateral = perf.cumsumCollateral;
      const cumsumSize = perf.cumsumSize;

      if (cumsumCollateral.isZero()) {
        throw new Error(`Account ${perf.account} collateral history is 0, please verify data integrity`);
      }

      const sumMaxSize = perf.sumMaxSize.add(openPositions.sumMaxSize);
      const positionsCount = perf.closedCount.add(BigNumber.from(openPositions.openPositionsCount));
      const performance = {
        id: perf.account + ":" + period,
        account: perf.account,
        absProfit,
        relProfit,
        realizedPnl,
        unrealizedPnl,
        maxCollateral,
        averageSize: sumMaxSize.div(positionsCount),
        averageLeverage: cumsumSize.mul(expandDecimals(1, USD_DECIMALS)).div(cumsumCollateral),
        wins: perf.wins,
        losses: perf.losses,
      };

      data.push(performance);
    }

    return {
      data: data.sort((a, b) => (a.absProfit.gt(b.absProfit) ? -1 : 1)),
      updatedAt: Date.now(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountPerf.updatedAt, positions.updatedAt]);

  return {
    positions,
    accounts: {
      isLoading: !data,
      error: accountPerf.error,
      data: data || [],
      updatedAt,
    },
  };
}
