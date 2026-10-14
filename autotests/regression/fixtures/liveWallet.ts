import { expect, type Page } from "@playwright/test";
import { test as browserTest } from "./browser";
import { connectInjectedWallet, installInjectedWallet } from "./injectedWallet";
import { LiveAccounts, type LiveAccount, type LiveChain, type LiveProfile } from "./liveAccounts";
import { blockLiveSubmissions, readOnlyWalletHandler } from "./readOnlyWallet";

export const test = browserTest.extend<
  {
    liveProfile: LiveProfile;
    liveAccount: LiveAccount;
    liveWallet: { connect: (page: Page, path?: string) => Promise<void> };
  },
  { liveAccounts: LiveAccounts }
>({
  liveProfile: ["position", { option: true }],
  liveAccounts: [
    async ({ chainId }, use) => {
      await use(new LiveAccounts(chainId as LiveChain));
    },
    { scope: "worker" },
  ],
  liveAccount: async ({ liveAccounts, liveProfile }, use, testInfo) => {
    const account = await liveAccounts.select(liveProfile);
    await testInfo.attach("live-account-prerequisite", {
      body: JSON.stringify(account, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
      contentType: "application/json",
    });
    await use(account);
  },
  liveWallet: [
    async ({ page, context, liveAccount, liveAccounts, baseURL }, use, testInfo) => {
      const rejected: string[] = [];
      const rejections: unknown[] = [];
      let shareDialogsDismissed = 0;
      // Recent public trades can prompt for sharing immediately after connection.
      await page.addLocatorHandler(page.getByText("Share your GMX trade on X", { exact: true }), async () => {
        const modal = page
          .locator(".Modal-content")
          .filter({ has: page.getByText("Share your GMX trade on X", { exact: true }) });
        const preference = modal.getByRole("button", { name: "Don't show this again", exact: true });
        if (!(await preference.getAttribute("class"))?.split(/\s+/).includes("selected")) await preference.click();
        await expect(preference).toHaveClass(/selected/);
        await modal.locator(".Modal-close-button").click();
        shareDialogsDismissed++;
      });
      await context.exposeBinding("__liveRejection", (_, detail) => {
        rejections.push(detail);
      });
      await context.addInitScript(() => {
        window.addEventListener("unhandledrejection", (event) => {
          const reason = event.reason;
          const target = reason instanceof Event ? reason.target : undefined;
          const url = target instanceof WebSocket ? new URL(target.url) : undefined;
          void (window as unknown as { __liveRejection: (detail: unknown) => Promise<void> }).__liveRejection({
            message: reason instanceof Error ? reason.message : String(reason),
            stack: reason instanceof Error ? reason.stack : undefined,
            websocket: url ? url.origin : undefined,
          });
        });
      });
      await blockLiveSubmissions(context, rejected);
      const provider = await installInjectedWallet(context, {
        address: liveAccount.account,
        chainId: liveAccounts.chainId,
        allowedOrigin: new URL(baseURL!).origin,
        request: readOnlyWalletHandler(async (request, chainId) => {
          if (chainId !== liveAccounts.chainId) throw new Error("Live account read attempted on a different chain");
          return liveAccounts.rpc.request(request as Parameters<typeof liveAccounts.rpc.request>[0]);
        }, rejected),
      });
      await use({
        connect: async (page, path = "/trade") => {
          await page.goto(path, { waitUntil: "domcontentloaded" });
          await connectInjectedWallet(page, liveAccount.account);
          await expect(page.locator("#privy-dialog")).not.toBeVisible({ timeout: 45_000 });
        },
      });
      await context.unrouteAll({ behavior: "ignoreErrors" });
      await testInfo.attach("live-read-only-wallet", {
        body: JSON.stringify({
          ...provider.getState(),
          rejected,
          rejections,
          shareDialogsDismissed,
          mockedData: false,
          signingAvailable: false,
        }),
        contentType: "application/json",
      });
      expect(rejected, "Live-state checks must not request signatures or submit transactions").toEqual([]);
    },
    { auto: true },
  ],
});
