import { isAddressEqual } from "viem";

import type { GmxApiSdk } from "sdk/clients/v2";
import type { TransitOrder, TransitOrderStatus, TransitQuoteParams } from "sdk/utils/paxos/types";

// TODO: remove once the gateway has Paxos keys; mocks every Transit call and never sends a wallet transaction
export const IS_PAXOS_TRANSIT_MOCKED = import.meta.env.DEV;

export type TransitApi = Pick<
  GmxApiSdk,
  "fetchTransitFeeTier" | "fetchTransitQuote" | "fetchTransitAuthorization" | "fetchTransitOrder" | "fetchTransitOrders"
>;

const MOCK_STATION_ADDRESS = "0x000000000000000000000000000000000000dEaD";
const PENDING_MS = 10_000;
const PROCESSING_MS = 20_000;
const MOCK_FEE_BPS = 1n;
const MOCK_ZERO_FEE_CAPACITY = 750_000n * 10n ** 6n;

function getMockFee({ offerAmount, feeTier }: TransitQuoteParams) {
  return feeTier === "zeroFee" ? 0n : (offerAmount * MOCK_FEE_BPS) / 10_000n;
}

type MockOrder = { params: TransitQuoteParams; id: string; submittedAt: number };

const mockOrders: MockOrder[] = [];

function getMockStatus(submittedAt: number): TransitOrderStatus {
  const elapsed = Date.now() - submittedAt;

  if (elapsed < PENDING_MS) return "PENDING_BRIDGE";
  if (elapsed < PROCESSING_MS) return "PROCESSING";
  return "PROCESSED";
}

function toTransitOrder({ params, id, submittedAt }: MockOrder): TransitOrder {
  const status = getMockStatus(submittedAt);
  const createdAt = new Date(submittedAt).toISOString();

  return {
    id,
    offerAsset: params.offerAsset,
    wantAsset: params.wantAsset,
    amountDue: params.offerAmount - getMockFee(params),
    remainingAmountDue: status === "PROCESSED" ? 0n : params.offerAmount,
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
    orderExecuteds: [],
  };
}

export const mockTransitApi: TransitApi & { submitOrder: (params: TransitQuoteParams) => string } = {
  fetchTransitFeeTier: async () => ({ feeTier: "zeroFee", zeroFeeCapacity: MOCK_ZERO_FEE_CAPACITY }),

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
    const order = mockOrders.find((mockOrder) => mockOrder.id === orderId);

    if (!order) {
      throw new Error(`Mock Transit order ${orderId} not found`);
    }

    return toTransitOrder(order);
  },

  fetchTransitOrders: async ({ userAddress }) => ({
    orders: mockOrders
      .filter((order) => isAddressEqual(order.params.userAddress, userAddress))
      .map(toTransitOrder)
      .reverse(),
    nextPageToken: undefined,
  }),

  submitOrder: (params) => {
    const id = `0xmock${mockOrders.length}`;
    mockOrders.push({ params, id, submittedAt: Date.now() });

    return id;
  },
};
