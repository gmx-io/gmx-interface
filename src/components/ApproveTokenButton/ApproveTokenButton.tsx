import { Trans } from "@lingui/macro";
import { useState } from "react";
import { ImCheckboxUnchecked, ImSpinner2 } from "react-icons/im";

import { approveTokens } from "domain/tokens";
import { isAddressZero } from "lib/legacy";
import { userAnalytics } from "lib/userAnalytics";
import { TokenApproveClickEvent, TokenApproveResultEvent } from "lib/userAnalytics/types";
import useWallet from "lib/wallets/useWallet";
import { getWrappedToken } from "sdk/configs/tokens";

import "./ApproveTokenButton.scss";

type Props = {
  spenderAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  isApproved?: boolean;
  approveAmount?: bigint;
  customLabel?: string;
  onApproveSubmitted?: () => void;
};

export function ApproveTokenButton(p: Props) {
  const { signer, chainId } = useWallet();
  const [isApproving, setIsApproving] = useState(false);
  const [isApproveSubmitted, setIsApproveSubmitted] = useState(false);

  function onApprove() {
    if (!chainId || isApproveSubmitted || p.isApproved) return;

    const wrappedToken = getWrappedToken(chainId);
    const tokenAddress = isAddressZero(p.tokenAddress) ? wrappedToken.address : p.tokenAddress;

    userAnalytics.pushEvent<TokenApproveClickEvent>({
      event: "TokenApproveAction",
      data: {
        action: "ApproveClick",
      },
    });

    approveTokens({
      setIsApproving,
      signer,
      tokenAddress: tokenAddress,
      spender: p.spenderAddress,
      pendingTxns: [],
      setPendingTxns: () => null,
      infoTokens: {},
      chainId,
      approveAmount: p.approveAmount,
      permitParams: undefined,
      onApproveSubmitted: () => {
        setIsApproveSubmitted(true);
        p.onApproveSubmitted?.();
      },
      onApproveFail: () => {
        userAnalytics.pushEvent<TokenApproveResultEvent>({
          event: "TokenApproveAction",
          data: {
            action: "ApproveFail",
          },
        });
      },
    });
  }

  const isLoading = isApproving || (isApproveSubmitted && !p.isApproved);

  return (
    <div className="ApproveTokenButton Checkbox fullRow" onClick={onApprove}>
      <span className="text-body-medium text-yellow-300">
        {p.customLabel ?? <Trans>Allow {p.tokenSymbol} to be spent</Trans>}
      </span>

      <div className="ApproveTokenButton-checkbox">
        {isLoading ? (
          <ImSpinner2 className="spin ApproveTokenButton-spin" />
        ) : (
          <ImCheckboxUnchecked className="App-icon Checkbox-icon inactive" />
        )}
      </div>
    </div>
  );
}
