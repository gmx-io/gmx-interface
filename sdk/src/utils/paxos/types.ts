// Shapes follow developers.paxoslabs.com; the gateway (/v1/paxos/transit) passes Paxos responses through as-is
export type TransitFeeTier = "zeroFee" | "standardFee";

export type TransitResponseFormat = "encoded" | "full" | "structured";

export type TransitOrderStatus = "PENDING_BRIDGE" | "PROCESSING" | "PROCESSED" | "REMOVED";

export type TransitFeeTierResponse = {
  feeTier: TransitFeeTier;
  zeroFeeCapacity: bigint;
};

export type TransitTokenMetadata = {
  chain_id: string;
  address: string;
  name: string;
  symbol: string;
  decimals: string;
  token_standard: string;
};

export type TransitRoute = {
  sourceChainId: number;
  destinationChainId: number;
  destinationChainEID: number;
  offerAsset: string;
  wantAsset: string;
  minOrderSize: bigint;
  tokenMetadataMap: Record<string, TransitTokenMetadata>;
};

export type TransitRoutesParams = {
  filter?: string;
  feeTier?: TransitFeeTier;
};

export type TransitPermitData = {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: Record<string, { name: string; type: string }[]>;
  value: {
    owner: string;
    spender: string;
    value: string;
    nonce: string;
    deadline: string;
  };
  deadline: string;
};

export type TransitAuthorizationMethod =
  | { type: "eip2612_permit"; description: string; permitData: TransitPermitData }
  | { type: "erc20_approve"; description: string; transaction: { encoded: string } };

export type TransitAuthorizationParams = {
  userAddress: string;
  tokenAddress: string;
  spenderAddress: string;
  amount: bigint;
  chainId: number;
};

export type TransitAuthorizationResponse = {
  spenderAddress: string;
  alreadyApproved: boolean;
  methods: TransitAuthorizationMethod[];
};

export type TransitQuoteParams = {
  userAddress: string;
  offerAsset: string;
  wantAsset: string;
  offerAmount: bigint;
  sourceChainId: number;
  destinationChainId: number;
  permitSignature?: string;
  permitDeadline?: number;
  responseFormat?: TransitResponseFormat;
  feeTier?: TransitFeeTier;
};

export type TransitQuoteTransaction = {
  to: string;
  data?: string;
  value: bigint;
  abi?: unknown[];
  functionName: "submitOrder" | "submitOrderWithPermit";
  args?: unknown[];
};

export type TransitQuote = {
  transaction: TransitQuoteTransaction;
  amountOut: bigint;
  protocolFee: bigint;
  fillCostFee: bigint;
  conversionRateFee: bigint;
  conversionRateHundredthsBps: number;
  integratorFee: bigint;
  totalFees: bigint;
  estimatedLatencyMs: number | undefined;
};

export type TransitOrderExecution = {
  id: string;
  amount: bigint;
  remaining: bigint;
  timestamp: number;
  txHash: string;
  chainId: number;
};

export type TransitOrder = {
  id: string;
  offerAsset: string;
  wantAsset: string;
  amountDue: bigint;
  remainingAmountDue: bigint;
  offerAmount: bigint;
  receiver: string;
  distributorCode: string;
  destinationChainId: number;
  sourceChainId: number;
  receiveTime: number;
  status: TransitOrderStatus;
  user: string;
  createdAt: string;
  updatedAt: string;
  tokenMetadata: Record<string, TransitTokenMetadata>;
  orderExecuteds: TransitOrderExecution[];
};

export type TransitOrdersParams = {
  userAddress: string;
  pageSize?: number;
  pageToken?: string;
  filter?: string;
};

export type TransitOrdersResponse = {
  orders: TransitOrder[];
  nextPageToken: string | undefined;
};
