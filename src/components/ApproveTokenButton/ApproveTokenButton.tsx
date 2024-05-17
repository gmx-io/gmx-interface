import { Trans } from "@lingui/macro";
import { getWrappedToken } from "config/tokens";
import { approveTokens } from "domain/tokens";
import { isAddressZero } from "lib/legacy";
import { useState } from "react";
import { ImCheckboxUnchecked, ImSpinner2 } from "react-icons/im";

import "./ApproveTokenButton.scss";
import useWallet from "lib/wallets/useWallet";

type Props = {
  spenderAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  isApproved?: boolean;
  approveAmount?: bigint;
  customLabel?: string;
};

export function ApproveTokenButton(p: Props) {
  const { signer, chainId } = useWallet();
  const [isApproving, setIsApproving] = useState(false);
  const [isApproveSubmitted, setIsApproveSubmitted] = useState(false);

  function onApprove() {
    if (!chainId || isApproveSubmitted || p.isApproved) return;

    const wrappedToken = getWrappedToken(chainId);
    const tokenAddress = isAddressZero(p.tokenAddress) ? wrappedToken.address : p.tokenAddress;

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
      onApproveSubmitted: () => setIsApproveSubmitted(true),
    });
  }

  const isLoading = isApproving || (isApproveSubmitted && !p.isApproved);

  return (
    <div className="ApproveTokenButton Checkbox fullRow" onClick={onApprove}>
      <span className="text-yellow-500">{p.customLabel ?? <Trans>Allow {p.tokenSymbol} to be spent</Trans>}</span>

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
