import { expect, test as base } from "@playwright/test";

export const test = base.extend<{ chainId: number; diagnostics: void }>({
  chainId: async ({}, use, testInfo) => {
    await use(testInfo.config.metadata.chainId as number);
  },
  context: async ({ context, chainId }, use) => {
    await context.addInitScript((network) => {
      if (window.top !== window || !/^https?:$/.test(location.protocol)) return;
      if (!localStorage.getItem("regression-initialized")) {
        localStorage.setItem("production-preview", "true");
        localStorage.setItem("SELECTED_NETWORK", String(network));
        localStorage.setItem("SELECTED_SETTLEMENT_CHAIN_ID", String(network));
        localStorage.setItem("LANGUAGE_KEY", "en");
        localStorage.setItem("regression-initialized", "true");
      }
    }, chainId);
    await use(context);
  },
  diagnostics: [
    async ({ page }, use, testInfo) => {
      const errors: string[] = [];
      const failedRequests: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("requestfailed", (request) => {
        if (failedRequests.length < 100) {
          const url = new URL(request.url());
          failedRequests.push(`${request.method()} ${url.origin}${url.pathname}: ${request.failure()?.errorText}`);
        }
      });
      await use();
      await testInfo.attach("browser-diagnostics", {
        body: JSON.stringify({ errors, failedRequests }, null, 2),
        contentType: "application/json",
      });
      expect(errors, "Unhandled JavaScript errors (RR-25-01)").toEqual([]);
    },
    { auto: true },
  ],
});
