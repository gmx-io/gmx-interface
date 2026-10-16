import assert from "node:assert/strict";
import { expect, type Page } from "@playwright/test";
import { decodeFunctionData, getAddress, hashTypedData, parseAbi, stringToHex, keccak256, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getContract } from "../../../sdk/src/configs/contracts";
import { subaccountActionCountKey, SUBACCOUNT_ORDER_ACTION } from "../../../sdk/src/configs/dataStore";
import { SUBACCOUNT_MESSAGE } from "../../../sdk/src/configs/express";
import { getSubaccountApprovalTypedData } from "../../../sdk/src/utils/subaccount/getSubaccountApprovalTypedData";
import { labelledInput, openSettings } from "../fixtures/trade";
import { USD } from "./economy";
import type { FundedSession } from "./session";
import { assertUiInventory } from "./uiOrders";
import { walletTypedData, minifiedUiTypedData } from "./uiOneClickGuard";
import type { UiWallet } from "./uiWallet";

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
  let generated = false;
  let generatedAddress: string | undefined;
  await wallet.authorize(
    activate,
    async (request) => {
      await session.gate(USD, false);
      if (request.method === "personal_sign") {
        assert.ok(!generated);
        assert.equal(request.params?.length, 2);
        assert.equal(request.params[0], stringToHex(SUBACCOUNT_MESSAGE));
        assert.equal(getAddress(String(request.params[1])), session.address);
        generated = true;
        const signature = await session.signUiMessage(request.params[0] as Hex);
        generatedAddress = privateKeyToAccount(keccak256(signature) as `0x${string}`).address;
        return signature;
      }
      assert.ok(generated);
      const typed = walletTypedData(request, session.address);
      assert.ok(generatedAddress);
      const subaccount = generatedAddress;
      assert.ok(!(await session.subaccountActive(subaccount)), "Existing 1CT authorization must not be modified");
      const now = BigInt(Math.floor(Date.now() / 1000));
      const nonce = await session.rpc.readContract({
        address: getContract(42161, "SubaccountGelatoRelayRouter"),
        abi: parseAbi(["function subaccountApprovalNonces(address) view returns(uint256)"]),
        functionName: "subaccountApprovalNonces",
        args: [session.address],
      });
      const used = await session.rpc.readContract({
        address: getContract(42161, "DataStore"),
        abi: parseAbi(["function getUint(bytes32) view returns(uint256)"]),
        functionName: "getUint",
        args: [subaccountActionCountKey(session.address, subaccount, SUBACCOUNT_ORDER_ACTION) as Hex],
      });
      let expected: ReturnType<typeof getSubaccountApprovalTypedData> | undefined;
      for (let lag = 0n; lag <= 120n; lag++) {
        const candidate = getSubaccountApprovalTypedData({
          chainId: 42161,
          subaccountAddress: subaccount,
          shouldAdd: true,
          expiresAt: now + 86400n - lag,
          maxAllowedCount: used + 2n,
          nonce,
        });
        if (hashTypedData(typed as never) === hashTypedData(minifiedUiTypedData(candidate) as never)) {
          expected = candidate;
          break;
        }
      }
      assert.ok(expected, "1CT digest differs from two actions for one day");
      if (inventory.subaccount) assert.equal(inventory.subaccount, subaccount);
      inventory.subaccount = subaccount;
      inventory.uiSubaccountInitialCount = used.toString();
      inventory.uiSubaccountApprovalHash = hashTypedData(expected as never);
      await session.save();
      return session.signUiTypedData(typed as never);
    },
    2
  );
  await expect(page.getByText("Approval signed", { exact: true })).toBeVisible();
  await expect(settings.getByText("Gas payment token", { exact: true })).toBeVisible();
  await expect(activate).toHaveClass(/border-slate-100/);
  inventory.uiOneClickAuthorized = "true";
  await session.save();
  await page.keyboard.press("Escape");
  return inventory.subaccount;
}

export async function revokeUiOneClick(session: FundedSession, wallet: UiWallet, page: Page) {
  if (await session.previousAction("ui:one-click-revoke")) return;
  const subaccount = session.active.inventory?.subaccount;
  assert.ok(subaccount && (await session.subaccountActive(subaccount)));
  const settings = await openSettings(page);
  await wallet.submit(
    {
      purpose: "one-click-revoke",
      cleanup: true,
      preflight: (state) => assertUiInventory(session, state, []),
      inspect: (tx) => {
        assert.equal(getAddress(tx.to), getAddress(getContract(42161, "SubaccountRouter")));
        assert.equal(tx.value, 0n);
        const call = decodeFunctionData({ abi: parseAbi(["function removeSubaccount(address)"]), data: tx.data });
        assert.deepEqual(call.args, [getAddress(subaccount)]);
        return { extraFeeUsd: 0n };
      },
    },
    settings.getByText("Classic", { exact: true })
  );
  assert.ok(!(await session.subaccountActive(subaccount)));
  session.active.inventory!.uiOneClickRevoked = "true";
  await session.save();
  await page.keyboard.press("Escape");
}
