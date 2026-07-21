import { isIncentivesEnabled } from "domain/synthetics/incentives/v2/constants";

export type IncentivesNavItemConfig = { key: "rewards"; to: "/rewards" };

export function resolveIncentivesNavItem(chainId: number): IncentivesNavItemConfig | undefined {
  if (!isIncentivesEnabled(chainId)) {
    return undefined;
  }

  return { key: "rewards", to: "/rewards" };
}
