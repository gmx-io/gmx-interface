import { t, Trans } from "@lingui/macro";
import { ReactNode, useMemo, useState } from "react";

import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { EMPTY_ARRAY } from "lib/objects";

import Button from "components/Button/Button";
import ConnectWalletButton from "components/ConnectWalletButton/ConnectWalletButton";
import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import Modal from "components/Modal/Modal";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import usePagination from "components/Pagination/usePagination";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableOptionsFilter } from "components/TableOptionsFilter/TableOptionsFilter";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

import { formatGt, formatTableDateTime } from "../gtPointsFormat";
import { GT_HISTORY_ACTIONS, type GtHistoryAction, type GtHistoryItem } from "../gtPointsTypes";

const PAGE_SIZE = 10;

function getActionLabels(): Record<GtHistoryAction, string> {
  return {
    tradingReward: t`Trading reward`,
    referralReward: t`Referral reward`,
    stakingReward: t`Staking reward`,
    gtSale: t`GT sale`,
  };
}

type Props = {
  history: GtHistoryItem[] | undefined;
  isConnected: boolean;
  isLoading: boolean;
};

export function GtHistory({ history, isConnected, isLoading }: Props) {
  const [actionFilter, setActionFilter] = useState<GtHistoryAction[]>([]);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const labels = getActionLabels();

  const filtered = useMemo(
    () => (history ?? []).filter((item) => actionFilter.length === 0 || actionFilter.includes(item.action)),
    [history, actionFilter]
  );

  const { currentPage, setCurrentPage, pageCount, currentData } = usePagination(
    `gt-history-${actionFilter.join(",")}`,
    filtered,
    PAGE_SIZE
  );

  const filterOptions = GT_HISTORY_ACTIONS.map((action) => ({ data: action, text: labels[action] }));
  const hasData = isConnected && !isLoading && history !== undefined;

  return (
    <div className="flex flex-col overflow-hidden rounded-8 bg-slate-900">
      <div className="flex items-center justify-between gap-8 p-20 pb-12">
        <h3 className="text-body-large font-medium text-typography-primary">
          <Trans>GT history</Trans>
        </h3>
        {hasData && history.length > 0 && (
          <Button variant="ghost" size="small" onClick={() => setIsSummaryOpen(true)}>
            <Trans>Summary</Trans>
          </Button>
        )}
      </div>

      <TableScrollFadeContainer className="px-0">
        <table className="w-full min-w-[520px]">
          <thead>
            <TableTheadTr>
              <TableTh className="w-[40%]">
                <TableOptionsFilter<GtHistoryAction>
                  multiple
                  label={t`Action`}
                  placeholder={t`Search action`}
                  value={actionFilter}
                  options={filterOptions}
                  onChange={setActionFilter}
                  popupPlacement="bottom-start"
                />
              </TableTh>
              <TableTh>
                <Trans>Amount</Trans>
              </TableTh>
              <TableTh>
                <Trans>Time</Trans>
              </TableTh>
            </TableTheadTr>
          </thead>
          {hasData && filtered.length > 0 && (
            <tbody>
              {currentData.map((item) => (
                <TableTr key={item.id}>
                  <TableTd className="text-body-medium font-medium">{labels[item.action]}</TableTd>
                  <TableTd className="text-body-medium numbers">{formatGt(item.amount, { signed: true })}</TableTd>
                  <TableTd className="text-body-medium text-typography-secondary numbers">
                    {formatTableDateTime(item.timestamp)}
                  </TableTd>
                </TableTr>
              ))}
            </tbody>
          )}
        </table>
      </TableScrollFadeContainer>

      <HistoryEmptyState
        isConnected={isConnected}
        isLoading={isLoading}
        isEmpty={!hasData || filtered.length === 0}
        emptyText={
          history !== undefined && history.length > 0 ? (
            <Trans>No GT history for this action</Trans>
          ) : history === undefined ? (
            <Trans>GT history is not available yet</Trans>
          ) : (
            <Trans>No GT history yet</Trans>
          )
        }
      />

      {hasData && (
        <BottomTablePagination
          page={currentPage}
          pageCount={pageCount}
          onPageChange={setCurrentPage}
          className="border-t-1/2 border-slate-600"
        />
      )}

      <GtSummaryModal isVisible={isSummaryOpen} setIsVisible={setIsSummaryOpen} history={history ?? EMPTY_ARRAY} />
    </div>
  );
}

function HistoryEmptyState({
  isConnected,
  isLoading,
  isEmpty,
  emptyText,
}: {
  isConnected: boolean;
  isLoading: boolean;
  isEmpty: boolean;
  emptyText: ReactNode;
}) {
  const { openConnectModal } = useConnectModal();

  if (!isConnected && !isLoading) {
    return (
      <EmptyTableContent
        isLoading={false}
        isEmpty
        emptyText={
          <div className="flex flex-col items-center gap-12">
            <Trans>Connect your wallet to see your GT history</Trans>
            {openConnectModal && (
              <ConnectWalletButton onClick={openConnectModal}>
                <Trans>Connect wallet</Trans>
              </ConnectWalletButton>
            )}
          </div>
        }
      />
    );
  }

  return <EmptyTableContent isLoading={isLoading} isEmpty={isEmpty} emptyText={emptyText} />;
}

function GtSummaryModal({
  isVisible,
  setIsVisible,
  history,
}: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  history: GtHistoryItem[];
}) {
  const labels = getActionLabels();

  const totals = useMemo(() => {
    const byAction = Object.fromEntries(GT_HISTORY_ACTIONS.map((action) => [action, 0n])) as Record<
      GtHistoryAction,
      bigint
    >;
    for (const item of history) byAction[item.action] += item.amount;
    return byAction;
  }, [history]);

  return (
    <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={<Trans>GT summary</Trans>}>
      <div className="flex w-[360px] max-w-full flex-col gap-12">
        {GT_HISTORY_ACTIONS.map((action) => (
          <SyntheticsInfoRow
            key={action}
            label={labels[action]}
            value={<span className="numbers">{formatGt(totals[action], { signed: true })}</span>}
          />
        ))}
      </div>
    </Modal>
  );
}
