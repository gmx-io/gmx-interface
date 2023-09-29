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

const PAGE_SIZE = 100;

type Props = {
  shouldShowPaginationButtons: boolean;
  marketsInfoData: MarketsInfoData | undefined;
  tokensData: TokensData | undefined;
  setIsClaiming: (isClaiming: boolean) => void;
  setIsSettling: (isSettling: boolean) => void;
  positionsInfoData: PositionsInfoData | undefined;
};

export function Claims({
  shouldShowPaginationButtons,
  marketsInfoData,
  tokensData,
  setIsClaiming,
  setIsSettling,
  positionsInfoData,
}: Props) {
  const { chainId } = useChainId();
  const { account } = useWallet();
  const [pageIndex, setPageIndex] = useState(0);

  const { claimActions, isLoading } = useClaimCollateralHistory(chainId, {
    marketsInfoData,
    tokensData,
    pageIndex,
    pageSize: PAGE_SIZE,
  });

  const isEmpty = !account || claimActions?.length === 0;

  const handleClaimClick = useCallback(() => {
    setIsClaiming(true);
  }, [setIsClaiming]);

  const handleSettleClick = useCallback(() => {
    setIsSettling(true);
  }, [setIsSettling]);

  const isMobile = useMedia("(max-width: 1100px)");

  return (
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
            positionsInfoData={positionsInfoData}
            onSettleClick={handleSettleClick}
            style={isMobile ? undefined : { marginRight: 4 }}
          />
        )}
        {account && !isLoading && (
          <ClaimableCard
            marketsInfoData={marketsInfoData}
            onClaimClick={handleClaimClick}
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
  );
}
