import { test, expect } from "@playwright/experimental-ct-react";
import { ethers } from "ethers";

import { getSubaccountApprovalKey } from "config/localStorage";
import {
  installMockChain,
  MOCK_ACCOUNT_PRIVATE_KEY,
  MockChain,
  SEEDED_SUBACCOUNT_ADDRESS,
  SEEDED_SUBACCOUNT_PRIVATE_KEY,
} from "domain/testUtils/oneClickCtRpcHarness";

import { OneClickNetworkSwitchStory } from "./OneClickNetworkSwitch.ct.stories";

const ARBITRUM = 42161;
const SOURCE_BASE_MAINNET = 8453;
const MOCK_ACCOUNT = new ethers.Wallet(MOCK_ACCOUNT_PRIVATE_KEY).address;

const SLOT_A_KEY = getSubaccountApprovalKey(ARBITRUM, MOCK_ACCOUNT, undefined);
const SLOT_B_KEY = getSubaccountApprovalKey(ARBITRUM, MOCK_ACCOUNT, SOURCE_BASE_MAINNET);

const ANOTHER_NETWORK_WARNING = /One-Click Trading needs a one-time signature for the current network/;

test.setTimeout(60_000);

type PageLike = {
  evaluate: <R, Arg>(fn: (arg: Arg) => R, arg: Arg) => Promise<R>;
};

function readLocalStorage(page: PageLike, key: unknown): Promise<string | null> {
  return page.evaluate((k: string) => localStorage.getItem(k), JSON.stringify(key));
}

test.describe("One-Click approval slots on source-network switch (FEDEV-2334)", () => {
  test("switching the source network shows the re-sign warning; re-signing writes its own slot and keeps the other one", async ({
    mount,
    page,
  }) => {
    const chain = new MockChain({
      walletPrivateKey: MOCK_ACCOUNT_PRIVATE_KEY,
      subaccountAddress: SEEDED_SUBACCOUNT_ADDRESS,
      onchain: { active: false },
    });
    await installMockChain(page, chain);

    await mount(
      <OneClickNetworkSwitchStory
        seedSubaccountAddress={SEEDED_SUBACCOUNT_ADDRESS}
        seedSubaccountPrivateKey={SEEDED_SUBACCOUNT_PRIVATE_KEY}
      />
    );

    await expect(page.locator('[data-qa="margin-input"]')).toBeVisible();
    await expect(page.getByText(ANOTHER_NETWORK_WARNING)).not.toBeVisible();

    const slotABefore = await readLocalStorage(page, SLOT_A_KEY);
    expect(slotABefore).toContain(SEEDED_SUBACCOUNT_ADDRESS);
    expect(await readLocalStorage(page, SLOT_B_KEY)).toBeNull();

    await page.locator('[data-qa="switch-to-base"]').click();

    await expect(page.getByText(ANOTHER_NETWORK_WARNING)).toBeVisible({ timeout: 15_000 });

    await page.getByText("Re-sign", { exact: true }).click();

    await expect(page.getByText("Settings updated")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(ANOTHER_NETWORK_WARNING)).not.toBeVisible();

    const slotBRaw = await readLocalStorage(page, SLOT_B_KEY);
    expect(slotBRaw).toBeTruthy();
    const slotB = JSON.parse(slotBRaw!);
    expect(slotB.subaccount).toBe(SEEDED_SUBACCOUNT_ADDRESS);
    expect(slotB.signatureChainId).toBe(SOURCE_BASE_MAINNET);

    expect(chain.signedTypedData).toHaveLength(1);
    const typedDataRecord = chain.signedTypedData[0];
    expect((typedDataRecord.payload.domain as { chainId?: number | string }).chainId?.toString()).toBe(
      String(SOURCE_BASE_MAINNET)
    );
    const typesWithoutDomain = { ...typedDataRecord.payload.types };
    delete (typesWithoutDomain as Record<string, unknown>).EIP712Domain;
    const recoveredSigner = ethers.verifyTypedData(
      typedDataRecord.payload.domain as ethers.TypedDataDomain,
      typesWithoutDomain,
      typedDataRecord.payload.message,
      slotB.signature
    );
    expect(recoveredSigner).toBe(MOCK_ACCOUNT);

    expect(await readLocalStorage(page, SLOT_A_KEY)).toBe(slotABefore);
  });
});
