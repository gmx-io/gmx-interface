import { expect } from "@playwright/test";
import cryptoJs from "crypto-js";
import { decodeFunctionData, encodeFunctionResult, getAddress, toFunctionSelector, zeroAddress, zeroHash } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import AbstractSubaccountApprovalNonceable from "../../../sdk/src/abis/AbstractSubaccountApprovalNonceable";
import DataStore from "../../../sdk/src/abis/DataStore";
import {
  maxAllowedSubaccountActionCountKey,
  SUBACCOUNT_ORDER_ACTION,
  subaccountActionCountKey,
  subaccountExpiresAtKey,
  subaccountIntegrationIdKey,
  subaccountListKey,
} from "../../../sdk/src/configs/dataStore";
import { RATE_LIMITED_RPC_TIMEOUT, test } from "../fixtures/accountState";

const NONCES = toFunctionSelector("subaccountApprovalNonces(address)");

test.use({ walletReviewMode: true });
test.slow();

for (const { rows, name, warning, onchain } of [
  {
    rows: "14.15",
    name: "time limit expired",
    warning: "One-Click Trading time limit expired. You're now using Express Trading.",
    onchain: { expiresAt: -3600n, maxAllowedCount: 90n, currentActionsCount: 3n },
  },
  {
    rows: "14.16",
    name: "action limit reached",
    warning: "One-Click Trading action limit reached. You're now using Express Trading.",
    onchain: { expiresAt: 86_400n, maxAllowedCount: 5n, currentActionsCount: 5n },
  },
]) {
  test(`${rows} an active One-Click session with its ${name} on chain warns in the trade box and Re-enable asks the wallet for a new approval signature`, async ({
    page,
    context,
    accountState,
    chainId,
    walletReviews,
  }) => {
    const privateKey = generatePrivateKey();
    const subaccount = privateKeyToAccount(privateKey).address;
    const account = accountState.address;
    const now = BigInt(Math.floor(Date.now() / 1000));
    const uints = new Map([
      [maxAllowedSubaccountActionCountKey(account, subaccount, SUBACCOUNT_ORDER_ACTION), onchain.maxAllowedCount],
      [subaccountActionCountKey(account, subaccount, SUBACCOUNT_ORDER_ACTION), onchain.currentActionsCount],
      [subaccountExpiresAtKey(account, subaccount, SUBACCOUNT_ORDER_ACTION), now + onchain.expiresAt],
    ]);
    accountState.balances.set(accountState.data.collateral.address, 100n * 10n ** 6n);
    accountState.balances.set(zeroAddress, 10n ** 17n);
    accountState.contractRead = (_target, data) => {
      if (data.startsWith(NONCES)) {
        const { args } = decodeFunctionData({ abi: AbstractSubaccountApprovalNonceable, data });
        if (getAddress(args[0]) !== account) return;
        return encodeFunctionResult({
          abi: AbstractSubaccountApprovalNonceable,
          functionName: "subaccountApprovalNonces",
          result: 0n,
        });
      }
      try {
        const call = decodeFunctionData({ abi: DataStore, data });
        if (call.functionName === "containsAddress" && call.args[0] === subaccountListKey(account))
          return encodeFunctionResult({
            abi: DataStore,
            functionName: "containsAddress",
            result: getAddress(call.args[1]) === subaccount,
          });
        if (call.functionName === "getUint" && uints.has(call.args[0]))
          return encodeFunctionResult({ abi: DataStore, functionName: "getUint", result: uints.get(call.args[0])! });
        if (call.functionName === "getBytes32" && call.args[0] === subaccountIntegrationIdKey(account, subaccount))
          return encodeFunctionResult({ abi: DataStore, functionName: "getBytes32", result: zeroHash });
      } catch {
        return undefined;
      }
    };
    // The app stores the subaccount key encrypted with the main account address.
    await context.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
      key: JSON.stringify([chainId, account, "one-click-trading-config"]),
      value: JSON.stringify({
        address: subaccount,
        privateKey: cryptoJs.AES.encrypt(privateKey, account).toString(),
        isNew: true,
      }),
    });
    await accountState.connect(page);
    await page.getByTestId("margin-input").fill("10");
    await expect(page.getByText(warning)).toBeVisible({ timeout: RATE_LIMITED_RPC_TIMEOUT });
    await page.getByRole("button", { name: "Re-enable", exact: true }).click();
    // Re-enabling re-reads the subaccount state before the signature request.
    await expect.poll(() => walletReviews.length, { timeout: RATE_LIMITED_RPC_TIMEOUT }).toBe(1);
    const [request] = walletReviews;
    expect(request.method).toBe("eth_signTypedData_v4");
    expect(getAddress(request.params![0] as string)).toBe(account);
    // The subaccount approval is signed as a minified EIP-712 digest.
    expect(JSON.parse(request.params![1] as string).message.digest).toMatch(/^0x[\da-f]{64}$/i);
    await expect(page.getByText(warning)).toBeVisible();
  });
}
