import { TableCell } from "components/Table/types";
import { LEADERBOARD_PAGES } from "./constants";

export enum PerfPeriod {
  DAY = "24 hours",
  WEEK = "7 days",
  MONTH = "1 month",
  TOTAL = "All time",
}

export type TopAccountsRow = {
  key: string;
  rank: TableCell;
  account: TableCell;
  absPnl: TableCell;
  relPnl: TableCell;
  averageSize: TableCell;
  averageLeverage: TableCell;
  winsLosses: TableCell;
};

export type RemoteData<T> = {
  isLoading: boolean;
  data: T[];
  error: Error | null;
  updatedAt: number;
};

export type CompetitionType = "notionalPnl" | "pnlPercentage";

export type LeaderboardTimeframe = {
  from: number;
  to: number | undefined;
};

export type LeaderboardType = "all" | "30days" | "7days";

export type LeaderboardPageKey = keyof typeof LEADERBOARD_PAGES;
