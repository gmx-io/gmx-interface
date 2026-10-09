import type { FeeProfile } from "./economy";

export const fundedCases = [
  { id: "smoke-refresh", group: "smoke", title: "small position survives refresh" },
  { id: "market-long", group: "trading", title: "long: increase, collateral deposit/withdraw, partial/full close" },
  { id: "market-short", group: "trading", title: "short: increase, collateral deposit/withdraw, partial/full close" },
  { id: "limit-long", group: "orders", title: "long limit: create, edit, refresh, cancel" },
  { id: "limit-short", group: "orders", title: "short limit: create, edit, refresh, cancel" },
  { id: "stop-long", group: "orders", title: "long stop: create, edit, refresh, cancel" },
  { id: "stop-short", group: "orders", title: "short stop: create, edit, refresh, cancel" },
  { id: "tp-sl", group: "orders", title: "position TP/SL: create, edit, cancel, close" },
  { id: "twap", group: "orders", title: "two-part TWAP: first execution and cancellation of remainder" },
  { id: "swap", group: "swap", title: "USDC/WETH market swap round trip" },
  { id: "account", group: "account", title: "GMX Account: same-chain deposit and withdrawal" },
  { id: "bridge", group: "bridge", title: "Base to GMX Account and back: destination settlement" },
  { id: "gm", group: "liquidity", title: "GM: USDC deposit and withdrawal" },
  { id: "glv", group: "liquidity", title: "GLV: USDC deposit and withdrawal" },
  { id: "staking", group: "earn", title: "GMX: stake and unstake a bounded existing balance" },
  { id: "claims", group: "earn", title: "claim existing staking rewards and verify receipt and balance" },
  { id: "one-click", group: "one-click", title: "1CT: bounded activation, order, cancellation and revocation" },
] as const;

export type FundedCase = (typeof fundedCases)[number];

export function selectFundedCases(args: string[]) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--execute") continue;
    if (args[i] === "--group" || args[i] === "--case" || args[i] === "--fee-profile") {
      i++;
      continue;
    }
    throw new Error("Unknown funded argument; use --group, --case, --fee-profile or --execute");
  }
  const value = (flag: string) => {
    const index = args.indexOf(flag);
    if (index < 0) return undefined;
    if (!args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`Missing value for ${flag}`);
    return args[index + 1].split(",");
  };
  const groups = value("--group");
  const ids = value("--case");
  if (groups && ids) throw new Error("Select --group or --case, not both");
  if (groups?.some((g) => g !== "all" && !fundedCases.some((c) => c.group === g)))
    throw new Error("Unknown funded group");
  if (ids?.some((id) => !fundedCases.some((c) => c.id === id))) throw new Error("Unknown funded case");
  const selected = fundedCases.filter((c) =>
    ids ? ids.includes(c.id) : groups ? groups.includes("all") || groups.includes(c.group) : c.group === "smoke"
  );
  if (!selected.length) throw new Error("No funded cases selected");
  return selected;
}

export function selectFeeProfile(args: string[], selected: readonly FundedCase[]): FeeProfile {
  const index = args.indexOf("--fee-profile");
  const profile = index < 0 ? "economy" : args[index + 1];
  if (profile !== "economy" && profile !== "glv") throw new Error("Fee profile must be economy or glv");
  if (profile === "glv" && (selected.length !== 1 || selected[0].id !== "glv"))
    throw new Error("The higher GLV fee profile is only permitted with --case glv");
  return profile;
}

export function selectedCasesFromEnvironment() {
  if (process.env.REGRESSION_FUNDED_CASES === "all") return selectFundedCases(["--group", "all"]);
  return selectFundedCases(["--case", process.env.REGRESSION_FUNDED_CASES || "smoke-refresh"]);
}
