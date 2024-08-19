import { Locator, Page } from "@playwright/test";
import { Dappwright } from "@tenkeylabs/dappwright";

declare module "@playwright/test" {
  interface Locator {
    selector: string;
    waitForVisible(): void;
    waitForSelector(): void;
    waitForDetached(): void;
  }
}

export class BasePage {
  public root: Locator;
  public wallet: Dappwright;

  private wrapLocatorWithRoot(locator: Locator, selector: string) {
    locator.selector = selector;
    locator.waitForVisible = async () => {
      if (process.env.PWDEBUG) {
        console.log(`Waiting for ${selector} to be visible`);
      }

      await this.page.waitForSelector(selector, {
        state: "visible",
      });
    };

    locator.waitForDetached = async () => {
      if (process.env.PWDEBUG) {
        console.log(`Waiting for ${selector} to be detached`);
      }

      await this.page.waitForSelector(selector, {
        state: "detached",
      });
    };

    locator.waitForSelector = async () => {
      if (process.env.PWDEBUG) {
        console.log(`Waiting for selector = ${selector}`);
      }

      await this.page.waitForSelector(selector);
    };

    return locator;
  }

  constructor(
    public page: Page,
    wallet: Dappwright,
    root?: Locator
  ) {
    this.page = page;
    this.wallet = wallet;
    this.root = root ? root : page.locator("body");
    if (root) {
      this.root = root;
    } else {
      this.root = page.locator("body");
      this.wrapLocatorWithRoot(this.root, "body");
    }
  }

  locator(selector: string, root?: Locator) {
    const locatorSelector =
      selector.startsWith(".") || selector.startsWith("//") || selector.startsWith("[")
        ? selector
        : `[data-qa="${selector}"]`;
    const locator = (root ?? this.root).locator(locatorSelector);
    return this.wrapLocatorWithRoot(locator, locatorSelector);
  }

  async allowSpentTokens() {
    const popup = await this.wallet.page.context().waitForEvent("page");
    await popup.waitForSelector('[data-testid="page-container-footer-next"]');
    await popup.click('[data-testid="page-container-footer-next"]');
    await popup.waitForSelector('[data-testid="page-container-footer-next"]:has-text("Approve")');
    await popup.click('[data-testid="page-container-footer-next"]:has-text("Approve")');
  }

  async has(locator: string | Locator, timeout = 5000) {
    const selector = typeof locator === "string" ? this.locator(locator).selector : locator.selector;

    try {
      await this.page.waitForSelector(selector, { state: "attached", timeout });
      return true;
    } catch (e) {
      return false;
    }
  }

  async waitForTransactionToBeSent() {
    /**
     * @todo Implement me!
     */
  }
}
