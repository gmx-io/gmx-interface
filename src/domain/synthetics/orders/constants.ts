import { t } from "@lingui/macro";
import { OrderType } from "./types";

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
