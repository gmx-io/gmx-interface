import type { ReactNode } from "react";
import Skeleton from "react-loading-skeleton";

import "react-loading-skeleton/dist/skeleton.css";

export function RewardsValue({
  children,
  loading,
  width = "3ch",
  height = "0.8em",
}: {
  children?: ReactNode;
  loading: boolean;
  width?: number | string;
  height?: number | string;
}) {
  if (children != null) return <>{children}</>;
  if (!loading) return <>—</>;

  return (
    <Skeleton
      inline
      width={width}
      height={height}
      containerClassName="rewards-skeleton"
      baseColor="var(--rewards-skeleton-base)"
      highlightColor="var(--rewards-skeleton-highlight)"
      duration={2}
    />
  );
}
