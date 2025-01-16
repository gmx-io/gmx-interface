import { t } from "@lingui/macro";

import { getChainName } from "config/chains";
import { ExecutionFee } from "sdk/types/fees";

export * from "./executionFee";

export function getExecutionFeeWarning(chainId: number, fees: ExecutionFee) {
  const chainName = getChainName(chainId);
  const highWarning = t`The network fees are high currently, which may be due to a temporary increase in transactions on the ${chainName} network.`;
  const veryHighWarning = t`The network fees are very high currently, which may be due to a temporary increase in transactions on the ${chainName} network.`;

  return fees.isFeeVeryHigh ? veryHighWarning : fees.isFeeHigh ? highWarning : undefined;
}
