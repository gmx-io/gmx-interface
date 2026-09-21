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
    name: "EmptyIncentiveVester",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "index",
        type: "uint256",
      },
    ],
    name: "EmptyIssuanceAccount",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "index",
        type: "uint256",
      },
    ],
    name: "EmptyIssuanceAmount",
    type: "error",
  },
  {
    inputs: [],
    name: "EmptyIssuanceBatch",
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
        name: "unclaimedAmount",
        type: "uint256",
      },
    ],
    name: "EmptyIssuanceReduction",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "vester",
        type: "address",
      },
    ],
    name: "IncentiveVesterAlreadySet",
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
        name: "outstandingAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "balance",
        type: "uint256",
      },
    ],
    name: "InsufficientIssuanceFunding",
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
        name: "amountsLength",
        type: "uint256",
      },
    ],
    name: "InvalidIssuanceBatchLengths",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "epochId",
        type: "uint256",
      },
      {
        internalType: "bytes32",
        name: "batchHash",
        type: "bytes32",
      },
    ],
    name: "IssuanceBatchContentAlreadyProcessed",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "epochId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "batchIndex",
        type: "uint256",
      },
    ],
    name: "IssuanceBatchIndexAlreadyProcessed",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "index",
        type: "uint256",
      },
    ],
    name: "IssuanceBatchNotSorted",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "expectedEntryCount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "entryCount",
        type: "uint256",
      },
    ],
    name: "IssuanceEpochEntryCountMismatch",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "epochId",
        type: "uint256",
      },
    ],
    name: "IssuanceEpochFinalized",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "expectedTotal",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "totalAmount",
        type: "uint256",
      },
    ],
    name: "IssuanceEpochTotalMismatch",
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
    inputs: [
      {
        internalType: "address",
        name: "_account",
        type: "address",
      },
    ],
    name: "claimable",
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
    name: "esGmx",
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
        name: "",
        type: "address",
      },
    ],
    name: "issuedAmounts",
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
    name: "vester",
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
        internalType: "uint256",
        name: "_epochId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_batchIndex",
        type: "uint256",
      },
      {
        internalType: "address[]",
        name: "_accounts",
        type: "address[]",
      },
      {
        internalType: "uint256[]",
        name: "_amounts",
        type: "uint256[]",
      },
    ],
    name: "distributeEpoch",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "epochs",
    outputs: [
      {
        internalType: "bool",
        name: "finalized",
        type: "bool",
      },
      {
        internalType: "uint256",
        name: "entryCount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "totalAmount",
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
        name: "",
        type: "uint256",
      },
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    name: "processedBatchHashes",
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
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "processedBatchIndexes",
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
    name: "totalClaimedAmount",
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
    name: "totalIssuedAmount",
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
] as const;
