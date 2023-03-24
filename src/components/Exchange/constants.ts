export enum ErrorCode {
  InsufficientLiquiditySwap = "INSUFFICIENT_LIQUIDITY_SWAP",
  InsufficientLiquidityLeverage = "INSUFFICIENT_LIQUIDITY_LEVERAGE",
  InsufficientCollateralIn = "INSUFFICIENT_COLLATERAL_IN",
  InsufficientProfitLiquidity = "INSUFFICIENT_PROFIT_LIQUIDITY",
  InsufficientReceiveToken = "INSUFFICIENT_RECEIVE_TOKEN",
  ReceiveCollateralTokenOnly = "RECEIVE_COLLATERAL_TOKEN_ONLY",
  TokenPoolExceeded = "TOKEN_POOL_EXCEEDED",
  TokenPoolExceededShorts = "TOKEN_POOL_EXCEEDED_SHORTS",
  Buffer = "BUFFER",
  MaxUSDG = "MAX_USDG",
  InvalidLiqPrice = "INVALID_LIQ_PRICE",
}

export enum ErrorDisplayType {
  Modal = "MODAL",
  Tooltip = "TOOLTIP",
}
