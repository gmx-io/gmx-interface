import { mustNeverExist } from "lib/types";

import { OrderInfo, OrderType } from "./types";

export type OrderTypeFilterValue =
  | "trigger-limit"
  | "trigger-take-profit"
  | "trigger-stop-loss"
  | "swaps-twap"
  | "swaps-limit";

export const convertOrderTypeFilterValues = (
  orderTypeFilters: OrderTypeFilterValue[]
): { type: OrderType[]; groupType: OrderInfo["__groupType"][] } => {
  return orderTypeFilters.map(convertOrderTypeFilterValue).reduce(
    (acc, curr) => {
      return {
        type: [...acc.type, ...curr.type],
        groupType: [...acc.groupType, ...curr.groupType],
      };
    },
    { type: [], groupType: [] }
  );
};

const convertOrderTypeFilterValue = (
  orderTypeFilter: OrderTypeFilterValue
): { type: OrderType[]; groupType: OrderInfo["__groupType"][] } => {
  switch (orderTypeFilter) {
    case "trigger-limit":
      return { type: [OrderType.LimitIncrease], groupType: [] };
    case "trigger-take-profit":
      return { type: [OrderType.LimitIncrease], groupType: [] };
    case "trigger-stop-loss":
      return { type: [OrderType.StopLossDecrease], groupType: [] };
    case "swaps-twap":
      return { type: [OrderType.LimitSwap], groupType: ["twap"] };
    case "swaps-limit":
      return { type: [OrderType.LimitSwap], groupType: ["none"] };
    default:
      return mustNeverExist(orderTypeFilter);
  }
};
