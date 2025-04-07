import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useState } from "react";
import { useMedia } from "react-use";

import { selectAccount, selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useClaimCollateralHistory } from "domain/synthetics/claimHistory";

import { ClaimableCard } from "./ClaimableCard";
import { ClaimsHistory } from "./ClaimsHistory";
import { SettleAccruedCard } from "./SettleAccruedCard";
import { AccruedPositionPriceImpactRebateModal } from "../AccruedPositionPriceImpactRebateModal/AccruedPositionPriceImpactRebateModal";
import { ClaimablePositionPriceImpactRebateModal } from "../ClaimablePositionPriceImpactRebateModal/ClaimablePositionPriceImpactRebateModal";
import { ClaimModal } from "../ClaimModal/ClaimModal";
import { SettleAccruedFundingFeeModal } from "../SettleAccruedFundingFeeModal/SettleAccruedFundingFeeModal";

import "./Claims.scss";

const CLAIMS_HISTORY_PREFETCH_SIZE = 100;

const MARGIN_RIGHT = { marginRight: 4 };
const MARGIN_LEFT = { marginLeft: 4 };

export function Claims({
  isSettling,
  setIsSettling,
  setPendingTxns,
  allowedSlippage,
}: {
  isSettling: boolean;
  setIsSettling: (v: boolean) => void;
  setPendingTxns: (txns: any) => void;
  allowedSlippage: number;
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

  const isMobile = useMedia("(max-width: 1100px)");

  return (
    <>
      <ClaimModal isVisible={isClaiming} onClose={handleClaimModalClose} setPendingTxns={setPendingTxns} />
      <SettleAccruedFundingFeeModal
        isVisible={isSettling}
        allowedSlippage={allowedSlippage}
        setPendingTxns={setPendingTxns}
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
          <div className="Claims-loading App-box">
            <Trans>Loading...</Trans>
          </div>
        )}
        <div
          className={cx("flex", "w-full", {
            "flex-col": isMobile,
          })}
        >
          {account && !isLoading && (
            <SettleAccruedCard
              onSettleClick={handleSettleClick}
              onAccruedPositionPriceImpactRebateClick={handleAccruedPositionPriceImpactRebateClick}
              style={isMobile ? undefined : MARGIN_RIGHT}
            />
          )}
          {account && !isLoading && (
            <ClaimableCard
              onClaimClick={handleClaimClick}
              onClaimablePositionPriceImpactFeesClick={handleClaimablePositionPriceImpactFeesClick}
              style={isMobile ? undefined : MARGIN_LEFT}
            />
          )}
        </div>

        <ClaimsHistory />
      </div>
    </>
  );
}
