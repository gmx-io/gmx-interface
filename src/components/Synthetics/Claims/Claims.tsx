import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useState } from "react";
import { useMedia } from "react-use";

import { selectAccount, selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useClaimCollateralHistory } from "domain/synthetics/claimHistory";

import { AccruedPositionPriceImpactRebateModal } from "../AccruedPositionPriceImpactRebateModal/AccruedPositionPriceImpactRebateModal";
import { ClaimModal } from "../ClaimModal/ClaimModal";
import { ClaimablePositionPriceImpactRebateModal } from "../ClaimablePositionPriceImpactRebateModal/ClaimablePositionPriceImpactRebateModal";
import { SettleAccruedFundingFeeModal } from "../SettleAccruedFundingFeeModal/SettleAccruedFundingFeeModal";
import { ClaimableCard } from "./ClaimableCard";
import { ClaimsHistory } from "./ClaimsHistory";
import { SettleAccruedCard } from "./SettleAccruedCard";

import "./Claims.scss";

const CLAIMS_HISTORY_PREFETCH_SIZE = 100;

const MARGIN_RIGHT = { marginRight: 4 };
const MARGIN_LEFT = { marginLeft: 4 };

export function Claims({
  shouldShowPaginationButtons,
  isSettling,
  setIsSettling,
  gettingPendingFeePositionKeys,
  setGettingPendingFeePositionKeys,
  setPendingTxns,
  allowedSlippage,
}: {
  shouldShowPaginationButtons: boolean;
  isSettling: boolean;
  setIsSettling: (v: boolean) => void;
  gettingPendingFeePositionKeys: string[];
  setGettingPendingFeePositionKeys: (keys: string[]) => void;
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
    setGettingPendingFeePositionKeys([]);
    setIsSettling(false);
  }, [setGettingPendingFeePositionKeys, setIsSettling]);

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
        positionKeys={gettingPendingFeePositionKeys}
        allowedSlippage={allowedSlippage}
        setPositionKeys={setGettingPendingFeePositionKeys}
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

        <ClaimsHistory shouldShowPaginationButtons={shouldShowPaginationButtons} />
      </div>
    </>
  );
}
