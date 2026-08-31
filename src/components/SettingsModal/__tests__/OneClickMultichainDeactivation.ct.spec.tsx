import type { Locator } from "@playwright/experimental-ct-core";
import { test, expect } from "@playwright/experimental-ct-react";
import { ethers } from "ethers";

import { getSubaccountApprovalKey, getSubaccountConfigKey } from "config/localStorage";
import {
  ARBITRUM_CONTRACTS,
  MOCK_ACCOUNT_PRIVATE_KEY,
  MockChain,
  MockGelatoRelay,
  SEEDED_SUBACCOUNT_ADDRESS,
  SEEDED_SUBACCOUNT_PRIVATE_KEY,
} from "domain/testUtils/rpc/mockChain";
import { assertNoRpcHoles, installRpcResponder } from "domain/testUtils/rpc/playwrightAdapter";
import MultichainSubaccountRouterAbi from "sdk/abis/MultichainSubaccountRouter";
import { ARBITRUM, SOURCE_BASE_MAINNET } from "sdk/configs/chainIds";
import { getWrappedToken } from "sdk/configs/tokens";

import { OneClickMultichainDeactivationStory } from "./OneClickMultichainDeactivation.ct.stories";

const MOCK_ACCOUNT = new ethers.Wallet(MOCK_ACCOUNT_PRIVATE_KEY).address;

const FAR_FUTURE = 9999999999n;

const ARBITRUM_WETH_ADDRESS = getWrappedToken(ARBITRUM).address;

const MULTICHAIN_SUBACCOUNT_ROUTER_IFACE = new ethers.Interface(MultichainSubaccountRouterAbi as ethers.InterfaceAbi);
const REMOVE_SUBACCOUNT_SELECTOR = MULTICHAIN_SUBACCOUNT_ROUTER_IFACE.getFunction("removeSubaccount")!.selector;

function extractRelayedCallData(taskData: string): string {
  return taskData.slice(0, taskData.length - 144);
}

const CONFIG_KEY = getSubaccountConfigKey(ARBITRUM, MOCK_ACCOUNT);
const SETTLEMENT_APPROVAL_KEY = getSubaccountApprovalKey(ARBITRUM, MOCK_ACCOUNT, undefined);
const BASE_APPROVAL_KEY = getSubaccountApprovalKey(ARBITRUM, MOCK_ACCOUNT, SOURCE_BASE_MAINNET);

test.setTimeout(90_000);

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

function countSignatureRequests(chain: MockChain): number {
  return chain.rpcLog.filter(
    (e) => e.method === "eth_signTypedData_v4" || e.method === "eth_sign" || e.method === "personal_sign"
  ).length;
}

test.describe("Trading Settings: multichain Express+1CT -> Express deactivation (FEDEV-2133)", () => {
  test("with an empty GMX Account the deactivation fails fast before any signature; depositing and retrying deactivates via the relay", async ({
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
    const gelatoRelay = new MockGelatoRelay(chain);
    gelatoRelay.simulateInsufficientBalanceForToken = ARBITRUM_WETH_ADDRESS;
    await installRpcResponder(page, chain, { gelatoRelay });

    // the rollout pins express to GMX Relay; this spec is about the deactivation UX, and its
    // harness speaks Gelato — route through the incident switch until the sunset cleanup moves
    // the harness onto /v1/relay/*
    await page.evaluate(() => {
      localStorage.setItem(
        "api-ui-flags-cache-v2-42161",
        JSON.stringify({ forceGelatoFallback: { enabled: true, createdAt: "", updatedAt: "" } })
      );
    });

    await mount(
      <OneClickMultichainDeactivationStory
        seedSubaccountAddress={SEEDED_SUBACCOUNT_ADDRESS}
        seedSubaccountPrivateKey={SEEDED_SUBACCOUNT_PRIVATE_KEY}
      />
    );

    await expectModeActive(modeButton(page, "Express + One-Click"));

    const configBefore = await readLocalStorage(page, CONFIG_KEY);
    expect(configBefore).toContain(SEEDED_SUBACCOUNT_ADDRESS);

    await modeButton(page, "Express").click();

    await expect(page.getByText("Deactivation failed")).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText(
        "Insufficient gas payment token balance in your GMX Account to cover network fees. Deposit funds and retry."
      )
    ).toBeVisible();

    expect(countSignatureRequests(chain)).toBe(0);
    expect(chain.signedTypedData).toHaveLength(0);
    expect(chain.signedMessages).toHaveLength(0);
    expect(chain.sentTransactions).toHaveLength(0);
    expect(gelatoRelay.sentTransactions).toHaveLength(0);

    await expectModeActive(modeButton(page, "Express + One-Click"));
    await expectModeInactive(modeButton(page, "Express"));
    expect(await readLocalStorage(page, CONFIG_KEY)).toBe(configBefore);

    await page.locator('[data-qa="deposit-gas-payment-token"]').click();
    gelatoRelay.simulateInsufficientBalanceForToken = undefined;

    await modeButton(page, "Express").click();

    await expect(page.getByText("Deactivated")).toBeVisible({ timeout: 30_000 });

    expect(chain.sentTransactions).toHaveLength(0);
    expect(gelatoRelay.sentTransactions).toHaveLength(1);
    expect(ethers.getAddress(gelatoRelay.sentTransactions[0].to)).toBe(ARBITRUM_CONTRACTS.MultichainSubaccountRouter);
    expect(gelatoRelay.sentTransactions[0].data.startsWith(REMOVE_SUBACCOUNT_SELECTOR)).toBe(true);
    expect(gelatoRelay.sentTransactions[0].chainId).toBe(String(ARBITRUM));

    const relayedCallData = extractRelayedCallData(gelatoRelay.sentTransactions[0].data);
    const decodedRemoveCall = MULTICHAIN_SUBACCOUNT_ROUTER_IFACE.decodeFunctionData(
      "removeSubaccount",
      relayedCallData
    );
    const [decodedRelayParams, decodedAccount, decodedSrcChainId, decodedSubaccount] = decodedRemoveCall;
    expect(ethers.getAddress(decodedAccount)).toBe(MOCK_ACCOUNT);
    expect(decodedSrcChainId).toBe(BigInt(SOURCE_BASE_MAINNET));
    expect(ethers.getAddress(decodedSubaccount)).toBe(SEEDED_SUBACCOUNT_ADDRESS);

    expect(countSignatureRequests(chain)).toBe(1);
    expect(chain.signedTypedData).toHaveLength(1);
    const typedDataRecord = chain.signedTypedData[0];
    expect(typedDataRecord.payload.primaryType).toBe("Minified");
    const signedDomain = typedDataRecord.payload.domain as {
      chainId?: number | string;
      verifyingContract?: string;
    };
    expect(signedDomain.chainId?.toString()).toBe(String(SOURCE_BASE_MAINNET));
    expect(signedDomain.verifyingContract && ethers.getAddress(signedDomain.verifyingContract)).toBe(
      ARBITRUM_CONTRACTS.MultichainSubaccountRouter
    );
    expect(decodedRelayParams.signature).toBe(typedDataRecord.signature);

    const typesWithoutDomain = { ...typedDataRecord.payload.types };
    delete (typesWithoutDomain as Record<string, unknown>).EIP712Domain;
    const recoveredSigner = ethers.verifyTypedData(
      typedDataRecord.payload.domain as ethers.TypedDataDomain,
      typesWithoutDomain,
      typedDataRecord.payload.message,
      typedDataRecord.signature
    );
    expect(recoveredSigner).toBe(MOCK_ACCOUNT);

    await expectModeActive(modeButton(page, "Express"));
    await expectModeInactive(modeButton(page, "Express + One-Click"));

    expect(await readLocalStorage(page, CONFIG_KEY)).not.toContain(SEEDED_SUBACCOUNT_ADDRESS);
    expect(await readLocalStorage(page, SETTLEMENT_APPROVAL_KEY)).toBeFalsy();
    expect(await readLocalStorage(page, BASE_APPROVAL_KEY)).toBeFalsy();
  });
});
