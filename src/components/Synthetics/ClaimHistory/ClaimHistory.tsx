import { Trans } from "@lingui/macro";
import { useChainId } from "lib/chains";
import { useState } from "react";
import { useClaimCollateralHistory } from "domain/synthetics/claimHistory";
import { ClaimHistoryRow } from "../ClaimHistoryRow/ClaimHistoryRow";
import { MarketsInfoData } from "domain/synthetics/markets";
import { TokensData } from "domain/synthetics/tokens";
import useWallet from "lib/wallets/useWallet";

const PAGE_SIZE = 100;

type Props = {
  shouldShowPaginationButtons: boolean;
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
};

export function ClaimHistory(p: Props) {
  const { shouldShowPaginationButtons, marketsInfoData, tokensData } = p;
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

  return (
    <div className="TradeHistory">
      {account && isLoading && (
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
