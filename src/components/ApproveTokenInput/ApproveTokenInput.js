import { useContext, useState } from "react";
import "./ApproveTokenInput.css";
import { ethers } from "ethers";
import { formatAmount } from "lib/numbers";
import { approveTokens } from "domain/tokens";
import { getContract } from "config/contracts";
import { getTokenInfo } from "domain/tokens/utils";
import Button from "components/Button/Button";
import useSWR from "swr";

import Token from "abis/Token.json";
import { DynamicWalletContext } from "store/dynamicwalletprovider";
import { dynamicApprovePlugin } from "domain/legacy";

export default function ApproveTokenInput(props) {
  const { tokenInfo, library, chainId, infoTokens, pendingTxns, setPendingTxns } = props;
  const [approveValue, setApproveValue] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [tokenAllowance, setTokenAllowance] = useState(ethers.BigNumber.from(0));
  const routerAddress = getContract(chainId, "Router");
  const { AddressZero } = ethers.constants;
  const dynamicContext = useContext(DynamicWalletContext);
  const active = dynamicContext.active;
  const account = dynamicContext.account;
  // const { active, account } = useWeb3React();

  const onApproveValueChange = (e) => {
    const inputValue = e.target.value;
    if (!isNaN(inputValue) && inputValue.trim() !== "") {
      const inputValueInWei = ethers.utils.parseEther(inputValue);
      const remainingBalance = tokenInfo.balance.sub(tokenAllowance);

      if (inputValueInWei.gt(remainingBalance)) {
        return;
      }
    }
    setApproveValue(inputValue);
  };

  function approveToken() {
    try {
      approveTokens({
        setIsApproving,
        library,
        tokenAddress: tokenInfo.address,
        spender: routerAddress,
        chainId: chainId,
        onApproveSubmitted: () => {
          setIsApproving(false);
          setIsApproved(true);
        },
        infoTokens,
        getTokenInfo,
        pendingTxns,
        setPendingTxns,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(error);
    }

    return;
  }

  const onMaxClick = () => {
    const tokenBalanceInEther = ethers.utils.formatEther(tokenInfo.balance);
    const allowanceInEther = ethers.utils.formatEther(tokenAllowance);
    const maxApproveValue = parseFloat(tokenBalanceInEther) - parseFloat(allowanceInEther);
    setApproveValue(maxApproveValue.toString());
  };

  const needApproval = tokenInfo.address !== AddressZero && tokenAllowance && tokenAllowance.lt(tokenInfo.balance);

  const onApproveClick = () => {
    return needApproval ? approveToken() : null;
  };

  useSWR(active && [active, chainId, tokenInfo.address, "allowance", account, routerAddress], {
    fetcher: dynamicApprovePlugin(library, Token),
    onSuccess: (data) => setTokenAllowance(data),
  });

  return (
    <div className="Approve-tokens-input-section-wrapper">
      <div className="Approve-tokens-input-section">
        <img src={tokenInfo.imageUrl} alt={tokenInfo.name} className="token-image" />

        <div className="Approve-token-input-section-bottom">
          <input
            type="number"
            min="0"
            placeholder="0.0"
            className="Approve-swap-input"
            value={approveValue}
            onChange={onApproveValueChange}
          />
          <button onClick={onMaxClick} className="Approve-token-input-max">
            MAX
          </button>
        </div>

        <Button
          variant={isApproved ? "approved" : "await"}
          className="w-20 h-full"
          onClick={onApproveClick}
          disabled={parseFloat(approveValue) === 0 || isApproving}
        >
          {isApproved ? "Approved!" : "Approve"}
        </Button>
      </div>

      <div className="muted">
        {tokenInfo.name}: {formatAmount(tokenInfo.balance, tokenInfo.decimals, 4, true)}
      </div>
    </div>
  );
}
