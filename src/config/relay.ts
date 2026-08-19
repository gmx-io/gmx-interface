import { UiFlags, getIsGelatoFallbackForced, readPersistedUiFlags } from "domain/synthetics/uiFlags/uiFlags";

import { ensureAbFlagRolled, getIsFlagEnabled } from "./ab";
import { ARBITRUM, AVALANCHE, ContractsChainId, MEGAETH } from "./chains";

export type RelayProvider = "gelato" | "gmx";

export type RelayRollout = RelayProvider | "ab";

const rawEnvRelayProvider = import.meta.env.VITE_APP_RELAY_PROVIDER;

// an empty or misspelled value is neither nullish nor a provider; unchecked it would silently
// override the whole rollout with a name nothing matches
const ENV_RELAY_PROVIDER: RelayProvider | undefined =
  rawEnvRelayProvider === "gmx" || rawEnvRelayProvider === "gelato" ? rawEnvRelayProvider : undefined;

const RELAY_ROLLOUT: Partial<Record<ContractsChainId, RelayRollout>> = {
  [ARBITRUM]: "ab",
  [AVALANCHE]: "ab",
  [MEGAETH]: "ab",
};

export function resolveRelayProvider(rollout: RelayRollout | undefined, isAbEnabled: boolean): RelayProvider {
  if (rollout === "ab") {
    return isAbEnabled ? "gmx" : "gelato";
  }

  return rollout ?? "gelato";
}

// reactive callers pass the flags they subscribe to, so a thrown switch reaches them on the next
// poll instead of whenever their memoized inputs happen to change
export function getRelayProvider(chainId: ContractsChainId, uiFlags?: UiFlags): RelayProvider {
  if (getIsGelatoFallbackForced(uiFlags ?? readPersistedUiFlags(chainId))) {
    return "gelato";
  }

  return ENV_RELAY_PROVIDER ?? resolveRelayProvider(RELAY_ROLLOUT[chainId], getIsFlagEnabled("gmxRelay"));
}

// the split is over browsers that send express operations, so the coin is tossed here — at the
// first send — and everything else (selectors, pollers, metrics) reads the assignment passively
export function getRelayProviderForSubmit(chainId: ContractsChainId): RelayProvider {
  if (RELAY_ROLLOUT[chainId] === "ab") {
    ensureAbFlagRolled("gmxRelay");
  }

  return getRelayProvider(chainId);
}
