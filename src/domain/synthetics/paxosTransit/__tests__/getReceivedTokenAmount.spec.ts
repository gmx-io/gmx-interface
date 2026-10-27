import { encodeAbiParameters, encodeEventTopics, erc20Abi, pad } from "viem";
import { describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { abis } from "sdk/abis";

import { getReceivedTokenAmount } from "../getReceivedTokenAmount";

const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USDG = "0x004B506865409877C9fA29bfb1ebA929984B9bbC";
const ACCOUNT = "0x1234567890abcdef1234567890abcdef12345678";
const VAULT = "0x0000000000000000000000000000000000000001";
const KEEPER = "0x0000000000000000000000000000000000000002";
const EVENT_EMITTER = "0xC8ee91A54287DB53897056e12D9819156D3822Fb";

const receiptLogs = vi.hoisted(() => ({ logs: [] as unknown[] }));

vi.mock("lib/wallets/walletConfig", () => ({
  getPublicClientWithRpc: () => ({
    waitForTransactionReceipt: async () => ({ logs: receiptLogs.logs }),
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

const eventLog1 = abis.EventEmitter.find((item) => item.type === "event" && item.name === "EventLog1")!;

function makeMultichainTransferInLog(account: string, token: string, amount: bigint) {
  const noItems = { items: [], arrayItems: [] };
  const eventData = {
    addressItems: {
      items: [
        { key: "token", value: token },
        { key: "account", value: account },
      ],
      arrayItems: [],
    },
    uintItems: { items: [{ key: "amount", value: amount }], arrayItems: [] },
    intItems: noItems,
    boolItems: noItems,
    bytes32Items: noItems,
    bytesItems: noItems,
    stringItems: noItems,
  };

  return {
    ...makeTransferLog(token, account, 0n),
    address: EVENT_EMITTER,
    topics: encodeEventTopics({
      abi: abis.EventEmitter,
      eventName: "EventLog1",
      args: { eventNameHash: "MultichainTransferIn", topic1: pad(account as `0x${string}`) },
    }),
    data: encodeAbiParameters(
      eventLog1.inputs.filter((input) => !("indexed" in input && input.indexed)),
      [VAULT, "MultichainTransferIn", eventData]
    ),
  };
}

describe("getReceivedTokenAmount", () => {
  const params: Parameters<typeof getReceivedTokenAmount>[0] = {
    chainId: ARBITRUM,
    txnHash: `0x${"0".repeat(64)}`,
    tokenAddress: USDG,
    account: ACCOUNT,
  };

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

  it("reads a GMX Account credit from the multichain vault's transfer-in events", async () => {
    receiptLogs.logs = [
      makeMultichainTransferInLog(ACCOUNT, USDG, 990_000n),
      makeMultichainTransferInLog(KEEPER, USDG, 1_000n),
      makeTransferLog(USDG, ACCOUNT, 5_000_000n),
    ];

    await expect(getReceivedTokenAmount({ ...params, isGmxAccount: true })).resolves.toBe(990_000n);
  });
});
