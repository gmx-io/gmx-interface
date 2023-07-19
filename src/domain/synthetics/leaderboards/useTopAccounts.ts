// import { useState, useEffect } from "react";
import { AccountPerf, AccountPositionsSummary, AccountScores, PerfPeriod, PositionScores, PositionsSummaryByAccount } from "./types";
import { useAccountPerf, usePositionScores } from "./index";
import { BigNumber } from "ethers";

const groupPositionsByAccount = (positions: Array<PositionScores>): PositionsSummaryByAccount => {
  const groupBy: PositionsSummaryByAccount = {};

  for (const p of positions) {
    const { account } = p;

    if (!groupBy[account]) {
      groupBy[account] = {
        account,
        unrealizedPnl: BigNumber.from(0),
        sumSize: BigNumber.from(0),
        sumCollateral: BigNumber.from(0),
        sumMaxSize: BigNumber.from(0),
        positions: [],
      };
    }

    const summary = groupBy[account];

    summary.positions.push(p);
    summary.unrealizedPnl = summary.unrealizedPnl.add(p.unrealizedPnl);
    summary.sumSize = summary.sumSize.add(p.sizeInUsd)
    summary.sumCollateral = summary.sumCollateral.add(p.collateralAmount);
    summary.sumMaxSize = summary.sumMaxSize.add(p.maxSize);
  }

  return groupBy;
};

export function useTopAccounts(period: PerfPeriod) {
  const accountPerf = useAccountPerf(period);
  console.log({accountPerf});
  const positions = usePositionScores();
  console.log({positions});

  if (accountPerf.error || positions.error) {
    return { data: [], isLoading: false, error: accountPerf.error || positions.error };
  } else if (accountPerf.isLoading || positions.isLoading) {
    return { data: [], isLoading: true, error: null };
  }

  const data: Array<AccountScores> = []
  const summaryByAccount: Record<string, AccountPositionsSummary> = groupPositionsByAccount(positions.data);
  const perfOrderedByPnl: Array<AccountPerf> = accountPerf.data.sort((a, b) => a.totalPnl.gt(b.totalPnl) ? -1 : 1);

  for (let i = 0; i < perfOrderedByPnl.length; i++) {
    const acc = perfOrderedByPnl[i];
    const summary = summaryByAccount[acc.account] || {
      unrealizedPnl: BigNumber.from(0),
      sumMaxSize: BigNumber.from(0),
      positions: [],
    };

    const profit = acc.totalPnl.add(summary.unrealizedPnl);
    const relPnl = profit.div(acc.maxCollateral).mul(BigNumber.from(100));

    if (acc.cumsumCollateral.add(summary.sumCollateral).eq(0)) {
      console.log({ acc, summary });
      return { isLoading: false, data: [], error: null };
    }

    const scores = {
      id: acc.account + ":" + period,
      rank: i + 1,
      account: acc.account,
      absPnl: acc.totalPnl,
      relPnl: relPnl,
      size: BigNumber.from(0), // acc.sumMaxSize.add(summary.sumMaxSize).div(acc.closedCount.add(BigNumber.from(summary.positions.length))),
      leverage: acc.cumsumSize.add(summary.sumSize).div(acc.cumsumCollateral.add(summary.sumCollateral)),
      wins: acc.wins,
      losses: acc.losses,
    };

    data.push(scores);
  }

  return { isLoading: false, error: null, data };
}
