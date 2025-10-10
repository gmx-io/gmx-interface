export default [
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "address", name: "token", type: "address" },
    ],
    name: "EmptyMultichainTransferInAmount",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "balance", type: "uint256" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "InsufficientMultichainBalance",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "endpoint", type: "address" }],
    name: "InvalidMultichainEndpoint",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "provider", type: "address" }],
    name: "InvalidMultichainProvider",
    type: "error",
  },
  {
    inputs: [
      { internalType: "contract DataStore", name: "dataStore", type: "DataStore" },
      { internalType: "address", name: "account", type: "address" },
      { internalType: "address", name: "token", type: "address" },
    ],
    name: "getMultichainBalanceAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "contract DataStore", name: "dataStore", type: "DataStore" },
      { internalType: "address", name: "endpoint", type: "address" },
    ],
    name: "validateMultichainEndpoint",
    outputs: [],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "contract DataStore", name: "dataStore", type: "DataStore" },
      { internalType: "address", name: "provider", type: "address" },
    ],
    name: "validateMultichainProvider",
    outputs: [],
    stateMutability: "view",
    type: "function",
  },
] as const;
