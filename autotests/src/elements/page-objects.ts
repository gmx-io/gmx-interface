import { Locator, Page } from "@playwright/test";
import { Dappwright } from "@tenkeylabs/dappwright";
import { BasePage } from "./base-page";

import { Modal, Tabs } from "./common";
import { CloseOperation, EditOperation, ExchangeListTab, GmxNavigation } from "./types";
import { Tradebox } from "./tradebox";

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

class Header extends BasePage {
  settings = this.locator("settings");
  userAddress = this.locator("user-address");

  leaderboard = this.locator("leaderboard");
  ecosystem = this.locator("ecosystem");

  connectWalletButton = this.locator("connect-wallet-button");

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
}

class NetworkDropdown extends BasePage {
  handle = this.locator("networks-dropdown-handle");
  dropdown = this.locator("networks-dropdown");
  settings = this.locator("networks-dropdown-settings");

  async switchNetwork(network: "Arbitrum" | "Avalanche" | "Arbitrum Goerli" | "Avalanche Fuji") {
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
  allowSpentToken = this.locator("allow-spent-token-button");

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
      const cantSpentToken = await this.has(this.allowSpentToken);

      if (hasPriceImpactWarning) {
        await this.highPriceImpact.click();
      }

      if (hasSwapImpactWarning) {
        await this.highSwapImpact.click();
      }

      if (cantSpentToken) {
        await Promise.all([this.allowSpentToken.click(), this.allowSpentTokens()]);
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
  allowSpentToken = this.locator("allow-spent-token-button");

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
      const cantSpentToken = await this.has(this.allowSpentToken);

      if (hasPriceImpactWarning) {
        await this.highPriceImpact.click();
      }

      if (hasSwapImpactWarning) {
        await this.highSwapImpact.click();
      }

      if (cantSpentToken) {
        await this.allowSpentToken.click();
        await this.wallet.confirmTransaction();
      }
    }

    await this.confirmButton.click();
    await this.wallet.confirmTransaction();
  }
}

class Order extends BasePage {
  editButton = this.locator("edit-order");
  closeButton = this.locator("close-order");

  async close() {
    await this.closeButton.click();
    await this.wallet.confirmTransaction();
  }
}

class Position extends BasePage {
  closeButton = this.locator("position-close-button");
  edit = this.locator("position-edit-button");
  handle = this.locator("position-handle");

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

  async select() {
    await this.handle.click();
  }
}

class ExchangeListTabs extends Tabs<ExchangeListTab> {
  orders = this.locator("exchange-list-tabs-tab-Orders");
  positions = this.locator("exchange-list-tabs-tab-Positions");
  trades = this.locator("exchange-list-tabs-tab-Trades");
  claims = this.locator("exchange-list-tabs-tab-Claims");

  constructor(page: Page, wallet: Dappwright, root: Locator) {
    super(page, wallet, root);
    this.setTabs({
      Orders: this.orders,
      Positions: this.positions,
      Trades: this.trades,
      Claims: this.claims,
    });
  }
}

class ExchangeList extends BasePage {
  tabs = new ExchangeListTabs(this.page, this.wallet, this.locator("exchange-list-tabs"));
}

export class GmxApp extends BasePage {
  header = new Header(this.page, this.wallet, this.locator("header"));
  tradebox = new Tradebox(this.page, this.wallet, this.locator("tradebox"));
  exchangeList = new ExchangeList(this.page, this.wallet, this.locator("trade-table-large"));

  tradeLink = this.locator("trade");

  dashboardPage = this.locator("dashboard-page");
  earnPage = this.locator("earn-page");
  leaderboardPage = this.locator("leaderboard-page");
  ecosystemPage = this.locator("ecosystem-page");
  referralsPage = this.locator("referrals-page");
  buyPage = this.locator("buy-page");
  buyGlpPage = this.locator("buy-glp-page");
  poolsPage = this.locator("pools-page");

  price = this.locator("price");

  networksDropdown = new NetworkDropdown(this.page, this.wallet);
  settings = new Settings(this.page, this.wallet);
  baseUrl: string;

  constructor(page: Page, wallet: Dappwright, baseUrl: string) {
    super(page, wallet);
    this.baseUrl = baseUrl;
    this.root = this.page.locator("body");
  }

  async getPrice(): Promise<string> {
    const result = await this.price.evaluate((el) => el.textContent);

    if (!result) {
      return "";
    }

    return result;
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
    await this.exchangeList.tabs.select("Positions");
    return new Position(
      this.page,
      this.wallet,
      this.locator(`[data-qa="trade-table-large"] [data-qa="position-item-${market}-${pool}-${direction}"]`)
    );
  }

  async getOrder(fromToken: string, toTokenString: string): Promise<Order>;
  async getOrder(market: string, pool: string, direction: "Long" | "Short"): Promise<Order>;
  async getOrder(marketOrToken: string, poolOrToken: string, direction?: "Long" | "Short"): Promise<Order> {
    await this.exchangeList.tabs.select("Orders");
    if (!direction) {
      return new Order(
        this.page,
        this.wallet,
        this.locator(`[data-qa="trade-table-large"] [data-qa="order-swap-${marketOrToken}-${poolOrToken}"]`)
      );
    }

    return new Order(
      this.page,
      this.wallet,
      this.locator(
        `[data-qa="trade-table-large"] [data-qa="order-market-${marketOrToken} [${poolOrToken}]-${direction}"]`
      )
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
