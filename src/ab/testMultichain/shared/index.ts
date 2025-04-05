import { getIsFlagEnabled } from "config/ab";
export type { Line, MakeOptional, RowDetails, TooltipContent, TooltipState, TooltipString } from "./disabled";
export {
  INEQUALITY_GT,
  INEQUALITY_LT,
  formatTradeActionTimestamp,
  formatTradeActionTimestampISO,
  getErrorTooltipTitle,
  getOrderActionText,
  infoRow,
  lines,
  numberToState,
} from "./disabled";

import { tryGetError as tryGetErrorDisabled } from "./disabled";
import { tryGetError as tryGetErrorEnabled } from "./enabled";

export const tryGetError = getIsFlagEnabled("testMultichain") ? tryGetErrorEnabled : tryGetErrorDisabled;
