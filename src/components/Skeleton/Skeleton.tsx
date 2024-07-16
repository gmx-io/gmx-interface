import { ComponentPropsWithoutRef, ComponentType, FunctionComponent } from "react";
import { SkeletonTheme } from "react-loading-skeleton";

import AccountPnlSummarySkeletonStructure from "./AccountPnlSummarySkeletonStructure";
import ClaimsHistorySkeletonStructure from "./ClaimsHistorySkeletonStructure";
import GMListSkeletonStructure from "./GMListSkeletonStructure";
import { LeaderboardTopAccountsStructure } from "./LeaderboardTopAccountsStructure";
import { LeaderboardTopPositionsStructure } from "./LeaderboardTopPositionsStructure";
import MarketListSkeletonStructure from "./MarketListSkeletonStructure";
import TradesHistorySkeletonStructure from "./TradesHistorySkeletonStructure";

import "react-loading-skeleton/dist/skeleton.css";
import "./Skeleton.scss";

type Props = {
  count?: number;
  Structure: ComponentType;
};

function TableListSkeleton({ count = 10, Structure, ...restProps }: Props) {
  return (
    <SkeletonTheme baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A">
      {Array.from({ length: count }).map((_, index) => (
        <Structure {...restProps} key={index} />
      ))}
    </SkeletonTheme>
  );
}

type SkeletonProps<Component extends FunctionComponent> = {
  count?: number;
} & ComponentPropsWithoutRef<Component>;

export function MarketListSkeleton(props: SkeletonProps<typeof MarketListSkeletonStructure>) {
  return <TableListSkeleton {...props} Structure={MarketListSkeletonStructure} />;
}

export function GMListSkeleton(props: SkeletonProps<typeof GMListSkeletonStructure>) {
  return <TableListSkeleton {...props} Structure={GMListSkeletonStructure} />;
}

export function TopAccountsSkeleton(props) {
  return <TableListSkeleton {...props} Structure={LeaderboardTopAccountsStructure} />;
}

export function TopPositionsSkeleton(props) {
  return <TableListSkeleton {...props} Structure={LeaderboardTopPositionsStructure} />;
}

export function TradesHistorySkeleton(props: SkeletonProps<typeof TradesHistorySkeletonStructure>) {
  return <TableListSkeleton {...props} Structure={TradesHistorySkeletonStructure} />;
}

export function ClaimsHistorySkeleton(props: SkeletonProps<typeof ClaimsHistorySkeletonStructure>) {
  return <TableListSkeleton {...props} Structure={ClaimsHistorySkeletonStructure} />;
}

export function AccountPnlSummarySkeleton(props: SkeletonProps<typeof AccountPnlSummarySkeletonStructure>) {
  return <TableListSkeleton {...props} Structure={AccountPnlSummarySkeletonStructure} />;
}
