import type { ApiParameterPeriod } from "utils/rates/types";

export type PerformanceAnnualized = {
  address: string;
  performance?: string;
  entity: string;
};

export type PerformanceSnapshot = {
  snapshotTimestamp: number;
  performance?: string;
};

export type PerformanceSnapshots = {
  address: string;
  entity: string;
  snapshots: PerformanceSnapshot[];
};

export type PerformanceParams = {
  period?: ApiParameterPeriod;
  address?: string;
};
