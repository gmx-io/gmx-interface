export default [
  {
    inputs: [{ internalType: "contract RoleStore", name: "_roleStore", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      { internalType: "address", name: "msgSender", type: "address" },
      { internalType: "string", name: "role", type: "string" },
    ],
    name: "Unauthorized",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "account", type: "address" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "pluginTransfer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "roleStore",
    outputs: [{ internalType: "contract RoleStore", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
