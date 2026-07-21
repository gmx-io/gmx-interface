import { Trans } from "@lingui/macro";

import type { BoostId, StakingTierId, VolumeTierId } from "domain/synthetics/incentives/v2/types";

export type AccountDataState = "disconnected" | "loading" | "unavailable" | "ready";

export const volumeTierLabels: Record<VolumeTierId, React.ReactNode> = {
  Tier1: <Trans>Ranked</Trans>,
  Tier2: <Trans>Certified</Trans>,
  Tier3: <Trans>Veteran</Trans>,
  Tier4: <Trans>Legendary</Trans>,
  Tier5: <Trans>Apex</Trans>,
};

export const stakingTierLabels: Record<StakingTierId, React.ReactNode> = {
  Tier1: <Trans>Supporter</Trans>,
  Tier2: <Trans>Advocate</Trans>,
  Tier3: <Trans>Guardian</Trans>,
  Tier4: <Trans>Steward</Trans>,
  Tier5: <Trans>Titan</Trans>,
};

export const boostLabels: Record<BoostId, React.ReactNode> = {
  FeaturedMarkets: <Trans>Featured Markets</Trans>,
  BalancingTrades: <Trans>Balancing Trades</Trans>,
  LifetimeTrading: <Trans>Lifetime Volume</Trans>,
  ManualAllocation: <Trans>Manual Allocation</Trans>,
};

export function AccountValue({ state, children }: { state: AccountDataState; children: React.ReactNode }) {
  if (state === "loading") return <>…</>;
  if (state === "unavailable") return <Trans>Unavailable</Trans>;
  if (state === "disconnected") return <>-</>;

  return <>{children}</>;
}

export function StatusLabel({
  state,
  active,
  projected,
  qualified,
}: {
  state: AccountDataState;
  active: boolean;
  projected?: boolean;
  qualified?: boolean;
}) {
  if (state === "loading") return <span className="text-typography-secondary">…</span>;
  if (state === "unavailable") return <span className="text-yellow-300">-</span>;
  if (state === "disconnected") return <span className="text-typography-secondary">-</span>;

  if (qualified !== undefined) {
    return (
      <span className={qualified ? "text-blue-300" : "text-typography-secondary"}>
        {qualified ? <Trans>Qualified this epoch</Trans> : <Trans>Not qualified this epoch</Trans>}
      </span>
    );
  }

  if (active && projected) {
    return (
      <span className="text-green-500">
        <Trans>Active · next epoch</Trans>
      </span>
    );
  }

  if (projected) {
    return (
      <span className="text-blue-300">
        <Trans>Next epoch</Trans>
      </span>
    );
  }

  return (
    <span className={active ? "text-green-500" : "text-typography-secondary"}>
      {active ? <Trans>Active</Trans> : <Trans>Inactive</Trans>}
    </span>
  );
}
