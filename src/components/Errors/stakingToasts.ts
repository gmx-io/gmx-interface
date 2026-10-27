import { t } from "@lingui/macro";

import type { ErrorLike } from "lib/errors";
import { decodeInnermostCustomErrorFromError } from "lib/errors/customErrors";
import { helperToast } from "lib/helperToast";

import { getErrorMessage } from "./errorToasts";
import {
  getAccountTransfersPausedMessage,
  getContractErrorMessageFromError,
  getUnstakeRequestsPausedMessage,
} from "./getContractErrorMessage";

export type StakingErrorAction = "default" | "unstakeRequest" | "transfer";

export function getStakingErrorMessage({
  chainId,
  error,
  action,
}: {
  chainId: number;
  error: ErrorLike | undefined;
  action: StakingErrorAction;
}): string | undefined {
  if (decodeInnermostCustomErrorFromError(error)?.name === "DisabledFeature") {
    if (action === "unstakeRequest") {
      return getUnstakeRequestsPausedMessage();
    }

    if (action === "transfer") {
      return getAccountTransfersPausedMessage();
    }

    return undefined;
  }

  return getContractErrorMessageFromError({ chainId, error });
}

export function showStakingErrorToast({
  chainId,
  error,
  failMsg,
  action = "default",
}: {
  chainId: number;
  error: ErrorLike;
  failMsg: string;
  action?: StakingErrorAction;
}) {
  const stakingErrorMessage = getStakingErrorMessage({ chainId, error, action });

  if (stakingErrorMessage) {
    helperToast.error(stakingErrorMessage);
    return;
  }

  const { failMsg: errorContent, autoCloseToast } = getErrorMessage(chainId, error, failMsg);
  helperToast.error(errorContent, { autoClose: autoCloseToast });
}

export function showRewardRouterChangedToast() {
  helperToast.info(t`Staking moved to a new contract. Review and try again.`);
}
