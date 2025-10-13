export default [
  {
    name: "isValidSignature",
    inputs: [
      { internalType: "bytes32", name: "_hash", type: "bytes32" },
      { internalType: "bytes", name: "_signature", type: "bytes" },
    ],
    outputs: [{ internalType: "bytes4", name: "magicValue", type: "bytes4" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
