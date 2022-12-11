import { BigNumber } from "ethers";

export type PriceImpactConfig = {
  factorPositive: BigNumber;
  factorNegative: BigNumber;
  exponentFactor: BigNumber;
};

export type PriceImpactConfigsData = {
  [marketAddress: string]: PriceImpactConfig;
};

export type PriceImpact = {
  impact: BigNumber;
  basisPoints: BigNumber;
};
