import { Locator, Page } from "@playwright/test";
import { Dappwright } from "@tenkeylabs/dappwright";

declare module "@playwright/test" {
  interface Locator {
    selector: string;
    waitForVisible(): void;
    waitForSelector(): void;
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

  locator(selector: string) {
    const locatorSelector =
      selector.startsWith(".") || selector.startsWith("//") || selector.startsWith("[")
        ? selector
        : `[data-qa="${selector}"]`;
    const locator = this.root.locator(locatorSelector);
    return this.wrapLocatorWithRoot(locator, locatorSelector);
  }

  async waitForTransactionToBeSent() {
    /**
     * @todo Implement me!
     */
  }
}
