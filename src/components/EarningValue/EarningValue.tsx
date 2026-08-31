import { Trans } from "@lingui/macro";
import { ReactNode } from "react";
import Skeleton from "react-loading-skeleton";

import { getChainName } from "config/chains";
import { useChainId } from "lib/chains";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

type EarningValueProps<T> = {
  value: T | null | undefined;
  isLoading?: boolean;
  isAvailable?: boolean;
  unavailableTooltip?: ReactNode;
  skeletonWidth?: number;
  children: (value: NonNullable<T>) => ReactNode;
};

export function EarningValue<T>({
  value,
  isLoading = false,
  isAvailable = true,
  unavailableTooltip,
  skeletonWidth = 60,
  children,
}: EarningValueProps<T>) {
  if (!isAvailable) {
    return <EarningNotAvailable tooltip={unavailableTooltip} />;
  }

  if (isLoading) {
    return <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={skeletonWidth} className="leading-base" />;
  }

  if (value == null) {
    return <EarningNotAvailable />;
  }

  return <>{children(value as NonNullable<T>)}</>;
}

export function EarningNotAvailable({ tooltip }: { tooltip?: ReactNode }) {
  const label = (
    <span className="text-typography-secondary">
      <Trans>N/A</Trans>
    </span>
  );

  if (!tooltip) {
    return label;
  }

  return <TooltipWithPortal handle={label} content={tooltip} />;
}

export function EarningUnavailableNote() {
  return (
    <div className="text-typography-primary">
      <Trans>Fee data is temporarily unavailable.</Trans>
    </div>
  );
}

export type EarningAttributionScope = "gm" | "glv" | "lp";

export function getEarningAttributionScope({
  gm,
  glv,
}: {
  gm: boolean;
  glv: boolean;
}): EarningAttributionScope | undefined {
  if (gm && glv) {
    return "lp";
  }

  if (gm) {
    return "gm";
  }

  if (glv) {
    return "glv";
  }

  return undefined;
}

export function EarningAttributionNote({ scope }: { scope: EarningAttributionScope }) {
  const { chainId } = useChainId();
  const chainName = getChainName(chainId);

  return (
    <div className="text-typography-primary">
      {scope === "gm" && (
        <Trans>
          Earned fees are only tracked for GM held in your wallet on {chainName}. GM in a GMX Account or on another
          chain still earns fees, but they can't be attributed per account yet.
        </Trans>
      )}
      {scope === "glv" && (
        <Trans>
          Earned fees are only tracked for GLV held in your wallet on {chainName}. GLV in a GMX Account or on another
          chain still earns fees, but they can't be attributed per account yet.
        </Trans>
      )}
      {scope === "lp" && (
        <Trans>
          Earned fees are only tracked for GM and GLV held in your wallet on {chainName}. GM and GLV in a GMX Account or
          on another chain still earn fees, but they can't be attributed per account yet.
        </Trans>
      )}
    </div>
  );
}
