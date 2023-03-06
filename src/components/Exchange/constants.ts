export enum ErrorCode {
  InsufficientLiquidity = "INSUFFICIENT_LIQUIDITY",
  InsufficientLiquidityShorts = "INSUFFICIENT_LIQUIDITY_SHORTS",
  InsufficientCollateralIn = "INSUFFICIENT_COLLATERAL_IN",
  InsufficientReceiveToken = "INSUFFICIENT_RECEIVE_TOKEN",
  ReceiveCollateralTokenOnly = "RECEIVE_COLLATERAL_TOKEN_ONLY",
  PoolExceeded = "POOL_EXCEEDED",
  Buffer = "BUFFER",
  MaxUSDG = "MAX_USDG",
  InvalidLiqPrice = "INVALID_LIQ_PRICE",
}

export enum ErrorDisplayType {
  Modal = "MODAL",
  Tooltip = "TOOLTIP",
}
