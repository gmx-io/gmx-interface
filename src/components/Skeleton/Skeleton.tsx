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
  invisible?: boolean;
  Structure: ComponentType<any>;
};

export function TableListSkeleton({ count = 10, Structure, invisible = false, ...restProps }: Props) {
  return (
    <SkeletonTheme
      baseColor={invisible ? "transparent" : "#B4BBFF1A"}
      highlightColor={invisible ? "transparent" : "#B4BBFF1A"}
      enableAnimation={!invisible}
    >
      {Array.from({ length: count }).map((_, index) => (
        <Structure {...restProps} invisible={invisible} key={index} />
      ))}
    </SkeletonTheme>
  );
}

type SkeletonProps<Component extends FunctionComponent> = {
  count?: number;
  invisible?: boolean;
} & ComponentPropsWithoutRef<Component>;

export function MarketListSkeleton(props: SkeletonProps<typeof MarketListSkeletonStructure>) {
  return <TableListSkeleton {...props} Structure={MarketListSkeletonStructure} />;
}

export function GMListSkeleton(props: SkeletonProps<typeof GMListSkeletonStructure>) {
  return <TableListSkeleton {...props} Structure={GMListSkeletonStructure} />;
}

export function TopAccountsSkeleton(props: SkeletonProps<typeof LeaderboardTopAccountsStructure>) {
  return <TableListSkeleton {...props} Structure={LeaderboardTopAccountsStructure} />;
}

export function TopPositionsSkeleton(props: SkeletonProps<typeof LeaderboardTopPositionsStructure>) {
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
