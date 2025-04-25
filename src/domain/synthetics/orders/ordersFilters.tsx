import { mustNeverExist } from "lib/types";

import { OrderType } from "./types";

export type OrderTypeFilterValue =
  | "trigger-limit"
  | "trigger-take-profit"
  | "trigger-stop-loss"
  | "twap"
  | "swaps-twap"
  | "swaps-limit";

type OrderFilterGroupType = "twap" | "none";

export const convertOrderTypeFilterValues = (
  orderTypeFilters: OrderTypeFilterValue[]
): { type: OrderType[]; groupType: OrderFilterGroupType[] } => {
  return orderTypeFilters.map(convertOrderTypeFilterValue).reduce(
    (acc, curr) => {
      return {
        type: [...acc.type, ...curr.type],
        groupType: [...acc.groupType, curr.groupType],
      };
    },
    { type: [] as OrderType[], groupType: [] as OrderFilterGroupType[] }
  );
};

const convertOrderTypeFilterValue = (
  orderTypeFilter: OrderTypeFilterValue
): { type: OrderType[]; groupType: OrderFilterGroupType } => {
  switch (orderTypeFilter) {
    case "trigger-limit":
      return { type: [OrderType.LimitIncrease], groupType: "none" };
    case "trigger-take-profit":
      return { type: [OrderType.LimitIncrease], groupType: "none" };
    case "trigger-stop-loss":
      return { type: [OrderType.StopLossDecrease], groupType: "none" };
    case "swaps-twap":
      return { type: [OrderType.LimitSwap], groupType: "twap" };
    case "swaps-limit":
      return { type: [OrderType.LimitSwap], groupType: "none" };
    case "twap":
      return { type: [OrderType.LimitIncrease, OrderType.LimitDecrease], groupType: "twap" };
    default:
      return mustNeverExist(orderTypeFilter);
  }
};
