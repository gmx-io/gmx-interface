import { getTokensMap } from "sdk/configs/tokens";

import { metrics } from "./Metrics";
import type { TokenPermitEvent, TokenPermitOutcome } from "./types";

export function sendTokenPermitMetric({
  outcome,
  chainId,
  tokenAddress,
  accountType,
  reason,
}: {
  outcome: TokenPermitOutcome;
  chainId: number;
  tokenAddress: string;
  accountType: string | undefined;
  reason?: string;
}) {
  metrics.pushEvent<TokenPermitEvent>({
    event: "tokenPermit",
    isError: outcome === "failedCheck" || outcome === "fallback",
    data: {
      outcome,
      chainId,
      token: getTokensMap(chainId)?.[tokenAddress]?.symbol ?? tokenAddress,
      accountType,
      reason,
    },
  });
}
