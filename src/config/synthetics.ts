import { t } from "@lingui/macro";

export const PLACEHOLDER_MARKET_NAME = "GM: ---/--- : [---/---]";

export const HIGH_PRICE_IMPACT_BP = 800;

export enum OrderType {
  // the order will be cancelled if the minOutputAmount cannot be fulfilled
  MarketSwap,
  // @dev LimitSwap: swap token A to token B if the minOutputAmount can be fulfilled
  LimitSwap,
  // @dev MarketIncrease: increase position at the current market price
  // the order will be cancelled if the position cannot be increased at the acceptablePrice
  MarketIncrease,
  // @dev LimitIncrease: increase position if the triggerPrice is reached and the acceptablePrice can be fulfilled
  LimitIncrease,
  // @dev MarketDecrease: decrease position at the curent market price
  // the order will be cancelled if the position cannot be decreased at the acceptablePrice
  MarketDecrease,
  // @dev LimitDecrease: decrease position if the triggerPrice is reached and the acceptablePrice can be fulfilled
  LimitDecrease,
  // @dev StopLossDecrease: decrease position if the triggerPrice is reached and the acceptablePrice can be fulfilled
  StopLossDecrease,
  // @dev Liquidation: allows liquidation of positions if the criteria for liquidation are met
  Liquidation,
}

export const orderTypeLabels = {
  [OrderType.MarketSwap]: t`Market Swap`,
  [OrderType.LimitSwap]: t`Limit Swap`,
  [OrderType.MarketIncrease]: t`Market Increase`,
  [OrderType.LimitIncrease]: t`Limit Increase`,
  [OrderType.MarketDecrease]: t`Market Decrease`,
  [OrderType.LimitDecrease]: t`Limit Decrease`,
  [OrderType.StopLossDecrease]: t`Stop Loss Decrease`,
  [OrderType.Liquidation]: t`Liquidation`,
};
