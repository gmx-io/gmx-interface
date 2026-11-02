import { Trans } from "@lingui/macro";
import { type JSX } from "react";

import { AnnouncementVariant } from "config/events";
import { DAY_MS } from "lib/dates";

export type UiFlagEventVariant = AnnouncementVariant;

const DEFAULT_DISMISS_COOLDOWN_MS = DAY_MS;

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
    title: <Trans>Service disruption</Trans>,
    content: <Trans>Trading may be temporarily unavailable. Our team is working to resolve the issue.</Trans>,
    variant: "error",
  },
  {
    id: "qa-info-hint",
    flagName: "qaInfoHint",
    title: "Test · Scheduled maintenance",
    content: "Charts may load slowly on Thursday from 10:00 to 10:30 UTC.",
    variant: "info",
  },
];

export function getUiFlagEventDismissCooldown(event: UiFlagEventData): number {
  return event.dismissCooldownMs ?? DEFAULT_DISMISS_COOLDOWN_MS;
}
