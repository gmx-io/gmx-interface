export type Direction = "Long" | "Short" | "Swap";
export type TradeMode = "Market" | "Limit" | "Trigger";
export type Leverage = `${0.1 | 1 | 2 | 5 | 10 | 15 | 25 | 50 | 75 | 100}x`;
export type PositionPercent = "25%" | "50%" | "75%" | "100%";
export type GmxNavigation =
  | "/trade"
  | "/dashboard"
  | "/earn"
  | "/leaderboard"
  | "/ecosystem"
  | "/buy"
  | "/buy_glp"
  | "/pools"
  | "/referrals";
export type EditOperation = "Deposit" | "Withdraw";
export type CloseOperation = "Market" | "TP/SL";
