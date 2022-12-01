import { BigNumber } from "ethers";

export type PriceImpactConfig = {
  factorPositive: any;
  factorNegative: any;
  exponentFactor: any;
};

export type PriceImpactConfigsData = {
  priceImpactConfigs: {
    [marketAddress: string]: PriceImpactConfig;
  };
};

export type PriceImpactData = {
  priceImpact: BigNumber;
  priceImpactBasisPoints: BigNumber;
};
