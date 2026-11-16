export type GmsolMarketConfig = {
  tradeMath?: "gmsol";
  minCollateralUsd?: bigint;
  minPositionSizeUsd?: bigint;
};

export type Decimal = { coefficient: bigint; scale: number };
