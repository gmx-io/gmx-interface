import { Locator, Page } from "@playwright/test";
import { Dappwright } from "@tenkeylabs/dappwright";
import { BasePage } from "./base-page";

export class Tabs<T extends string> extends BasePage {
  tabs: Record<string, Locator>;

  setTabs(tabs: Record<T, Locator>) {
    this.tabs = tabs;
  }

  async select(value: T) {
    const tab = this.tabs[value];

    const style = await tab.evaluate((el) => {
      return window.getComputedStyle(el).pointerEvents;
    });

    if (style !== "none") {
      await tab.click();
    }
  }
}

export class Modal extends BasePage {
  constructor(page: Page, wallet: Dappwright, modalAttribute: string) {
    super(page, wallet);
    this.root = this.locator(modalAttribute);
  }
}
