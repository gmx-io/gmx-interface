import React, { useState } from "react";
import "./ApproveTokens.css";
import { Trans } from "@lingui/macro";
import { getTokens } from "config/tokens";
import { useWeb3React } from "@web3-react/core";
import useSWR from "swr";
import { getContract } from "config/contracts";
import { contractFetcher } from "lib/contracts";

import Reader from "abis/ReaderV2.json";
import { useInfoTokens } from "domain/tokens";
import ApproveTokenInput from "components/ApproveTokenInput/ApproveTokenInput";
import Button from "components/Button/Button";
import { SHOULD_SHOW_APPROVE_TOKENS_MODAL } from "config/localStorage";

export default function ApproveTokens(props) {
  const { chainId, pendingTxns, setPendingTxns, closeApprovalsModal } = props;
  const { active, account, library } = useWeb3React();
  const readerAddress = getContract(chainId, "Reader");
  const tokens = getTokens(chainId);
  const tokenAddresses = tokens.map((token) => token.address);

  const { data: tokenBalances } = useSWR(active && [active, chainId, readerAddress, "getTokenBalances", account], {
    fetcher: contractFetcher(library, Reader, [tokenAddresses]),
  });
  const { infoTokens } = useInfoTokens(library, chainId, active, tokenBalances);

  let nonZeroBalanceTokens = [];
  for (let key in infoTokens) {
    let tokenInfo = infoTokens[key];
    if (tokenInfo.balance && tokenInfo.balance.gt(0)) {
      nonZeroBalanceTokens.push(tokenInfo);
    }
  }

  const [checked, setChecked] = useState(false);

  return (
    <div className="Approve-tokens-modal-body">
      <div className="Page-description">
        <Trans>
          Please approve the tokens present in your wallet to the necessary contracts to avoid repeated approval
          transactions. The tokens are being approved to the <span className="code">Router</span> contract.
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
      <div className="checkbox-container">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => {
            setChecked(!checked);
            localStorage.setItem(SHOULD_SHOW_APPROVE_TOKENS_MODAL, checked);
          }}
        />
        <span classname="checkbox-text">Don't show me this again</span>
      </div>
    </div>
  );
}
