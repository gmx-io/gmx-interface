import { encodeAbiParameters, encodeEventTopics, erc20Abi } from "viem";
import { describe, expect, it, vi } from "vitest";

import { getReceivedTokenAmount } from "../getReceivedTokenAmount";

const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USDG = "0x004B506865409877C9fA29bfb1ebA929984B9bbC";
const ACCOUNT = "0x1234567890abcdef1234567890abcdef12345678";
const VAULT = "0x0000000000000000000000000000000000000001";
const KEEPER = "0x0000000000000000000000000000000000000002";

const receiptLogs = vi.hoisted(() => ({ logs: [] as unknown[] }));

vi.mock("lib/wallets/walletConfig", () => ({
  getPublicClientWithRpc: () => ({
    getTransactionReceipt: async () => ({ logs: receiptLogs.logs }),
  }),
}));

function makeTransferLog(token: string, to: string, value: bigint) {
  return {
    address: token,
    topics: encodeEventTopics({ abi: erc20Abi, eventName: "Transfer", args: { from: VAULT, to } }),
    data: encodeAbiParameters([{ type: "uint256" }], [value]),
    blockHash: `0x${"0".repeat(64)}`,
    blockNumber: 1n,
    logIndex: 0,
    transactionHash: `0x${"0".repeat(64)}`,
    transactionIndex: 0,
    removed: false,
  };
}

describe("getReceivedTokenAmount", () => {
  const params = { chainId: 42161, txnHash: `0x${"0".repeat(64)}`, tokenAddress: USDG, account: ACCOUNT };

  it("sums the token transfers to the account", async () => {
    receiptLogs.logs = [
      makeTransferLog(USDG, ACCOUNT, 600_000n),
      makeTransferLog(USDG, KEEPER, 1_000n),
      makeTransferLog(USDC, ACCOUNT, 5_000_000n),
      makeTransferLog(USDG, ACCOUNT, 400_000n),
    ];

    await expect(getReceivedTokenAmount(params)).resolves.toBe(1_000_000n);
  });

  it("returns zero when the account receives none of the token", async () => {
    receiptLogs.logs = [makeTransferLog(USDG, KEEPER, 1_000n), makeTransferLog(USDC, ACCOUNT, 5_000_000n)];

    await expect(getReceivedTokenAmount(params)).resolves.toBe(0n);
  });
});
