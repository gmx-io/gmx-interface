import React, { useContext } from "react";
import "./ApproveTokens.css";
import { Trans } from "@lingui/macro";

import ApproveTokenInput from "components/ApproveTokenInput/ApproveTokenInput";
import Button from "components/Button/Button";
import { DynamicWalletContext } from "store/dynamicwalletprovider";

export default function ApproveTokens(props) {
  const { chainId, pendingTxns, setPendingTxns, nonZeroBalanceTokens, closeApprovalsModal } = props;
  const dynamicContext = useContext(DynamicWalletContext);
  const signer = dynamicContext.signer;
  //const { library } = useWeb3React();

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
          library={signer}
          chainId={chainId}
          pendingTxns={pendingTxns}
          setPendingTxns={setPendingTxns}
        />
      ))}
      <Button variant="approve-done" className="w-20 h-full" onClick={closeApprovalsModal}>
        {`Done`}
      </Button>
    </div>
  );
}
