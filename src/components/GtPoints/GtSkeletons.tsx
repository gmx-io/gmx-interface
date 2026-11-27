import Skeleton from "react-loading-skeleton";

import { TableListSkeleton } from "components/Skeleton/Skeleton";
import { TableTd, TableTr } from "components/Table/Table";

// Loading rows for the GT Points tables, shaped like each table's real rows (as the release tables do),
// so nothing shows "Loading..." and the card keeps its size when the data arrives.

function Bar({ width, small }: { width: number; small?: boolean }) {
  return (
    <span className={small ? "text-body-small" : "text-body-medium"}>
      <Skeleton width={width} inline className="max-w-full" />
    </span>
  );
}

function Circle({ size }: { size: number }) {
  return <Skeleton circle width={size} height={size} inline className="!block shrink-0" />;
}

function TwoBars({ top, bottom }: { top: number; bottom: number }) {
  return (
    <span className="flex min-w-0 flex-col gap-2">
      <Bar width={top} />
      <Bar width={bottom} small />
    </span>
  );
}

function IconWithName({ size, name }: { size: number; name: number }) {
  return (
    <span className="flex items-center gap-10">
      <Circle size={size} />
      <TwoBars top={name} bottom={Math.round(name * 0.7)} />
    </span>
  );
}

// GT history (My)
function GtHistoryTableRow() {
  return (
    <TableTr>
      <TableTd>
        <Bar width={110} />
      </TableTd>
      <TableTd>
        <Bar width={80} />
      </TableTd>
      <TableTd>
        <Bar width={150} />
      </TableTd>
    </TableTr>
  );
}

function GtHistoryListRow() {
  return (
    <div className="flex items-center justify-between gap-12 border-b-1/2 border-slate-600 px-20 py-10 last:border-b-0">
      <TwoBars top={110} bottom={150} />
      <Bar width={80} />
    </div>
  );
}

export function GtHistorySkeleton({ isMobile }: { isMobile: boolean }) {
  return isMobile ? (
    <div className="flex flex-col">
      <TableListSkeleton count={10} Structure={GtHistoryListRow} />
    </div>
  ) : (
    <tbody>
      <TableListSkeleton count={10} Structure={GtHistoryTableRow} />
    </tbody>
  );
}

// Top GT holders (Global)
function TopHoldersTableRow() {
  return (
    <TableTr>
      <TableTd className="!py-14">
        <Bar width={24} />
      </TableTd>
      <TableTd className="!py-14">
        <span className="flex items-center gap-10">
          <Circle size={24} />
          <Bar width={120} />
        </span>
      </TableTd>
      <TableTd className="!py-14">
        <Bar width={110} />
      </TableTd>
      <TableTd className="!py-14">
        <Bar width={80} />
      </TableTd>
    </TableTr>
  );
}

function TopHoldersListRow() {
  return (
    <div className="flex items-center gap-12 px-20 py-12 odd:bg-fill-surfaceElevated50">
      <span className="w-40 shrink-0">
        <Bar width={20} />
      </span>
      <Circle size={28} />
      <span className="grow">
        <TwoBars top={100} bottom={70} />
      </span>
      <Bar width={90} />
    </div>
  );
}

export function TopHoldersSkeleton({ isMobile }: { isMobile: boolean }) {
  return isMobile ? (
    <div className="flex flex-col">
      <TableListSkeleton count={20} Structure={TopHoldersListRow} />
    </div>
  ) : (
    <tbody>
      <TableListSkeleton count={20} Structure={TopHoldersTableRow} />
    </tbody>
  );
}

// Stake positions (Stake)
function StakePositionTableRow() {
  return (
    <TableTr>
      <TableTd>
        <Skeleton width={16} height={16} inline className="!block" />
      </TableTd>
      <TableTd>
        <IconWithName size={28} name={120} />
      </TableTd>
      <TableTd>
        <TwoBars top={70} bottom={90} />
      </TableTd>
      <TableTd>
        <Bar width={60} />
      </TableTd>
      <TableTd>
        <Bar width={50} />
      </TableTd>
      <TableTd>
        <Bar width={50} />
      </TableTd>
      <TableTd>
        <Bar width={70} />
      </TableTd>
      <TableTd>
        <Skeleton width={140} height={32} inline className="ml-auto !block" />
      </TableTd>
    </TableTr>
  );
}

function StakePositionCard() {
  return (
    <div className="flex flex-col gap-4 rounded-8 bg-fill-surfaceElevated50 p-12">
      <div className="pb-8">
        <IconWithName size={32} name={120} />
      </div>
      <div className="flex flex-col gap-10 border-t border-slate-600 pt-8">
        {[90, 70, 80, 60, 90].map((width, index) => (
          <div key={index} className="flex items-center justify-between">
            <Bar width={width} />
            <Bar width={70} />
          </div>
        ))}
      </div>
      <div className="mt-12 grid grid-cols-2 gap-8">
        <Skeleton height={32} />
        <Skeleton height={32} />
      </div>
    </div>
  );
}

export function StakePositionsSkeleton({ isMobile }: { isMobile: boolean }) {
  return isMobile ? (
    <div className="flex flex-col gap-8 p-16">
      <TableListSkeleton count={3} Structure={StakePositionCard} />
    </div>
  ) : (
    <tbody>
      <TableListSkeleton count={5} Structure={StakePositionTableRow} />
    </tbody>
  );
}

// Stake/unstake history (Stake)
function StakeHistoryTableRow() {
  return (
    <TableTr>
      <TableTd>
        <Bar width={60} />
      </TableTd>
      <TableTd>
        <IconWithName size={24} name={110} />
      </TableTd>
      <TableTd>
        <Bar width={90} />
      </TableTd>
      <TableTd>
        <Bar width={150} />
      </TableTd>
    </TableTr>
  );
}

function StakeHistoryListRow() {
  return (
    <div className="flex items-center justify-between gap-12 border-b-1/2 border-slate-600 px-20 py-10 last:border-b-0">
      <TwoBars top={70} bottom={150} />
      <span className="flex flex-col items-end gap-2">
        <Bar width={90} />
        <Bar width={110} small />
      </span>
    </div>
  );
}

export function StakeHistorySkeleton({ isMobile }: { isMobile: boolean }) {
  return isMobile ? (
    <div className="flex flex-col">
      <TableListSkeleton count={10} Structure={StakeHistoryListRow} />
    </div>
  ) : (
    <tbody>
      <TableListSkeleton count={10} Structure={StakeHistoryTableRow} />
    </tbody>
  );
}
