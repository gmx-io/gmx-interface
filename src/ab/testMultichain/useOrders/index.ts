import { getIsFlagEnabled } from "config/ab";

import { useOrders as useOrdersDisabled } from "./disabled";
import { useOrders as useOrdersEnabled } from "./enabled";

export const useOrders = getIsFlagEnabled("testMultichain") ? useOrdersEnabled : useOrdersDisabled;
