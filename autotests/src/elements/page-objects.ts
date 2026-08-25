import { Locator, Page, expect } from "@playwright/test";
import { Dappwright } from "@tenkeylabs/dappwright";
import { BasePage } from "./base-page";

import { Direction, TradeMode, GmxNavigation, Leverage, EditOperation, CloseOperation } from "./types";
import { Modal, Tabs } from "./common";

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

class PositionEditTabs extends Tabs<EditOperation> {
  depositTab = this.locator("operation-tabs-tab-Deposit");
  withdrawTab = this.locator("operation-tabs-tab-Withdraw");

  constructor(page: Page, wallet: Dappwright, root: Locator) {
    super(page, wallet, root);
    this.setTabs({
      Deposit: this.depositTab,
      Withdraw: this.withdrawTab,
    });
  }
}

class PositionCloseTabs extends Tabs<CloseOperation> {
  marketTab = this.locator("operation-tabs-tab-Market");
  tpsl = this.locator("operation-tabs-tab-TP/SL");

  constructor(page: Page, wallet: Dappwright, root: Locator) {
    super(page, wallet, root);
    this.setTabs({
      Market: this.marketTab,
      "TP/SL": this.tpsl,
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

class Tradebox extends BasePage {
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

class Header extends BasePage {
  settings = this.locator("settings");
  userAddress = this.locator("user-address");

  leaderboard = this.locator("leaderboard");
  ecosystem = this.locator("ecosystem");

  connectWalletButton = this.locator("connect-wallet-button");

  price = this.locator("price");

  async connectWallet() {
    const connect = await this.connectWalletButton;

    if (!connect) {
      console.error("Wallet is already connected");
      return;
    }

    await connect.click();
    await this.page.waitForSelector('[data-testid="rk-wallet-option-io.metamask"]');
    await this.page.click('[data-testid="rk-wallet-option-io.metamask"]');
    await this.wallet.approve();
  }

  async getPrice(): Promise<string> {
    const result = await this.price.evaluate((el) => el.textContent);

    if (!result) {
      return "";
    }

    return result;
  }
}

class NetworkDropdown extends BasePage {
  handle = this.locator("networks-dropdown-handle");
  dropdown = this.locator("networks-dropdown");
  settings = this.locator("networks-dropdown-settings");

  async switchNetwork(network: "Arbitrum" | "Avalanche" | "Avalanche Fuji") {
    await this.handle.click();
    await this.dropdown.waitForVisible();
    const item = await this.locator(`networks-dropdown-${network}`);
    await item.click();
    await this.wallet.confirmNetworkSwitch();
  }
}

class Settings extends BasePage {
  modal = new Modal(this.page, this.wallet, "settings-modal");
}

class EditModal extends Modal {
  input = this.locator("amount-input");
  confirmButton = this.locator("confirm-button");
  tabs = new PositionEditTabs(this.page, this.wallet, this.root);

  highPriceImpact = this.locator("high-price-impact-warning");
  highSwapImpact = this.locator("high-swap-impact-warning");

  async deposit(amount: string) {
    await this.tabs.select("Deposit");
    await this.input.locator("input").fill(amount);

    await this.confirm();
  }

  async withdraw(amount: string) {
    await this.tabs.select("Withdraw");

    if (amount.endsWith("%")) {
      await this.input.locator("input").click();
      await this.input.locator(`[data-qa="amount-input-percent-selector-${amount.slice(0, -1)}"]`).click();
    } else {
      await this.input.fill(amount);
    }

    await this.confirm();
  }

  async confirm(agree = true) {
    if (agree) {
      const hasPriceImpactWarning = await this.has(this.highPriceImpact);
      const hasSwapImpactWarning = await this.has(this.highSwapImpact);

      if (hasPriceImpactWarning) {
        await this.highPriceImpact.click();
      }

      if (hasSwapImpactWarning) {
        await this.highSwapImpact.click();
      }
    }

    await this.confirmButton.click();
    await this.wallet.confirmTransaction();
  }
}

class CloseModal extends Modal {
  input = this.locator("amount-input");
  confirmButton = this.locator("confirm-button");
  tabs = new PositionCloseTabs(this.page, this.wallet, this.root);

  highPriceImpact = this.locator("high-price-impact-warning");
  highSwapImpact = this.locator("high-swap-impact-warning");

  async closePartially(amount: string) {
    await this.tabs.select("Market");

    if (amount.endsWith("%")) {
      await this.input.locator("input").click();
      await this.input.locator(`[data-qa="amount-input-percent-selector-${amount.slice(0, -1)}"]`).click();
    } else {
      await this.input.fill(amount);
    }

    await this.confirm();
  }

  async closeFull() {
    await this.tabs.select("Market");

    await this.input.locator("input").click();
    await this.input.locator(`[data-qa="input-max"]`).click();

    await this.confirm();
  }

  async confirm(agree = true) {
    if (agree) {
      const hasPriceImpactWarning = await this.has(this.highPriceImpact);
      const hasSwapImpactWarning = await this.has(this.highSwapImpact);

      if (hasPriceImpactWarning) {
        await this.highPriceImpact.click();
      }

      if (hasSwapImpactWarning) {
        await this.highSwapImpact.click();
      }
    }

    await this.confirmButton.click();
    await this.wallet.confirmTransaction();
  }
}

class Position extends BasePage {
  closeButton = this.locator("position-close-button");
  edit = this.locator("position-edit-button");

  editModal?: EditModal;
  closeModal?: CloseModal;

  async waitForLoadingEnd() {
    const loading = this.locator("position-loading");

    await loading.waitForVisible();
    await loading.waitForDetached();
  }

  async getCollateral(): Promise<string | null> {
    return await this.locator("position-collateral-value").evaluate((el) => el.textContent);
  }

  async startEdit() {
    await this.edit.click();
    this.editModal = new EditModal(this.page, this.wallet, "position-edit-modal");
    await this.editModal.root.waitForVisible();
  }

  async startClose() {
    await this.closeButton.click();
    this.closeModal = new CloseModal(this.page, this.wallet, "position-close-modal");
    await this.closeModal.root.waitForVisible();
  }

  async closeFull() {
    await this.startClose();

    if (!this.closeModal) {
      throw new Error("Close modal is not opened");
    }

    await this.closeModal.closeFull();
    await this.closeModal.root.waitFor({
      state: "detached",
    });
    this.closeModal = undefined;

    await this.waitForTransactionToBeSent();
    await this.waitForLoadingEnd();
  }

  async closePartially(amount: string) {
    await this.startClose();

    if (!this.closeModal) {
      throw new Error("Close modal is not opened");
    }

    await this.closeModal.closePartially(amount);
    await this.closeModal.root.waitFor({
      state: "detached",
    });
    this.closeModal = undefined;

    await this.waitForTransactionToBeSent();
    await this.waitForLoadingEnd();
  }

  async deposit(amount: string) {
    await this.startEdit();

    if (!this.editModal) {
      throw new Error("Edit modal is not opened");
    }

    await this.editModal.deposit(amount);
    await this.editModal.root.waitFor({
      state: "detached",
    });
    this.editModal = undefined;

    await this.waitForTransactionToBeSent();
    await this.waitForLoadingEnd();
  }

  async withdraw(amount: string) {
    await this.startEdit();

    if (!this.editModal) {
      throw new Error("Edit modal is not opened");
    }

    await this.editModal.withdraw(amount);
    await this.editModal.root.waitFor({
      state: "detached",
    });
    this.editModal = undefined;

    await this.waitForTransactionToBeSent();
    await this.waitForLoadingEnd();
  }
}

export class GmxApp extends BasePage {
  header = new Header(this.page, this.wallet, this.locator("header"));
  tradebox = new Tradebox(this.page, this.wallet, this.locator("tradebox"));

  tradeLink = this.locator("trade");

  dashboardPage = this.locator("dashboard-page");
  earnPage = this.locator("earn-page");
  leaderboardPage = this.locator("leaderboard-page");
  ecosystemPage = this.locator("ecosystem-page");
  referralsPage = this.locator("referrals-page");
  buyPage = this.locator("buy-page");
  buyGlpPage = this.locator("buy-glp-page");
  poolsPage = this.locator("pools-page");

  networksDropdown = new NetworkDropdown(this.page, this.wallet);
  settings = new Settings(this.page, this.wallet);
  baseUrl: string;

  constructor(page: Page, wallet: Dappwright, baseUrl: string) {
    super(page, wallet);
    this.baseUrl = baseUrl;
    this.root = this.page.locator("body");
  }

  async closeAllToasts() {
    while (true) {
      const element = await this.page.$("[data-qa='close-toast']");
      if (!element) {
        break;
      }

      await element.click();
      await element.waitForElementState("hidden");
      /** We need to wait for a second to ensure that DOM node will be detached */
      await this.page.waitForTimeout(500);
    }
  }

  async getPosition(market: string, pool: string, direction: "Long" | "Short") {
    return new Position(
      this.page,
      this.wallet,
      this.locator(`[data-qa="trade-table-large"] [data-qa="position-item-${market}-${pool}-${direction}"]`)
    );
  }

  async navigateTo(page: GmxNavigation) {
    await this.page.goto(this.baseUrl + "#" + page);
  }

  async openSettings() {
    await this.networksDropdown.handle.waitForSelector();
    await this.networksDropdown.handle.click();
    await this.networksDropdown.dropdown.waitForVisible();
    await this.networksDropdown.settings.click();
  }
}
