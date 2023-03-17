import { Trans } from "@lingui/macro";
import { useChainId } from "lib/chains";
import { useState } from "react";
import { useClaimCollateralHistory } from "domain/synthetics/claimHistory";
import { ClaimHistoryRow } from "../ClaimHistoryRow/ClaimHistoryRow";
import { useAvailableTokensData } from "domain/synthetics/tokens";
import { useMarketsData } from "domain/synthetics/markets";

const PAGE_SIZE = 100;

type Props = {
  shouldShowPaginationButtons: boolean;
};

export function ClaimHistory(p: Props) {
  const { shouldShowPaginationButtons } = p;
  const { chainId } = useChainId();
  const [pageIndex, setPageIndex] = useState(0);

  const { marketsData } = useMarketsData(chainId);
  const { tokensData } = useAvailableTokensData(chainId);

  const { claimActions, isLoading } = useClaimCollateralHistory(chainId, { pageIndex, pageSize: PAGE_SIZE });

  const isEmpty = !isLoading && !claimActions?.length;

  return (
    <div className="TradeHistory">
      {isLoading && (
        <div className="TradeHistoryRow App-box">
          <Trans>Loading...</Trans>
        </div>
      )}
      {isEmpty && (
        <div className="TradeHistoryRow App-box">
          <Trans>No claims yet</Trans>
        </div>
      )}
      {claimActions?.map((claimAction) => (
        <ClaimHistoryRow
          key={claimAction.id}
          claimAction={claimAction}
          marketsData={marketsData}
          tokensData={tokensData}
        />
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
