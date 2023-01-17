import { BigNumber } from "ethers";

export type SyntheticsConfig = {
  maxLeverage: BigNumber;
  minCollateralUsd: BigNumber;
};
