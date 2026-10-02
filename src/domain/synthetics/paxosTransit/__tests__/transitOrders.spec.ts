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

const rpc = vi.hoisted(() => ({ logs: [] as ReturnType<typeof makeOrderSubmittedLog>[], missingReceiptCount: 0 }));

vi.mock("lib/wallets/walletConfig", async () => {
  const { createPublicClient, custom, numberToHex } = await import("viem");

  const toRpcLog = (log: ReturnType<typeof makeOrderSubmittedLog>) => ({
    ...log,
    blockNumber: numberToHex(log.blockNumber),
    logIndex: numberToHex(log.logIndex),
    transactionIndex: numberToHex(log.transactionIndex),
  });

  const request = async ({ method, params }: { method: string; params: [string] }) => {
    const hash = params?.[0];

    if (method === "eth_blockNumber") return "0x2";

    if (method === "eth_getTransactionByHash") {
      return { hash, blockNumber: "0x1", blockHash: `0x${"0".repeat(64)}`, transactionIndex: "0x0", nonce: "0x0" };
    }

    if (method === "eth_getTransactionReceipt") {
      if (rpc.missingReceiptCount > 0) {
        rpc.missingReceiptCount -= 1;
        return null;
      }

      return {
        transactionHash: hash,
        blockHash: `0x${"0".repeat(64)}`,
        blockNumber: "0x1",
        transactionIndex: "0x0",
        status: "0x1",
        logs: rpc.logs.map(toRpcLog),
      };
    }

    throw new Error(`unexpected ${method}`);
  };

  const client = createPublicClient({ transport: custom({ request }), pollingInterval: 1 });

  return { getPublicClientWithRpc: () => client };
});

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
  it("finds an unfinished order in the requested direction", () => {
    const orders = [
      makeOrder("0xsell", { offerAsset: USDG.toLowerCase(), wantAsset: USDC.toLowerCase(), status: "PROCESSING" }),
      makeOrder("0xdone", { status: "PROCESSED" }),
      makeOrder("0xbridging", { status: "PENDING_BRIDGE" }),
      makeOrder("0xprocessing", { status: "PROCESSING" }),
    ];

    expect(findPendingTransitOrder(orders, { offerAsset: USDC, wantAsset: USDG })?.id).toBe("0xbridging");
    expect(findPendingTransitOrder(orders, { offerAsset: USDG, wantAsset: USDC })?.id).toBe("0xsell");
  });

  it("ignores finished and removed orders", () => {
    const orders = [makeOrder("0xdone", { status: "PROCESSED" }), makeOrder("0xremoved", { status: "REMOVED" })];

    expect(findPendingTransitOrder(orders, { offerAsset: USDC, wantAsset: USDG })).toBeUndefined();
  });
});

describe("getSubmittedTransitOrderId", () => {
  const params = { chainId: 42161, txnHash: `0x${"0".repeat(64)}`, stationAddress: STATION };

  it("reads the order id from the station's OrderSubmitted event", async () => {
    rpc.logs = [makeOrderSubmittedLog(STATION)];

    expect(await getSubmittedTransitOrderId(params)).toBe(ORDER_ID);
  });

  it("ignores OrderSubmitted events from other contracts", async () => {
    rpc.logs = [makeOrderSubmittedLog(USDC)];

    expect(await getSubmittedTransitOrderId(params)).toBeUndefined();
  });

  it("waits for the receipt when the RPC has not indexed the transaction yet", async () => {
    rpc.logs = [makeOrderSubmittedLog(STATION)];
    rpc.missingReceiptCount = 1;

    expect(await getSubmittedTransitOrderId(params)).toBe(ORDER_ID);
  });
});
