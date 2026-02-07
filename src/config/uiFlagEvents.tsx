import { Trans } from "@lingui/macro";
import { type JSX } from "react";

export type UiFlagEventVariant = "info" | "warning";

const DEFAULT_DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

export type UiFlagEventData = {
  id: string;
  flagName: string;
  title: string | JSX.Element;
  content: string | string[] | JSX.Element;
  variant: UiFlagEventVariant;
  dismissCooldownMs?: number;
};

export const uiFlagEventsData: UiFlagEventData[] = [
  {
    id: "service-disruption",
    flagName: "showServiceDisruptionBanner",
    title: <Trans>Service Disruption</Trans>,
    content: <Trans>Trading may be temporarily unavailable. Our team is working to resolve the issue</Trans>,
    variant: "warning",
  },
];

export function getUiFlagEventDismissCooldown(event: UiFlagEventData): number {
  return event.dismissCooldownMs ?? DEFAULT_DISMISS_COOLDOWN_MS;
}
