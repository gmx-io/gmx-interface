import { getIsFlagEnabled } from "config/ab";
import { parseError as parseErrorDisabled } from "sdk/utils/errors";

import { parseError as parseErrorEnabled } from "./enabled";

export type { ErrorData, ErrorLike, ErrorPattern, OrderErrorContext, TxError } from "sdk/utils/errors";

export {
  TxErrorType,
  CustomErrorName,
  extendError,
  getIsUserError,
  getIsUserRejectedError,
  isContractError,
  extractTxnError,
  extractDataFromError,
} from "sdk/utils/errors";
// export {  } from "sdk/utils/errors/transactionsErrors";

export const parseError = getIsFlagEnabled("testMultichain") ? parseErrorEnabled : parseErrorDisabled;
