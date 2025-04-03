import { ParsedError } from "./parseError";

export function isContractError(error: ParsedError, errorType: CustomErrorName) {
  return error.contractError === errorType;
}
