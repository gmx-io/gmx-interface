import type { IncentivesConfig } from "./types";

export type IncentivesAvailability =
  | { status: "loading" }
  | { status: "active"; config: IncentivesConfig; isStale: boolean }
  | { status: "inactive" }
  | { status: "error"; error: Error }
  | { status: "unsupported-chain" };

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

export function resolveIncentivesAvailability({
  supported,
  config,
  error,
}: {
  supported: boolean;
  config: IncentivesConfig | null | undefined;
  error: unknown;
}): IncentivesAvailability {
  if (!supported) {
    return { status: "unsupported-chain" };
  }

  if (config && typeof config === "object") {
    return { status: "active", config, isStale: Boolean(error) };
  }

  if (config === null) {
    return { status: "inactive" };
  }

  if (error) {
    return { status: "error", error: toError(error) };
  }

  return { status: "loading" };
}
