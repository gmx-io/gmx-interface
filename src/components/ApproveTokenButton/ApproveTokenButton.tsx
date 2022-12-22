import { Trans } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import { getWrappedToken } from "config/tokens";
import { approveTokens } from "domain/tokens";
import { isAddressZero } from "lib/legacy";
import { useState } from "react";
import { ImCheckboxUnchecked, ImSpinner2 } from "react-icons/im";

import "./ApproveTokenButton.scss";

type Props = {
  spenderAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  isApproved?: boolean;
};

export function ApproveTokenButton(p: Props) {
  const { library, chainId } = useWeb3React();
  const [isApproving, setIsApproving] = useState(false);
  const [isApproveSubmitted, setIsApproveSubmitted] = useState(false);

  function onApprove() {
    if (!chainId || isApproveSubmitted || p.isApproved) return;

    const wrappedToken = getWrappedToken(chainId);
    const tokenAddress = isAddressZero(p.tokenAddress) ? wrappedToken.address : p.tokenAddress;

    approveTokens({
      setIsApproving,
      library,
      tokenAddress: tokenAddress,
      spender: p.spenderAddress,
      pendingTxns: [],
      setPendingTxns: () => null,
      infoTokens: {},
      chainId,
      onApproveSubmitted: () => setIsApproveSubmitted(true),
    });
  }

  const isLoading = isApproving || (isApproveSubmitted && !p.isApproved);

  return (
    <div className="ApproveTokenButton" onClick={onApprove}>
      <Trans>Allow {p.tokenSymbol} to be spent</Trans>

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
