import type { BoostId, StakingTierId, VolumeTierId } from "domain/synthetics/incentives/types";

import ApexActive from "img/boosts/active/ic_apex.svg?react";
import MarketBalancerActive from "img/boosts/active/ic_market_balancer.svg?react";
import MultichainTraderActive from "img/boosts/active/ic_multichain_trader.svg?react";
import RiskManagedTraderActive from "img/boosts/active/ic_risk_managed_trader.svg?react";
import RwaTraderActive from "img/boosts/active/ic_rwa_trader.svg?react";
import ApexInactive from "img/boosts/inactive/ic_apex.svg?react";
import MarketBalancerInactive from "img/boosts/inactive/ic_market_balancer.svg?react";
import MultichainTraderInactive from "img/boosts/inactive/ic_multichain_trader.svg?react";
import RiskManagedTraderInactive from "img/boosts/inactive/ic_risk_managed_trader.svg?react";
import RwaTraderInactive from "img/boosts/inactive/ic_rwa_trader.svg?react";
import AdvocateActive from "img/staking/active/ic_advocate.svg?react";
import GuardianActive from "img/staking/active/ic_guardian.svg?react";
import StewardActive from "img/staking/active/ic_steward.svg?react";
import SupporterActive from "img/staking/active/ic_supporter.svg?react";
import TitanActive from "img/staking/active/ic_titan.svg?react";
import AdvocateInactive from "img/staking/inactive/ic_advocate.svg?react";
import GuardianInactive from "img/staking/inactive/ic_guardian.svg?react";
import StewardInactive from "img/staking/inactive/ic_steward.svg?react";
import SupporterInactive from "img/staking/inactive/ic_supporter.svg?react";
import TitanInactive from "img/staking/inactive/ic_titan.svg?react";
import CertifiedActive from "img/volume/active/ic_certified.svg?react";
import LegendaryActive from "img/volume/active/ic_legendary.svg?react";
import RankedActive from "img/volume/active/ic_ranked.svg?react";
import VeteranActive from "img/volume/active/ic_veteran.svg?react";
import CertifiedInactive from "img/volume/inactive/ic_certified.svg?react";
import LegendaryInactive from "img/volume/inactive/ic_legendary.svg?react";
import RankedInactive from "img/volume/inactive/ic_ranked.svg?react";
import VeteranInactive from "img/volume/inactive/ic_veteran.svg?react";

type SvgComponent = React.FC<React.SVGProps<SVGSVGElement>>;
type IconPair = { active: SvgComponent; inactive: SvgComponent };

const VOLUME_TIER_ICONS: Record<VolumeTierId, IconPair> = {
  Tier1: { active: RankedActive, inactive: RankedInactive },
  Tier2: { active: CertifiedActive, inactive: CertifiedInactive },
  Tier3: { active: VeteranActive, inactive: VeteranInactive },
  Tier4: { active: LegendaryActive, inactive: LegendaryInactive },
  Tier5: { active: ApexActive, inactive: ApexInactive },
};

const STAKING_TIER_ICONS: Record<StakingTierId, IconPair> = {
  Tier1: { active: SupporterActive, inactive: SupporterInactive },
  Tier2: { active: AdvocateActive, inactive: AdvocateInactive },
  Tier3: { active: GuardianActive, inactive: GuardianInactive },
  Tier4: { active: StewardActive, inactive: StewardInactive },
  Tier5: { active: TitanActive, inactive: TitanInactive },
};

const BOOST_ICONS: Record<BoostId, IconPair> = {
  BalancingTrades: { active: MarketBalancerActive, inactive: MarketBalancerInactive },
  FeaturedMarkets: { active: MultichainTraderActive, inactive: MultichainTraderInactive },
  LifetimeTrading: { active: RiskManagedTraderActive, inactive: RiskManagedTraderInactive },
};

// Extra boost icons available for future boost types
export const EXTRA_BOOST_ICONS = {
  RwaTrader: { active: RwaTraderActive, inactive: RwaTraderInactive },
  RiskManagedTrader: { active: RiskManagedTraderActive, inactive: RiskManagedTraderInactive },
};

const tierIconBase = "size-28 shrink-0 rounded-8 border-1/2 border-slate-600";
const tierIconGlow = `${tierIconBase} drop-shadow-[0_4px_6px_rgba(120,133,255,0.9)] dark:drop-shadow-[0_4px_6px_rgba(120,133,255,0.9)] !border-blue-300/50`;

export function VolumeTierIcon({
  tierId,
  active,
  className,
}: {
  tierId: VolumeTierId;
  active: boolean;
  className?: string;
}) {
  const iconPair = VOLUME_TIER_ICONS[tierId];
  const Icon = active ? iconPair.active : iconPair.inactive;
  return <Icon className={className ?? (active ? tierIconGlow : tierIconBase)} />;
}

export function StakingTierIcon({
  tierId,
  active,
  className,
}: {
  tierId: StakingTierId;
  active: boolean;
  className?: string;
}) {
  const iconPair = STAKING_TIER_ICONS[tierId];
  const Icon = active ? iconPair.active : iconPair.inactive;
  return <Icon className={className ?? (active ? tierIconGlow : tierIconBase)} />;
}

export function BoostTierIcon({
  boostId,
  active,
  className,
}: {
  boostId: BoostId;
  active: boolean;
  className?: string;
}) {
  const iconPair = BOOST_ICONS[boostId];
  if (!iconPair) return null;
  const Icon = active ? iconPair.active : iconPair.inactive;
  return <Icon className={className ?? (active ? tierIconGlow : tierIconBase)} />;
}
