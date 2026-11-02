import type { Page } from "@playwright/test";

import { readRegressionAnnouncements } from "./deploymentConfig";

// Announcement dates are UTC in the "d MMM yyyy, H:mm" format.
export const announcementTime = (date: string) => Date.parse(`${date.replace(",", "")} UTC`);

// Dated announcements a disconnected wallet can get on this chain, from the deployed release config.
export function datedChainAnnouncements(chainId: number) {
  const chain = chainId === 43114 ? "AVALANCHE" : "ARBITRUM";
  return readRegressionAnnouncements().flatMap((event) =>
    event.startDate && !event.requiresOpenPosition && (!event.chains || event.chains.includes(chain))
      ? [{ ...event, start: announcementTime(event.startDate), end: announcementTime(event.endDate) }]
      : []
  );
}

// What's new shows only when no other top-right message applies, so a live outage warning would hide it.
export async function dismissOutageWarning(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("ui-flag-event-dismissed-service-disruption", String(Date.now()))
  );
}
