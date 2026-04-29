import type { ErrorLike } from "./parseError";
import { parseError } from "./parseError";

const IGNORED_ESTIMATE_GAS_CONTRACT_ERRORS = ["InsufficientMultichainBalance"];
const IGNORED_ESTIMATE_GAS_MESSAGE_PATTERNS = [
  "ERC20: transfer amount exceeds balance",
  "ERC20: transfer amount exceeds allowance",
];

export function isIgnoredEstimateGasError(error: ErrorLike): boolean {
  const parsed = parseError(error);
  if (!parsed) return false;

  if (parsed.contractError && IGNORED_ESTIMATE_GAS_CONTRACT_ERRORS.includes(parsed.contractError)) {
    return true;
  }

  if (
    parsed.errorMessage &&
    IGNORED_ESTIMATE_GAS_MESSAGE_PATTERNS.some((pattern) => parsed.errorMessage!.includes(pattern))
  ) {
    return true;
  }

  return false;
}
