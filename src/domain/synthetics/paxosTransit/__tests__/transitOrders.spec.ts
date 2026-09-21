import { encodeAbiParameters, encodeEventTopics, getAbiItem } from "viem";
import { describe, expect, it, vi } from "vitest";

import { abis } from "sdk/abis";
import type { TransitOrder, TransitOrderStatus } from "sdk/utils/paxos/types";

import { findPendingTransitOrder, getSubmittedTransitOrderId } from "../transitOrders";

const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USDG = "0x004B506865409877C9fA29bfb1ebA929984B9bbC";
const STATION = "0x49AAA987b1a7e9E4AE091dcD8332c39F322D7d28";
const USER = "0x1234567890abcdef1234567890abcdef12345678";
const ORDER_ID = "0x1111111111111111111111111111111111111111111111111111111111111111";

const receiptLogs = vi.hoisted(() => ({ logs: [] as unknown[] }));

vi.mock("lib/wallets/walletConfig", () => ({
  getPublicClientWithRpc: () => ({
    getTransactionReceipt: async () => ({ logs: receiptLogs.logs }),
  }),
}));

function makeOrderSubmittedLog(address: string) {
  const event = getAbiItem({ abi: abis.TransitStation, name: "OrderSubmitted" });
  const dataInputs = event.inputs.filter((input) => !input.indexed);
  const quote = {
    route: { destEID: 30110, offerAsset: USDC, wantAsset: USDG },
    offerAmount: 1_000_000n,
    receiver: USER,
    protocolFee: 0n,
    integratorFee: 0n,
    integratorFeeReceiver: USER,
    distributorCode: `0x${"0".repeat(64)}`,
    deadline: 0n,
    salt: `0x${"0".repeat(64)}`,
  } as const;

  return {
    address,
    topics: encodeEventTopics({
      abi: abis.TransitStation,
      eventName: "OrderSubmitted",
      args: { uuid: ORDER_ID, user: USER, distributorCode: `0x${"0".repeat(64)}` },
    }),
    data: encodeAbiParameters(dataInputs, [30110, quote]),
    blockHash: `0x${"0".repeat(64)}`,
    blockNumber: 1n,
    logIndex: 0,
    transactionHash: `0x${"0".repeat(64)}`,
    transactionIndex: 0,
    removed: false,
  };
}

function makeOrder(id: string, overrides: Partial<TransitOrder> = {}): TransitOrder {
  return {
    id,
    offerAsset: USDC.toLowerCase(),
    wantAsset: USDG.toLowerCase(),
    amountDue: 0n,
    remainingAmountDue: 0n,
    offerAmount: 1_000_000n,
    receiver: "0x1",
    distributorCode: "0x",
    destinationChainId: 42161,
    sourceChainId: 42161,
    receiveTime: 0,
    status: "PENDING_BRIDGE" as TransitOrderStatus,
    user: "0x1",
    createdAt: "",
    updatedAt: "",
    tokenMetadata: {},
    orderExecuteds: [],
    ...overrides,
  };
}

describe("findPendingTransitOrder", () => {
  it("finds an unfinished USDC to USDG order", () => {
    const orders = [makeOrder("0xdone", { status: "PROCESSED" }), makeOrder("0xpending", { status: "PROCESSING" })];

    expect(findPendingTransitOrder(orders, { offerAsset: USDC, wantAsset: USDG })?.id).toBe("0xpending");
  });

  it("ignores finished and removed orders", () => {
    const orders = [makeOrder("0xdone", { status: "PROCESSED" }), makeOrder("0xremoved", { status: "REMOVED" })];

    expect(findPendingTransitOrder(orders, { offerAsset: USDC, wantAsset: USDG })).toBeUndefined();
  });
});

describe("getSubmittedTransitOrderId", () => {
  const params = { chainId: 42161, txnHash: `0x${"0".repeat(64)}`, stationAddress: STATION };

  it("reads the order id from the station's OrderSubmitted event", async () => {
    receiptLogs.logs = [makeOrderSubmittedLog(STATION)];

    expect(await getSubmittedTransitOrderId(params)).toBe(ORDER_ID);
  });

  it("ignores OrderSubmitted events from other contracts", async () => {
    receiptLogs.logs = [makeOrderSubmittedLog(USDC)];

    expect(await getSubmittedTransitOrderId(params)).toBeUndefined();
  });
});
