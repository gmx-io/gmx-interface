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

const PAGE_SIZE = 100;

type Props = {
  shouldShowPaginationButtons: boolean;
  marketsInfoData: MarketsInfoData | undefined;
  tokensData?: TokensData;
  setIsClaiming: (isClaiming: boolean) => void;
};

export function Claims({ shouldShowPaginationButtons, marketsInfoData, tokensData, setIsClaiming }: Props) {
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

  return (
    <div className="TradeHistory">
      {account && isLoading && (
        <div className="TradeHistoryRow App-box">
          <Trans>Loading...</Trans>
        </div>
      )}
      {account && !isLoading && <ClaimableCard marketsInfoData={marketsInfoData} onClaimClick={handleClaimClick} />}
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
