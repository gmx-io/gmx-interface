import { useState, useEffect } from "react";
import { AccountPerf, AccountPositionsSummary, AccountScores, PerfPeriod, PositionScores, PositionsSummaryByAccount, RemoteData } from "./types";
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
        sumCollateral: BigNumber.from(0),
        sumMaxSize: BigNumber.from(0),
        positions: [],
      };
    }

    const summary = groupBy[account];

    summary.positions.push(p);
    summary.unrealizedPnl = summary.unrealizedPnl.add(p.unrealizedPnl);
    summary.sumCollateral = summary.sumCollateral.add(p.collateralAmount);
    summary.sumMaxSize = summary.sumMaxSize.add(p.maxSize);
  }

  return groupBy;
};

export function useTopAccounts(period: PerfPeriod) {
  const [topAccounts, setTopAccounts] = useState<RemoteData<AccountScores>>({
    isLoading: false,
    data: [],
    error: null,
  });

  const accountPerf = useAccountPerf(period);
  const positions = usePositionScores();

  useEffect(() => {
    if (accountPerf.error || positions.error) {
      setTopAccounts(s => ({...s, isLoading: false, error: accountPerf.error || positions.error}));
      return;
    } else if (!(accountPerf.data && accountPerf.data.length) || !(positions.data && positions.data.length)) {
      setTopAccounts(s => ({...s, error: null, isLoading: true}));
      return;
    }

    const scoresByAccount: Record<string, AccountScores> = {};
    const accountScores: Array<AccountScores> = []
    const summaryByAccount: Record<string, AccountPositionsSummary> = groupPositionsByAccount(positions.data);
    const perfOrderedByPnl: Array<AccountPerf> = accountPerf.data.sort((a, b) => a.totalPnl.gt(b.totalPnl) ? -1 : 1);

    for (let i = 0; i < perfOrderedByPnl.length; i++) {
      const acc = perfOrderedByPnl[i];
      const summary = summaryByAccount[acc.account];
      const profit = acc.totalPnl.add(summary.unrealizedPnl);
      const maxCollateral = acc.maxCollateral;
      const relPnl = profit.div(maxCollateral).mul(BigNumber.from(100));
      const scores = {
        id: acc.account + ":" + period,
        rank: i + 1,
        account: acc.account,
        absPnl: acc.totalPnl,
        relPnl,
        size: acc.sumMaxSize.add(summary.sumMaxSize).div(acc.closedCount.add(BigNumber.from(summary.positions.length))),
        leverage: acc.cumsumSize.div(acc.cumsumCollateral),
      };

      scoresByAccount[acc.account] = scores;
      accountScores.push(scores)
    }
  }, [
    accountPerf.data,
    accountPerf.data.length,
    accountPerf.error,
    period,
    positions.data,
    positions.data.length,
    positions.error
  ]);

  return topAccounts;
}
