import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useClaimCollateralHistory } from "domain/synthetics/claimHistory";
import { RebateInfoItem } from "domain/synthetics/fees/useRebatesInfo";
import { PositionsInfoData } from "domain/synthetics/positions";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { useCallback, useState } from "react";
import { useMedia } from "react-use";
import { AccruedPositionPriceImpactRebateModal } from "../AccruedPositionPriceImpactRebateModal/AccruedPositionPriceImpactRebateModal";
import { ClaimHistoryRow } from "../ClaimHistoryRow/ClaimHistoryRow";
import { ClaimModal } from "../ClaimModal/ClaimModal";
import { ClaimablePositionPriceImpactRebateModal } from "../ClaimablePositionPriceImpactRebateModal/ClaimablePositionPriceImpactRebateModal";
import { SettleAccruedFundingFeeModal } from "../SettleAccruedFundingFeeModal/SettleAccruedFundingFeeModal";
import { ClaimableCard } from "./ClaimableCard";
import "./Claims.scss";
import { SettleAccruedCard } from "./SettleAccruedCard";

const PAGE_SIZE = 100;

const MARGIN_RIGHT = { marginRight: 4 };
const MARGIN_LEFT = { marginRight: 4 };

export function Claims({
  shouldShowPaginationButtons,
  isSettling,
  setIsSettling,
  positionsInfoData,
  gettingPendingFeePositionKeys,
  setGettingPendingFeePositionKeys,
  setPendingTxns,
  allowedSlippage,
  accruedPositionPriceImpactFees,
  claimablePositionPriceImpactFees,
}: {
  shouldShowPaginationButtons: boolean;
  isSettling: boolean;
  setIsSettling: (v: boolean) => void;
  positionsInfoData: PositionsInfoData | undefined;
  gettingPendingFeePositionKeys: string[];
  setGettingPendingFeePositionKeys: (keys: string[]) => void;
  setPendingTxns: (txns: any) => void;
  allowedSlippage: number;
  accruedPositionPriceImpactFees: RebateInfoItem[];
  claimablePositionPriceImpactFees: RebateInfoItem[];
}) {
  const { chainId } = useChainId();
  const { account } = useWallet();
  const [pageIndex, setPageIndex] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);

  const [isAccruedPositionPriceImpactRebateModalVisible, setIsAccruedPositionPriceImpactRebateModalVisible] =
    useState(false);
  const [isClaimablePositionPriceImpactFeesModalVisible, setIsClaimablePositionPriceImpactFeesModalVisible] =
    useState(false);

  const { claimActions, isLoading } = useClaimCollateralHistory(chainId, {
    pageIndex,
    pageSize: PAGE_SIZE,
  });

  const isEmpty = !account || claimActions?.length === 0;

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

  const isMobile = useMedia("(max-width: 1100px)");

  return (
    <>
      <ClaimModal isVisible={isClaiming} onClose={() => setIsClaiming(false)} setPendingTxns={setPendingTxns} />
      <SettleAccruedFundingFeeModal
        isVisible={isSettling}
        positionKeys={gettingPendingFeePositionKeys}
        positionsInfoData={positionsInfoData}
        allowedSlippage={allowedSlippage}
        setPositionKeys={setGettingPendingFeePositionKeys}
        setPendingTxns={setPendingTxns}
        onClose={handleSettleCloseClick}
      />
      <AccruedPositionPriceImpactRebateModal
        isVisible={isAccruedPositionPriceImpactRebateModalVisible}
        onClose={handleAccruedPositionPriceImpactRebateCloseClick}
        accruedPositionPriceImpactFees={accruedPositionPriceImpactFees}
      />

      <ClaimablePositionPriceImpactRebateModal
        isVisible={isClaimablePositionPriceImpactFeesModalVisible}
        onClose={handleClaimablePositionPriceImpactFeesCloseClick}
        claimablePositionPriceImpactFees={claimablePositionPriceImpactFees}
      />

      <div className="TradeHistory">
        {account && isLoading && (
          <div className="TradeHistoryRow App-box">
            <Trans>Loading...</Trans>
          </div>
        )}
        <div
          className={cx("flex", "w-full", {
            "flex-column": isMobile,
          })}
        >
          {account && !isLoading && (
            <SettleAccruedCard
              accruedPositionPriceImpactFees={accruedPositionPriceImpactFees}
              positionsInfoData={positionsInfoData}
              onSettleClick={handleSettleClick}
              onAccruedPositionPriceImpactRebateClick={handleAccruedPositionPriceImpactRebateClick}
              style={isMobile ? undefined : MARGIN_RIGHT}
            />
          )}
          {account && !isLoading && (
            <ClaimableCard
              claimablePositionPriceImpactFees={claimablePositionPriceImpactFees}
              onClaimClick={handleClaimClick}
              onClaimablePositionPriceImpactFeesClick={handleClaimablePositionPriceImpactFeesClick}
              style={isMobile ? undefined : MARGIN_LEFT}
            />
          )}
        </div>
        {isEmpty && (
          <div className="TradeHistoryRow App-box">
            <Trans>No claims yet</Trans>
          </div>
        )}
        {claimActions?.map((claimAction) => (
          <ClaimHistoryRow key={claimAction.id} claimAction={claimAction} />
        ))}
        {shouldShowPaginationButtons && (
          <div>
            {pageIndex > 0 && (
              <button className="App-button-option App-card-option" onClick={() => setPageIndex((old) => old - 1)}>
                <Trans>Prev</Trans>
              </button>
            )}
            {claimActions && claimActions.length >= PAGE_SIZE && (
              <button className="App-button-option App-card-option" onClick={() => setPageIndex((old) => old + 1)}>
                <Trans>Next</Trans>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
