export default [
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "key",
        type: "bytes32",
      },
    ],
    name: "DisabledFeature",
    type: "error",
  },
  {
    inputs: [],
    name: "EmptyVesterDepositAmount",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "EmptyVesterWithdrawal",
    type: "error",
  },
  {
    inputs: [],
    name: "IncentiveIssuerBindingNotConfirmed",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "issuer",
        type: "address",
      },
    ],
    name: "IncentiveIssuerNotBound",
    type: "error",
  },
  {
    inputs: [],
    name: "IncentiveTokenNonTransferrable",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "excessBalance",
        type: "uint256",
      },
    ],
    name: "IncentiveWithdrawalExceedsExcessBalance",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "obligations",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "balance",
        type: "uint256",
      },
    ],
    name: "InsufficientVesterBacking",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "accountsLength",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "capsLength",
        type: "uint256",
      },
    ],
    name: "InvalidProvisionCapLengths",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "SelfVestingTransfer",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "msgSender",
        type: "address",
      },
      {
        internalType: "string",
        name: "role",
        type: "string",
      },
    ],
    name: "Unauthorized",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "VesterAccountFrozen",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "deactivatedAt",
        type: "uint256",
      },
    ],
    name: "VesterAlreadyDeactivated",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "deactivatedAt",
        type: "uint256",
      },
    ],
    name: "VesterDeactivated",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "deactivatedAt",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "currentDeactivatedAt",
        type: "uint256",
      },
    ],
    name: "VesterDeactivationNotExtended",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "deactivatedAt",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "minDeactivatedAt",
        type: "uint256",
      },
    ],
    name: "VesterDeactivationNoticeTooShort",
    type: "error",
  },
  {
    inputs: [],
    name: "VesterProvisioningComplete",
    type: "error",
  },
  {
    inputs: [],
    name: "VesterProvisioningNotComplete",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "totalVested",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "cap",
        type: "uint256",
      },
    ],
    name: "VestingCapExceeded",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "VestingReceiverNotFresh",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "VestingSenderHasOpenSession",
    type: "error",
  },
  {
    inputs: [],
    name: "claim",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "claimableToken",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "deactivatedAt",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "esToken",
    outputs: [
      {
        internalType: "address",
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
        name: "_account",
        type: "address",
      },
    ],
    name: "getVestingCap",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "isFrozen",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isIssuerBindingConfirmed",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "issuer",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pairRatioFactor",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pairToken",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "provisioningComplete",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "vestingDuration",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
