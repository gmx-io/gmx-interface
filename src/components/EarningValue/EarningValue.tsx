import { Trans } from "@lingui/macro";
import { ReactNode } from "react";
import Skeleton from "react-loading-skeleton";

type EarningValueProps<T> = {
  value: T | null | undefined;
  isLoading?: boolean;
  isAvailable?: boolean;
  skeletonWidth?: number;
  children: (value: NonNullable<T>) => ReactNode;
};

export function EarningValue<T>({
  value,
  isLoading = false,
  isAvailable = true,
  skeletonWidth = 60,
  children,
}: EarningValueProps<T>) {
  if (isLoading) {
    return <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={skeletonWidth} className="leading-base" />;
  }

  if (!isAvailable || value == null) {
    return (
      <span className="text-typography-secondary">
        <Trans>N/A</Trans>
      </span>
    );
  }

  return <>{children(value as NonNullable<T>)}</>;
}

export function EarningUnavailableNote() {
  return (
    <div className="text-typography-primary">
      <Trans>Fee data is temporarily unavailable.</Trans>
    </div>
  );
}
