import { TableCell } from "components/Table/types";

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

export type Ranked<T> = T & { rank: number };

export type RemoteData<T> = {
  isLoading: boolean;
  data: T[];
  error: Error | null;
  updatedAt: number;
};
