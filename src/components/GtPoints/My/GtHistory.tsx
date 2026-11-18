import { t, Trans } from "@lingui/macro";
import { useMemo, useState } from "react";

import { EMPTY_ARRAY } from "lib/objects";
import { useBreakpoints } from "lib/useBreakpoints";

import Button from "components/Button/Button";
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
import { GtHistorySkeleton } from "../GtSkeletons";

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
  const { isMobile } = useBreakpoints();
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

  const hasData = isConnected && !isLoading && history !== undefined;
  const hasRows = hasData && filtered.length > 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-8 bg-slate-900">
      <div className="flex items-center justify-between gap-8 p-20 pb-12">
        <h3 className="text-body-large font-medium text-typography-primary">
          <Trans>GT history</Trans>
        </h3>
        {hasData && history.length > 0 && (
          <div className="flex items-center gap-8">
            {isMobile && <GtActionFilter asButton value={actionFilter} onChange={setActionFilter} />}
            <Button variant="ghost" size="small" onClick={() => setIsSummaryOpen(true)}>
              <Trans>Summary</Trans>
            </Button>
          </div>
        )}
      </div>

      {isMobile ? (
        // Phones: action and time on the left, amount on the right (like Recent activity on Referrals),
        // so nothing scrolls sideways. The action filter moves to the header as a button.
        isLoading ? (
          <GtHistorySkeleton isMobile />
        ) : hasRows ? (
          <div className="flex flex-col">
            {currentData.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-12 border-b-1/2 border-slate-600 px-20 py-10 last:border-b-0"
              >
                <div className="flex min-w-0 flex-col gap-2">
                  <span className="text-body-medium font-medium text-typography-primary">{labels[item.action]}</span>
                  <span className="text-body-small text-typography-secondary numbers">
                    {formatTableDateTime(item.timestamp)}
                  </span>
                </div>
                <span className="text-body-medium shrink-0 numbers">{formatGt(item.amount, { signed: true })}</span>
              </div>
            ))}
          </div>
        ) : null
      ) : (
        <TableScrollFadeContainer className="px-0">
          <table className="w-full min-w-[520px]">
            <thead>
              <TableTheadTr>
                <TableTh className="w-[40%]">
                  <GtActionFilter value={actionFilter} onChange={setActionFilter} />
                </TableTh>
                <TableTh>
                  <Trans>Amount</Trans>
                </TableTh>
                <TableTh>
                  <Trans>Time</Trans>
                </TableTh>
              </TableTheadTr>
            </thead>
            {isLoading ? (
              <GtHistorySkeleton isMobile={false} />
            ) : (
              hasRows && (
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
              )
            )}
          </table>
        </TableScrollFadeContainer>
      )}

      <EmptyTableContent
        isLoading={false}
        isEmpty={!isLoading && !hasRows}
        emptyText={getEmptyText(isConnected, history)}
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

// The table header filter on desktop; a button next to Summary on phones, like GMX's order filters.
function GtActionFilter({
  value,
  onChange,
  asButton,
}: {
  value: GtHistoryAction[];
  onChange: (value: GtHistoryAction[]) => void;
  asButton?: boolean;
}) {
  const labels = getActionLabels();
  const options = GT_HISTORY_ACTIONS.map((action) => ({ data: action, text: labels[action] }));

  return (
    <TableOptionsFilter<GtHistoryAction>
      multiple
      asButton={asButton}
      label={t`Action`}
      placeholder={t`Search action`}
      value={value}
      options={options}
      onChange={onChange}
      popupPlacement={asButton ? "bottom-end" : "bottom-start"}
    />
  );
}

// Text only when no wallet is connected: the VIP card above has the page's one Connect wallet button.
function getEmptyText(isConnected: boolean, history: GtHistoryItem[] | undefined) {
  if (!isConnected) return <Trans>Connect your wallet to see your GT history</Trans>;
  if (history === undefined) return <Trans>GT history is not available yet</Trans>;
  if (history.length > 0) return <Trans>No GT history for this action</Trans>;
  return <Trans>No GT history yet</Trans>;
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
