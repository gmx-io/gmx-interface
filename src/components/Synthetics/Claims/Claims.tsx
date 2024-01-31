import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useClaimCollateralHistory } from "domain/synthetics/claimHistory";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { useCallback, useState } from "react";
import { ClaimHistoryRow } from "../ClaimHistoryRow/ClaimHistoryRow";
import { ClaimableCard } from "./ClaimableCard";

import {
  useMarketsInfoData,
  usePositionsInfoData,
  useTokensData,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useMedia } from "react-use";
import "./Claims.scss";
import { SettleAccruedCard } from "./SettleAccruedCard";

const PAGE_SIZE = 100;

type Props = {
  shouldShowPaginationButtons: boolean;
  setIsClaiming: (isClaiming: boolean) => void;
  setIsSettling: (isSettling: boolean) => void;
};

const MARGIN_RIGHT = { marginRight: 4 };
const MARGIN_LEFT = { marginRight: 4 };

export function Claims({ shouldShowPaginationButtons, setIsClaiming, setIsSettling }: Props) {
  const { chainId } = useChainId();
  const { account } = useWallet();
  const [pageIndex, setPageIndex] = useState(0);
  const tokensData = useTokensData();
  const marketsInfoData = useMarketsInfoData();
  const positionsInfoData = usePositionsInfoData();

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
            style={isMobile ? undefined : MARGIN_RIGHT}
          />
        )}
        {account && !isLoading && (
          <ClaimableCard
            marketsInfoData={marketsInfoData}
            onClaimClick={handleClaimClick}
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
  );
}
