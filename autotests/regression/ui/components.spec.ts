import { expect, type Locator, type Page } from "@playwright/test";

import { datedChainAnnouncements } from "../fixtures/announcements";
import { test } from "../fixtures/browser";
import { openTooltip } from "../fixtures/marketData";

// Always-on announcements shown in the What's new toast.
function toastEvents(chainId: number) {
  return datedChainAnnouncements(chainId).filter((event) => event.isActive && !event.flagId);
}

function tooltipPopup(page: Page) {
  return page.locator(".Tooltip-popup");
}

// Closing the previous tooltip first keeps its content from being read as the next one's.
async function hoverTooltip(page: Page, handle: Locator) {
  await page.mouse.move(0, 0);
  await expect(tooltipPopup(page)).toHaveCount(0);
  const popup = await openTooltip(page, handle);
  await expect(tooltipPopup(page)).toHaveCount(1);
  await expect(popup).toBeInViewport();
  await expect(popup).toHaveText(/\S.{9,}/);
  return (await popup.innerText()).replace(/\s+/g, " ").trim();
}

for (const { path, ready, expected } of [
  {
    path: "/trade",
    ready: (page: Page) => page.getByRole("banner").getByRole("button", { name: /\/USD/ }),
    expected: { "NET RATE / 1H": /funding.*borrowing/i, "Price impact": /price impact/i },
  },
  {
    path: "/pools",
    ready: (page: Page) => page.getByRole("link", { name: "Details", exact: true }).nth(2),
    expected: { "FEE APY": /trading fees/i },
  },
]) {
  test(`2.20 ${path} tooltips open on hover with relevant, non-empty content and close on leave`, async ({ page }) => {
    await page.goto(path);
    await expect(ready(page)).toBeVisible();
    const handles = page.locator(".Tooltip-handle").filter({ visible: true });
    await expect.poll(() => handles.count()).toBeGreaterThan(Object.keys(expected).length);
    const contents: Record<string, string> = {};
    for (const handle of (await handles.all()).slice(0, 12)) {
      const label = (await handle.innerText()).replace(/\s+/g, " ").trim();
      const content = await hoverTooltip(page, handle);
      contents[label || `#${Object.keys(contents).length}`] = content;
      expect(content, `${label} tooltip`).not.toMatch(/\b(?:NaN|Infinity|undefined|null)\b/);
    }
    await page.mouse.move(0, 0);
    await expect(tooltipPopup(page)).toHaveCount(0);
    await test.info().attach("tooltips", { body: JSON.stringify(contents, null, 2), contentType: "application/json" });
    for (const [label, content] of Object.entries(expected)) {
      expect(await hoverTooltip(page, handles.filter({ hasText: label }).first()), label).toMatch(content);
    }
  });
}

test("2.22 a long modal dims the page, scrolls inside and closes by Escape, overlay click and close button", async ({
  page,
}) => {
  await page.goto("/trade/swap");
  const modal = page.getByTestId("receive-selector-modal");
  const open = async () => {
    await page.getByTestId("receive-selector").click();
    await expect(modal).toBeVisible();
  };
  const findScroller = () =>
    modal.evaluateHandle((element) =>
      Array.from(element.querySelectorAll<HTMLElement>("*")).find(
        (child) => child.scrollHeight > child.clientHeight + 20 && getComputedStyle(child).overflowY === "auto"
      )
    );

  // The swap form picks its default tokens after market data loads, which closes a modal opened earlier.
  await expect(page.getByText("Available liquidity", { exact: true }).locator("xpath=..")).toContainText(
    /\$\s*[\d,]+/,
    {
      timeout: 30_000,
    }
  );
  await expect(async () => {
    if (!(await modal.isVisible())) await open();
    expect(await (await findScroller()).evaluate((element) => Boolean(element)), "scrollable modal content").toBe(true);
  }).toPass({ timeout: 30_000 });
  const readOverlay = () =>
    page.locator(".Modal-backdrop").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const alpha = getComputedStyle(element).backgroundColor.match(/[\d.]+/g)?.[3];
      return {
        covers: rect.left <= 0 && rect.top <= 0 && rect.right >= innerWidth && rect.bottom >= innerHeight,
        alpha: alpha === undefined ? 1 : Number(alpha),
        onTop: document.elementFromPoint(20, innerHeight / 2) === element,
      };
    });
  // The backdrop fades in.
  await expect.poll(readOverlay).toEqual({ covers: true, alpha: expect.any(Number), onTop: true });
  expect((await readOverlay()).alpha).toBeGreaterThan(0.2);

  await expect(modal).toContainText("ETH");
  const pageScroll = await page.evaluate(() => document.scrollingElement!.scrollTop);
  await expect(async () => {
    if (!(await modal.isVisible())) await open();
    const scroller = await findScroller();
    const box = (await scroller.asElement()!.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 600);
    await expect.poll(() => scroller.evaluate((element) => (element as HTMLElement).scrollTop)).toBeGreaterThan(0);
  }).toPass({ timeout: 30_000 });
  expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(pageScroll);

  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
  await open();
  await page.mouse.click(20, (page.viewportSize()!.height * 2) / 3);
  await expect(modal).toBeHidden();
  await open();
  // The close icon has no accessible name.
  await modal.locator(".Modal-close-button").click();
  await expect(modal).toBeHidden();
  await expect(page.getByTestId("pay-input")).toBeVisible();
});

test("2.24 the What's new banner shows the current announcement and stays dismissed after reload", async ({
  page,
  chainId,
}) => {
  const events = toastEvents(chainId);
  const latest = events.filter((event) => event.title).sort((a, b) => b.start - a.start)[0];
  expect(latest, "a titled, always-on announcement in src/config/events.tsx").toBeDefined();
  const now = latest.start + 60 * 60 * 1000;
  const shown = events.filter((event) => event.start <= now && now < event.end);
  await page.clock.install({ time: now });

  await page.goto("/pools");
  const banner = page.getByTestId("announcement-banner").filter({ hasText: "What's new" });
  await expect(banner).toBeVisible();
  await expect(banner.getByText(latest.title!, { exact: true }).last()).toBeVisible();
  await expect(banner.getByRole("link", { name: "See more" })).toHaveAttribute(
    "href",
    new RegExp(`/announcements\\?id=${latest.id}`)
  );
  await banner.getByTestId("announcement-banner-close").click();
  await expect(banner).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("visited-announcements") ?? "[]")))
    .toEqual(expect.arrayContaining(shown.map((event) => event.id)));
  await page.reload();
  await expect(page.getByText("TVL in vaults and pools", { exact: true })).toBeVisible();
  await expect(page.getByTestId("whats-new-toast-container")).toBeAttached();
  await expect(banner).toHaveCount(0);
});

test("2.24 opening Announcements marks the What's new banner as read", async ({ page, chainId }) => {
  const latest = toastEvents(chainId)
    .filter((event) => event.title)
    .sort((a, b) => b.start - a.start)[0];
  await page.clock.install({ time: latest.start + 60 * 60 * 1000 });
  await page.goto("/announcements");
  await expect(page.locator(`[data-announcement-id="${latest.id}"]`)).toBeVisible();
  await expect(page.getByTestId("announcement-banner").filter({ hasText: "What's new" })).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("visited-announcements") ?? "[]")))
    .toContain(latest.id);
  await page.getByRole("link", { name: "Pools", exact: true }).first().click();
  await expect(page.getByText("TVL in vaults and pools", { exact: true })).toBeVisible();
  await expect(page.getByTestId("announcement-banner").filter({ hasText: "What's new" })).toHaveCount(0);
});
