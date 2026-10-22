import { expect, type Locator } from "@playwright/test";
import { decodeFunctionData } from "viem";

import ExchangeRouter from "../../../sdk/src/abis/ExchangeRouter";
import type { WalletRequest } from "./injectedWallet";

export async function inspectRejectedOrder(button: Locator, requests: WalletRequest[]) {
  await expect(button).toBeEnabled();
  await button.click();
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0].method).toBe("eth_sendTransaction");
  const tx = requests[0].params![0] as { to: string; from: string; data: string; value?: string };
  const root = decodeFunctionData({ abi: ExchangeRouter, data: tx.data });
  if (root.functionName !== "multicall") throw new Error("Expected an application order batch");
  await expect(button).toBeEnabled();
  return { tx, calls: root.args[0].map((data) => decodeFunctionData({ abi: ExchangeRouter, data })) };
}

export async function inspectRejectedCreateOrder(button: Locator, requests: WalletRequest[]) {
  const { tx, calls } = await inspectRejectedOrder(button, requests);
  const creates = calls.filter((call) => call.functionName === "createOrder");
  expect(creates).toHaveLength(1);
  const [create] = creates;
  if (create.functionName !== "createOrder") throw new Error("Expected createOrder");
  return { tx, calls, order: create.args[0] };
}
