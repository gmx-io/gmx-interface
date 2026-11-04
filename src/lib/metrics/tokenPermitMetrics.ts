import { getTokensMap } from "sdk/configs/tokens";
import type { SignedTokenPermit } from "sdk/utils/tokens/types";

import { metrics } from "./Metrics";
import type { TokenPermitEvent, TokenPermitFlow, TokenPermitOutcome } from "./types";

// a slice of r differs for every signature, carries no account and can't authorize anything
export function getTokenPermitId(permit: SignedTokenPermit): string {
  return permit.r.slice(2, 14);
}

export function sendTokenPermitMetric({
  outcome,
  chainId,
  tokenAddress,
  accountType,
  reason,
  flow,
  permitId,
}: {
  outcome: TokenPermitOutcome;
  chainId: number;
  tokenAddress: string;
  accountType: string | undefined;
  reason?: string;
  flow?: TokenPermitFlow;
  permitId?: string;
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
      flow,
      permitId,
    },
  });
}
