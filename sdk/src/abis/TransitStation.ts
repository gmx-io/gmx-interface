export default [
  {
    type: "constructor",
    inputs: [
      {
        name: "_owner",
        type: "address",
        internalType: "address",
      },
      {
        name: "_authority",
        type: "address",
        internalType: "contract Authority",
      },
      {
        name: "_endpoint",
        type: "address",
        internalType: "address",
      },
      {
        name: "_protocolFeeRecipient",
        type: "address",
        internalType: "address",
      },
      {
        name: "_quoteSigner",
        type: "address",
        internalType: "address",
      },
      {
        name: "_offerReceiver",
        type: "address",
        internalType: "address",
      },
      {
        name: "_wantAssetSource",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    name: "AmountExceedsDue",
    type: "error",
    inputs: [
      {
        name: "uuid",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "requested",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "due",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    name: "CallFailed",
    type: "error",
    inputs: [],
  },
  {
    name: "DuplicatePushAttempt",
    type: "error",
    inputs: [],
  },
  {
    name: "ECDSAInvalidSignature",
    type: "error",
    inputs: [],
  },
  {
    name: "ECDSAInvalidSignatureLength",
    type: "error",
    inputs: [
      {
        name: "length",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    name: "ECDSAInvalidSignatureS",
    type: "error",
    inputs: [
      {
        name: "s",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
  },
  {
    name: "EnforcedPause",
    type: "error",
    inputs: [],
  },
  {
    name: "ExpectedPause",
    type: "error",
    inputs: [],
  },
  {
    name: "FeesExceedOrEqualOffer",
    type: "error",
    inputs: [
      {
        name: "protocolFee",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "integratorFee",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "offerAmount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    name: "GasLimitNotSet",
    type: "error",
    inputs: [
      {
        name: "eid",
        type: "uint32",
        internalType: "uint32",
      },
    ],
  },
  {
    name: "IntegratorFeeTooHigh",
    type: "error",
    inputs: [
      {
        name: "integratorFee",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "maxIntegratorFee",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    name: "InvalidDelegate",
    type: "error",
    inputs: [],
  },
  {
    name: "InvalidEndpointCall",
    type: "error",
    inputs: [],
  },
  {
    name: "InvalidOptionType",
    type: "error",
    inputs: [
      {
        name: "optionType",
        type: "uint16",
        internalType: "uint16",
      },
    ],
  },
  {
    name: "InvalidSigner",
    type: "error",
    inputs: [
      {
        name: "recoveredSigner",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    name: "LengthMismatch",
    type: "error",
    inputs: [
      {
        name: "lengthA",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "lengthB",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    name: "LzTokenUnavailable",
    type: "error",
    inputs: [],
  },
  {
    name: "NoCode",
    type: "error",
    inputs: [
      {
        name: "target",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    name: "NoPeer",
    type: "error",
    inputs: [
      {
        name: "eid",
        type: "uint32",
        internalType: "uint32",
      },
    ],
  },
  {
    name: "NotEnoughNative",
    type: "error",
    inputs: [
      {
        name: "msgValue",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    name: "OnlyEndpoint",
    type: "error",
    inputs: [
      {
        name: "addr",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    name: "OnlyPeer",
    type: "error",
    inputs: [
      {
        name: "eid",
        type: "uint32",
        internalType: "uint32",
      },
      {
        name: "sender",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
  },
  {
    name: "OrderNotFound",
    type: "error",
    inputs: [
      {
        name: "uuid",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
  },
  {
    name: "PermitFailedAndAllowanceTooLow",
    type: "error",
    inputs: [],
  },
  {
    name: "ProtocolFeeTooHigh",
    type: "error",
    inputs: [
      {
        name: "protocolFee",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "maxProtocolFee",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    name: "QuoteExpired",
    type: "error",
    inputs: [
      {
        name: "deadline",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    name: "ResidualApproval",
    type: "error",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
      },
      {
        name: "wantAssetSource",
        type: "address",
        internalType: "address",
      },
      {
        name: "remaining",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    name: "RouteNotApproved",
    type: "error",
    inputs: [
      {
        name: "route",
        type: "tuple",
        components: [
          {
            name: "destEID",
            type: "uint32",
            internalType: "uint32",
          },
          {
            name: "offerAsset",
            type: "address",
            internalType: "address",
          },
          {
            name: "wantAsset",
            type: "address",
            internalType: "address",
          },
        ],
        internalType: "struct TransitStation.Route",
      },
    ],
  },
  {
    name: "SafeCastOverflowedUintDowncast",
    type: "error",
    inputs: [
      {
        name: "bits",
        type: "uint8",
        internalType: "uint8",
      },
      {
        name: "value",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    name: "SafeERC20FailedOperation",
    type: "error",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    name: "SameChainOrdersRequireNoValue",
    type: "error",
    inputs: [],
  },
  {
    name: "SignatureAlreadyUsed",
    type: "error",
    inputs: [
      {
        name: "digest",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
  },
  {
    name: "WantAssetMismatch",
    type: "error",
    inputs: [
      {
        name: "uuid",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "orderWantAsset",
        type: "address",
        internalType: "address",
      },
      {
        name: "batchWantAsset",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    name: "ZeroAddress",
    type: "error",
    inputs: [],
  },
  {
    name: "AuthorityUpdated",
    type: "event",
    inputs: [
      {
        name: "user",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newAuthority",
        type: "address",
        indexed: true,
        internalType: "contract Authority",
      },
    ],
    anonymous: false,
  },
  {
    name: "ETHRecovered",
    type: "event",
    inputs: [
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    name: "MessageGasLimitSet",
    type: "event",
    inputs: [
      {
        name: "eid",
        type: "uint32",
        indexed: true,
        internalType: "uint32",
      },
      {
        name: "gasLimit",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
    ],
    anonymous: false,
  },
  {
    name: "OfferReceiverSet",
    type: "event",
    inputs: [
      {
        name: "offerReceiver",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    name: "OrderBridgeReceived",
    type: "event",
    inputs: [
      {
        name: "uuid",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "srcEID",
        type: "uint32",
        indexed: true,
        internalType: "uint32",
      },
      {
        name: "guid",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32",
      },
      {
        name: "order",
        type: "tuple",
        indexed: false,
        components: [
          {
            name: "terms",
            type: "tuple",
            components: [
              {
                name: "uuid",
                type: "bytes32",
                internalType: "bytes32",
              },
              {
                name: "wantAsset",
                type: "address",
                internalType: "address",
              },
              {
                name: "receiver",
                type: "address",
                internalType: "address",
              },
              {
                name: "offerAsset",
                type: "address",
                internalType: "address",
              },
              {
                name: "offerAmountNormalized18AfterFees",
                type: "uint256",
                internalType: "uint256",
              },
            ],
            internalType: "struct TransitStation.OrderTerms",
          },
          {
            name: "amountDue",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "queuedAt",
            type: "uint64",
            internalType: "uint64",
          },
        ],
        internalType: "struct TransitStation.Order",
      },
    ],
    anonymous: false,
  },
  {
    name: "OrderBridged",
    type: "event",
    inputs: [
      {
        name: "uuid",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "destEID",
        type: "uint32",
        indexed: true,
        internalType: "uint32",
      },
      {
        name: "guid",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32",
      },
      {
        name: "terms",
        type: "tuple",
        indexed: false,
        components: [
          {
            name: "uuid",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "wantAsset",
            type: "address",
            internalType: "address",
          },
          {
            name: "receiver",
            type: "address",
            internalType: "address",
          },
          {
            name: "offerAsset",
            type: "address",
            internalType: "address",
          },
          {
            name: "offerAmountNormalized18AfterFees",
            type: "uint256",
            internalType: "uint256",
          },
        ],
        internalType: "struct TransitStation.OrderTerms",
      },
    ],
    anonymous: false,
  },
  {
    name: "OrderExecuted",
    type: "event",
    inputs: [
      {
        name: "uuid",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "remaining",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    name: "OrderForceRemoved",
    type: "event",
    inputs: [
      {
        name: "uuid",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "order",
        type: "tuple",
        indexed: false,
        components: [
          {
            name: "terms",
            type: "tuple",
            components: [
              {
                name: "uuid",
                type: "bytes32",
                internalType: "bytes32",
              },
              {
                name: "wantAsset",
                type: "address",
                internalType: "address",
              },
              {
                name: "receiver",
                type: "address",
                internalType: "address",
              },
              {
                name: "offerAsset",
                type: "address",
                internalType: "address",
              },
              {
                name: "offerAmountNormalized18AfterFees",
                type: "uint256",
                internalType: "uint256",
              },
            ],
            internalType: "struct TransitStation.OrderTerms",
          },
          {
            name: "amountDue",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "queuedAt",
            type: "uint64",
            internalType: "uint64",
          },
        ],
        internalType: "struct TransitStation.Order",
      },
    ],
    anonymous: false,
  },
  {
    name: "OrderReceived",
    type: "event",
    inputs: [
      {
        name: "uuid",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "order",
        type: "tuple",
        indexed: false,
        components: [
          {
            name: "terms",
            type: "tuple",
            components: [
              {
                name: "uuid",
                type: "bytes32",
                internalType: "bytes32",
              },
              {
                name: "wantAsset",
                type: "address",
                internalType: "address",
              },
              {
                name: "receiver",
                type: "address",
                internalType: "address",
              },
              {
                name: "offerAsset",
                type: "address",
                internalType: "address",
              },
              {
                name: "offerAmountNormalized18AfterFees",
                type: "uint256",
                internalType: "uint256",
              },
            ],
            internalType: "struct TransitStation.OrderTerms",
          },
          {
            name: "amountDue",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "queuedAt",
            type: "uint64",
            internalType: "uint64",
          },
        ],
        internalType: "struct TransitStation.Order",
      },
    ],
    anonymous: false,
  },
  {
    name: "OrderSubmitted",
    type: "event",
    inputs: [
      {
        name: "uuid",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "sourceEID",
        type: "uint32",
        indexed: false,
        internalType: "uint32",
      },
      {
        name: "quote",
        type: "tuple",
        indexed: false,
        components: [
          {
            name: "route",
            type: "tuple",
            components: [
              {
                name: "destEID",
                type: "uint32",
                internalType: "uint32",
              },
              {
                name: "offerAsset",
                type: "address",
                internalType: "address",
              },
              {
                name: "wantAsset",
                type: "address",
                internalType: "address",
              },
            ],
            internalType: "struct TransitStation.Route",
          },
          {
            name: "offerAmount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "receiver",
            type: "address",
            internalType: "address",
          },
          {
            name: "protocolFee",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "integratorFee",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "integratorFeeReceiver",
            type: "address",
            internalType: "address",
          },
          {
            name: "distributorCode",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "salt",
            type: "bytes32",
            internalType: "bytes32",
          },
        ],
        internalType: "struct TransitStation.Quote",
      },
      {
        name: "user",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "distributorCode",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
    ],
    anonymous: false,
  },
  {
    name: "OwnershipTransferred",
    type: "event",
    inputs: [
      {
        name: "user",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    name: "Paused",
    type: "event",
    inputs: [
      {
        name: "account",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    name: "PeerSet",
    type: "event",
    inputs: [
      {
        name: "eid",
        type: "uint32",
        indexed: false,
        internalType: "uint32",
      },
      {
        name: "peer",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32",
      },
    ],
    anonymous: false,
  },
  {
    name: "ProtocolFeeRecipientSet",
    type: "event",
    inputs: [
      {
        name: "recipient",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    name: "QuoteSignerSet",
    type: "event",
    inputs: [
      {
        name: "signer",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    name: "RouteApprovalSet",
    type: "event",
    inputs: [
      {
        name: "route",
        type: "tuple",
        indexed: false,
        components: [
          {
            name: "destEID",
            type: "uint32",
            internalType: "uint32",
          },
          {
            name: "offerAsset",
            type: "address",
            internalType: "address",
          },
          {
            name: "wantAsset",
            type: "address",
            internalType: "address",
          },
        ],
        internalType: "struct TransitStation.Route",
      },
      {
        name: "approved",
        type: "bool",
        indexed: true,
        internalType: "bool",
      },
    ],
    anonymous: false,
  },
  {
    name: "TokensRecovered",
    type: "event",
    inputs: [
      {
        name: "token",
        type: "address",
        indexed: false,
        internalType: "contract ERC20",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    name: "UUIDForceSetUsed",
    type: "event",
    inputs: [
      {
        name: "uuid",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
    ],
    anonymous: false,
  },
  {
    name: "Unpaused",
    type: "event",
    inputs: [
      {
        name: "account",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    name: "WantAssetSourceSet",
    type: "event",
    inputs: [
      {
        name: "wantAssetSource",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    name: "MAX_INTEGRATOR_FEE_BPS",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "MAX_PROTOCOL_FEE_BPS",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "ONE_HUNDRED_PERCENT",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "allowInitializePath",
    type: "function",
    inputs: [
      {
        name: "origin",
        type: "tuple",
        components: [
          {
            name: "srcEid",
            type: "uint32",
            internalType: "uint32",
          },
          {
            name: "sender",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "nonce",
            type: "uint64",
            internalType: "uint64",
          },
        ],
        internalType: "struct Origin",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "approvedRoutes",
    type: "function",
    inputs: [
      {
        name: "destEID",
        type: "uint32",
        internalType: "uint32",
      },
      {
        name: "offerAsset",
        type: "address",
        internalType: "address",
      },
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "authority",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract Authority",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "endpoint",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract ILayerZeroEndpointV2",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "executePendingOrders",
    type: "function",
    inputs: [
      {
        name: "batches",
        type: "tuple[]",
        components: [
          {
            name: "wantAsset",
            type: "address",
            internalType: "address",
          },
          {
            name: "uuids",
            type: "bytes32[]",
            internalType: "bytes32[]",
          },
          {
            name: "amounts",
            type: "uint256[]",
            internalType: "uint256[]",
          },
        ],
        internalType: "struct TransitStation.FillBatch[]",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "forceRemovePendingOrder",
    type: "function",
    inputs: [
      {
        name: "uuid",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "forceSetUsedDigestTrue",
    type: "function",
    inputs: [
      {
        name: "uuid",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "getPendingOrderIds",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32[]",
        internalType: "bytes32[]",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "getPendingOrders",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "orders",
        type: "tuple[]",
        components: [
          {
            name: "terms",
            type: "tuple",
            components: [
              {
                name: "uuid",
                type: "bytes32",
                internalType: "bytes32",
              },
              {
                name: "wantAsset",
                type: "address",
                internalType: "address",
              },
              {
                name: "receiver",
                type: "address",
                internalType: "address",
              },
              {
                name: "offerAsset",
                type: "address",
                internalType: "address",
              },
              {
                name: "offerAmountNormalized18AfterFees",
                type: "uint256",
                internalType: "uint256",
              },
            ],
            internalType: "struct TransitStation.OrderTerms",
          },
          {
            name: "amountDue",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "queuedAt",
            type: "uint64",
            internalType: "uint64",
          },
        ],
        internalType: "struct TransitStation.Order[]",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "hashQuote",
    type: "function",
    inputs: [
      {
        name: "quote",
        type: "tuple",
        components: [
          {
            name: "route",
            type: "tuple",
            components: [
              {
                name: "destEID",
                type: "uint32",
                internalType: "uint32",
              },
              {
                name: "offerAsset",
                type: "address",
                internalType: "address",
              },
              {
                name: "wantAsset",
                type: "address",
                internalType: "address",
              },
            ],
            internalType: "struct TransitStation.Route",
          },
          {
            name: "offerAmount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "receiver",
            type: "address",
            internalType: "address",
          },
          {
            name: "protocolFee",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "integratorFee",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "integratorFeeReceiver",
            type: "address",
            internalType: "address",
          },
          {
            name: "distributorCode",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "salt",
            type: "bytes32",
            internalType: "bytes32",
          },
        ],
        internalType: "struct TransitStation.Quote",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "pure",
  },
  {
    name: "isComposeMsgSender",
    type: "function",
    inputs: [
      {
        name: "",
        type: "tuple",
        components: [
          {
            name: "srcEid",
            type: "uint32",
            internalType: "uint32",
          },
          {
            name: "sender",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "nonce",
            type: "uint64",
            internalType: "uint64",
          },
        ],
        internalType: "struct Origin",
      },
      {
        name: "",
        type: "bytes",
        internalType: "bytes",
      },
      {
        name: "_sender",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "lzReceive",
    type: "function",
    inputs: [
      {
        name: "_origin",
        type: "tuple",
        components: [
          {
            name: "srcEid",
            type: "uint32",
            internalType: "uint32",
          },
          {
            name: "sender",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "nonce",
            type: "uint64",
            internalType: "uint64",
          },
        ],
        internalType: "struct Origin",
      },
      {
        name: "_guid",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "_message",
        type: "bytes",
        internalType: "bytes",
      },
      {
        name: "_executor",
        type: "address",
        internalType: "address",
      },
      {
        name: "_extraData",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    name: "messageGasLimit",
    type: "function",
    inputs: [
      {
        name: "",
        type: "uint32",
        internalType: "uint32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "nextNonce",
    type: "function",
    inputs: [
      {
        name: "",
        type: "uint32",
        internalType: "uint32",
      },
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "nonce",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "oAppVersion",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "senderVersion",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "receiverVersion",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "pure",
  },
  {
    name: "offerReceiver",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "owner",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "pause",
    type: "function",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "paused",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "peers",
    type: "function",
    inputs: [
      {
        name: "eid",
        type: "uint32",
        internalType: "uint32",
      },
    ],
    outputs: [
      {
        name: "peer",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "pendingOrderCount",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "pendingOrderIdsContains",
    type: "function",
    inputs: [
      {
        name: "uuid",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "pendingOrders",
    type: "function",
    inputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "terms",
        type: "tuple",
        components: [
          {
            name: "uuid",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "wantAsset",
            type: "address",
            internalType: "address",
          },
          {
            name: "receiver",
            type: "address",
            internalType: "address",
          },
          {
            name: "offerAsset",
            type: "address",
            internalType: "address",
          },
          {
            name: "offerAmountNormalized18AfterFees",
            type: "uint256",
            internalType: "uint256",
          },
        ],
        internalType: "struct TransitStation.OrderTerms",
      },
      {
        name: "amountDue",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "queuedAt",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "protocolFeeRecipient",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "quoteSend",
    type: "function",
    inputs: [
      {
        name: "destEID",
        type: "uint32",
        internalType: "uint32",
      },
      {
        name: "terms",
        type: "tuple",
        components: [
          {
            name: "uuid",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "wantAsset",
            type: "address",
            internalType: "address",
          },
          {
            name: "receiver",
            type: "address",
            internalType: "address",
          },
          {
            name: "offerAsset",
            type: "address",
            internalType: "address",
          },
          {
            name: "offerAmountNormalized18AfterFees",
            type: "uint256",
            internalType: "uint256",
          },
        ],
        internalType: "struct TransitStation.OrderTerms",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "quoteSigner",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "recoverETH",
    type: "function",
    inputs: [
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "recoverTokens",
    type: "function",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "contract ERC20",
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "setAuthority",
    type: "function",
    inputs: [
      {
        name: "newAuthority",
        type: "address",
        internalType: "contract Authority",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "setDelegate",
    type: "function",
    inputs: [
      {
        name: "_delegate",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "setMessageGasLimit",
    type: "function",
    inputs: [
      {
        name: "eid",
        type: "uint32",
        internalType: "uint32",
      },
      {
        name: "gasLimit",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "setOfferReceiver",
    type: "function",
    inputs: [
      {
        name: "newOfferReceiver",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "setPeer",
    type: "function",
    inputs: [
      {
        name: "_eid",
        type: "uint32",
        internalType: "uint32",
      },
      {
        name: "_peer",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "setProtocolFeeRecipient",
    type: "function",
    inputs: [
      {
        name: "recipient",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "setQuoteSigner",
    type: "function",
    inputs: [
      {
        name: "signer",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "setRouteApprovals",
    type: "function",
    inputs: [
      {
        name: "routes",
        type: "tuple[]",
        components: [
          {
            name: "destEID",
            type: "uint32",
            internalType: "uint32",
          },
          {
            name: "offerAsset",
            type: "address",
            internalType: "address",
          },
          {
            name: "wantAsset",
            type: "address",
            internalType: "address",
          },
        ],
        internalType: "struct TransitStation.Route[]",
      },
      {
        name: "approved",
        type: "bool[]",
        internalType: "bool[]",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "setWantAssetSource",
    type: "function",
    inputs: [
      {
        name: "newWantAssetSource",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "submitOrder",
    type: "function",
    inputs: [
      {
        name: "quote",
        type: "tuple",
        components: [
          {
            name: "route",
            type: "tuple",
            components: [
              {
                name: "destEID",
                type: "uint32",
                internalType: "uint32",
              },
              {
                name: "offerAsset",
                type: "address",
                internalType: "address",
              },
              {
                name: "wantAsset",
                type: "address",
                internalType: "address",
              },
            ],
            internalType: "struct TransitStation.Route",
          },
          {
            name: "offerAmount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "receiver",
            type: "address",
            internalType: "address",
          },
          {
            name: "protocolFee",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "integratorFee",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "integratorFeeReceiver",
            type: "address",
            internalType: "address",
          },
          {
            name: "distributorCode",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "salt",
            type: "bytes32",
            internalType: "bytes32",
          },
        ],
        internalType: "struct TransitStation.Quote",
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "uuid",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "payable",
  },
  {
    name: "submitOrderWithPermit",
    type: "function",
    inputs: [
      {
        name: "quote",
        type: "tuple",
        components: [
          {
            name: "route",
            type: "tuple",
            components: [
              {
                name: "destEID",
                type: "uint32",
                internalType: "uint32",
              },
              {
                name: "offerAsset",
                type: "address",
                internalType: "address",
              },
              {
                name: "wantAsset",
                type: "address",
                internalType: "address",
              },
            ],
            internalType: "struct TransitStation.Route",
          },
          {
            name: "offerAmount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "receiver",
            type: "address",
            internalType: "address",
          },
          {
            name: "protocolFee",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "integratorFee",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "integratorFeeReceiver",
            type: "address",
            internalType: "address",
          },
          {
            name: "distributorCode",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "salt",
            type: "bytes32",
            internalType: "bytes32",
          },
        ],
        internalType: "struct TransitStation.Quote",
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes",
      },
      {
        name: "permitDeadline",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "v",
        type: "uint8",
        internalType: "uint8",
      },
      {
        name: "r",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "s",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "uuid",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "payable",
  },
  {
    name: "thisChainEID",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint32",
        internalType: "uint32",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "transferOwnership",
    type: "function",
    inputs: [
      {
        name: "newOwner",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "unpause",
    type: "function",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "usedDigests",
    type: "function",
    inputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    name: "wantAssetSource",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
] as const;
