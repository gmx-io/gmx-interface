import assert from "node:assert/strict";
import { expect, type Page } from "@playwright/test";
import { decodeFunctionData, getAddress, hashTypedData, parseAbi, toHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getContract } from "../../../sdk/src/configs/contracts";
import {
  subaccountActionCountKey,
  SUBACCOUNT_ORDER_ACTION,
  subaccountRevocationCounterKey,
} from "../../../sdk/src/configs/dataStore";
import { getSubaccountApprovalTypedData } from "../../../sdk/src/utils/subaccount/getSubaccountApprovalTypedData";
import { closeSettings, labelledInput, openSettings, SELECTED_TRADING_MODE, tradingMode } from "../fixtures/trade";
import { USD } from "./economy";
import type { FundedSession } from "./session";
import { assertUiInventory } from "./uiOrders";
import {
  minifiedUiTypedData,
  refuseUiOneClickRemoval,
  uiOneClickRemovalRefused,
  walletTypedData,
} from "./uiOneClickGuard";
import type { UiActionPlan, UiWallet } from "./uiWallet";

export async function activateUiOneClick(session: FundedSession, wallet: UiWallet, page: Page) {
  const inventory = (session.active.inventory ??= {});
  if (inventory.uiOneClickAuthorized === "true") return inventory.subaccount;
  assert.ok(!session.active.actions.some((a) => a.uiRelay), "Do not reactivate a used session on retry");
  assertUiInventory(session, await session.snapshot(), []);
  const settings = await openSettings(page);
  await settings.getByText("One-Click settings", { exact: true }).click();
  await labelledInput(settings, "Allowed actions").fill("2");
  await labelledInput(settings, "Time limit").fill("1");
  await settings.getByRole("button", { name: "Save settings", exact: true }).click();
  const activate = settings
    .locator("div.min-h-66")
    .filter({ has: page.getByText("Express + One-Click", { exact: true }) });
  // The wallet only sees the digest of an approval for a fresh random key, so the key is recovered from the
  // randomness the page draws during activation to check that digest before signing.
  await recordPageRandomness(page);
  try {
    await wallet.authorize(
      activate,
      async (request) => {
        await session.gate(USD, false);
        const typed = walletTypedData(request, session.address);
        const now = BigInt(Math.floor(Date.now() / 1000));
        const nonce = await session.rpc.readContract({
          address: getContract(42161, "SubaccountGelatoRelayRouter"),
          abi: parseAbi(["function subaccountApprovalNonces(address) view returns(uint256)"]),
          functionName: "subaccountApprovalNonces",
          args: [session.address],
        });
        let subaccount: string | undefined;
        let expected: ReturnType<typeof getSubaccountApprovalTypedData> | undefined;
        search: for (const address of generatedKeyAddresses(await readPageRandomness(page))) {
          for (let lag = 0n; lag <= 120n; lag++) {
            // A fresh key has no actions or revocations on chain; both are checked below.
            const candidate = getSubaccountApprovalTypedData({
              chainId: 42161,
              subaccountAddress: address,
              shouldAdd: true,
              expiresAt: now + 86400n - lag,
              maxAllowedCount: 2n,
              nonce,
              account: session.address,
              revocationCounter: 0n,
            });
            if (hashTypedData(typed as never) === hashTypedData(minifiedUiTypedData(candidate) as never)) {
              subaccount = address;
              expected = candidate;
              break search;
            }
          }
        }
        assert.ok(subaccount && expected, "1CT digest differs from two actions for one day with a fresh key");
        session.followUiSubaccount(subaccount);
        assert.ok(!(await session.subaccountActive(subaccount)), "Existing 1CT authorization must not be modified");
        const dataStoreUint = (key: string) =>
          session.rpc.readContract({
            address: getContract(42161, "DataStore"),
            abi: parseAbi(["function getUint(bytes32) view returns(uint256)"]),
            functionName: "getUint",
            args: [key as Hex],
          });
        const used = await dataStoreUint(
          subaccountActionCountKey(session.address, subaccount, SUBACCOUNT_ORDER_ACTION)
        );
        const revocationCounter = await dataStoreUint(subaccountRevocationCounterKey(session.address, subaccount));
        assert.ok(used === 0n && revocationCounter === 0n, "Generated 1CT key was already used on chain");
        inventory.subaccount = subaccount;
        inventory.uiSubaccountInitialCount = used.toString();
        inventory.uiSubaccountApprovalHash = hashTypedData(expected as never);
        await session.save();
        return session.signUiTypedData(typed as never);
      },
      1
    );
  } finally {
    await stopPageRandomness(page);
  }
  await expect(page.getByText("Approval signed", { exact: true })).toBeVisible();
  await expect(settings.getByText("Gas payment token", { exact: true })).toBeVisible();
  await expect(activate).toHaveClass(/border-slate-100/);
  inventory.uiOneClickAuthorized = "true";
  await session.save();
  await closeSettings(page, settings);
  return inventory.subaccount;
}

export async function revokeUiOneClick(session: FundedSession, wallet: UiWallet, page: Page) {
  if (await session.previousAction("ui:one-click-revoke")) return;
  const subaccount = session.active.inventory?.subaccount;
  assert.ok(subaccount && (await session.subaccountActive(subaccount)));
  const settings = await openSettings(page);
  const refusal = refuseUiOneClickRemoval(session.address);
  const classic = settings.getByText("Classic", { exact: true });
  const deactivationToasts = page.getByText("Deactivate 1CT", { exact: true });
  let deactivations = 0;
  const plan: UiActionPlan = {
    purpose: "one-click-revoke",
    cleanup: true,
    preflight: (state) => assertUiInventory(session, state, []),
    // The app ignores a mode click while the previous change is still settling; a taken click opens a new
    // "Deactivate 1CT" toast, or selects Classic when it finishes without one.
    beforeClick: async () => {
      deactivations = await deactivationToasts.count();
    },
    afterClick: async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await expect
            .poll(
              async () =>
                (await deactivationToasts.count()) > deactivations ||
                SELECTED_TRADING_MODE.test((await tradingMode(settings, "Classic").getAttribute("class")) ?? ""),
              { timeout: 5_000 }
            )
            .toBe(true);
          return;
        } catch {
          await classic.click();
        }
      }
      throw new Error("Settings ignored the Classic mode click");
    },
    sign: refusal.sign,
    inspect: (tx) => {
      assert.equal(getAddress(tx.to), getAddress(getContract(42161, "SubaccountRouter")));
      assert.equal(tx.value, 0n);
      const call = decodeFunctionData({ abi: parseAbi(["function removeSubaccount(address)"]), data: tx.data });
      assert.deepEqual(call.args, [getAddress(subaccount)]);
      return { extraFeeUsd: 0n };
    },
  };
  try {
    await wallet.submit(plan, classic);
  } catch (error) {
    if (!refusal.refused || (error as Error).message !== uiOneClickRemovalRefused) throw error;
    // The failure text shows once the failed change has settled; afterClick repeats a click the app still ignored.
    await expect(page.getByText("Retry to deactivate with a wallet transaction.")).toBeVisible();
    await wallet.submit(plan, classic);
  }
  assert.ok(!(await session.subaccountActive(subaccount)));
  session.active.inventory!.uiOneClickRevoked = "true";
  await session.save();
  if (refusal.problem) throw new Error(refusal.problem);
  await closeSettings(page, settings);
}

type RandomnessWindow = { __regressionRandomness?: number[][]; __stopRegressionRandomness?: () => void };

const SECP256K1_ORDER = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

function recordPageRandomness(page: Page) {
  return page.evaluate(() => {
    const target = window as unknown as RandomnessWindow;
    const original = crypto.getRandomValues;
    const draws: number[][] = [];
    target.__regressionRandomness = draws;
    crypto.getRandomValues = function (array: Uint8Array) {
      const result = original.call(crypto, array);
      if (result?.byteLength === 48) draws.push(Array.from(new Uint8Array(result.buffer, result.byteOffset, 48)));
      return result;
    } as unknown as typeof crypto.getRandomValues;
    target.__stopRegressionRandomness = () => {
      crypto.getRandomValues = original;
    };
  });
}

function readPageRandomness(page: Page) {
  return page.evaluate(() => (window as unknown as RandomnessWindow).__regressionRandomness ?? []);
}

function stopPageRandomness(page: Page) {
  return page.evaluate(() => (window as unknown as RandomnessWindow).__stopRegressionRandomness?.());
}

// viem's generatePrivateKey maps 48 random bytes onto the curve order (noble's randomPrivateKey).
function generatedKeyAddresses(draws: number[][]) {
  return draws.map((bytes) => {
    const scalar = (BigInt(toHex(Uint8Array.from(bytes))) % (SECP256K1_ORDER - 1n)) + 1n;
    return privateKeyToAccount(toHex(scalar, { size: 32 })).address;
  });
}
