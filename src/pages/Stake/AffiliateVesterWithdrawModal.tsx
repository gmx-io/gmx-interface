import { Trans, t } from "@lingui/macro";
import { ethers } from "ethers";
import { useCallback, useMemo, useState } from "react";

import { getContract } from "config/contracts";
import { callContract } from "lib/contracts";
import { abis } from "sdk/abis";

import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import { SwitchToSettlementChainButtons } from "components/SwitchToSettlementChain/SwitchToSettlementChainButtons";
import { SwitchToSettlementChainWarning } from "components/SwitchToSettlementChain/SwitchToSettlementChainWarning";

export function AffiliateVesterWithdrawModal(props) {
  const { isVisible, setIsVisible, chainId, signer, setPendingTxns } = props;
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const affiliateVesterAddress = getContract(chainId, "AffiliateVester");

  const primaryText = useMemo(() => (isWithdrawing ? t`Confirming...` : t`Confirm Withdraw`), [isWithdrawing]);

  const onClickPrimary = useCallback(() => {
    setIsWithdrawing(true);
    const contract = new ethers.Contract(affiliateVesterAddress, abis.Vester, signer);

    callContract(chainId, contract, "withdraw", [], {
      sentMsg: t`Withdraw submitted.`,
      failMsg: t`Withdraw failed.`,
      successMsg: t`Withdrawn!`,
      setPendingTxns,
    })
      .then(() => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsWithdrawing(false);
      });
  }, [chainId, affiliateVesterAddress, signer, setPendingTxns, setIsVisible]);

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={t`Withdraw from Affiliate Vault`}>
        <Trans>
          <div>
            This will withdraw all esGMX tokens as well as pause vesting.
            <br />
            <br />
            esGMX tokens that have been converted to GMX will be claimed and remain as GMX tokens.
            <br />
            <br />
            To claim GMX tokens without withdrawing, use the "Claim" button.
            <br />
            <br />
          </div>
        </Trans>
        <SwitchToSettlementChainWarning topic="vesting" />
        <div className="Exchange-swap-button-container">
          <SwitchToSettlementChainButtons>
            <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={isWithdrawing}>
              {primaryText}
            </Button>
          </SwitchToSettlementChainButtons>
        </div>
      </Modal>
    </div>
  );
}
