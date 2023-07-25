import { AccountPerf, AccountPositionsSummary, AccountScores, PerfPeriod, PositionScores, PositionsSummaryByAccount } from "./types";
import { useAccountPerf, usePositionScores } from "./index";
import { BigNumber } from "ethers";
import { expandDecimals } from "lib/numbers";
import { USD_DECIMALS } from "lib/legacy";

const defaultSummary = (account) => ({
  account,
  unrealizedPnl: BigNumber.from(0),
  sumSize: BigNumber.from(0),
  sumCollateral: BigNumber.from(0),
  sumMaxSize: BigNumber.from(0),
  totalCollateral: BigNumber.from(0),
  positions: [],
});

const groupPositionsByAccount = (positions: Array<PositionScores>): PositionsSummaryByAccount => {
  const groupBy: PositionsSummaryByAccount = {};

  for (const p of positions) {
    const { account } = p;

    if (!groupBy[account]) {
      groupBy[account] = defaultSummary(account);
    }

    const summary = groupBy[account];

    summary.positions.push(p);
    summary.unrealizedPnl = summary.unrealizedPnl.add(p.unrealizedPnl);
    summary.sumSize = summary.sumSize.add(p.sizeInUsd)
    summary.sumCollateral = summary.sumCollateral.add(p.collateralAmountUsd);
    summary.sumMaxSize = summary.sumMaxSize.add(p.maxSize);
    summary.totalCollateral = summary.totalCollateral.add(p.collateralAmountUsd);
  }

  return groupBy;
};

export function useTopAccounts(period: PerfPeriod) {
  const accountPerf = useAccountPerf(period);
  const positions = usePositionScores();

  if (accountPerf.error || positions.error) {
    return { data: [], isLoading: false, error: accountPerf.error || positions.error };
  } else if (accountPerf.isLoading || positions.isLoading) {
    return { data: [], isLoading: true, error: null };
  }

  const data: Array<AccountScores> = []
  const openPositionsByAccount: Record<string, AccountPositionsSummary> = groupPositionsByAccount(positions.data);
  const perfOrderedByPnl: Array<AccountPerf> = accountPerf.data.sort((a, b) => a.totalPnl.gt(b.totalPnl) ? -1 : 1);

  for (let i = 0; i < perfOrderedByPnl.length; i++) {
    const perf = perfOrderedByPnl[i];
    const openPositions = openPositionsByAccount[perf.account] || defaultSummary(perf.account);

    const profit = perf.totalPnl.add(openPositions.unrealizedPnl);
    const maxCollateral = openPositions.totalCollateral.sub(perf.totalPnl);
    const relPnl = profit.mul(expandDecimals(1, USD_DECIMALS)).div(maxCollateral);

    if (perf.account.toLowerCase() === "0xde518bd3e2ade6873473eb32cfe4ca75f6d7f44e") {
      const { formatAmount } = require("lib/numbers");

      console.info({
        perf,
        openPositions,
        profit: formatAmount(profit, USD_DECIMALS),
        maxCollateral: formatAmount(maxCollateral, USD_DECIMALS),
        totalCollateral: formatAmount(perf.totalCollateral, USD_DECIMALS),
        realizedPnl: formatAmount(perf.totalPnl, USD_DECIMALS),
        unrealizedPnl: formatAmount(openPositions.unrealizedPnl, USD_DECIMALS),
        relPnl: formatAmount(relPnl, USD_DECIMALS),
      });
    }

    const cumsumCollateral = perf.cumsumCollateral; // .add(openPositions.sumCollateral);
    const cumsumSize = perf.cumsumSize; // .add(openPositions.sumSize);

    if (cumsumCollateral.isZero()) {
      throw new Error(`Account ${perf.account} collateral history is 0, please verify data integrity`);
    }

    const sumMaxSize = perf.sumMaxSize.add(openPositions.sumMaxSize);
    const positionsCount = perf.closedCount.add(BigNumber.from(openPositions.positions.length));
    const leverage = cumsumSize.mul(expandDecimals(1, USD_DECIMALS)).div(cumsumCollateral);
    const size = sumMaxSize.div(positionsCount);
    const scores = {
      id: perf.account + ":" + period,
      account: perf.account,
      absPnl: perf.totalPnl,
      relPnl,
      size,
      leverage,
      wins: perf.wins,
      losses: perf.losses,
    };

    data.push(scores);
  }

  return { isLoading: false, error: null, data };
}
