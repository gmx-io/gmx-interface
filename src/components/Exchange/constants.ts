export enum ErrorCode {
  InsufficientLiquiditySwap = "INSUFFICIENT_LIQUIDITY_SWAP",
  InsufficientLiquidityLeverage = "INSUFFICIENT_LIQUIDITY_LEVERAGE",
  InsufficientCollateralIn = "INSUFFICIENT_COLLATERAL_IN",
  InsufficientProfitLiquidity = "INSUFFICIENT_PROFIT_LIQUIDITY",
  InsufficientReceiveToken = "INSUFFICIENT_RECEIVE_TOKEN",
  ReceiveCollateralTokenOnly = "RECEIVE_COLLATERAL_TOKEN_ONLY",
  TokenPoolExceeded = "TOKEN_POOL_EXCEEDED",
  TokenPoolExceededShorts = "TOKEN_POOL_EXCEEDED_SHORTS",
  KeepLeverageNotPossible = "KEEP_LEVERAGE_NOT_POSSIBLE",
  FeesHigherThanCollateral = "FEES_HIGHER_THAN_COLLATERAL",
  NegativeNextCollateral = "NEGATIVE_NEXT_COLLATERAL",
  Buffer = "BUFFER",
  MaxUSDG = "MAX_USDG",
  InvalidLiqPrice = "INVALID_LIQ_PRICE",
  InsufficientDepositAmount = "INSUFFICIENT_DEPOSIT_AMOUNT",
}

export enum ErrorDisplayType {
  Modal = "MODAL",
  Tooltip = "TOOLTIP",
}
