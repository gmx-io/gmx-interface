export type BuybackWeekData = {
  weekStart: number;
  weekEnd: number;
  weeklyAccrued: string;
  cumulativeAccrued: string;
};

export type BuybackSummary = {
  totalAccrued: string;
  latestWeekAccrued: string;
  weeksTracked: number;
};

export type BuybackWeeklyStatsResponse = {
  summary: BuybackSummary;
  weeks: BuybackWeekData[];
};
