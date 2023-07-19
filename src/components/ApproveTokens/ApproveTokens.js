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
        <Trans>
          To avoid multiple signings, please enable 1-click trading for all assets, and select "MAX" when prompted. Your
          assets will remain in your wallet until you transact.
        </Trans>
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
