import type { ContractsChainId } from "config/chains";
import { helperToast } from "lib/helperToast";
import type { SignedTokenPermit } from "sdk/utils/tokens/types";

import { getInvalidPermitSignatureToastContent } from "components/Errors/errorToasts";

import { TokenPermitsCheckError } from "./checkTokenPermits";
import { getWalletTxnTokenPermits } from "./checkTokenPermitsBeforeSend";
import type { WalletTxnTokenPermits } from "./useTokenPermitTxnHandlers";

type RouterCall = { method: string; params: any[] };

/** The stored permits a router multicall should start with: one per token its `sendTokens` calls pull */
export async function prepareWalletTxnTokenPermits({
  chainId,
  walletTxnTokenPermits,
  multicall,
}: {
  chainId: ContractsChainId;
  walletTxnTokenPermits: WalletTxnTokenPermits | undefined;
  multicall: (RouterCall | undefined)[];
}): Promise<SignedTokenPermit[]> {
  if (!walletTxnTokenPermits?.tokenPermits.length) {
    return [];
  }

  const requiredAmounts: Record<string, bigint> = {};

  for (const call of multicall) {
    if (call?.method === "sendTokens") {
      const [tokenAddress, , amount] = call.params as [string, string, bigint];
      requiredAmounts[tokenAddress] = (requiredAmounts[tokenAddress] ?? 0n) + amount;
    }
  }

  try {
    const { validPermits, stalePermits } = await getWalletTxnTokenPermits({
      chainId,
      tokenPermits: walletTxnTokenPermits.tokenPermits,
      requiredAmounts,
    });

    if (stalePermits.length > 0) {
      walletTxnTokenPermits.removeTokenPermits(stalePermits);
    }

    return validPermits;
  } catch (error) {
    if (error instanceof TokenPermitsCheckError) {
      walletTxnTokenPermits.handleTokenPermitsError(error, []);
      helperToast.error(getInvalidPermitSignatureToastContent());
    }

    throw error;
  }
}

/** Sends a multicall that starts with `tokenPermits` and keeps the stored permits in step with what happened */
export async function sendWithWalletTxnTokenPermits<T>({
  walletTxnTokenPermits,
  tokenPermits,
  send,
}: {
  walletTxnTokenPermits: WalletTxnTokenPermits | undefined;
  tokenPermits: SignedTokenPermit[];
  /** `onPendingTxnSuccess` goes to the pending transaction, to report the permits once it is mined */
  send: (onPendingTxnSuccess: (() => void) | undefined) => Promise<T>;
}): Promise<T> {
  const hasTokenPermits = walletTxnTokenPermits !== undefined && tokenPermits.length > 0;

  try {
    const result = await send(
      hasTokenPermits ? walletTxnTokenPermits.getTokenPermitsExecutedHandler(tokenPermits) : undefined
    );

    if (hasTokenPermits) {
      walletTxnTokenPermits.forgetSentTokenPermits(tokenPermits);
    }

    return result;
  } catch (error) {
    // only the permit's external call can fail with a permit reason, and the simulation and gas estimate rethrow
    // without context
    walletTxnTokenPermits?.handleTokenPermitsError(error, tokenPermits, { isAnyContext: true });
    throw error;
  }
}
