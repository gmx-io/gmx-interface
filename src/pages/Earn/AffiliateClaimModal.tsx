import { Trans, t } from "@lingui/macro";
import { ethers } from "ethers";
import { useCallback, useMemo, useState } from "react";

import { getContract } from "config/contracts";
import { SetPendingTransactions } from "domain/legacy";
import { callContract } from "lib/contracts";
import { formatAmount } from "lib/numbers";
import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";

import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";

import Vester from "sdk/abis/Vester.json";

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

  const isPrimaryEnabled = totalVesterRewards != undefined && totalVesterRewards !== 0n && !isClaiming;

  const primaryText = useMemo(() => (isClaiming ? t`Claiming...` : t`Claim`), [isClaiming]);

  const formattedRewards = useMemo(() => formatAmount(totalVesterRewards, 18, 4, true), [totalVesterRewards]);

  const onClickPrimary = useCallback(() => {
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
  }, [chainId, affiliateVesterAddress, signer, setPendingTxns, setIsVisible]);

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={t`Claim Affiliate Vault Rewards`}>
        <Trans>
          <div>
            This will claim {formattedRewards} GMX.
            <br />
            <br />
            After claiming, you can stake these GMX tokens by using the "Stake" button in the GMX section of this Earn
            page.
            <br />
            <br />
          </div>
        </Trans>
        <div className="Exchange-swap-button-container">
          <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled}>
            {primaryText}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
