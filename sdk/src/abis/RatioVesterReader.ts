export default [
  {
    inputs: [
      {
        internalType: "address",
        name: "_issuer",
        type: "address",
      },
      {
        internalType: "address",
        name: "_account",
        type: "address",
      },
    ],
    name: "getIssuerInfo",
    outputs: [
      {
        internalType: "uint256[]",
        name: "",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_vester",
        type: "address",
      },
      {
        internalType: "address",
        name: "_account",
        type: "address",
      },
    ],
    name: "getTranches",
    outputs: [
      {
        internalType: "uint256[]",
        name: "startTimes",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "totalAmounts",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "convertedAmounts",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "_vesters",
        type: "address[]",
      },
      {
        internalType: "address",
        name: "_account",
        type: "address",
      },
    ],
    name: "getVestingInfo",
    outputs: [
      {
        internalType: "uint256[]",
        name: "",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
