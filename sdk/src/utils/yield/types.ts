import type { ApiParameterPeriod } from "utils/rates/types";

export type GmPoolYieldPnlWindow = {
  period: ApiParameterPeriod;
  startTimestamp: number;
  endTimestamp: number;
};

export type GmPoolYieldPnlComponents = {
  realizedPnlLongUsd: number;
  realizedPnlShortUsd: number;
  unrealizedPnlLongUsd: number;
  unrealizedPnlShortUsd: number;
};

export type GmPoolYieldPnlEntry = {
  marketToken: string;
  feeApy: number | null;
  tradersPnlUsd: number | null;
  tradersPnlApr: number | null;
  timeWeightedPoolValue: number | null;
  window: GmPoolYieldPnlWindow;
  components?: GmPoolYieldPnlComponents;
};

export type GmPoolsYieldPnlResponse = {
  pools: GmPoolYieldPnlEntry[];
};

export type GmPoolsYieldPnlParams = {
  pools?: string[];
  period?: ApiParameterPeriod;
  includeComponents?: boolean;
};

export type GmUserEarningsWindow = {
  days: number;
  startTimestamp: number;
  endTimestamp: number;
};

export type GmUserEarningEntry = {
  marketToken: string;
  lifetimeFeeUsd: string;
  recent7dFeeUsd: string;
};

export type GmUserEarningsResponse = {
  account: string;
  window: GmUserEarningsWindow;
  pools: GmUserEarningEntry[];
};

export type GmUserEarningsParams = {
  account: string;
};
