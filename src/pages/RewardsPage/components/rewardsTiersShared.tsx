import { Trans } from "@lingui/macro";

import type {
  BoostConfig,
  BoostId,
  IncentivesConfig,
  StakingTierId,
  VolumeTierId,
} from "domain/synthetics/incentives/v2/types";
import { formatMultiplier } from "domain/synthetics/incentives/v2/utils";
import { formatAmountHuman, USD_DECIMALS } from "lib/numbers";

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
  ManualAllocation: <Trans>Return Bonus</Trans>,
};

function formatCompactUsd(amount: bigint) {
  return formatAmountHuman(amount, USD_DECIMALS, true, 0).replace(/[kmb]$/i, (suffix) => suffix.toUpperCase());
}

export function BoostDescriptionText({ boost, config }: { boost: BoostConfig; config: IncentivesConfig }) {
  if (boost.boost === "FeaturedMarkets") {
    return <Trans>Trade featured markets to activate this boost and earn a higher multiplier for those trades.</Trans>;
  }

  if (boost.boost === "BalancingTrades") {
    return (
      <Trans>
        Place balancing position increases ({formatCompactUsd(config.balancingTradesThreshold)}+) on underutilized sides
        to earn an additional multiplier on those trades.
      </Trans>
    );
  }

  if (boost.boost === "LifetimeTrading") {
    return (
      <Trans>
        Reach {formatCompactUsd(config.lifetimeVolumeThreshold)}+ in lifetime trading volume to unlock a permanent{" "}
        {formatMultiplier(boost.multiplier, config.multiplierDecimals).replace("x", "×")} multiplier.
      </Trans>
    );
  }

  return null;
}

export function AccountValue({ state, children }: { state: AccountDataState; children: React.ReactNode }) {
  if (state === "loading") return <>…</>;
  if (state === "unavailable") return <>-</>;
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
      <span className="text-rewards-blue-300">
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
