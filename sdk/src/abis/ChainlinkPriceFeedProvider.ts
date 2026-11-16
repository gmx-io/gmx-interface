export default [
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "bytes", name: "", type: "bytes" },
    ],
    name: "getOraclePrice",
    outputs: [
      {
        components: [
          { internalType: "address", name: "token", type: "address" },
          { internalType: "uint256", name: "min", type: "uint256" },
          { internalType: "uint256", name: "max", type: "uint256" },
          { internalType: "uint256", name: "timestamp", type: "uint256" },
          { internalType: "address", name: "provider", type: "address" },
        ],
        internalType: "struct OracleUtils.ValidatedPrice",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
