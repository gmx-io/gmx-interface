import { withRetry } from "viem";

import type { ContractsChainId } from "config/chains";
import { extendError } from "lib/errors";
import { metrics } from "lib/metrics";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import { nowInSeconds } from "sdk/utils/time";
import type { SignedTokenPermit } from "sdk/utils/tokens/types";

import { checkTokenPermits, TokenPermitsCheckError, type TokenPermitsCheckResult } from "./checkTokenPermits";
import { getRelayTokenPermits, WALLET_TXN_PERMIT_DEADLINE_MARGIN_SECONDS } from "./permitUtils";

/** Drops the permits whose spend the allowance already covers and fails the ones it doesn't */
export async function checkTokenPermitsBeforeSend({
  chainId,
  permits,
  requiredAmounts,
  errorSource,
  minDeadline,
}: {
  chainId: ContractsChainId;
  permits: SignedTokenPermit[];
  requiredAmounts: Record<string, bigint>;
  errorSource: string;
  /** A needed permit that expires before this is outdated */
  minDeadline?: number;
}): Promise<Pick<TokenPermitsCheckResult, "validPermits" | "stalePermits">> {
  let result: TokenPermitsCheckResult;

  try {
    result = await withRetry(
      () => checkTokenPermits({ client: getPublicClientWithRpc(chainId), permits, requiredAmounts }),
      { retryCount: 1 }
    );
  } catch (error) {
    // an unchecked unlimited permit can overwrite a newer, smaller approval without reverting
    metrics.pushError(error, errorSource);
    throw extendError(error, { errorContext: "simulation" });
  }

  const expiringPermits =
    minDeadline !== undefined ? result.validPermits.filter((permit) => Number(permit.deadline) < minDeadline) : [];
  const outdatedPermits = [...result.outdatedPermits, ...expiringPermits];

  if (result.failedPermits.length > 0 || outdatedPermits.length > 0) {
    throw extendError(new TokenPermitsCheckError(result.failedPermits, outdatedPermits), {
      errorContext: "simulation",
      data: { tokens: [...result.failedPermits, ...outdatedPermits].map((permit) => permit.token) },
    });
  }

  return result;
}

/** The stored permits a wallet transaction spending `requiredAmounts` should carry */
export async function getWalletTxnTokenPermits({
  chainId,
  tokenPermits,
  requiredAmounts,
}: {
  chainId: ContractsChainId;
  tokenPermits: SignedTokenPermit[];
  requiredAmounts: Record<string, bigint>;
}): Promise<Pick<TokenPermitsCheckResult, "validPermits" | "stalePermits">> {
  const spentTokenPermits = getRelayTokenPermits({
    chainId,
    isGmxAccount: false,
    tokenPermits,
    spentTokenAddresses: Object.keys(requiredAmounts).filter((tokenAddress) => requiredAmounts[tokenAddress] > 0n),
  });

  if (spentTokenPermits.length === 0) {
    return { validPermits: [], stalePermits: [] };
  }

  return checkTokenPermitsBeforeSend({
    chainId,
    permits: spentTokenPermits,
    requiredAmounts,
    errorSource: "walletTxn.tokenPermitsCheck",
    minDeadline: nowInSeconds() + WALLET_TXN_PERMIT_DEADLINE_MARGIN_SECONDS,
  });
}
