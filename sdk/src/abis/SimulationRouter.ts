export default [
  {
    inputs: [
      {
        internalType: "contract Router",
        name: "_router",
        type: "address",
      },
      {
        internalType: "contract RoleStore",
        name: "_roleStore",
        type: "address",
      },
      {
        internalType: "contract DataStore",
        name: "_dataStore",
        type: "address",
      },
      {
        internalType: "contract EventEmitter",
        name: "_eventEmitter",
        type: "address",
      },
      {
        internalType: "contract IDepositHandler",
        name: "_depositHandler",
        type: "address",
      },
      {
        internalType: "contract IWithdrawalHandler",
        name: "_withdrawalHandler",
        type: "address",
      },
      {
        internalType: "contract IShiftHandler",
        name: "_shiftHandler",
        type: "address",
      },
      {
        internalType: "contract IOrderHandler",
        name: "_orderHandler",
        type: "address",
      },
      {
        internalType: "contract IJitOrderHandler",
        name: "_jitOrderHandler",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "EmptyHoldingAddress",
    type: "error",
  },
  {
    inputs: [],
    name: "EmptyReceiver",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
    ],
    name: "EmptyTokenTranferGasLimit",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        internalType: "address",
        name: "receiver",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "TokenTransferError",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "reason",
        type: "string",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "returndata",
        type: "bytes",
      },
    ],
    name: "TokenTransferReverted",
    type: "event",
  },
  {
    inputs: [],
    name: "dataStore",
    outputs: [
      {
        internalType: "contract DataStore",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "depositHandler",
    outputs: [
      {
        internalType: "contract IDepositHandler",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "eventEmitter",
    outputs: [
      {
        internalType: "contract EventEmitter",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "jitOrderHandler",
    outputs: [
      {
        internalType: "contract IJitOrderHandler",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes[]",
        name: "data",
        type: "bytes[]",
      },
    ],
    name: "multicall",
    outputs: [
      {
        internalType: "bytes[]",
        name: "results",
        type: "bytes[]",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "orderHandler",
    outputs: [
      {
        internalType: "contract IOrderHandler",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "roleStore",
    outputs: [
      {
        internalType: "contract RoleStore",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "router",
    outputs: [
      {
        internalType: "contract Router",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "receiver",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "sendNativeToken",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        internalType: "address",
        name: "receiver",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "sendTokens",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "receiver",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "sendWnt",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "shiftHandler",
    outputs: [
      {
        internalType: "contract IShiftHandler",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address[]",
            name: "primaryTokens",
            type: "address[]",
          },
          {
            components: [
              {
                internalType: "uint256",
                name: "min",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "max",
                type: "uint256",
              },
            ],
            internalType: "struct Price.Props[]",
            name: "primaryPrices",
            type: "tuple[]",
          },
          {
            internalType: "uint256",
            name: "minTimestamp",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "maxTimestamp",
            type: "uint256",
          },
        ],
        internalType: "struct OracleUtils.SimulatePricesParams",
        name: "simulatedOracleParams",
        type: "tuple",
      },
    ],
    name: "simulateExecuteLatestDeposit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "glv",
            type: "address",
          },
          {
            internalType: "address",
            name: "fromMarket",
            type: "address",
          },
          {
            internalType: "address",
            name: "toMarket",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "marketTokenAmount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "minMarketTokens",
            type: "uint256",
          },
        ],
        internalType: "struct GlvShiftUtils.CreateGlvShiftParams[]",
        name: "shiftParamsList",
        type: "tuple[]",
      },
      {
        components: [
          {
            internalType: "address[]",
            name: "primaryTokens",
            type: "address[]",
          },
          {
            components: [
              {
                internalType: "uint256",
                name: "min",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "max",
                type: "uint256",
              },
            ],
            internalType: "struct Price.Props[]",
            name: "primaryPrices",
            type: "tuple[]",
          },
          {
            internalType: "uint256",
            name: "minTimestamp",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "maxTimestamp",
            type: "uint256",
          },
        ],
        internalType: "struct OracleUtils.SimulatePricesParams",
        name: "simulatedOracleParams",
        type: "tuple",
      },
    ],
    name: "simulateExecuteLatestJitOrder",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address[]",
            name: "primaryTokens",
            type: "address[]",
          },
          {
            components: [
              {
                internalType: "uint256",
                name: "min",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "max",
                type: "uint256",
              },
            ],
            internalType: "struct Price.Props[]",
            name: "primaryPrices",
            type: "tuple[]",
          },
          {
            internalType: "uint256",
            name: "minTimestamp",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "maxTimestamp",
            type: "uint256",
          },
        ],
        internalType: "struct OracleUtils.SimulatePricesParams",
        name: "simulatedOracleParams",
        type: "tuple",
      },
    ],
    name: "simulateExecuteLatestOrder",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address[]",
            name: "primaryTokens",
            type: "address[]",
          },
          {
            components: [
              {
                internalType: "uint256",
                name: "min",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "max",
                type: "uint256",
              },
            ],
            internalType: "struct Price.Props[]",
            name: "primaryPrices",
            type: "tuple[]",
          },
          {
            internalType: "uint256",
            name: "minTimestamp",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "maxTimestamp",
            type: "uint256",
          },
        ],
        internalType: "struct OracleUtils.SimulatePricesParams",
        name: "simulatedOracleParams",
        type: "tuple",
      },
    ],
    name: "simulateExecuteLatestShift",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address[]",
            name: "primaryTokens",
            type: "address[]",
          },
          {
            components: [
              {
                internalType: "uint256",
                name: "min",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "max",
                type: "uint256",
              },
            ],
            internalType: "struct Price.Props[]",
            name: "primaryPrices",
            type: "tuple[]",
          },
          {
            internalType: "uint256",
            name: "minTimestamp",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "maxTimestamp",
            type: "uint256",
          },
        ],
        internalType: "struct OracleUtils.SimulatePricesParams",
        name: "simulatedOracleParams",
        type: "tuple",
      },
      {
        internalType: "enum ISwapPricingUtils.SwapPricingType",
        name: "swapPricingType",
        type: "uint8",
      },
    ],
    name: "simulateExecuteLatestWithdrawal",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawalHandler",
    outputs: [
      {
        internalType: "contract IWithdrawalHandler",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
