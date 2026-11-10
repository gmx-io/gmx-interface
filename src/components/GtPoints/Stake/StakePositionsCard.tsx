import { Plural, t, Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useMemo, useState } from "react";

import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import type { SortDirection } from "context/SorterContext/types";
import { useBreakpoints } from "lib/useBreakpoints";

import Badge from "components/Badge/Badge";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import ConnectWalletButton from "components/ConnectWalletButton/ConnectWalletButton";
import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import usePagination from "components/Pagination/usePagination";
import { Sorter } from "components/Sorter/Sorter";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tabs from "components/Tabs/Tabs";

import { formatGt, formatTableDateTime } from "../gtPointsFormat";
import type { GtPointsStakeData, GtStakePosition } from "../gtPointsTypes";
import { formatLpAmount, formatUsdValue, getStakeTokenName, StakeTokenLabel } from "./StakeTokenLabel";

type Tab = "positions" | "history";
type SortField = "value" | "duration";

export type StakeAction = { kind: "claim" | "unstake"; positions: GtStakePosition[] };

export function formatStakeDuration(stakedAt: number, now: number) {
  const days = Math.max(0, Math.floor((now - stakedAt) / 86_400));
  const weeks = Math.floor(days / 7);
  return { days: `${days}d`, weeks: weeks < 1 ? "(<1w)" : `(${weeks}w)` };
}

const formatApr = (apr: number) => `${apr.toFixed(2)}%`;

type Props = {
  stake: GtPointsStakeData | undefined;
  isConnected: boolean;
  isLoading: boolean;
  onAction: (action: StakeAction) => void;
};

export function StakePositionsCard({ stake, isConnected, isLoading, onAction }: Props) {
  const { isMobile } = useBreakpoints();
  const [tab, setTab] = useState<Tab>("positions");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sort, setSort] = useState<{ field: SortField; direction: SortDirection } | undefined>(undefined);
  const now = Math.floor(Date.now() / 1000);

  const positions = useMemo(() => stake?.positions ?? [], [stake]);

  const sorted = useMemo(() => {
    if (!sort || sort.direction === "unspecified") return positions;
    const sign = sort.direction === "asc" ? 1 : -1;
    return [...positions].sort((a, b) => {
      if (sort.field === "value") return a.initialValueUsd > b.initialValueUsd ? sign : -sign;
      return a.stakedAt < b.stakedAt ? sign : -sign;
    });
  }, [positions, sort]);

  const selected = positions.filter((position) => selectedIds.includes(position.id));
  const selectedWithGt = selected.filter((position) => position.unclaimedGt > 0n);
  const allSelected = positions.length > 0 && selected.length === positions.length;

  const toggle = (id: string, isChecked: boolean) =>
    setSelectedIds((ids) => (isChecked ? [...ids, id] : ids.filter((value) => value !== id)));
  const selectAll = (isChecked: boolean) => setSelectedIds(isChecked ? positions.map((p) => p.id) : []);

  const sorterProps = (field: SortField) => ({
    direction: sort?.field === field ? sort.direction : ("unspecified" as SortDirection),
    onChange: (direction: SortDirection) => setSort({ field, direction }),
  });

  const tabOptions = useMemo(
    () => [
      {
        value: "positions" as const,
        label: (
          <span className="inline-flex items-center gap-6">
            <Trans>Stake positions</Trans>
            {isConnected && stake ? <Badge>{positions.length}</Badge> : null}
          </span>
        ),
      },
      { value: "history" as const, label: <Trans>Stake/unstake history</Trans> },
    ],
    [isConnected, stake, positions.length]
  );

  const showBulk = tab === "positions" && isConnected && positions.length > 0;
  const bulkButtons = (
    <>
      <Button
        variant="secondary"
        size="small"
        className="whitespace-nowrap"
        disabled={selectedWithGt.length === 0}
        onClick={() => onAction({ kind: "claim", positions: selectedWithGt })}
      >
        <Trans>Claim GT</Trans>
      </Button>
      <Button
        variant="secondary"
        size="small"
        className="whitespace-nowrap"
        disabled={selected.length === 0}
        onClick={() => onAction({ kind: "unstake", positions: selected })}
      >
        <Plural value={selected.length} one="Unstake # position" other="Unstake # positions" />
      </Button>
    </>
  );

  return (
    <div className="flex flex-col overflow-hidden rounded-8 bg-slate-900">
      <div className="px-20 pt-12">
        <Tabs<Tab>
          type="underline"
          options={tabOptions}
          selectedValue={tab}
          onChange={setTab}
          rightContent={showBulk && !isMobile ? <div className="flex gap-8 pb-8">{bulkButtons}</div> : null}
        />
      </div>
      {showBulk && isMobile ? (
        <div className="flex flex-wrap items-center gap-8 px-16 pt-12">
          <Checkbox
            isChecked={allSelected}
            isPartialChecked={selected.length > 0 && !allSelected}
            setIsChecked={selectAll}
          >
            <span className="text-body-medium whitespace-nowrap">
              <Trans>Select all</Trans>
            </span>
          </Checkbox>
          <div className="ml-auto flex gap-8">{bulkButtons}</div>
        </div>
      ) : null}

      {!isConnected && isLoading ? (
        <EmptyTableContent isLoading isEmpty />
      ) : !isConnected ? (
        <ConnectState />
      ) : tab === "positions" ? (
        <>
          {isMobile ? (
            !isLoading && sorted.length > 0 ? (
              <div className="flex flex-col gap-8 p-16">
                {sorted.map((position) => (
                  <PositionCard
                    key={position.id}
                    position={position}
                    now={now}
                    isSelected={selectedIds.includes(position.id)}
                    onToggle={(isChecked) => toggle(position.id, isChecked)}
                    onAction={onAction}
                  />
                ))}
              </div>
            ) : null
          ) : (
            <TableScrollFadeContainer>
              <table className="w-full min-w-[780px] [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                <thead>
                  <TableTheadTr>
                    <TableTh className="w-[44px]">
                      <Checkbox
                        isChecked={allSelected}
                        isPartialChecked={selected.length > 0 && !allSelected}
                        disabled={positions.length === 0}
                        setIsChecked={selectAll}
                      >
                        <span className="sr-only">
                          <Trans>Select all positions</Trans>
                        </span>
                      </Checkbox>
                    </TableTh>
                    <TableTh>
                      <Trans>Token</Trans>
                    </TableTh>
                    <TableTh>
                      <Sorter {...sorterProps("value")}>
                        <Trans>Initial value</Trans>
                      </Sorter>
                    </TableTh>
                    <TableTh>
                      <Sorter {...sorterProps("duration")}>
                        <Trans>Duration</Trans>
                      </Sorter>
                    </TableTh>
                    <TableTh>
                      <Trans>Current APR</Trans>
                    </TableTh>
                    <TableTh>
                      <Trans>Avg APR</Trans>
                    </TableTh>
                    <TableTh>
                      <Trans>Unclaimed GT</Trans>
                    </TableTh>
                    <TableTh />
                  </TableTheadTr>
                </thead>
                {!isLoading && sorted.length > 0 ? (
                  <tbody>
                    {sorted.map((position) => {
                      const duration = formatStakeDuration(position.stakedAt, now);
                      return (
                        <TableTr key={position.id}>
                          <TableTd>
                            <Checkbox
                              isChecked={selectedIds.includes(position.id)}
                              setIsChecked={(isChecked) => toggle(position.id, isChecked)}
                            >
                              <span className="sr-only">{t`Select ${getStakeTokenName(position.token)}`}</span>
                            </Checkbox>
                          </TableTd>
                          <TableTd>
                            <StakeTokenLabel token={position.token} size={28} />
                          </TableTd>
                          <TableTd>
                            <TwoLines
                              top={formatUsdValue(position.initialValueUsd)}
                              bottom={`(${formatLpAmount(position.amount, position.token)})`}
                            />
                          </TableTd>
                          <TableTd className="text-body-medium numbers">
                            {duration.days} <span className="text-typography-secondary">{duration.weeks}</span>
                          </TableTd>
                          <TableTd className="text-body-medium numbers">{formatApr(position.currentApr)}</TableTd>
                          <TableTd className="text-body-medium numbers">{formatApr(position.avgApr)}</TableTd>
                          <TableTd className="text-body-medium numbers">{formatGt(position.unclaimedGt)}</TableTd>
                          <TableTd>
                            <div className="flex justify-end gap-8">
                              <Button
                                variant="secondary"
                                size="small"
                                className="whitespace-nowrap !px-8"
                                disabled={position.unclaimedGt === 0n}
                                onClick={() => onAction({ kind: "claim", positions: [position] })}
                              >
                                <Trans>Claim GT</Trans>
                              </Button>
                              <Button
                                variant="secondary"
                                size="small"
                                className="whitespace-nowrap !px-8"
                                onClick={() => onAction({ kind: "unstake", positions: [position] })}
                              >
                                <Trans>Unstake</Trans>
                              </Button>
                            </div>
                          </TableTd>
                        </TableTr>
                      );
                    })}
                  </tbody>
                ) : null}
              </table>
            </TableScrollFadeContainer>
          )}
          <EmptyTableContent
            isLoading={isLoading}
            isEmpty={sorted.length === 0}
            emptyText={
              stake ? (
                <Trans>No staked GLV or GM yet. Stake them to start earning GT.</Trans>
              ) : (
                <Trans>Staking data is not available yet</Trans>
              )
            }
          />
        </>
      ) : (
        <StakeHistory stake={stake} isLoading={isLoading} />
      )}
    </div>
  );
}

// Phones: one card per position, laid out like the GM/GLV cards on the Pools page.
function PositionCard({
  position,
  now,
  isSelected,
  onToggle,
  onAction,
}: {
  position: GtStakePosition;
  now: number;
  isSelected: boolean;
  onToggle: (isChecked: boolean) => void;
  onAction: (action: StakeAction) => void;
}) {
  const duration = formatStakeDuration(position.stakedAt, now);

  return (
    <div
      className={cx(
        "flex flex-col gap-4 rounded-8 border-1/2 bg-fill-surfaceElevated50 p-12",
        isSelected ? "border-blue-300" : "border-[transparent]"
      )}
    >
      <div className="flex items-center pb-8">
        <Checkbox className="text-left" isChecked={isSelected} setIsChecked={onToggle}>
          <StakeTokenLabel token={position.token} size={32} />
        </Checkbox>
      </div>
      <div className="flex flex-col gap-10 border-t border-slate-600 pt-8">
        <SyntheticsInfoRow
          label={<Trans>Initial value</Trans>}
          value={
            <span className="numbers">
              {formatUsdValue(position.initialValueUsd)}{" "}
              <span className="text-typography-secondary">({formatLpAmount(position.amount, position.token)})</span>
            </span>
          }
        />
        <SyntheticsInfoRow
          label={<Trans>Duration</Trans>}
          value={
            <span className="numbers">
              {duration.days} <span className="text-typography-secondary">{duration.weeks}</span>
            </span>
          }
        />
        <SyntheticsInfoRow
          label={<Trans>Current APR</Trans>}
          value={<span className="numbers">{formatApr(position.currentApr)}</span>}
        />
        <SyntheticsInfoRow
          label={<Trans>Avg APR</Trans>}
          value={<span className="numbers">{formatApr(position.avgApr)}</span>}
        />
        <SyntheticsInfoRow
          label={<Trans>Unclaimed GT</Trans>}
          value={<span className="numbers">{formatGt(position.unclaimedGt)}</span>}
        />
      </div>
      <div className="mt-12 grid grid-cols-2 gap-8">
        <Button
          variant="secondary"
          disabled={position.unclaimedGt === 0n}
          onClick={() => onAction({ kind: "claim", positions: [position] })}
        >
          <Trans>Claim GT</Trans>
        </Button>
        <Button variant="secondary" onClick={() => onAction({ kind: "unstake", positions: [position] })}>
          <Trans>Unstake</Trans>
        </Button>
      </div>
    </div>
  );
}

function TwoLines({ top, bottom }: { top: ReactNode; bottom: ReactNode }) {
  return (
    <span className="flex flex-col">
      <span className="text-body-medium numbers">{top}</span>
      <span className="text-body-small text-typography-secondary numbers">{bottom}</span>
    </span>
  );
}

function ConnectState() {
  const { openConnectModal } = useConnectModal();

  return (
    <EmptyTableContent
      isLoading={false}
      isEmpty
      emptyText={
        <div className="flex flex-col items-center gap-12">
          <Trans>Connect your wallet to see your staked GLV and GM</Trans>
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

function StakeHistory({ stake, isLoading }: { stake: GtPointsStakeData | undefined; isLoading: boolean }) {
  const history = useMemo(() => stake?.history ?? [], [stake]);
  const { currentPage, setCurrentPage, pageCount, currentData } = usePagination("gt-stake-history", history, 10);

  return (
    <>
      <TableScrollFadeContainer>
        <table className="w-full min-w-[620px]">
          <thead>
            <TableTheadTr>
              <TableTh>
                <Trans>Action</Trans>
              </TableTh>
              <TableTh>
                <Trans>Token</Trans>
              </TableTh>
              <TableTh>
                <Trans>Amount</Trans>
              </TableTh>
              <TableTh>
                <Trans>Time</Trans>
              </TableTh>
            </TableTheadTr>
          </thead>
          {!isLoading && currentData.length > 0 ? (
            <tbody>
              {currentData.map((item) => (
                <TableTr key={item.id}>
                  <TableTd className="text-body-medium font-medium">
                    {item.action === "stake" ? t`Stake` : t`Unstake`}
                  </TableTd>
                  <TableTd>
                    <StakeTokenLabel token={item.token} size={24} />
                  </TableTd>
                  <TableTd>
                    <TwoLines top={formatLpAmount(item.amount, item.token)} bottom={formatUsdValue(item.valueUsd)} />
                  </TableTd>
                  <TableTd className="text-body-medium text-typography-secondary numbers">
                    {formatTableDateTime(item.timestamp)}
                  </TableTd>
                </TableTr>
              ))}
            </tbody>
          ) : null}
        </table>
      </TableScrollFadeContainer>
      <EmptyTableContent
        isLoading={isLoading}
        isEmpty={history.length === 0}
        emptyText={stake ? <Trans>No staking history yet</Trans> : <Trans>Staking history is not available yet</Trans>}
      />
      {!isLoading && (
        <BottomTablePagination
          page={currentPage}
          pageCount={pageCount}
          onPageChange={setCurrentPage}
          className="border-t-1/2 border-slate-600"
        />
      )}
    </>
  );
}
