import cx from "classnames";
import { Trans } from "@lingui/macro";
import { useChainId } from "lib/chains";
import { useCallback, useState } from "react";
import { useClaimCollateralHistory } from "domain/synthetics/claimHistory";
import { ClaimHistoryRow } from "../ClaimHistoryRow/ClaimHistoryRow";
import { MarketsInfoData } from "domain/synthetics/markets";
import { TokensData } from "domain/synthetics/tokens";
import useWallet from "lib/wallets/useWallet";
import { ClaimableCard } from "./ClaimableCard";

import "./Claims.scss";
import { useMedia } from "react-use";
import { SettleAccruedCard } from "./SettleAccruedCard";
import { PositionsInfoData } from "domain/synthetics/positions";
import { ClaimModal } from "../ClaimModal/ClaimModal";
import { SettleAccruedFundingFeeModal } from "../SettleAccruedFundingFeeModal/SettleAccruedFundingFeeModal";
import { AccruedPositionPriceImpactRebateModal } from "../AccruedPositionPriceImpactRebateModal/AccruedPositionPriceImpactRebateModal";
import { ClaimablePositionPriceImpactRebateModal } from "../ClaimablePositionPriceImpactRebateModal/ClaimablePositionPriceImpactRebateModal";

const PAGE_SIZE = 100;

export function Claims({
  shouldShowPaginationButtons,
  marketsInfoData,
  tokensData,
  isSettling,
  setIsSettling,
  positionsInfoData,
  gettingPendingFeePositionKeys,
  setGettingPendingFeePositionKeys,
  setPendingTxns,
  allowedSlippage,
}: {
  shouldShowPaginationButtons: boolean;
  marketsInfoData: MarketsInfoData | undefined;
  tokensData: TokensData | undefined;
  isSettling: boolean;
  setIsSettling: (v: boolean) => void;
  positionsInfoData: PositionsInfoData | undefined;
  gettingPendingFeePositionKeys: string[];
  setGettingPendingFeePositionKeys: (keys: string[]) => void;
  setPendingTxns: (txns: any) => void;
  allowedSlippage: number;
}) {
  const { chainId } = useChainId();
  const { account } = useWallet();
  const [pageIndex, setPageIndex] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);

  const [isAccruedPositionPriceImpactRebateModalVisible, setIsAccruedPositionPriceImpactRebateModalVisible] =
    useState(false);
  const [isClaimablePositionPriceImpactFeesModalVisible, setIsClaimablePositionPriceImpactFeesModalVisible] =
    useState(false);

  const { claimActions, isLoading, accruedPositionPriceImpactFees, claimablePositionPriceImpactFees } =
    useClaimCollateralHistory(chainId, {
      marketsInfoData,
      tokensData,
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

  const isMobile = useMedia("(max-width: 1100px)");

  return (
    <>
      <ClaimModal
        marketsInfoData={marketsInfoData}
        isVisible={isClaiming}
        onClose={() => setIsClaiming(false)}
        setPendingTxns={setPendingTxns}
      />
      <SettleAccruedFundingFeeModal
        isVisible={isSettling}
        positionKeys={gettingPendingFeePositionKeys}
        positionsInfoData={positionsInfoData}
        tokensData={tokensData}
        allowedSlippage={allowedSlippage}
        setPositionKeys={setGettingPendingFeePositionKeys}
        setPendingTxns={setPendingTxns}
        onClose={useCallback(() => {
          setGettingPendingFeePositionKeys([]);
          setIsSettling(false);
        }, [setGettingPendingFeePositionKeys, setIsSettling])}
      />
      <AccruedPositionPriceImpactRebateModal
        isVisible={isAccruedPositionPriceImpactRebateModalVisible}
        onClose={useCallback(() => {
          setIsAccruedPositionPriceImpactRebateModalVisible(false);
        }, [])}
        accruedPositionPriceImpactFees={accruedPositionPriceImpactFees}
      />

      <ClaimablePositionPriceImpactRebateModal
        isVisible={isClaimablePositionPriceImpactFeesModalVisible}
        onClose={useCallback(() => {
          setIsClaimablePositionPriceImpactFeesModalVisible(false);
        }, [])}
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
              style={isMobile ? undefined : { marginRight: 4 }}
            />
          )}
          {account && !isLoading && (
            <ClaimableCard
              claimablePositionPriceImpactFees={claimablePositionPriceImpactFees}
              marketsInfoData={marketsInfoData}
              onClaimClick={handleClaimClick}
              onClaimablePositionPriceImpactFeesClick={handleClaimablePositionPriceImpactFeesClick}
              style={isMobile ? undefined : { marginLeft: 4 }}
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
