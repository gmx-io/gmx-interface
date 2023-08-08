import { AccountPositionsSummary, AccountScores, PerfPeriod, PositionScores, PositionsSummaryByAccount } from "./types";
import { useAccountPerf, usePositionScores } from "./index";
import { BigNumber } from "ethers";
import { expandDecimals } from "lib/numbers";
import { USD_DECIMALS } from "lib/legacy";

const defaultSummary = (account: string): AccountPositionsSummary => ({
  account,
  unrealizedPnl: BigNumber.from(0),
  sumSize: BigNumber.from(0),
  sumCollateral: BigNumber.from(0),
  sumMaxSize: BigNumber.from(0),
  totalCollateral: BigNumber.from(0),
  borrowingFeeUsd: BigNumber.from(0),
  fundingFeeUsd: BigNumber.from(0),
  positionFeeUsd: BigNumber.from(0),
  priceImpactUsd: BigNumber.from(0),
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
    summary.borrowingFeeUsd = summary.borrowingFeeUsd.add(p.borrowingFeeUsd);
    summary.fundingFeeUsd = summary.fundingFeeUsd.add(p.fundingFeeUsd);
    summary.positionFeeUsd = summary.positionFeeUsd.add(p.positionFeeUsd);
    summary.priceImpactUsd = summary.priceImpactUsd.add(p.priceImpactUsd);
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

  for (let i = 0; i < accountPerf.data.length; i++) {
    const perf = accountPerf.data[i];
    const openPositions = openPositionsByAccount[perf.account] || defaultSummary(perf.account);
    const totalPnl = perf.totalPnl
      .sub(openPositions.borrowingFeeUsd)
      .sub(openPositions.fundingFeeUsd)
      .sub(openPositions.positionFeeUsd)
      .add(openPositions.priceImpactUsd);

    // console.log({
    //   pnlWithFees: formatUsd(perf.totalPnl),
    //   borrowingFees: formatUsd(openPositions.borrowingFeeUsd),
    //   fundingFeeUsd: formatUsd(openPositions.fundingFeeUsd),
    //   positionFeeUsd: formatUsd(openPositions.positionFeeUsd),
    //   priceImpactUsd: formatUsd(openPositions.priceImpactUsd),
    //   totalPnl: formatUsd(totalPnl),
    // });

    const profit = totalPnl.add(openPositions.unrealizedPnl);
    const maxCollateral = perf.maxCollateral;
    if (maxCollateral.isZero()) {
      throw new Error(`Account ${perf.account} max collateral is 0, please verify data integrity`);
    }
    const relPnl = profit.mul(expandDecimals(1, USD_DECIMALS)).div(maxCollateral);
    const cumsumCollateral = perf.cumsumCollateral;
    const cumsumSize = perf.cumsumSize;

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
      absPnl: totalPnl,
      // absPnl: profit,
      relPnl,
      size,
      leverage,
      wins: perf.wins,
      losses: perf.losses,
    };

    data.push(scores);
  }

  const orderedData: Array<AccountScores> = data.sort((a, b) => a.absPnl.gt(b.absPnl) ? -1 : 1);

  return { isLoading: false, error: null, data: orderedData };
}
