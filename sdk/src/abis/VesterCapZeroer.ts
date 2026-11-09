export default [
  {
    inputs: [
      { internalType: "contract RoleStore", name: "_roleStore", type: "address" },
      { internalType: "contract EventEmitter", name: "_eventEmitter", type: "address" },
      { internalType: "address", name: "_vester", type: "address" },
    ],
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
    inputs: [],
    name: "eventEmitter",
    outputs: [{ internalType: "contract EventEmitter", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_account", type: "address" }],
    name: "isZeroed",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "roleStore",
    outputs: [{ internalType: "contract RoleStore", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "vester",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address[]", name: "_accounts", type: "address[]" }],
    name: "zeroCaps",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
