import { expect, type Locator, type Page } from "@playwright/test";

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

// Hover pauses the rotation first, so the slide cannot change between the dot clicks and the checks after them.
export async function showWhatsNewSlide(whatsNew: Locator, title: string) {
  await whatsNew.hover();
  const slideTitle = whatsNew.getByTestId("whats-new-slide").getByText(title, { exact: true });
  const dots = whatsNew.getByRole("button", { name: /^Go to slide/ });
  for (let i = 0; i < (await dots.count()) && !(await slideTitle.isVisible()); i++) await dots.nth(i).click();
  await expect(slideTitle).toBeVisible();
}
