import { mustNeverExist } from "lib/types";

import { OrderType } from "./types";

export type OrderTypeFilterValue =
  | "trigger-limit"
  | "trigger-stop-market"
  | "trigger-take-profit"
  | "trigger-stop-loss"
  | "twap"
  | "twap-increase"
  | "swaps-twap"
  | "swaps-limit";

type OrderFilterGroupType = "twap" | "none";

type OrderTypeFilterCondition = { type: OrderType[]; groupType: OrderFilterGroupType };

// type and group must match within one option, so Take-Profit + Swaps TWAP doesn't let plain limit swaps through
export const getIsOrderMatchingTypeFilters = (
  orderTypeFilters: OrderTypeFilterValue[]
): ((orderType: OrderType, groupType: OrderFilterGroupType) => boolean) => {
  const conditions = orderTypeFilters.map(convertOrderTypeFilterValue);

  return (orderType, groupType) =>
    conditions.some((condition) => condition.type.includes(orderType) && condition.groupType === groupType);
};

const convertOrderTypeFilterValue = (orderTypeFilter: OrderTypeFilterValue): OrderTypeFilterCondition => {
  switch (orderTypeFilter) {
    case "trigger-limit":
      return { type: [OrderType.LimitIncrease], groupType: "none" };
    case "trigger-stop-market":
      return { type: [OrderType.StopIncrease], groupType: "none" };
    case "trigger-take-profit":
      return { type: [OrderType.LimitDecrease], groupType: "none" };
    case "trigger-stop-loss":
      return { type: [OrderType.StopLossDecrease], groupType: "none" };
    case "swaps-twap":
      return { type: [OrderType.LimitSwap], groupType: "twap" };
    case "swaps-limit":
      return { type: [OrderType.LimitSwap], groupType: "none" };
    case "twap":
      return { type: [OrderType.LimitIncrease, OrderType.LimitDecrease], groupType: "twap" };
    case "twap-increase":
      return { type: [OrderType.LimitIncrease], groupType: "twap" };
    default:
      return mustNeverExist(orderTypeFilter);
  }
};
