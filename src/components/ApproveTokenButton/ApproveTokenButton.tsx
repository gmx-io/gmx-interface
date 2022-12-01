import { t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import Checkbox from "components/Checkbox/Checkbox";
import { getWrappedToken } from "config/tokens";
import { approveTokens } from "domain/tokens";
import { isAddressZero } from "lib/legacy";
import { useState } from "react";

type Props = {
  spenderAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
};

export function ApproveTokenButton(p: Props) {
  const { library, chainId } = useWeb3React();
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  function onApprove() {
    if (!chainId) return;

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
      onApproveSubmitted: () => setIsApproved(true),
    });
  }

  return (
    <Checkbox isChecked={isApproved} setIsChecked={onApprove}>
      {isApproving ? t`Pending approve ${p.tokenSymbol}` : t`Approve token ${p.tokenSymbol}`}
    </Checkbox>
  );
}
