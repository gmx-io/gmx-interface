import { CustomErrorName } from ".";
import { ErrorData } from "./parseError";

export function isContractError(error: ErrorData, errorType: CustomErrorName) {
  return error.contractError === errorType;
}
