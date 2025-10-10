export default [
  {
    components: [
      { internalType: "address[]", name: "tokens", type: "address[]" },
      { internalType: "address[]", name: "providers", type: "address[]" },
      { internalType: "bytes[]", name: "data", type: "bytes[]" },
    ],
    internalType: "struct OracleUtils.SetPricesParams",
    name: "oracleParams",
    type: "tuple",
  },
  {
    components: [
      { internalType: "address[]", name: "sendTokens", type: "address[]" },
      { internalType: "uint256[]", name: "sendAmounts", type: "uint256[]" },
      { internalType: "address[]", name: "externalCallTargets", type: "address[]" },
      { internalType: "bytes[]", name: "externalCallDataList", type: "bytes[]" },
      { internalType: "address[]", name: "refundTokens", type: "address[]" },
      { internalType: "address[]", name: "refundReceivers", type: "address[]" },
    ],
    internalType: "struct ExternalCalls",
    name: "externalCalls",
    type: "tuple",
  },
  {
    components: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
      { internalType: "address", name: "token", type: "address" },
    ],
    internalType: "struct TokenPermit[]",
    name: "tokenPermits",
    type: "tuple[]",
  },
  {
    components: [
      { internalType: "address", name: "feeToken", type: "address" },
      { internalType: "uint256", name: "feeAmount", type: "uint256" },
      { internalType: "address[]", name: "feeSwapPath", type: "address[]" },
    ],
    internalType: "struct FeeParams",
    name: "fee",
    type: "tuple",
  },
  { internalType: "uint256", name: "userNonce", type: "uint256" },
  { internalType: "uint256", name: "deadline", type: "uint256" },
  { internalType: "uint256", name: "desChainId", type: "uint256" },
] as const;
