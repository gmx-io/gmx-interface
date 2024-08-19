import { Locator, Page } from "@playwright/test";
import { Dappwright } from "@tenkeylabs/dappwright";

import { BasePage } from "./base-page";
import { Modal, Tabs } from "./common";
import { Direction, Leverage, TradeMode } from "./types";

class TradeDirectionTabs extends Tabs<Direction> {
  long = this.locator("trade-direction-tab-Long");
  short = this.locator("trade-direction-tab-Short");
  swap = this.locator("trade-direction-tab-Swap");

  constructor(page: Page, wallet: Dappwright, root: Locator) {
    super(page, wallet, root);
    this.setTabs({
      Long: this.long,
      Short: this.short,
      Swap: this.swap,
    });
  }
}

class TradeModeTabs extends Tabs<TradeMode> {
  market = this.locator("trade-mode-tab-Market");
  limit = this.locator("trade-mode-tab-Limit");
  trigger = this.locator("trade-mode-tab-Trigger");

  constructor(page: Page, wallet: Dappwright, root: Locator) {
    super(page, wallet, root);
    this.setTabs({
      Market: this.market,
      Limit: this.limit,
      Trigger: this.trigger,
    });
  }
}

class LeverageSlider extends BasePage {
  tooltip = this.locator("leverage-slider-tooltip");
  handle = this.locator("leverage-slider-handle");

  async setLeverage(leverage: Leverage) {
    const handle = await this.handle;
    const leverageTextTarget = await this.page.locator(
      `xpath=//*[contains(@class, "rc-slider-mark-text") and text()="${leverage}"]`
    );
    await handle.dragTo(leverageTextTarget);
  }
}

export class Tradebox extends BasePage {
  market = this.locator("market");
  payInput = this.locator("pay-input");
  buyInput = this.locator("buy-input");
  triggerPriceInput = this.locator("trigger-price-input");

  confirmTradeButton = this.locator("confirm-trade-button");

  marketSelector = this.locator("market-selector");
  collateralSelector = this.locator("collateral-selector");

  poolSelector = this.locator("pool-selector-button");
  collateralInSelector = this.locator("collateral-in-selector-button");

  leverageSlider = new LeverageSlider(this.page, this.wallet, this.locator("leverage-slider"));

  directionTabs = new TradeDirectionTabs(this.page, this.wallet, this.locator("trade-direction"));
  modeTabs = new TradeModeTabs(this.page, this.wallet, this.locator("trade-mode"));

  limits = this.locator("info-row-tradebox-limit-entries");

  async selectDirection(direction: Direction) {
    await this.directionTabs.select(direction);
  }

  async selectMode(mode: TradeMode) {
    await this.modeTabs.select(mode);
  }

  async setLeverage(leverage: Leverage) {
    await this.leverageSlider.setLeverage(leverage);
  }

  async selectMarket(market: string) {
    await this.page.waitForSelector(this.marketSelector.selector);
    await this.marketSelector.click();

    const marketsModal = new Modal(this.page, this.wallet, "market-selector-modal");

    await marketsModal.root.waitForVisible();

    const item = await marketsModal.locator(`market-selector-${market}`);

    await item.focus();
    await item.waitForVisible();
    await item.click();

    await this.page.waitForSelector(marketsModal.root.selector, {
      state: "detached",
    });
  }

  async selectCollateral(token: string) {
    await this.page.waitForSelector(this.collateralSelector.selector);
    await this.collateralSelector.click();

    const tokensModal = new Modal(this.page, this.wallet, "collateral-selector-modal");

    await tokensModal.root.waitForVisible();

    const item = tokensModal.locator(`collateral-selector-token-${token}`);

    await item.focus();
    await item.waitForVisible();
    await item.click();

    await this.page.waitForSelector(tokensModal.root.selector, {
      state: "detached",
    });
  }

  async selectPool(pool: string) {
    const enabled = await this.has("pool-selector-button");

    if (!enabled) {
      console.log("[SelectPool]: pool selector is not enabled");
      return;
    }

    await this.poolSelector.click();

    const item = this.locator(`pool-selector-row-${pool}`, this.page.locator("body"));
    await item.waitForVisible();
    await item.click();

    await this.page.waitForSelector(`[data-qa="pool-selector-row-${pool}"]`, {
      state: "detached",
    });
  }

  async selectCollateralIn(token: string) {
    await this.collateralInSelector.click();

    const item = this.page.locator(`[data-qa="collateral-in-selector-row-${token}"]`);
    await item;
    await item.click();

    await this.page.waitForSelector(`[data-qa="collateral-in-selector-row-${token}"]`, {
      state: "detached",
    });
  }
}
