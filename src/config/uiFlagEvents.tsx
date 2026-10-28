import { Trans } from "@lingui/macro";
import { type JSX } from "react";

import { getIsSolanaNetworkEnabled } from "config/ab";
import { type NetworkId, isSolanaNetwork } from "config/chains";
import { AnnouncementVariant } from "config/events";
import { DAY_MS } from "lib/dates";

export type UiFlagEventVariant = AnnouncementVariant;

export type UiFlagEventNetwork = "evm" | "solana";

const DEFAULT_DISMISS_COOLDOWN_MS = DAY_MS;

export type UiFlagEventData = {
  id: string;
  flagName: string;
  title: string | JSX.Element;
  content: string | string[] | JSX.Element;
  variant: UiFlagEventVariant;
  dismissCooldownMs?: number;
  // Defaults to "evm"; Solana flags are read from the Arbitrum keeper but shown only on the Solana network
  network?: UiFlagEventNetwork;
};

export const uiFlagEventsData: UiFlagEventData[] = [
  {
    id: "service-disruption",
    flagName: "showServiceDisruptionBanner",
    title: <Trans>Service disruption</Trans>,
    content: <Trans>Trading may be temporarily unavailable. Our team is working to resolve the issue.</Trans>,
    variant: "error",
  },
  {
    id: "solana-service-disruption",
    flagName: "showSolanaServiceDisruptionBanner",
    title: <Trans>Solana service disruption</Trans>,
    content: <Trans>Trading on Solana may be temporarily unavailable. Our team is working to resolve the issue.</Trans>,
    variant: "error",
    network: "solana",
  },
];

export function getUiFlagEventDismissCooldown(event: UiFlagEventData): number {
  return event.dismissCooldownMs ?? DEFAULT_DISMISS_COOLDOWN_MS;
}

// Solana events need the solanaNetwork AB flag (Settings > Debug settings > AB flags) on top of the Solana network.
export function getIsUiFlagEventOnNetwork(event: UiFlagEventData, networkId: NetworkId): boolean {
  if (event.network === "solana" && !getIsSolanaNetworkEnabled()) {
    return false;
  }

  return (event.network ?? "evm") === (isSolanaNetwork(networkId) ? "solana" : "evm");
}
