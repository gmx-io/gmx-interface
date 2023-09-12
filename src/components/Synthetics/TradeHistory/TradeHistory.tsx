import { Trans } from "@lingui/macro";
import { useTradeHistory } from "domain/synthetics/tradeHistory";
import { useChainId } from "lib/chains";
import { TradeHistoryRow } from "../TradeHistoryRow/TradeHistoryRow";
import { useState } from "react";
import { usePositionsConstants } from "domain/synthetics/positions/usePositionsConstants";
import { MarketsInfoData } from "domain/synthetics/markets";
import { TokensData } from "domain/synthetics/tokens";

const PAGE_SIZE = 100;

type Props = {
  shouldShowPaginationButtons: boolean;
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  account: string | null | undefined;
  forAllAccounts?: boolean;
};

export function TradeHistory(p: Props) {
  const { shouldShowPaginationButtons, marketsInfoData, tokensData, forAllAccounts } = p;
  const { chainId } = useChainId();
  const [pageIndex, setPageIndex] = useState(0);

  const { minCollateralUsd } = usePositionsConstants(chainId);
  const { tradeActions, isLoading: isHistoryLoading } = useTradeHistory(chainId, {
    account: p.account,
    forAllAccounts,
    marketsInfoData,
    tokensData,
    pageIndex,
    pageSize: PAGE_SIZE,
  });

  const isLoading = !!p.account && (!minCollateralUsd || isHistoryLoading);

  const isEmpty = !isLoading && !tradeActions?.length;

  return (
    <div className="TradeHistory">
      {isLoading && (
        <div className="TradeHistoryRow App-box">
          <Trans>Loading...</Trans>
        </div>
      )}
      {isEmpty && (
        <div className="TradeHistoryRow App-box">
          <Trans>No trades yet</Trans>
        </div>
      )}
      {!isLoading &&
        tradeActions?.map((tradeAction) => (
          <TradeHistoryRow
            shouldDisplayAccount={forAllAccounts}
            key={tradeAction.id}
            tradeAction={tradeAction}
            minCollateralUsd={minCollateralUsd!}
          />
        ))}
      {shouldShowPaginationButtons && (
        <div>
          {pageIndex > 0 && (
            <button className="App-button-option App-card-option" onClick={() => setPageIndex((old) => old - 1)}>
              <Trans>Prev</Trans>
            </button>
          )}
          {tradeActions && tradeActions.length >= PAGE_SIZE && (
            <button className="App-button-option App-card-option" onClick={() => setPageIndex((old) => old + 1)}>
              <Trans>Next</Trans>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
