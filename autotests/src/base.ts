import { BrowserContext, test as baseTest } from "@playwright/test";
import dappwright, { Dappwright, MetaMaskWallet } from "@tenkeylabs/dappwright";
import { GmxApp } from "./elements/page-objects";

import { config } from "dotenv";
import { mockWeb3 } from "./mocks/web3";

config();

let savedContext: BrowserContext | undefined;
let savedWallet: Dappwright | undefined;

export const test = baseTest.extend<{
  context: BrowserContext;
  wallet: Dappwright;
  appUrl: string;
  gmx: GmxApp;
}>({
  page: async ({ context }, use) => {
    const page = await context.newPage();

    if (!process.env.USE_METAMASK) {
      /**
       * @todo Fix this mock to work with rainbowkit
       */
      await mockWeb3(page, () => {
        Web3Mock.mock({
          blockchain: "ethereum",
          accounts: { return: [process.env.ACCOUNT] },
        });
      });
    }

    await use(page);
  },

  context: async ({ appUrl }, use) => {
    if (savedContext && savedWallet) {
      await use(savedContext);
      return;
    }

    const [wallet, metamaskPage, ctx] = await dappwright.bootstrap("", {
      wallet: "metamask",
      version: MetaMaskWallet.recommendedVersion,
      seed: process.env.SEED,
      headless: !Boolean(process.env.PWDEBUG),
    });

    if (process.env.USE_METAMASK) {
      console.log("[Preparing Metamask]");
      if (process.env.CHAIN?.toLocaleLowerCase() === "arbitrum") {
        await metamaskPage.locator('[data-testid="network-display"]').click();
        await metamaskPage.locator('button:has-text("Add Network")').click();
        await metamaskPage.locator('//h6[contains(text(), "Arbitrum One")]/../../../*[2]/button').click();
        await metamaskPage.locator('[data-testid="confirmation-submit-button"]').click();
        await metamaskPage.locator('//button/h6[contains(text(), "Switch to Arbitrum One")]').click();
        await metamaskPage.waitForTimeout(1000);
        await metamaskPage.locator('[data-testid="detected-token-banner"] button').click();
        await metamaskPage.waitForTimeout(1000);
        await metamaskPage
          .locator('//*[contains(@class, "popover-footer")]/button[contains(text(), "Import")]')
          .click();
      } else {
        await wallet.addNetwork({
          chainId: 43113,
          networkName: "Avalanche Fuji",
          rpc: "https://avalanche-fuji-c-chain.publicnode.com",
          symbol: "AVAX",
        });
      }
    }

    console.log("[Preparing GMX App]");
    const page = await ctx.newPage();
    await page.goto(appUrl);
    const gmx = new GmxApp(page, wallet, appUrl);
    await gmx.header.connectWallet();
    await gmx.closeAllToasts();

    savedContext = ctx;
    savedWallet = wallet;

    await use(ctx);
  },

  wallet: async ({ context }, use) => {
    if (savedWallet) {
      await use(savedWallet);
      return;
    }

    const metamask = await dappwright.getWallet("metamask", context);

    await use(metamask);
  },

  appUrl: async ({}, use) => use(process.env.GMX_BASE_URL || "https://app.gmx.io"),

  gmx: async ({ wallet, page, appUrl }, use) => {
    const gmx = new GmxApp(page, wallet, appUrl);
    await use(gmx);
  },
});
