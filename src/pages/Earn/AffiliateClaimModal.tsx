import { Trans, t } from "@lingui/macro";
import { ethers } from "ethers";
import React, { useState } from "react";
import Vester from "sdk/abis/Vester.json";
import { getContract } from "config/contracts";
import { SetPendingTransactions } from "domain/legacy";
import { callContract } from "lib/contracts";
import { formatAmount } from "lib/numbers";
import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";
import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";

export function AffiliateClaimModal(props: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  signer: UncheckedJsonRpcSigner | undefined;
  chainId: number;
  setPendingTxns: SetPendingTransactions;
  totalVesterRewards: bigint | undefined;
}) {
  const { isVisible, setIsVisible, signer, chainId, setPendingTxns, totalVesterRewards } = props;
  const [isClaiming, setIsClaiming] = useState(false);
  const affiliateVesterAddress = getContract(chainId, "AffiliateVester");

  const isPrimaryEnabled = () => {
    if (totalVesterRewards == undefined || totalVesterRewards == 0n) {
      return false;
    }

    return !isClaiming;
  };

  const getPrimaryText = () => {
    if (isClaiming) {
      return t`Claiming...`;
    }
    return t`Claim`;
  };

  const onClickPrimary = () => {
    setIsClaiming(true);

    const affiliateVesterContract = new ethers.Contract(affiliateVesterAddress, Vester.abi, signer);

    callContract(chainId, affiliateVesterContract, "claim", [], {
      sentMsg: t`Claim submitted.`,
      failMsg: t`Claim failed.`,
      successMsg: t`Claim completed!`,
      setPendingTxns,
    })
      .then(() => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsClaiming(false);
      });
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={t`Claim Affiliate Vault Rewards`}>
        <Trans>
          <div>
            This will claim {formatAmount(totalVesterRewards, 18, 4, true)} GMX.
            <br />
            <br />
            After claiming, you can stake these GMX tokens by using the "Stake" button in the GMX section of this Earn
            page.
            <br />
            <br />
          </div>
        </Trans>
        <div className="Exchange-swap-button-container">
          <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
