export default [
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
] as const;
