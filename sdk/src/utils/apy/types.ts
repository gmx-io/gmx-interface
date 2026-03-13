import type { ApiParameterPeriod } from "utils/rates/types";

export type ApyEntry = {
  apy: number;
  baseApy: number;
  bonusApr: number;
};

export type ApyResponse = {
  markets: Record<string, ApyEntry>;
  glvs: Record<string, ApyEntry>;
};

export type ApyParams = {
  period?: ApiParameterPeriod;
};
