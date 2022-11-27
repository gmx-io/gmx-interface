export type SyntheticsMarket = {
  perp: string;

  marketTokenAddress: string;

  indexTokenSymbol: string;
  longCollateralSymbol: string;
  shortCollateralSymbol: string;
};

export enum MarketPoolType {
  Long = "Long",
  Short = "Short",
}
