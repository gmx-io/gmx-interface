import { getIsFlagEnabled } from "config/ab";

export { convertFromContractPrice, convertToContractPrice } from "./disabled";

import { parseTxEvents as parseTxEventsDisabled } from "./disabled";
import { parseTxEvents as parseTxEventsEnabled } from "./enabled";

export const parseTxEvents = getIsFlagEnabled("testMultichain") ? parseTxEventsEnabled : parseTxEventsDisabled;
