import { expect, type Locator } from "@playwright/test";
import { decodeFunctionData, getAddress } from "viem";

import { getAbi } from "../../../sdk/src/abis/getAbi";
import { CONTRACTS_CHAIN_IDS } from "../../../sdk/src/configs/chains";
import { getContract } from "../../../sdk/src/configs/contracts";
import type { WalletRequest } from "./injectedWallet";

// The router address identifies the chain, and with it the contracts version whose ABI encoded the batch.
function exchangeRouterAbi(to: string) {
  const chainId = CONTRACTS_CHAIN_IDS.find(
    (chainId) => getAddress(getContract(chainId, "ExchangeRouter")) === getAddress(to)
  );
  if (!chainId) throw new Error(`Expected an ExchangeRouter transaction, got one to ${to}`);
  return getAbi(chainId, "ExchangeRouter");
}

export async function inspectRejectedOrder(button: Locator, requests: WalletRequest[]) {
  await expect(button).toBeEnabled();
  await button.click();
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0].method).toBe("eth_sendTransaction");
  const tx = requests[0].params![0] as { to: string; from: string; data: string; value?: string };
  const abi = exchangeRouterAbi(tx.to);
  const root = decodeFunctionData({ abi, data: tx.data });
  if (root.functionName !== "multicall") throw new Error("Expected an application order batch");
  await expect(button).toBeEnabled();
  return { tx, calls: root.args[0].map((data) => decodeFunctionData({ abi, data })) };
}

export async function inspectRejectedCreateOrder(button: Locator, requests: WalletRequest[]) {
  const { tx, calls } = await inspectRejectedOrder(button, requests);
  const creates = calls.filter((call) => call.functionName === "createOrder");
  expect(creates).toHaveLength(1);
  const [create] = creates;
  if (create.functionName !== "createOrder") throw new Error("Expected createOrder");
  return { tx, calls, order: create.args[0] };
}
