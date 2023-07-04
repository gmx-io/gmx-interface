import React from "react";
import "./ApproveTokens.css";
import { Trans } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import ApproveTokenInput from "components/ApproveTokenInput/ApproveTokenInput";
import Button from "components/Button/Button";

export default function ApproveTokens(props) {
  const { chainId, pendingTxns, setPendingTxns, nonZeroBalanceTokens, closeApprovalsModal } = props;
  const { library } = useWeb3React();

  return (
    <div className="Approve-tokens-modal-body">
      <div className="Page-description">
        <div className="Page-description">
          <Trans>
            To ensure a smoother trading experience, we kindly request you to authorize the tokens in your wallet for
            the required contracts. By doing so, you can avoid multiple approval transactions. The tokens will be
            approved for the Router contract. <br /> <br />
            By pre-approving your assets, you can enjoy a quicker and more efficient trading experience.
          </Trans>
        </div>
      </div>
      {nonZeroBalanceTokens.map((tokenInfo, index) => (
        <ApproveTokenInput
          key={index}
          tokenInfo={tokenInfo}
          library={library}
          chainId={chainId}
          pendingTxns={pendingTxns}
          setPendingTxns={setPendingTxns}
        />
      ))}
      <Button variant="primary-action" className="w-20 h-full" onClick={closeApprovalsModal}>
        {`Done`}
      </Button>
    </div>
  );
}
