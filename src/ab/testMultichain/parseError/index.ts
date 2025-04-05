import { getIsFlagEnabled } from "config/ab";

export type { ErrorData, ErrorLike } from "./disabled";

import { parseError as parseErrorDisabled } from "./disabled";
import { parseError as parseErrorEnabled } from "./enabled";

export const parseError = getIsFlagEnabled("testMultichain") ? parseErrorEnabled : parseErrorDisabled;
