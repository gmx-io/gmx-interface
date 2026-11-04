import { type ErrorLike, parseError } from "lib/errors";
import { metrics, type TokenApprovalEvent, type TokenApprovalMetricParams } from "lib/metrics";
import type { AnyChainId } from "sdk/configs/chains";

import { getApprovalTokenDisplay } from "./insufficientApproval";

export function sendTokenApprovalMetric({
  metric,
  method,
  outcome,
  chainId,
  tokenAddress,
  spender,
  isUnlimited,
  error,
}: {
  metric: TokenApprovalMetricParams;
  method: TokenApprovalEvent["data"]["method"];
  outcome: TokenApprovalEvent["data"]["outcome"];
  chainId: number;
  tokenAddress: string;
  spender: string;
  isUnlimited: boolean | undefined;
  error?: unknown;
}) {
  const { hideSpender, ...metricData } = metric;
  const errorData = error !== undefined ? parseError(error as ErrorLike) : undefined;

  metrics.pushEvent<TokenApprovalEvent>({
    event: "tokenApproval",
    isError: false,
    data: {
      ...metricData,
      method,
      outcome,
      chainId,
      tokenAddress,
      tokenSymbol: getApprovalTokenDisplay(chainId as AnyChainId, tokenAddress)?.symbol,
      spenderAddress: hideSpender ? undefined : spender,
      isUnlimited,
      // tells failures before the wallet prompt (e.g. gas estimation) from wallet errors
      errorContext: errorData?.errorContext,
      txErrorType: errorData?.txErrorType,
    },
  });
}
