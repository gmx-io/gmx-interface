import { isAddressEqual } from "viem";

import type {
  TransitOrder,
  TransitOrderExecution,
  TransitOrderStatus,
  TransitQuoteParams,
} from "sdk/utils/paxos/types";

import type { TransitApi } from "./types";

const MOCK_STATION_ADDRESS = "0x000000000000000000000000000000000000dEaD";
const PENDING_MS = 3_000;
const PARTIAL_FILL_MS = 4_000;
const PROCESSING_MS = 9_000;

export const MOCK_CONVERSION_MS = PROCESSING_MS;
const MOCK_FEE_BPS = 1n;
const MOCK_ZERO_FEE_CAPACITY = 750_000n * 10n ** 6n;

function getMockFee({ offerAmount, feeTier }: TransitQuoteParams) {
  return feeTier === "zeroFee" ? 0n : (offerAmount * MOCK_FEE_BPS) / 10_000n;
}

type MockOrder = { params: TransitQuoteParams; id: string; submittedAt: number };

const MOCK_ORDERS_KEY = "debug-paxos-transit-mock-orders";

function readMockOrders(): MockOrder[] {
  try {
    return JSON.parse(sessionStorage.getItem(MOCK_ORDERS_KEY) ?? "[]", (key, value) =>
      key === "offerAmount" ? BigInt(value) : value
    );
  } catch {
    return [];
  }
}

function writeMockOrders(orders: MockOrder[]) {
  try {
    sessionStorage.setItem(
      MOCK_ORDERS_KEY,
      JSON.stringify(orders, (key, value) => (typeof value === "bigint" ? value.toString() : value))
    );
  } catch {
    // preview builds in private mode have no session storage
  }
}

function getMockStatus(submittedAt: number): TransitOrderStatus {
  const elapsed = Date.now() - submittedAt;

  if (elapsed < PENDING_MS) return "PENDING_BRIDGE";
  if (elapsed < PROCESSING_MS) return "PROCESSING";
  return "PROCESSED";
}

function getMockExecutions(p: {
  id: string;
  params: TransitQuoteParams;
  submittedAt: number;
  amountDue: bigint;
}): TransitOrderExecution[] {
  const elapsed = Date.now() - p.submittedAt;
  const firstPart = (p.amountDue * 40n) / 100n;
  const execution = { txHash: "0x", chainId: p.params.destinationChainId };
  const executions: TransitOrderExecution[] = [];

  if (elapsed >= PARTIAL_FILL_MS) {
    executions.push({
      ...execution,
      id: `${p.id}-1`,
      amount: firstPart,
      remaining: p.amountDue - firstPart,
      timestamp: Math.floor((p.submittedAt + PARTIAL_FILL_MS) / 1000),
    });
  }

  if (elapsed >= PROCESSING_MS) {
    executions.push({
      ...execution,
      id: `${p.id}-2`,
      amount: p.amountDue - firstPart,
      remaining: 0n,
      timestamp: Math.floor((p.submittedAt + PROCESSING_MS) / 1000),
    });
  }

  return executions;
}

function toTransitOrder({ params, id, submittedAt }: MockOrder): TransitOrder {
  const status = getMockStatus(submittedAt);
  const createdAt = new Date(submittedAt).toISOString();
  const amountDue = params.offerAmount - getMockFee(params);
  const orderExecuteds = getMockExecutions({ id, params, submittedAt, amountDue });
  const deliveredAmount = orderExecuteds.reduce((sum, execution) => sum + execution.amount, 0n);

  return {
    id,
    offerAsset: params.offerAsset,
    wantAsset: params.wantAsset,
    amountDue,
    remainingAmountDue: amountDue - deliveredAmount,
    offerAmount: params.offerAmount,
    receiver: params.userAddress,
    distributorCode: "0x",
    destinationChainId: params.destinationChainId,
    sourceChainId: params.sourceChainId,
    receiveTime: Math.floor(submittedAt / 1000),
    status,
    user: params.userAddress,
    createdAt,
    updatedAt: createdAt,
    tokenMetadata: {},
    orderExecuteds,
  };
}

// TODO: remove once the gateway has Paxos keys; mocks every Transit call and never sends a wallet transaction
export const mockTransitApi: TransitApi & { submitOrder: (params: TransitQuoteParams) => string } = {
  fetchTransitRoutes: async () => [],
  fetchTransitFeeTier: async () => ({
    feeTier: "zeroFee",
    zeroFeeCapacity: MOCK_ZERO_FEE_CAPACITY,
    isZeroFeeAvailable: true,
    zeroFeeExpectedReopenAt: undefined,
  }),

  fetchTransitQuote: async (params) => ({
    transaction: { to: MOCK_STATION_ADDRESS, data: "0x", value: 0n, functionName: "submitOrder" },
    amountOut: params.offerAmount - getMockFee(params),
    protocolFee: getMockFee(params),
    fillCostFee: 0n,
    conversionRateFee: getMockFee(params),
    conversionRateHundredthsBps: params.feeTier === "zeroFee" ? 0 : Number(MOCK_FEE_BPS * 100n),
    integratorFee: 0n,
    totalFees: getMockFee(params),
    estimatedLatencyMs: PROCESSING_MS,
  }),

  fetchTransitAuthorization: async (params) => ({
    spenderAddress: params.spenderAddress,
    alreadyApproved: true,
    methods: [],
  }),

  fetchTransitOrder: async ({ orderId }) => {
    const order = readMockOrders().find((mockOrder) => mockOrder.id === orderId);

    if (!order) {
      throw new Error(`Mock Transit order ${orderId} not found`);
    }

    return toTransitOrder(order);
  },

  fetchTransitOrders: async ({ userAddress }) => ({
    orders: readMockOrders()
      .filter((order) => isAddressEqual(order.params.userAddress, userAddress))
      .map(toTransitOrder)
      .reverse(),
    nextPageToken: undefined,
  }),

  submitOrder: (params) => {
    const orders = readMockOrders();
    const id = `0xmock${orders.length}`;

    writeMockOrders([...orders, { params, id, submittedAt: Date.now() }]);

    return id;
  },
};
