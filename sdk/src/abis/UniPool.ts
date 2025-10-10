export default [
  {
    inputs: [{ internalType: "uint32[]", name: "", type: "uint32[]" }],
    name: "observe",
    outputs: [
      { internalType: "int56[]", name: "tickCumulatives", type: "int56[]" },
      { internalType: "uint160[]", name: "secondsPerLiquidityCumulativeX128s", type: "uint160[]" },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "slot0",
    outputs: [
      { internalType: "uint160", name: "sqrtPriceX96", type: "uint160" },
      { internalType: "int24", name: "tick", type: "int24" },
      { internalType: "uint16", name: "observationIndex", type: "uint16" },
      { internalType: "uint16", name: "observationCardinality", type: "uint16" },
      { internalType: "uint16", name: "observationCardinalityNext", type: "uint16" },
      { internalType: "uint8", name: "feeProtocol", type: "uint8" },
      { internalType: "bool", name: "unlocked", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tickSpacing",
    outputs: [{ internalType: "int24", name: "", type: "int24" }],
    stateMutability: "pure",
    type: "function",
  },
] as const;
