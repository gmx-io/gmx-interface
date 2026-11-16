import { expect } from "@playwright/test";

import { test as browserTest } from "./browser";

export const test = browserTest.extend<{ appHandoffs: void }>({
  appHandoffs: [
    async ({ context }, use, testInfo) => {
      const target = new URL(testInfo.config.metadata.target);
      const handoffs: { builtDestination: string; testedDestination: string }[] = [];
      await context.route(
        /^https:\/\/(?:app\.gmx\.io|(?:[a-z0-9-]+\.)?gmx-interface\.pages\.dev)(?:\/|$)/,
        async (route) => {
          const request = route.request();
          if (!request.isNavigationRequest() || request.frame().parentFrame()) return route.fallback();
          const builtDestination = request.url();
          const original = new URL(builtDestination);
          const testedDestination = new URL(original.pathname + original.search + original.hash, target.origin).href;
          handoffs.push({ builtDestination, testedDestination });
          if (original.origin === target.origin) return route.fallback();
          await route.fulfill({ status: 302, headers: { location: testedDestination } });
        }
      );
      await use();
      await testInfo.attach("landing-app-handoffs", {
        body: JSON.stringify(
          {
            note: "Landing app links are redirected to the selected app preview, preserving the generated path and query. Original destinations are recorded below.",
            handoffs,
          },
          null,
          2
        ),
        contentType: "application/json",
      });
      expect(
        handoffs.filter(({ builtDestination }) => new URL(builtDestination).origin !== "https://app.gmx.io"),
        "Landing app links must point at the production app"
      ).toEqual([]);
    },
    { auto: true },
  ],
});
