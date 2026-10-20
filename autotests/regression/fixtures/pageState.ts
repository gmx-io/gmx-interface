import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";

const LOADERS = ".bouncing-loader, .spinning-loader, .react-loading-skeleton";
const LOADING_BOUND = 45_000;

export async function expectSettled(page: Page) {
  await expect(page.locator(LOADERS).filter({ visible: true })).toHaveCount(0, { timeout: LOADING_BOUND });
  await expect(page.getByText(/^Loading\.*$/).filter({ visible: true })).toHaveCount(0, { timeout: LOADING_BOUND });
  await expect(page.getByText("Something went wrong", { exact: true }).filter({ visible: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Page not found" })).toHaveCount(0);
}

// The app scrolls inside its page container, so the viewport grows to the content before the capture.
async function attachFullPageScreenshot(page: Page, testInfo: TestInfo, name: string) {
  const viewport = page.viewportSize()!;
  const height = await page.evaluate(() =>
    Math.max(
      document.documentElement.scrollHeight,
      ...Array.from(
        document.querySelectorAll<HTMLElement>(".scrollbar-gutter-stable"),
        (element) => element.scrollHeight
      )
    )
  );
  await page.setViewportSize({ width: viewport.width, height: Math.min(height, 8000) });
  await expectSettled(page);
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true, animations: "disabled" }),
    contentType: "image/png",
  });
  await page.setViewportSize(viewport);
}

export const BASELINE_PAGES: { path: string; ready: (page: Page) => Locator }[] = [
  { path: "/trade", ready: (page) => page.getByRole("button", { name: /\/USD/ }).first() },
  { path: "/pools", ready: (page) => page.getByText("TVL in vaults and pools", { exact: true }) },
  { path: "/earn/discover", ready: (page) => page.getByText("What is GMX?", { exact: true }) },
  { path: "/stats", ready: (page) => page.getByTestId("dashboard-page") },
  { path: "/leaderboard", ready: (page) => page.getByText("Top addresses", { exact: true }) },
  { path: "/referrals", ready: (page) => page.getByTestId("referrals-page") },
];

// Expects the page to be open at `path` already.
export async function captureBaseline(
  page: Page,
  testInfo: TestInfo,
  { path, ready }: (typeof BASELINE_PAGES)[number]
) {
  await expect(ready(page)).toBeVisible();
  if (path === "/trade")
    await expect(
      page.frameLocator('iframe[title="Financial Chart"]').getByRole("region", { name: "Chart #1", exact: true })
    ).toBeVisible();
  await expectSettled(page);
  await attachFullPageScreenshot(page, testInfo, `baseline${path.replaceAll("/", "-")}`);
}
