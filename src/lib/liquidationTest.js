import { BigNumber } from "ethers";
import getLiquidation from "./getLiquidation";

const DEPOSIT_ERROR = {
  liquidationAmount: BigNumber.from(),
  size: BigNumber.from(),
  collateral: BigNumber.from(),
  averagePrice: BigNumber.from(),
  isLong: BigNumber.from(),
};

const liquidation = getLiquidation(DEPOSIT_ERROR);
