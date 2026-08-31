import type { Locator } from "@playwright/experimental-ct-core";
import { test, expect } from "@playwright/experimental-ct-react";
import { ethers } from "ethers";

import { getSubaccountApprovalKey, getSubaccountConfigKey } from "config/localStorage";
import {
  ARBITRUM_CONTRACTS,
  deriveGeneratedSubaccount,
  MOCK_ACCOUNT_PRIVATE_KEY,
  MockChain,
  SEEDED_SUBACCOUNT_ADDRESS,
  SEEDED_SUBACCOUNT_PRIVATE_KEY,
  SUBACCOUNT_MESSAGE,
} from "domain/testUtils/rpc/mockChain";
import { assertNoRpcHoles, installRpcResponder } from "domain/testUtils/rpc/playwrightAdapter";
import { ARBITRUM } from "sdk/configs/chainIds";

import { OneClickTradingModeStory } from "./OneClickTradingMode.ct.stories";

const MOCK_ACCOUNT = new ethers.Wallet(MOCK_ACCOUNT_PRIVATE_KEY).address;

const FAR_FUTURE = 9999999999n;

const INSUFFICIENT_FUNDS_RPC_ERROR = "insufficient funds for gas * price + value: balance 0, tx cost 21000000000000";

test.setTimeout(60_000);

test.afterEach(assertNoRpcHoles);

type PageLike = {
  locator: (selector: string) => Locator;
  getByText: (text: string | RegExp, options?: { exact?: boolean }) => Locator;
  evaluate: <R, Arg>(fn: (arg: Arg) => R, arg: Arg) => Promise<R>;
};

function settingsModal(page: PageLike) {
  return page.locator('[data-qa="settings-modal"]');
}

function modeButton(page: PageLike, title: "Classic" | "Express" | "Express + One-Click"): Locator {
  return settingsModal(page)
    .locator("div.min-h-66")
    .filter({ has: page.getByText(title, { exact: true }) });
}

function expectModeActive(button: Locator) {
  return expect(button).toHaveClass(/border-slate-100/);
}

function expectModeInactive(button: Locator) {
  return expect(button).toHaveClass(/border-slate-600/);
}

function readLocalStorage(page: PageLike, key: unknown): Promise<string | null> {
  return page.evaluate((k: string) => localStorage.getItem(k), JSON.stringify(key));
}

const CONFIG_KEY = getSubaccountConfigKey(ARBITRUM, MOCK_ACCOUNT);
const SETTLEMENT_APPROVAL_KEY = getSubaccountApprovalKey(ARBITRUM, MOCK_ACCOUNT, undefined);

test.describe("Trading Settings: Express+1CT -> Express deactivation (FEDEV-2133)", () => {
  test("failed deactivation keeps Express+1CT with an actionable reason; fixing the cause and retrying succeeds", async ({
    mount,
    page,
  }) => {
    const chain = new MockChain({
      walletPrivateKey: MOCK_ACCOUNT_PRIVATE_KEY,
      subaccountAddress: SEEDED_SUBACCOUNT_ADDRESS,
      onchain: {
        active: true,
        maxAllowedCount: 10n,
        currentActionsCount: 0n,
        expiresAt: FAR_FUTURE,
      },
    });
    chain.estimateGasError = INSUFFICIENT_FUNDS_RPC_ERROR;
    await installRpcResponder(page, chain);

    await mount(
      <OneClickTradingModeStory
        expressEnabled
        seedSubaccountAddress={SEEDED_SUBACCOUNT_ADDRESS}
        seedSubaccountPrivateKey={SEEDED_SUBACCOUNT_PRIVATE_KEY}
      />
    );

    await expectModeActive(modeButton(page, "Express + One-Click"));

    await modeButton(page, "Express").click();

    await expect(page.getByText("Deactivation failed")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Insufficient ETH balance to cover network fees. Add funds and retry.")).toBeVisible();

    await expectModeActive(modeButton(page, "Express + One-Click"));
    await expectModeInactive(modeButton(page, "Express"));
    expect(await readLocalStorage(page, CONFIG_KEY)).toContain(SEEDED_SUBACCOUNT_ADDRESS);
    expect(chain.sentTransactions).toHaveLength(0);

    chain.estimateGasError = undefined;

    await modeButton(page, "Express").click();

    await expect(page.getByText("Deactivated")).toBeVisible({ timeout: 20_000 });

    expect(chain.sentTransactions).toHaveLength(1);
    expect(chain.sentTransactions[0].to && ethers.getAddress(chain.sentTransactions[0].to)).toBe(
      ARBITRUM_CONTRACTS.SubaccountRouter
    );

    await expectModeActive(modeButton(page, "Express"));
    await expectModeInactive(modeButton(page, "Express + One-Click"));

    expect(await readLocalStorage(page, CONFIG_KEY)).not.toContain(SEEDED_SUBACCOUNT_ADDRESS);
    expect(await readLocalStorage(page, SETTLEMENT_APPROVAL_KEY)).toBeFalsy();
  });

  test("rejecting the deactivation transaction in the wallet keeps Express+1CT retryable; confirming on retry deactivates", async ({
    mount,
    page,
  }) => {
    const chain = new MockChain({
      walletPrivateKey: MOCK_ACCOUNT_PRIVATE_KEY,
      subaccountAddress: SEEDED_SUBACCOUNT_ADDRESS,
      onchain: {
        active: true,
        maxAllowedCount: 10n,
        currentActionsCount: 0n,
        expiresAt: FAR_FUTURE,
      },
    });
    chain.rejectSendTransaction = true;
    await installRpcResponder(page, chain);

    await mount(
      <OneClickTradingModeStory
        expressEnabled
        seedSubaccountAddress={SEEDED_SUBACCOUNT_ADDRESS}
        seedSubaccountPrivateKey={SEEDED_SUBACCOUNT_PRIVATE_KEY}
      />
    );

    await expectModeActive(modeButton(page, "Express + One-Click"));

    const configBefore = await readLocalStorage(page, CONFIG_KEY);
    expect(configBefore).toContain(SEEDED_SUBACCOUNT_ADDRESS);

    await modeButton(page, "Express").click();

    await expect(page.getByText("Deactivation failed")).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText("The signature request was rejected in your wallet. Retry and confirm the request to deactivate.")
    ).toBeVisible();

    const sendRequests = chain.rpcLog.filter((e) => e.method === "eth_sendTransaction");
    expect(sendRequests).toHaveLength(1);
    expect(sendRequests[0].error).toBe("User rejected the request.");
    expect(chain.sentTransactions).toHaveLength(0);

    await expectModeActive(modeButton(page, "Express + One-Click"));
    await expectModeInactive(modeButton(page, "Express"));
    expect(await readLocalStorage(page, CONFIG_KEY)).toBe(configBefore);

    chain.rejectSendTransaction = false;

    await modeButton(page, "Express").click();

    await expect(page.getByText("Deactivated")).toBeVisible({ timeout: 20_000 });

    expect(chain.sentTransactions).toHaveLength(1);
    expect(chain.sentTransactions[0].to && ethers.getAddress(chain.sentTransactions[0].to)).toBe(
      ARBITRUM_CONTRACTS.SubaccountRouter
    );

    await expectModeActive(modeButton(page, "Express"));
    await expectModeInactive(modeButton(page, "Express + One-Click"));

    expect(await readLocalStorage(page, CONFIG_KEY)).not.toContain(SEEDED_SUBACCOUNT_ADDRESS);
    expect(await readLocalStorage(page, SETTLEMENT_APPROVAL_KEY)).toBeFalsy();
  });

  test("deactivating a subaccount that is not registered on-chain skips the wallet transaction", async ({
    mount,
    page,
  }) => {
    const chain = new MockChain({
      walletPrivateKey: MOCK_ACCOUNT_PRIVATE_KEY,
      subaccountAddress: SEEDED_SUBACCOUNT_ADDRESS,
      onchain: { active: false },
    });
    await installRpcResponder(page, chain);

    await mount(
      <OneClickTradingModeStory
        expressEnabled
        seedSubaccountAddress={SEEDED_SUBACCOUNT_ADDRESS}
        seedSubaccountPrivateKey={SEEDED_SUBACCOUNT_PRIVATE_KEY}
        seedSettlementApproval
      />
    );

    await expectModeActive(modeButton(page, "Express + One-Click"));

    await modeButton(page, "Express").click();

    await expect(page.getByText("Deactivated")).toBeVisible({ timeout: 20_000 });
    await expectModeActive(modeButton(page, "Express"));

    expect(chain.sentTransactions).toHaveLength(0);
    expect(await readLocalStorage(page, CONFIG_KEY)).not.toContain(SEEDED_SUBACCOUNT_ADDRESS);
    expect(await readLocalStorage(page, SETTLEMENT_APPROVAL_KEY)).toBeFalsy();
  });
});

test.describe("Trading Settings: enabling One-Click with real signatures (FEDEV-2132)", () => {
  test("rejecting the approval re-sign for an already stored subaccount keeps the stored config byte-for-byte", async ({
    mount,
    page,
  }) => {
    const chain = new MockChain({
      walletPrivateKey: MOCK_ACCOUNT_PRIVATE_KEY,
      subaccountAddress: SEEDED_SUBACCOUNT_ADDRESS,
      onchain: { active: false },
    });
    chain.rejectTypedDataSign = true;
    await installRpcResponder(page, chain);

    await mount(
      <OneClickTradingModeStory
        expressEnabled
        seedSubaccountAddress={SEEDED_SUBACCOUNT_ADDRESS}
        seedSubaccountPrivateKey={SEEDED_SUBACCOUNT_PRIVATE_KEY}
      />
    );

    await expectModeActive(modeButton(page, "Express"));
    await expectModeInactive(modeButton(page, "Express + One-Click"));

    const configBefore = await readLocalStorage(page, CONFIG_KEY);
    expect(configBefore).toContain(SEEDED_SUBACCOUNT_ADDRESS);

    await modeButton(page, "Express + One-Click").click();

    await expect(page.getByText("Approval signing failed")).toBeVisible();

    expect(chain.signedMessages).toHaveLength(0);
    expect(chain.rpcLog.filter((e) => e.method === "eth_sign" || e.method === "personal_sign")).toHaveLength(0);

    const typedDataRequests = chain.rpcLog.filter((e) => e.method === "eth_signTypedData_v4");
    expect(typedDataRequests).toHaveLength(1);
    expect(typedDataRequests[0].error).toBe("User rejected the request.");
    expect(chain.signedTypedData).toHaveLength(0);

    await expectModeActive(modeButton(page, "Express"));
    await expectModeInactive(modeButton(page, "Express + One-Click"));
    expect(await readLocalStorage(page, SETTLEMENT_APPROVAL_KEY)).toBeFalsy();

    expect(await readLocalStorage(page, CONFIG_KEY)).toBe(configBefore);
  });

  test("rejecting the approval signature leaves no partial state; retry with real signatures activates One-Click", async ({
    mount,
    page,
  }) => {
    const generated = await deriveGeneratedSubaccount(MOCK_ACCOUNT_PRIVATE_KEY, SUBACCOUNT_MESSAGE);

    const chain = new MockChain({
      walletPrivateKey: MOCK_ACCOUNT_PRIVATE_KEY,
      subaccountAddress: generated.address,
      onchain: { active: false },
    });
    chain.setBalance(generated.address, 2n * 10n ** 15n);
    chain.rejectTypedDataSign = true;
    await installRpcResponder(page, chain);

    await mount(<OneClickTradingModeStory expressEnabled />);

    await expectModeActive(modeButton(page, "Express"));

    await modeButton(page, "Express + One-Click").click();

    await expect(page.getByText("Session generated")).toBeVisible();
    await expect(page.getByText("Approval signing failed")).toBeVisible();

    expect(chain.signedMessages).toHaveLength(1);
    const recoveredSigner = ethers.verifyMessage(SUBACCOUNT_MESSAGE, chain.signedMessages[0].signature);
    expect(recoveredSigner).toBe(MOCK_ACCOUNT);

    await expectModeActive(modeButton(page, "Express"));
    await expectModeInactive(modeButton(page, "Express + One-Click"));
    expect(await readLocalStorage(page, CONFIG_KEY)).toBeFalsy();
    expect(await readLocalStorage(page, SETTLEMENT_APPROVAL_KEY)).toBeFalsy();
    await expect(page.getByText(/remaining in old 1CT subaccount/)).not.toBeVisible();

    chain.rejectTypedDataSign = false;

    await modeButton(page, "Express + One-Click").click();

    await expect(page.getByText("Approval signed")).toBeVisible({ timeout: 15_000 });
    await expectModeActive(modeButton(page, "Express + One-Click"));

    expect(chain.signedMessages).toHaveLength(2);

    expect(await readLocalStorage(page, CONFIG_KEY)).toContain(generated.address);

    const storedApprovalRaw = await readLocalStorage(page, SETTLEMENT_APPROVAL_KEY);
    expect(storedApprovalRaw).toBeTruthy();
    const storedApproval = JSON.parse(storedApprovalRaw!);
    expect(storedApproval.subaccount).toBe(generated.address);

    expect(chain.signedTypedData).toHaveLength(1);
    const typedDataRecord = chain.signedTypedData[0];
    const typesWithoutDomain = { ...typedDataRecord.payload.types };
    delete (typesWithoutDomain as Record<string, unknown>).EIP712Domain;
    const recoveredTypedDataSigner = ethers.verifyTypedData(
      typedDataRecord.payload.domain as ethers.TypedDataDomain,
      typesWithoutDomain,
      typedDataRecord.payload.message,
      storedApproval.signature
    );
    expect(recoveredTypedDataSigner).toBe(MOCK_ACCOUNT);
  });
});
