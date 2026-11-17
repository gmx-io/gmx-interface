import { expect, test } from "@playwright/test";

import { readRegressionAnnouncements } from "../fixtures/deploymentConfig";

// Announcement dates are UTC in the "d MMM yyyy, H:mm" format.
const time = (date: string) => Date.parse(`${date.replace(",", "")} UTC`);

test("24.05 the latest release announcement starts only after the previous one is retired", async ({}, testInfo) => {
  const releases = readRegressionAnnouncements()
    .filter(({ id }) => id.startsWith("release-"))
    .map((event) => ({ ...event, start: time(event.startDate!), end: time(event.endDate) }))
    .sort((a, b) => b.start - a.start);
  await testInfo.attach("release-announcements", {
    body: JSON.stringify(releases.slice(0, 2), null, 2),
    contentType: "application/json",
  });
  expect(releases.length).toBeGreaterThan(1);
  for (const { start, end } of releases) expect(start < end).toBe(true);
  const [latest, previous] = releases;
  expect(latest.start, `${latest.id} starts before ${previous.id} ends`).toBeGreaterThanOrEqual(previous.end);
});
