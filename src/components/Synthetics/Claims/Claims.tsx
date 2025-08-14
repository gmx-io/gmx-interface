import { Trans } from "@lingui/macro";
import { useCallback, useState } from "react";

import { selectAccount, selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useClaimCollateralHistory } from "domain/synthetics/claimHistory";

import { ClaimableCard } from "./ClaimableCard";
import { ClaimsHistory, ClaimsHistoryProps } from "./ClaimsHistory";
import { SettleAccruedCard } from "./SettleAccruedCard";
import { AccruedPositionPriceImpactRebateModal } from "../AccruedPositionPriceImpactRebateModal/AccruedPositionPriceImpactRebateModal";
import { ClaimablePositionPriceImpactRebateModal } from "../ClaimablePositionPriceImpactRebateModal/ClaimablePositionPriceImpactRebateModal";
import { ClaimModal } from "../ClaimModal/ClaimModal";
import { SettleAccruedFundingFeeModal } from "../SettleAccruedFundingFeeModal/SettleAccruedFundingFeeModal";

import "./Claims.scss";

const CLAIMS_HISTORY_PREFETCH_SIZE = 100;

export function Claims({
  isSettling,
  setIsSettling,
  setPendingTxns,
  allowedSlippage,
  claimsHistoryProps,
}: {
  isSettling: boolean;
  setIsSettling: (v: boolean) => void;
  setPendingTxns: (txns: any) => void;
  allowedSlippage: number;
  claimsHistoryProps: ClaimsHistoryProps;
}) {
  const chainId = useSelector(selectChainId);
  const account = useSelector(selectAccount);
  const [isClaiming, setIsClaiming] = useState(false);

  const [isAccruedPositionPriceImpactRebateModalVisible, setIsAccruedPositionPriceImpactRebateModalVisible] =
    useState(false);
  const [isClaimablePositionPriceImpactFeesModalVisible, setIsClaimablePositionPriceImpactFeesModalVisible] =
    useState(false);

  const { isLoading } = useClaimCollateralHistory(chainId, {
    pageSize: CLAIMS_HISTORY_PREFETCH_SIZE,
  });

  const handleClaimClick = useCallback(() => setIsClaiming(true), [setIsClaiming]);
  const handleSettleClick = useCallback(() => setIsSettling(true), [setIsSettling]);
  const handleAccruedPositionPriceImpactRebateClick = useCallback(
    () => setIsAccruedPositionPriceImpactRebateModalVisible(true),
    [setIsAccruedPositionPriceImpactRebateModalVisible]
  );
  const handleClaimablePositionPriceImpactFeesClick = useCallback(
    () => setIsClaimablePositionPriceImpactFeesModalVisible(true),
    [setIsClaimablePositionPriceImpactFeesModalVisible]
  );

  const handleSettleCloseClick = useCallback(() => {
    setIsSettling(false);
  }, [setIsSettling]);

  const handleAccruedPositionPriceImpactRebateCloseClick = useCallback(() => {
    setIsAccruedPositionPriceImpactRebateModalVisible(false);
  }, []);

  const handleClaimablePositionPriceImpactFeesCloseClick = useCallback(() => {
    setIsClaimablePositionPriceImpactFeesModalVisible(false);
  }, []);

  const handleClaimModalClose = useCallback(() => {
    setIsClaiming(false);
  }, []);

  return (
    <>
      <ClaimModal isVisible={isClaiming} onClose={handleClaimModalClose} setPendingTxns={setPendingTxns} />
      <SettleAccruedFundingFeeModal
        isVisible={isSettling}
        allowedSlippage={allowedSlippage}
        onClose={handleSettleCloseClick}
      />
      <AccruedPositionPriceImpactRebateModal
        isVisible={isAccruedPositionPriceImpactRebateModalVisible}
        onClose={handleAccruedPositionPriceImpactRebateCloseClick}
      />

      <ClaimablePositionPriceImpactRebateModal
        isVisible={isClaimablePositionPriceImpactFeesModalVisible}
        onClose={handleClaimablePositionPriceImpactFeesCloseClick}
      />

      <div>
        {account && isLoading && (
          <div className="Claims-loading">
            <Trans>Loading...</Trans>
          </div>
        )}
        <div className={"flex w-full max-lg:flex-col"}>
          {account && !isLoading && (
            <SettleAccruedCard
              onSettleClick={handleSettleClick}
              onAccruedPositionPriceImpactRebateClick={handleAccruedPositionPriceImpactRebateClick}
            />
          )}
          {account && !isLoading && (
            <ClaimableCard
              onClaimClick={handleClaimClick}
              onClaimablePositionPriceImpactFeesClick={handleClaimablePositionPriceImpactFeesClick}
            />
          )}
        </div>

        <ClaimsHistory {...claimsHistoryProps} />
      </div>
    </>
  );
}
