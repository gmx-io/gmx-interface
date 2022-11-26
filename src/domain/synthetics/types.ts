import { Token } from "domain/tokens";
import { BigNumber } from "ethers";

export type SyntheticsMarket = {
  perp: string;

  marketTokenAddress: string;

  indexTokenSymbol: string;
  longCollateralSymbol: string;
  shortCollateralSymbol: string;
};

export type TokenPriceData = {
  minPrice: BigNumber;
  maxPrice: BigNumber;
};

export type TokenBalanceData = {
  balance: BigNumber;
};

export type SyntheticsTokenInfo = Token & TokenPriceData & TokenBalanceData;
