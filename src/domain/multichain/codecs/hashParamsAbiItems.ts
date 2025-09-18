export const RELAY_PARAMS_TYPE = {
  type: "tuple",
  name: "",
  components: [
    {
      type: "tuple",
      name: "oracleParams",
      components: [
        { type: "address[]", name: "tokens" },
        { type: "address[]", name: "providers" },
        { type: "bytes[]", name: "data" },
      ],
    },
    {
      type: "tuple",
      name: "externalCalls",
      components: [
        { type: "address[]", name: "sendTokens" },
        { type: "uint256[]", name: "sendAmounts" },
        { type: "address[]", name: "externalCallTargets" },
        { type: "bytes[]", name: "externalCallDataList" },
        { type: "address[]", name: "refundTokens" },
        { type: "address[]", name: "refundReceivers" },
      ],
    },
    {
      type: "tuple[]",
      name: "tokenPermits",
      components: [
        { type: "address", name: "owner" },
        { type: "address", name: "spender" },
        { type: "uint256", name: "value" },
        { type: "uint256", name: "deadline" },
        { type: "address", name: "token" },
      ],
    },
    {
      type: "tuple",
      name: "fee",
      components: [
        { type: "address", name: "feeToken" },
        { type: "uint256", name: "feeAmount" },
        { type: "address[]", name: "feeSwapPath" },
      ],
    },
    { type: "uint256", name: "userNonce" },
    { type: "uint256", name: "deadline" },
    { type: "bytes", name: "signature" },
    { type: "uint256", name: "desChainId" },
  ],
} as const;

export const TRANSFER_REQUESTS_TYPE = {
  type: "tuple",
  name: "",
  components: [
    { type: "address[]", name: "tokens" },
    { type: "address[]", name: "receivers" },
    { type: "uint256[]", name: "amounts" },
  ],
} as const;

export const CREATE_DEPOSIT_PARAMS_TYPE = {
  type: "tuple",
  name: "",
  components: [
    {
      type: "tuple",
      name: "addresses",
      components: [
        { type: "address", name: "receiver" },
        { type: "address", name: "callbackContract" },
        { type: "address", name: "uiFeeReceiver" },
        { type: "address", name: "market" },
        { type: "address", name: "initialLongToken" },
        { type: "address", name: "initialShortToken" },
        { type: "address[]", name: "longTokenSwapPath" },
        { type: "address[]", name: "shortTokenSwapPath" },
      ],
    },
    { type: "uint256", name: "minMarketTokens" },
    { type: "bool", name: "shouldUnwrapNativeToken" },
    { type: "uint256", name: "executionFee" },
    { type: "uint256", name: "callbackGasLimit" },
    { type: "bytes32[]", name: "dataList" },
  ],
} as const;

export const CREATE_GLV_DEPOSIT_PARAMS_TYPE = {
  type: "tuple",
  name: "",
  components: [
    {
      type: "tuple",
      name: "addresses",
      components: [
        { type: "address", name: "glv" },
        { type: "address", name: "market" },
        { type: "address", name: "receiver" },
        { type: "address", name: "callbackContract" },
        { type: "address", name: "uiFeeReceiver" },
        { type: "address", name: "initialLongToken" },
        { type: "address", name: "initialShortToken" },
        { type: "address[]", name: "longTokenSwapPath" },
        { type: "address[]", name: "shortTokenSwapPath" },
      ],
    },
    { type: "uint256", name: "minGlvTokens" },
    { type: "uint256", name: "executionFee" },
    { type: "uint256", name: "callbackGasLimit" },
    { type: "bool", name: "shouldUnwrapNativeToken" },
    { type: "bool", name: "isMarketTokenDeposit" },
    { type: "bytes32[]", name: "dataList" },
  ],
} as const;

export const CREATE_WITHDRAWAL_PARAMS_TYPE = {
  type: "tuple",
  name: "",
  components: [
    {
      type: "tuple",
      name: "addresses",
      components: [
        { type: "address", name: "receiver" },
        { type: "address", name: "callbackContract" },
        { type: "address", name: "uiFeeReceiver" },
        { type: "address", name: "market" },
        { type: "address[]", name: "longTokenSwapPath" },
        { type: "address[]", name: "shortTokenSwapPath" },
      ],
    },
    { type: "uint256", name: "minLongTokenAmount" },
    { type: "uint256", name: "minShortTokenAmount" },
    { type: "bool", name: "shouldUnwrapNativeToken" },
    { type: "uint256", name: "executionFee" },
    { type: "uint256", name: "callbackGasLimit" },
    { type: "bytes32[]", name: "dataList" },
  ],
} as const;

export const BRIDGE_OUT_PARAMS = {
  type: "tuple",
  name: "",
  components: [
    { type: "uint256", name: "desChainId" },
    { type: "uint256", name: "deadline" },
    { type: "address", name: "provider" },
    { type: "bytes", name: "providerData" },
    { type: "uint256", name: "minAmountOut" },
    { type: "address", name: "secondaryProvider" },
    { type: "bytes", name: "secondaryProviderData" },
    { type: "uint256", name: "secondaryMinAmountOut" },
  ],
} as const;
