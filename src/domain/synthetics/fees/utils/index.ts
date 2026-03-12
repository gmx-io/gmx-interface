import { t } from "@lingui/macro";

import { getChainName } from "config/chains";
import { ExecutionFee } from "sdk/utils/fees/types";

export function getExecutionFeeWarning(chainId: number, fees: ExecutionFee) {
  const chainName = getChainName(chainId);
  const highWarning = t`Network fees are high due to increased ${chainName} network activity`;
  const veryHighWarning = t`Network fees are very high due to increased ${chainName} network activity`;

  return fees.isFeeVeryHigh ? veryHighWarning : fees.isFeeHigh ? highWarning : undefined;
}
