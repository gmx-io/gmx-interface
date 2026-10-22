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
