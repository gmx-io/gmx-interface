import { useCallback, useMemo } from "react";

import { useTokenPermitsContext } from "context/TokenPermitsContext/TokenPermitsContextProvider";
import { useChainId } from "lib/chains";
import type { ErrorLike } from "lib/errors";
import {
  getExpiredPermitDeadlineError,
  getInvalidPermitSignatureError,
  getIsPermitExpiredDeadlineOnSimulation,
  getIsPermitSignatureErrorOnSimulation,
} from "lib/errors/customErrors";
import { metrics } from "lib/metrics";
import { getTokenPermitId, sendTokenPermitMetric } from "lib/metrics/tokenPermitMetrics";
import type { SignedTokenPermit } from "sdk/utils/tokens/types";

import type { PermitIssueType } from "components/Errors/errorToasts";

import { TokenPermitsCheckError } from "./checkTokenPermits";
import { getIsTokenPermitNonceUsed, validateTokenPermitSignature } from "./permitUtils";

type PermitErrorOptions = Parameters<typeof getIsPermitSignatureErrorOnSimulation>[1];

export function getTokenPermitIssueType(
  error: unknown,
  sentTokenPermits: SignedTokenPermit[],
  options?: PermitErrorOptions
): PermitIssueType | undefined {
  if (error instanceof TokenPermitsCheckError) {
    return "failedCheck";
  }

  if (sentTokenPermits.length === 0) {
    return undefined;
  }

  if (getIsPermitExpiredDeadlineOnSimulation(error as ErrorLike, options)) {
    return "expiredDeadline";
  }

  if (getIsPermitSignatureErrorOnSimulation(error as ErrorLike, options)) {
    return "invalidSignature";
  }

  return undefined;
}

/** What happens to stored permits once a transaction that carried them is sent or fails */
export function useTokenPermitTxnHandlers() {
  const { chainId } = useChainId();
  const { removeTokenPermits, disableTokenPermits, accountType } = useTokenPermitsContext();

  const forgetSentTokenPermits = useCallback(
    // the transaction carries the permit nonce now, so a later transaction must not send the same permit again
    (permits: SignedTokenPermit[]) => removeTokenPermits(permits),
    [removeTokenPermits]
  );

  const getTokenPermitsExecutedHandler = useCallback(
    (permits: SignedTokenPermit[]) => () =>
      permits.forEach((permit) =>
        sendTokenPermitMetric({
          outcome: "executed",
          chainId,
          tokenAddress: permit.token,
          accountType,
          permitId: getTokenPermitId(permit),
        })
      ),
    [accountType, chainId]
  );

  const handleTokenPermitsError = useCallback(
    (error: unknown, sentTokenPermits: SignedTokenPermit[], options?: PermitErrorOptions) => {
      const issueType = getTokenPermitIssueType(error, sentTokenPermits, options);

      if (error instanceof TokenPermitsCheckError) {
        disableTokenPermits(error.failedPermits.map((permit) => permit.token));
        removeTokenPermits(error.failedPermits);
        error.failedPermits.forEach((permit) => {
          sendTokenPermitMetric({
            outcome: "failedCheck",
            chainId,
            tokenAddress: permit.token,
            accountType,
            reason: "preSendCheck",
            permitId: getTokenPermitId(permit),
          });
        });
      } else if (issueType === "expiredDeadline") {
        sentTokenPermits.forEach((permit) => {
          metrics.pushError(getExpiredPermitDeadlineError({ permit }), "simulation.permitExpiredDeadline");
        });

        removeTokenPermits(sentTokenPermits);
      } else if (issueType === "invalidSignature") {
        // a nonce used by another order in the meantime also reads as an invalid signature, so every sent
        // permit is dropped now, and only a permit the chain will keep rejecting keeps its token on approvals
        removeTokenPermits(sentTokenPermits);
        sentTokenPermits.forEach((permit) => {
          sendTokenPermitMetric({
            outcome: "failedCheck",
            chainId,
            tokenAddress: permit.token,
            accountType,
            reason: "simulation",
            permitId: getTokenPermitId(permit),
          });
          validateTokenPermitSignature(chainId, permit).then((validationResult) => {
            metrics.pushError(
              getInvalidPermitSignatureError({
                isValid: validationResult.isValid,
                permit,
                error: validationResult.error,
              }),
              "simulation.permitError"
            );
          });
        });

        sentTokenPermits.forEach((permit) => {
          getIsTokenPermitNonceUsed(chainId, permit).then((isNonceUsed) => {
            // the read can finish after a wallet switch, so the token is disabled for the permit's own account
            if (isNonceUsed === false) {
              disableTokenPermits([permit.token], { chainId, account: permit.owner });
            }
          });
        });
      }
    },
    [accountType, chainId, disableTokenPermits, removeTokenPermits]
  );

  return { removeTokenPermits, forgetSentTokenPermits, getTokenPermitsExecutedHandler, handleTokenPermitsError };
}

export type WalletTxnTokenPermits = ReturnType<typeof useTokenPermitTxnHandlers> & {
  /** Stored permits a wallet transaction may carry, empty while Classic permits are off */
  tokenPermits: SignedTokenPermit[];
};

export function useWalletTxnTokenPermits(): WalletTxnTokenPermits {
  const { classicTokenPermits } = useTokenPermitsContext();
  const { removeTokenPermits, forgetSentTokenPermits, getTokenPermitsExecutedHandler, handleTokenPermitsError } =
    useTokenPermitTxnHandlers();

  return useMemo(
    () => ({
      tokenPermits: classicTokenPermits,
      removeTokenPermits,
      forgetSentTokenPermits,
      getTokenPermitsExecutedHandler,
      handleTokenPermitsError,
    }),
    [
      classicTokenPermits,
      forgetSentTokenPermits,
      getTokenPermitsExecutedHandler,
      handleTokenPermitsError,
      removeTokenPermits,
    ]
  );
}
