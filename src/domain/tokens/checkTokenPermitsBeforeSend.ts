import type { ContractsChainId } from "config/chains";
import { extendError } from "lib/errors";
import { metrics } from "lib/metrics";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import type { SignedTokenPermit } from "sdk/utils/tokens/types";

import { checkTokenPermits, TokenPermitsCheckError, type TokenPermitsCheckResult } from "./checkTokenPermits";
import { getRelayTokenPermits } from "./permitUtils";

/** Drops the permits whose spend the allowance already covers and fails the ones it doesn't */
export async function checkTokenPermitsBeforeSend({
  chainId,
  permits,
  requiredAmounts,
  errorSource,
}: {
  chainId: ContractsChainId;
  permits: SignedTokenPermit[];
  requiredAmounts: Record<string, bigint>;
  errorSource: string;
}): Promise<Pick<TokenPermitsCheckResult, "validPermits" | "stalePermits">> {
  let result: TokenPermitsCheckResult;

  try {
    result = await checkTokenPermits({ client: getPublicClientWithRpc(chainId), permits, requiredAmounts });
  } catch (error) {
    // the relay and the wallet transaction's own simulation still catch a bad permit, so an unreachable rpc
    // must not block the order
    metrics.pushError(error, errorSource);
    return { validPermits: permits, stalePermits: [] };
  }

  if (result.failedPermits.length > 0) {
    throw extendError(new TokenPermitsCheckError(result.failedPermits), {
      errorContext: "simulation",
      data: { tokens: result.failedPermits.map((permit) => permit.token) },
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
  });
}
