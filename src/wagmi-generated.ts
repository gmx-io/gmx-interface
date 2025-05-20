//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// LayerZeroProvider
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9637CeC59357484DD58Edc722F9e757a3C32e8D9)
 */
export const layerZeroProviderAbi = [
  {
    type: "constructor",
    inputs: [
      {
        name: "_dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      {
        name: "_roleStore",
        internalType: "contract RoleStore",
        type: "address",
      },
      {
        name: "_eventEmitter",
        internalType: "contract EventEmitter",
        type: "address",
      },
      {
        name: "_multichainVault",
        internalType: "contract MultichainVault",
        type: "address",
      },
      {
        name: "_multichainGmRouter",
        internalType: "contract IMultichainGmRouter",
        type: "address",
      },
      {
        name: "_multichainGlvRouter",
        internalType: "contract IMultichainGlvRouter",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  { type: "error", inputs: [], name: "EmptyHoldingAddress" },
  { type: "error", inputs: [], name: "EmptyReceiver" },
  {
    type: "error",
    inputs: [{ name: "token", internalType: "address", type: "address" }],
    name: "EmptyTokenTranferGasLimit",
  },
  { type: "error", inputs: [], name: "EmptyWithdrawalAmount" },
  {
    type: "error",
    inputs: [{ name: "token", internalType: "address", type: "address" }],
    name: "InvalidBridgeOutToken",
  },
  {
    type: "error",
    inputs: [
      { name: "token", internalType: "address", type: "address" },
      { name: "receiver", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "TokenTransferError",
  },
  {
    type: "error",
    inputs: [
      { name: "msgSender", internalType: "address", type: "address" },
      { name: "role", internalType: "string", type: "string" },
    ],
    name: "Unauthorized",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "reason",
        internalType: "string",
        type: "string",
        indexed: false,
      },
      {
        name: "returndata",
        internalType: "bytes",
        type: "bytes",
        indexed: false,
      },
    ],
    name: "TokenTransferReverted",
  },
  {
    type: "function",
    inputs: [
      {
        name: "params",
        internalType: "struct IMultichainProvider.BridgeOutParams",
        type: "tuple",
        components: [
          { name: "provider", internalType: "address", type: "address" },
          { name: "account", internalType: "address", type: "address" },
          { name: "token", internalType: "address", type: "address" },
          { name: "amount", internalType: "uint256", type: "uint256" },
          { name: "data", internalType: "bytes", type: "bytes" },
        ],
      },
    ],
    name: "bridgeOut",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [],
    name: "dataStore",
    outputs: [{ name: "", internalType: "contract DataStore", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "eventEmitter",
    outputs: [{ name: "", internalType: "contract EventEmitter", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "from", internalType: "address", type: "address" },
      { name: "", internalType: "bytes32", type: "bytes32" },
      { name: "message", internalType: "bytes", type: "bytes" },
      { name: "", internalType: "address", type: "address" },
      { name: "", internalType: "bytes", type: "bytes" },
    ],
    name: "lzCompose",
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [],
    name: "multichainGlvRouter",
    outputs: [
      {
        name: "",
        internalType: "contract IMultichainGlvRouter",
        type: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "multichainGmRouter",
    outputs: [
      {
        name: "",
        internalType: "contract IMultichainGmRouter",
        type: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "multichainVault",
    outputs: [{ name: "", internalType: "contract MultichainVault", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "roleStore",
    outputs: [{ name: "", internalType: "contract RoleStore", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "token", internalType: "address", type: "address" },
      { name: "receiver", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "withdrawTokens",
    outputs: [],
    stateMutability: "nonpayable",
  },
  { type: "receive", stateMutability: "payable" },
] as const;

/**
 * [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9637CeC59357484DD58Edc722F9e757a3C32e8D9)
 */
export const layerZeroProviderAddress = {
  421614: "0x9637CeC59357484DD58Edc722F9e757a3C32e8D9",
} as const;

/**
 * [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9637CeC59357484DD58Edc722F9e757a3C32e8D9)
 */
export const layerZeroProviderConfig = {
  address: layerZeroProviderAddress,
  abi: layerZeroProviderAbi,
} as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MultichainOrderRouter
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5c80d035187D39Baa77625AA6BBc5b2B76AeE6Ba)
 */
export const multichainOrderRouterAbi = [
  {
    type: "constructor",
    inputs: [
      {
        name: "params",
        internalType: "struct MultichainRouter.BaseConstructorParams",
        type: "tuple",
        components: [
          { name: "router", internalType: "contract Router", type: "address" },
          {
            name: "roleStore",
            internalType: "contract RoleStore",
            type: "address",
          },
          {
            name: "dataStore",
            internalType: "contract DataStore",
            type: "address",
          },
          {
            name: "eventEmitter",
            internalType: "contract EventEmitter",
            type: "address",
          },
          { name: "oracle", internalType: "contract IOracle", type: "address" },
          {
            name: "orderVault",
            internalType: "contract OrderVault",
            type: "address",
          },
          {
            name: "orderHandler",
            internalType: "contract IOrderHandler",
            type: "address",
          },
          {
            name: "swapHandler",
            internalType: "contract ISwapHandler",
            type: "address",
          },
          {
            name: "externalHandler",
            internalType: "contract IExternalHandler",
            type: "address",
          },
          {
            name: "multichainVault",
            internalType: "contract MultichainVault",
            type: "address",
          },
        ],
      },
      {
        name: "_referralStorage",
        internalType: "contract IReferralStorage",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "error",
    inputs: [
      { name: "currentTimestamp", internalType: "uint256", type: "uint256" },
      { name: "deadline", internalType: "uint256", type: "uint256" },
    ],
    name: "DeadlinePassed",
  },
  {
    type: "error",
    inputs: [{ name: "key", internalType: "bytes32", type: "bytes32" }],
    name: "DisabledFeature",
  },
  { type: "error", inputs: [], name: "EmptyHoldingAddress" },
  { type: "error", inputs: [], name: "EmptyOrder" },
  { type: "error", inputs: [], name: "EmptyReceiver" },
  { type: "error", inputs: [], name: "EmptyRelayFeeAddress" },
  {
    type: "error",
    inputs: [{ name: "token", internalType: "address", type: "address" }],
    name: "EmptyTokenTranferGasLimit",
  },
  {
    type: "error",
    inputs: [
      { name: "requiredRelayFee", internalType: "uint256", type: "uint256" },
      { name: "availableFeeAmount", internalType: "uint256", type: "uint256" },
    ],
    name: "InsufficientRelayFee",
  },
  {
    type: "error",
    inputs: [{ name: "desChainId", internalType: "uint256", type: "uint256" }],
    name: "InvalidDestinationChainId",
  },
  {
    type: "error",
    inputs: [
      { name: "sendTokensLength", internalType: "uint256", type: "uint256" },
      { name: "sendAmountsLength", internalType: "uint256", type: "uint256" },
    ],
    name: "InvalidExternalCalls",
  },
  {
    type: "error",
    inputs: [
      { name: "spender", internalType: "address", type: "address" },
      { name: "expectedSpender", internalType: "address", type: "address" },
    ],
    name: "InvalidPermitSpender",
  },
  {
    type: "error",
    inputs: [{ name: "srcChainId", internalType: "uint256", type: "uint256" }],
    name: "InvalidSrcChainId",
  },
  {
    type: "error",
    inputs: [
      { name: "storedUserNonce", internalType: "uint256", type: "uint256" },
      { name: "userNonce", internalType: "uint256", type: "uint256" },
    ],
    name: "InvalidUserNonce",
  },
  {
    type: "error",
    inputs: [
      { name: "feeUsd", internalType: "uint256", type: "uint256" },
      { name: "maxFeeUsd", internalType: "uint256", type: "uint256" },
    ],
    name: "MaxRelayFeeSwapForSubaccountExceeded",
  },
  {
    type: "error",
    inputs: [],
    name: "NonEmptyExternalCallsForSubaccountOrder",
  },
  {
    type: "error",
    inputs: [{ name: "calldataLength", internalType: "uint256", type: "uint256" }],
    name: "RelayCalldataTooLong",
  },
  { type: "error", inputs: [], name: "RelayEmptyBatch" },
  { type: "error", inputs: [], name: "TokenPermitsNotAllowedForMultichain" },
  {
    type: "error",
    inputs: [
      { name: "token", internalType: "address", type: "address" },
      { name: "receiver", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "TokenTransferError",
  },
  {
    type: "error",
    inputs: [
      { name: "msgSender", internalType: "address", type: "address" },
      { name: "role", internalType: "string", type: "string" },
    ],
    name: "Unauthorized",
  },
  {
    type: "error",
    inputs: [
      { name: "feeToken", internalType: "address", type: "address" },
      { name: "expectedFeeToken", internalType: "address", type: "address" },
    ],
    name: "UnexpectedRelayFeeToken",
  },
  {
    type: "error",
    inputs: [
      { name: "feeToken", internalType: "address", type: "address" },
      { name: "expectedFeeToken", internalType: "address", type: "address" },
    ],
    name: "UnsupportedRelayFeeToken",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "reason",
        internalType: "string",
        type: "string",
        indexed: false,
      },
      {
        name: "returndata",
        internalType: "bytes",
        type: "bytes",
        indexed: false,
      },
    ],
    name: "TokenTransferReverted",
  },
  {
    type: "function",
    inputs: [
      {
        name: "relayParams",
        internalType: "struct IRelayUtils.RelayParams",
        type: "tuple",
        components: [
          {
            name: "oracleParams",
            internalType: "struct OracleUtils.SetPricesParams",
            type: "tuple",
            components: [
              { name: "tokens", internalType: "address[]", type: "address[]" },
              {
                name: "providers",
                internalType: "address[]",
                type: "address[]",
              },
              { name: "data", internalType: "bytes[]", type: "bytes[]" },
            ],
          },
          {
            name: "externalCalls",
            internalType: "struct IRelayUtils.ExternalCalls",
            type: "tuple",
            components: [
              {
                name: "sendTokens",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "sendAmounts",
                internalType: "uint256[]",
                type: "uint256[]",
              },
              {
                name: "externalCallTargets",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "externalCallDataList",
                internalType: "bytes[]",
                type: "bytes[]",
              },
              {
                name: "refundTokens",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "refundReceivers",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          {
            name: "tokenPermits",
            internalType: "struct IRelayUtils.TokenPermit[]",
            type: "tuple[]",
            components: [
              { name: "owner", internalType: "address", type: "address" },
              { name: "spender", internalType: "address", type: "address" },
              { name: "value", internalType: "uint256", type: "uint256" },
              { name: "deadline", internalType: "uint256", type: "uint256" },
              { name: "v", internalType: "uint8", type: "uint8" },
              { name: "r", internalType: "bytes32", type: "bytes32" },
              { name: "s", internalType: "bytes32", type: "bytes32" },
              { name: "token", internalType: "address", type: "address" },
            ],
          },
          {
            name: "fee",
            internalType: "struct IRelayUtils.FeeParams",
            type: "tuple",
            components: [
              { name: "feeToken", internalType: "address", type: "address" },
              { name: "feeAmount", internalType: "uint256", type: "uint256" },
              {
                name: "feeSwapPath",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          { name: "userNonce", internalType: "uint256", type: "uint256" },
          { name: "deadline", internalType: "uint256", type: "uint256" },
          { name: "signature", internalType: "bytes", type: "bytes" },
          { name: "desChainId", internalType: "uint256", type: "uint256" },
        ],
      },
      { name: "account", internalType: "address", type: "address" },
      { name: "srcChainId", internalType: "uint256", type: "uint256" },
      {
        name: "params",
        internalType: "struct BatchParams",
        type: "tuple",
        components: [
          {
            name: "createOrderParamsList",
            internalType: "struct IBaseOrderUtils.CreateOrderParams[]",
            type: "tuple[]",
            components: [
              {
                name: "addresses",
                internalType: "struct IBaseOrderUtils.CreateOrderParamsAddresses",
                type: "tuple",
                components: [
                  {
                    name: "receiver",
                    internalType: "address",
                    type: "address",
                  },
                  {
                    name: "cancellationReceiver",
                    internalType: "address",
                    type: "address",
                  },
                  {
                    name: "callbackContract",
                    internalType: "address",
                    type: "address",
                  },
                  {
                    name: "uiFeeReceiver",
                    internalType: "address",
                    type: "address",
                  },
                  { name: "market", internalType: "address", type: "address" },
                  {
                    name: "initialCollateralToken",
                    internalType: "address",
                    type: "address",
                  },
                  {
                    name: "swapPath",
                    internalType: "address[]",
                    type: "address[]",
                  },
                ],
              },
              {
                name: "numbers",
                internalType: "struct IBaseOrderUtils.CreateOrderParamsNumbers",
                type: "tuple",
                components: [
                  {
                    name: "sizeDeltaUsd",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "initialCollateralDeltaAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "triggerPrice",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "acceptablePrice",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "executionFee",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "callbackGasLimit",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "minOutputAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "validFromTime",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "orderType",
                internalType: "enum Order.OrderType",
                type: "uint8",
              },
              {
                name: "decreasePositionSwapType",
                internalType: "enum Order.DecreasePositionSwapType",
                type: "uint8",
              },
              { name: "isLong", internalType: "bool", type: "bool" },
              {
                name: "shouldUnwrapNativeToken",
                internalType: "bool",
                type: "bool",
              },
              { name: "autoCancel", internalType: "bool", type: "bool" },
              {
                name: "referralCode",
                internalType: "bytes32",
                type: "bytes32",
              },
              {
                name: "dataList",
                internalType: "bytes32[]",
                type: "bytes32[]",
              },
            ],
          },
          {
            name: "updateOrderParamsList",
            internalType: "struct UpdateOrderParams[]",
            type: "tuple[]",
            components: [
              { name: "key", internalType: "bytes32", type: "bytes32" },
              {
                name: "sizeDeltaUsd",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "acceptablePrice",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "triggerPrice",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "minOutputAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "validFromTime",
                internalType: "uint256",
                type: "uint256",
              },
              { name: "autoCancel", internalType: "bool", type: "bool" },
              {
                name: "executionFeeIncrease",
                internalType: "uint256",
                type: "uint256",
              },
            ],
          },
          {
            name: "cancelOrderKeys",
            internalType: "bytes32[]",
            type: "bytes32[]",
          },
        ],
      },
    ],
    name: "batch",
    outputs: [{ name: "", internalType: "bytes32[]", type: "bytes32[]" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      {
        name: "relayParams",
        internalType: "struct IRelayUtils.RelayParams",
        type: "tuple",
        components: [
          {
            name: "oracleParams",
            internalType: "struct OracleUtils.SetPricesParams",
            type: "tuple",
            components: [
              { name: "tokens", internalType: "address[]", type: "address[]" },
              {
                name: "providers",
                internalType: "address[]",
                type: "address[]",
              },
              { name: "data", internalType: "bytes[]", type: "bytes[]" },
            ],
          },
          {
            name: "externalCalls",
            internalType: "struct IRelayUtils.ExternalCalls",
            type: "tuple",
            components: [
              {
                name: "sendTokens",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "sendAmounts",
                internalType: "uint256[]",
                type: "uint256[]",
              },
              {
                name: "externalCallTargets",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "externalCallDataList",
                internalType: "bytes[]",
                type: "bytes[]",
              },
              {
                name: "refundTokens",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "refundReceivers",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          {
            name: "tokenPermits",
            internalType: "struct IRelayUtils.TokenPermit[]",
            type: "tuple[]",
            components: [
              { name: "owner", internalType: "address", type: "address" },
              { name: "spender", internalType: "address", type: "address" },
              { name: "value", internalType: "uint256", type: "uint256" },
              { name: "deadline", internalType: "uint256", type: "uint256" },
              { name: "v", internalType: "uint8", type: "uint8" },
              { name: "r", internalType: "bytes32", type: "bytes32" },
              { name: "s", internalType: "bytes32", type: "bytes32" },
              { name: "token", internalType: "address", type: "address" },
            ],
          },
          {
            name: "fee",
            internalType: "struct IRelayUtils.FeeParams",
            type: "tuple",
            components: [
              { name: "feeToken", internalType: "address", type: "address" },
              { name: "feeAmount", internalType: "uint256", type: "uint256" },
              {
                name: "feeSwapPath",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          { name: "userNonce", internalType: "uint256", type: "uint256" },
          { name: "deadline", internalType: "uint256", type: "uint256" },
          { name: "signature", internalType: "bytes", type: "bytes" },
          { name: "desChainId", internalType: "uint256", type: "uint256" },
        ],
      },
      { name: "account", internalType: "address", type: "address" },
      { name: "srcChainId", internalType: "uint256", type: "uint256" },
      { name: "key", internalType: "bytes32", type: "bytes32" },
    ],
    name: "cancelOrder",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      {
        name: "relayParams",
        internalType: "struct IRelayUtils.RelayParams",
        type: "tuple",
        components: [
          {
            name: "oracleParams",
            internalType: "struct OracleUtils.SetPricesParams",
            type: "tuple",
            components: [
              { name: "tokens", internalType: "address[]", type: "address[]" },
              {
                name: "providers",
                internalType: "address[]",
                type: "address[]",
              },
              { name: "data", internalType: "bytes[]", type: "bytes[]" },
            ],
          },
          {
            name: "externalCalls",
            internalType: "struct IRelayUtils.ExternalCalls",
            type: "tuple",
            components: [
              {
                name: "sendTokens",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "sendAmounts",
                internalType: "uint256[]",
                type: "uint256[]",
              },
              {
                name: "externalCallTargets",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "externalCallDataList",
                internalType: "bytes[]",
                type: "bytes[]",
              },
              {
                name: "refundTokens",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "refundReceivers",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          {
            name: "tokenPermits",
            internalType: "struct IRelayUtils.TokenPermit[]",
            type: "tuple[]",
            components: [
              { name: "owner", internalType: "address", type: "address" },
              { name: "spender", internalType: "address", type: "address" },
              { name: "value", internalType: "uint256", type: "uint256" },
              { name: "deadline", internalType: "uint256", type: "uint256" },
              { name: "v", internalType: "uint8", type: "uint8" },
              { name: "r", internalType: "bytes32", type: "bytes32" },
              { name: "s", internalType: "bytes32", type: "bytes32" },
              { name: "token", internalType: "address", type: "address" },
            ],
          },
          {
            name: "fee",
            internalType: "struct IRelayUtils.FeeParams",
            type: "tuple",
            components: [
              { name: "feeToken", internalType: "address", type: "address" },
              { name: "feeAmount", internalType: "uint256", type: "uint256" },
              {
                name: "feeSwapPath",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          { name: "userNonce", internalType: "uint256", type: "uint256" },
          { name: "deadline", internalType: "uint256", type: "uint256" },
          { name: "signature", internalType: "bytes", type: "bytes" },
          { name: "desChainId", internalType: "uint256", type: "uint256" },
        ],
      },
      { name: "account", internalType: "address", type: "address" },
      { name: "srcChainId", internalType: "uint256", type: "uint256" },
      {
        name: "params",
        internalType: "struct IBaseOrderUtils.CreateOrderParams",
        type: "tuple",
        components: [
          {
            name: "addresses",
            internalType: "struct IBaseOrderUtils.CreateOrderParamsAddresses",
            type: "tuple",
            components: [
              { name: "receiver", internalType: "address", type: "address" },
              {
                name: "cancellationReceiver",
                internalType: "address",
                type: "address",
              },
              {
                name: "callbackContract",
                internalType: "address",
                type: "address",
              },
              {
                name: "uiFeeReceiver",
                internalType: "address",
                type: "address",
              },
              { name: "market", internalType: "address", type: "address" },
              {
                name: "initialCollateralToken",
                internalType: "address",
                type: "address",
              },
              {
                name: "swapPath",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          {
            name: "numbers",
            internalType: "struct IBaseOrderUtils.CreateOrderParamsNumbers",
            type: "tuple",
            components: [
              {
                name: "sizeDeltaUsd",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "initialCollateralDeltaAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "triggerPrice",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "acceptablePrice",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "executionFee",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "callbackGasLimit",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "minOutputAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "validFromTime",
                internalType: "uint256",
                type: "uint256",
              },
            ],
          },
          {
            name: "orderType",
            internalType: "enum Order.OrderType",
            type: "uint8",
          },
          {
            name: "decreasePositionSwapType",
            internalType: "enum Order.DecreasePositionSwapType",
            type: "uint8",
          },
          { name: "isLong", internalType: "bool", type: "bool" },
          {
            name: "shouldUnwrapNativeToken",
            internalType: "bool",
            type: "bool",
          },
          { name: "autoCancel", internalType: "bool", type: "bool" },
          { name: "referralCode", internalType: "bytes32", type: "bytes32" },
          { name: "dataList", internalType: "bytes32[]", type: "bytes32[]" },
        ],
      },
    ],
    name: "createOrder",
    outputs: [{ name: "", internalType: "bytes32", type: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [],
    name: "dataStore",
    outputs: [{ name: "", internalType: "contract DataStore", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "eventEmitter",
    outputs: [{ name: "", internalType: "contract EventEmitter", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "externalHandler",
    outputs: [{ name: "", internalType: "contract IExternalHandler", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "data", internalType: "bytes[]", type: "bytes[]" }],
    name: "multicall",
    outputs: [{ name: "results", internalType: "bytes[]", type: "bytes[]" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [],
    name: "multichainVault",
    outputs: [{ name: "", internalType: "contract MultichainVault", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "oracle",
    outputs: [{ name: "", internalType: "contract IOracle", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "orderHandler",
    outputs: [{ name: "", internalType: "contract IOrderHandler", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "orderVault",
    outputs: [{ name: "", internalType: "contract OrderVault", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "referralStorage",
    outputs: [{ name: "", internalType: "contract IReferralStorage", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "roleStore",
    outputs: [{ name: "", internalType: "contract RoleStore", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "router",
    outputs: [{ name: "", internalType: "contract Router", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "receiver", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "sendNativeToken",
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [
      { name: "token", internalType: "address", type: "address" },
      { name: "receiver", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "sendTokens",
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [
      { name: "receiver", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "sendWnt",
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [],
    name: "swapHandler",
    outputs: [{ name: "", internalType: "contract ISwapHandler", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "relayParams",
        internalType: "struct IRelayUtils.RelayParams",
        type: "tuple",
        components: [
          {
            name: "oracleParams",
            internalType: "struct OracleUtils.SetPricesParams",
            type: "tuple",
            components: [
              { name: "tokens", internalType: "address[]", type: "address[]" },
              {
                name: "providers",
                internalType: "address[]",
                type: "address[]",
              },
              { name: "data", internalType: "bytes[]", type: "bytes[]" },
            ],
          },
          {
            name: "externalCalls",
            internalType: "struct IRelayUtils.ExternalCalls",
            type: "tuple",
            components: [
              {
                name: "sendTokens",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "sendAmounts",
                internalType: "uint256[]",
                type: "uint256[]",
              },
              {
                name: "externalCallTargets",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "externalCallDataList",
                internalType: "bytes[]",
                type: "bytes[]",
              },
              {
                name: "refundTokens",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "refundReceivers",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          {
            name: "tokenPermits",
            internalType: "struct IRelayUtils.TokenPermit[]",
            type: "tuple[]",
            components: [
              { name: "owner", internalType: "address", type: "address" },
              { name: "spender", internalType: "address", type: "address" },
              { name: "value", internalType: "uint256", type: "uint256" },
              { name: "deadline", internalType: "uint256", type: "uint256" },
              { name: "v", internalType: "uint8", type: "uint8" },
              { name: "r", internalType: "bytes32", type: "bytes32" },
              { name: "s", internalType: "bytes32", type: "bytes32" },
              { name: "token", internalType: "address", type: "address" },
            ],
          },
          {
            name: "fee",
            internalType: "struct IRelayUtils.FeeParams",
            type: "tuple",
            components: [
              { name: "feeToken", internalType: "address", type: "address" },
              { name: "feeAmount", internalType: "uint256", type: "uint256" },
              {
                name: "feeSwapPath",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          { name: "userNonce", internalType: "uint256", type: "uint256" },
          { name: "deadline", internalType: "uint256", type: "uint256" },
          { name: "signature", internalType: "bytes", type: "bytes" },
          { name: "desChainId", internalType: "uint256", type: "uint256" },
        ],
      },
      { name: "account", internalType: "address", type: "address" },
      { name: "srcChainId", internalType: "uint256", type: "uint256" },
      {
        name: "params",
        internalType: "struct UpdateOrderParams",
        type: "tuple",
        components: [
          { name: "key", internalType: "bytes32", type: "bytes32" },
          { name: "sizeDeltaUsd", internalType: "uint256", type: "uint256" },
          { name: "acceptablePrice", internalType: "uint256", type: "uint256" },
          { name: "triggerPrice", internalType: "uint256", type: "uint256" },
          { name: "minOutputAmount", internalType: "uint256", type: "uint256" },
          { name: "validFromTime", internalType: "uint256", type: "uint256" },
          { name: "autoCancel", internalType: "bool", type: "bool" },
          {
            name: "executionFeeIncrease",
            internalType: "uint256",
            type: "uint256",
          },
        ],
      },
    ],
    name: "updateOrder",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "", internalType: "address", type: "address" }],
    name: "userNonces",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

/**
 * [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5c80d035187D39Baa77625AA6BBc5b2B76AeE6Ba)
 */
export const multichainOrderRouterAddress = {
  421614: "0x5c80d035187D39Baa77625AA6BBc5b2B76AeE6Ba",
} as const;

/**
 * [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5c80d035187D39Baa77625AA6BBc5b2B76AeE6Ba)
 */
export const multichainOrderRouterConfig = {
  address: multichainOrderRouterAddress,
  abi: multichainOrderRouterAbi,
} as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MultichainSubaccountRouter
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x2CAEB911C921Fc0f5B0dE3825F4EfdD737ef5f4c)
 */
export const multichainSubaccountRouterAbi = [
  {
    type: "constructor",
    inputs: [
      {
        name: "params",
        internalType: "struct MultichainRouter.BaseConstructorParams",
        type: "tuple",
        components: [
          { name: "router", internalType: "contract Router", type: "address" },
          {
            name: "roleStore",
            internalType: "contract RoleStore",
            type: "address",
          },
          {
            name: "dataStore",
            internalType: "contract DataStore",
            type: "address",
          },
          {
            name: "eventEmitter",
            internalType: "contract EventEmitter",
            type: "address",
          },
          { name: "oracle", internalType: "contract IOracle", type: "address" },
          {
            name: "orderVault",
            internalType: "contract OrderVault",
            type: "address",
          },
          {
            name: "orderHandler",
            internalType: "contract IOrderHandler",
            type: "address",
          },
          {
            name: "swapHandler",
            internalType: "contract ISwapHandler",
            type: "address",
          },
          {
            name: "externalHandler",
            internalType: "contract IExternalHandler",
            type: "address",
          },
          {
            name: "multichainVault",
            internalType: "contract MultichainVault",
            type: "address",
          },
        ],
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "error",
    inputs: [
      { name: "currentTimestamp", internalType: "uint256", type: "uint256" },
      { name: "deadline", internalType: "uint256", type: "uint256" },
    ],
    name: "DeadlinePassed",
  },
  {
    type: "error",
    inputs: [{ name: "key", internalType: "bytes32", type: "bytes32" }],
    name: "DisabledFeature",
  },
  { type: "error", inputs: [], name: "EmptyHoldingAddress" },
  { type: "error", inputs: [], name: "EmptyOrder" },
  { type: "error", inputs: [], name: "EmptyReceiver" },
  { type: "error", inputs: [], name: "EmptyRelayFeeAddress" },
  {
    type: "error",
    inputs: [{ name: "token", internalType: "address", type: "address" }],
    name: "EmptyTokenTranferGasLimit",
  },
  {
    type: "error",
    inputs: [
      { name: "requiredRelayFee", internalType: "uint256", type: "uint256" },
      { name: "availableFeeAmount", internalType: "uint256", type: "uint256" },
    ],
    name: "InsufficientRelayFee",
  },
  {
    type: "error",
    inputs: [{ name: "desChainId", internalType: "uint256", type: "uint256" }],
    name: "InvalidDestinationChainId",
  },
  {
    type: "error",
    inputs: [
      { name: "sendTokensLength", internalType: "uint256", type: "uint256" },
      { name: "sendAmountsLength", internalType: "uint256", type: "uint256" },
    ],
    name: "InvalidExternalCalls",
  },
  {
    type: "error",
    inputs: [
      { name: "spender", internalType: "address", type: "address" },
      { name: "expectedSpender", internalType: "address", type: "address" },
    ],
    name: "InvalidPermitSpender",
  },
  {
    type: "error",
    inputs: [{ name: "srcChainId", internalType: "uint256", type: "uint256" }],
    name: "InvalidSrcChainId",
  },
  {
    type: "error",
    inputs: [
      { name: "storedUserNonce", internalType: "uint256", type: "uint256" },
      { name: "userNonce", internalType: "uint256", type: "uint256" },
    ],
    name: "InvalidUserNonce",
  },
  {
    type: "error",
    inputs: [
      { name: "feeUsd", internalType: "uint256", type: "uint256" },
      { name: "maxFeeUsd", internalType: "uint256", type: "uint256" },
    ],
    name: "MaxRelayFeeSwapForSubaccountExceeded",
  },
  {
    type: "error",
    inputs: [],
    name: "NonEmptyExternalCallsForSubaccountOrder",
  },
  {
    type: "error",
    inputs: [{ name: "calldataLength", internalType: "uint256", type: "uint256" }],
    name: "RelayCalldataTooLong",
  },
  { type: "error", inputs: [], name: "RelayEmptyBatch" },
  { type: "error", inputs: [], name: "TokenPermitsNotAllowedForMultichain" },
  {
    type: "error",
    inputs: [
      { name: "token", internalType: "address", type: "address" },
      { name: "receiver", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "TokenTransferError",
  },
  {
    type: "error",
    inputs: [
      { name: "msgSender", internalType: "address", type: "address" },
      { name: "role", internalType: "string", type: "string" },
    ],
    name: "Unauthorized",
  },
  {
    type: "error",
    inputs: [
      { name: "feeToken", internalType: "address", type: "address" },
      { name: "expectedFeeToken", internalType: "address", type: "address" },
    ],
    name: "UnexpectedRelayFeeToken",
  },
  {
    type: "error",
    inputs: [
      { name: "feeToken", internalType: "address", type: "address" },
      { name: "expectedFeeToken", internalType: "address", type: "address" },
    ],
    name: "UnsupportedRelayFeeToken",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "reason",
        internalType: "string",
        type: "string",
        indexed: false,
      },
      {
        name: "returndata",
        internalType: "bytes",
        type: "bytes",
        indexed: false,
      },
    ],
    name: "TokenTransferReverted",
  },
  {
    type: "function",
    inputs: [
      {
        name: "relayParams",
        internalType: "struct IRelayUtils.RelayParams",
        type: "tuple",
        components: [
          {
            name: "oracleParams",
            internalType: "struct OracleUtils.SetPricesParams",
            type: "tuple",
            components: [
              { name: "tokens", internalType: "address[]", type: "address[]" },
              {
                name: "providers",
                internalType: "address[]",
                type: "address[]",
              },
              { name: "data", internalType: "bytes[]", type: "bytes[]" },
            ],
          },
          {
            name: "externalCalls",
            internalType: "struct IRelayUtils.ExternalCalls",
            type: "tuple",
            components: [
              {
                name: "sendTokens",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "sendAmounts",
                internalType: "uint256[]",
                type: "uint256[]",
              },
              {
                name: "externalCallTargets",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "externalCallDataList",
                internalType: "bytes[]",
                type: "bytes[]",
              },
              {
                name: "refundTokens",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "refundReceivers",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          {
            name: "tokenPermits",
            internalType: "struct IRelayUtils.TokenPermit[]",
            type: "tuple[]",
            components: [
              { name: "owner", internalType: "address", type: "address" },
              { name: "spender", internalType: "address", type: "address" },
              { name: "value", internalType: "uint256", type: "uint256" },
              { name: "deadline", internalType: "uint256", type: "uint256" },
              { name: "v", internalType: "uint8", type: "uint8" },
              { name: "r", internalType: "bytes32", type: "bytes32" },
              { name: "s", internalType: "bytes32", type: "bytes32" },
              { name: "token", internalType: "address", type: "address" },
            ],
          },
          {
            name: "fee",
            internalType: "struct IRelayUtils.FeeParams",
            type: "tuple",
            components: [
              { name: "feeToken", internalType: "address", type: "address" },
              { name: "feeAmount", internalType: "uint256", type: "uint256" },
              {
                name: "feeSwapPath",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          { name: "userNonce", internalType: "uint256", type: "uint256" },
          { name: "deadline", internalType: "uint256", type: "uint256" },
          { name: "signature", internalType: "bytes", type: "bytes" },
          { name: "desChainId", internalType: "uint256", type: "uint256" },
        ],
      },
      {
        name: "subaccountApproval",
        internalType: "struct SubaccountApproval",
        type: "tuple",
        components: [
          { name: "subaccount", internalType: "address", type: "address" },
          { name: "shouldAdd", internalType: "bool", type: "bool" },
          { name: "expiresAt", internalType: "uint256", type: "uint256" },
          { name: "maxAllowedCount", internalType: "uint256", type: "uint256" },
          { name: "actionType", internalType: "bytes32", type: "bytes32" },
          { name: "nonce", internalType: "uint256", type: "uint256" },
          { name: "deadline", internalType: "uint256", type: "uint256" },
          { name: "integrationId", internalType: "bytes32", type: "bytes32" },
          { name: "signature", internalType: "bytes", type: "bytes" },
        ],
      },
      { name: "account", internalType: "address", type: "address" },
      { name: "srcChainId", internalType: "uint256", type: "uint256" },
      { name: "subaccount", internalType: "address", type: "address" },
      {
        name: "params",
        internalType: "struct BatchParams",
        type: "tuple",
        components: [
          {
            name: "createOrderParamsList",
            internalType: "struct IBaseOrderUtils.CreateOrderParams[]",
            type: "tuple[]",
            components: [
              {
                name: "addresses",
                internalType: "struct IBaseOrderUtils.CreateOrderParamsAddresses",
                type: "tuple",
                components: [
                  {
                    name: "receiver",
                    internalType: "address",
                    type: "address",
                  },
                  {
                    name: "cancellationReceiver",
                    internalType: "address",
                    type: "address",
                  },
                  {
                    name: "callbackContract",
                    internalType: "address",
                    type: "address",
                  },
                  {
                    name: "uiFeeReceiver",
                    internalType: "address",
                    type: "address",
                  },
                  { name: "market", internalType: "address", type: "address" },
                  {
                    name: "initialCollateralToken",
                    internalType: "address",
                    type: "address",
                  },
                  {
                    name: "swapPath",
                    internalType: "address[]",
                    type: "address[]",
                  },
                ],
              },
              {
                name: "numbers",
                internalType: "struct IBaseOrderUtils.CreateOrderParamsNumbers",
                type: "tuple",
                components: [
                  {
                    name: "sizeDeltaUsd",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "initialCollateralDeltaAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "triggerPrice",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "acceptablePrice",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "executionFee",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "callbackGasLimit",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "minOutputAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "validFromTime",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "orderType",
                internalType: "enum Order.OrderType",
                type: "uint8",
              },
              {
                name: "decreasePositionSwapType",
                internalType: "enum Order.DecreasePositionSwapType",
                type: "uint8",
              },
              { name: "isLong", internalType: "bool", type: "bool" },
              {
                name: "shouldUnwrapNativeToken",
                internalType: "bool",
                type: "bool",
              },
              { name: "autoCancel", internalType: "bool", type: "bool" },
              {
                name: "referralCode",
                internalType: "bytes32",
                type: "bytes32",
              },
              {
                name: "dataList",
                internalType: "bytes32[]",
                type: "bytes32[]",
              },
            ],
          },
          {
            name: "updateOrderParamsList",
            internalType: "struct UpdateOrderParams[]",
            type: "tuple[]",
            components: [
              { name: "key", internalType: "bytes32", type: "bytes32" },
              {
                name: "sizeDeltaUsd",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "acceptablePrice",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "triggerPrice",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "minOutputAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "validFromTime",
                internalType: "uint256",
                type: "uint256",
              },
              { name: "autoCancel", internalType: "bool", type: "bool" },
              {
                name: "executionFeeIncrease",
                internalType: "uint256",
                type: "uint256",
              },
            ],
          },
          {
            name: "cancelOrderKeys",
            internalType: "bytes32[]",
            type: "bytes32[]",
          },
        ],
      },
    ],
    name: "batch",
    outputs: [{ name: "", internalType: "bytes32[]", type: "bytes32[]" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      {
        name: "relayParams",
        internalType: "struct IRelayUtils.RelayParams",
        type: "tuple",
        components: [
          {
            name: "oracleParams",
            internalType: "struct OracleUtils.SetPricesParams",
            type: "tuple",
            components: [
              { name: "tokens", internalType: "address[]", type: "address[]" },
              {
                name: "providers",
                internalType: "address[]",
                type: "address[]",
              },
              { name: "data", internalType: "bytes[]", type: "bytes[]" },
            ],
          },
          {
            name: "externalCalls",
            internalType: "struct IRelayUtils.ExternalCalls",
            type: "tuple",
            components: [
              {
                name: "sendTokens",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "sendAmounts",
                internalType: "uint256[]",
                type: "uint256[]",
              },
              {
                name: "externalCallTargets",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "externalCallDataList",
                internalType: "bytes[]",
                type: "bytes[]",
              },
              {
                name: "refundTokens",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "refundReceivers",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          {
            name: "tokenPermits",
            internalType: "struct IRelayUtils.TokenPermit[]",
            type: "tuple[]",
            components: [
              { name: "owner", internalType: "address", type: "address" },
              { name: "spender", internalType: "address", type: "address" },
              { name: "value", internalType: "uint256", type: "uint256" },
              { name: "deadline", internalType: "uint256", type: "uint256" },
              { name: "v", internalType: "uint8", type: "uint8" },
              { name: "r", internalType: "bytes32", type: "bytes32" },
              { name: "s", internalType: "bytes32", type: "bytes32" },
              { name: "token", internalType: "address", type: "address" },
            ],
          },
          {
            name: "fee",
            internalType: "struct IRelayUtils.FeeParams",
            type: "tuple",
            components: [
              { name: "feeToken", internalType: "address", type: "address" },
              { name: "feeAmount", internalType: "uint256", type: "uint256" },
              {
                name: "feeSwapPath",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          { name: "userNonce", internalType: "uint256", type: "uint256" },
          { name: "deadline", internalType: "uint256", type: "uint256" },
          { name: "signature", internalType: "bytes", type: "bytes" },
          { name: "desChainId", internalType: "uint256", type: "uint256" },
        ],
      },
      {
        name: "subaccountApproval",
        internalType: "struct SubaccountApproval",
        type: "tuple",
        components: [
          { name: "subaccount", internalType: "address", type: "address" },
          { name: "shouldAdd", internalType: "bool", type: "bool" },
          { name: "expiresAt", internalType: "uint256", type: "uint256" },
          { name: "maxAllowedCount", internalType: "uint256", type: "uint256" },
          { name: "actionType", internalType: "bytes32", type: "bytes32" },
          { name: "nonce", internalType: "uint256", type: "uint256" },
          { name: "deadline", internalType: "uint256", type: "uint256" },
          { name: "integrationId", internalType: "bytes32", type: "bytes32" },
          { name: "signature", internalType: "bytes", type: "bytes" },
        ],
      },
      { name: "account", internalType: "address", type: "address" },
      { name: "srcChainId", internalType: "uint256", type: "uint256" },
      { name: "subaccount", internalType: "address", type: "address" },
      { name: "key", internalType: "bytes32", type: "bytes32" },
    ],
    name: "cancelOrder",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      {
        name: "relayParams",
        internalType: "struct IRelayUtils.RelayParams",
        type: "tuple",
        components: [
          {
            name: "oracleParams",
            internalType: "struct OracleUtils.SetPricesParams",
            type: "tuple",
            components: [
              { name: "tokens", internalType: "address[]", type: "address[]" },
              {
                name: "providers",
                internalType: "address[]",
                type: "address[]",
              },
              { name: "data", internalType: "bytes[]", type: "bytes[]" },
            ],
          },
          {
            name: "externalCalls",
            internalType: "struct IRelayUtils.ExternalCalls",
            type: "tuple",
            components: [
              {
                name: "sendTokens",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "sendAmounts",
                internalType: "uint256[]",
                type: "uint256[]",
              },
              {
                name: "externalCallTargets",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "externalCallDataList",
                internalType: "bytes[]",
                type: "bytes[]",
              },
              {
                name: "refundTokens",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "refundReceivers",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          {
            name: "tokenPermits",
            internalType: "struct IRelayUtils.TokenPermit[]",
            type: "tuple[]",
            components: [
              { name: "owner", internalType: "address", type: "address" },
              { name: "spender", internalType: "address", type: "address" },
              { name: "value", internalType: "uint256", type: "uint256" },
              { name: "deadline", internalType: "uint256", type: "uint256" },
              { name: "v", internalType: "uint8", type: "uint8" },
              { name: "r", internalType: "bytes32", type: "bytes32" },
              { name: "s", internalType: "bytes32", type: "bytes32" },
              { name: "token", internalType: "address", type: "address" },
            ],
          },
          {
            name: "fee",
            internalType: "struct IRelayUtils.FeeParams",
            type: "tuple",
            components: [
              { name: "feeToken", internalType: "address", type: "address" },
              { name: "feeAmount", internalType: "uint256", type: "uint256" },
              {
                name: "feeSwapPath",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          { name: "userNonce", internalType: "uint256", type: "uint256" },
          { name: "deadline", internalType: "uint256", type: "uint256" },
          { name: "signature", internalType: "bytes", type: "bytes" },
          { name: "desChainId", internalType: "uint256", type: "uint256" },
        ],
      },
      {
        name: "subaccountApproval",
        internalType: "struct SubaccountApproval",
        type: "tuple",
        components: [
          { name: "subaccount", internalType: "address", type: "address" },
          { name: "shouldAdd", internalType: "bool", type: "bool" },
          { name: "expiresAt", internalType: "uint256", type: "uint256" },
          { name: "maxAllowedCount", internalType: "uint256", type: "uint256" },
          { name: "actionType", internalType: "bytes32", type: "bytes32" },
          { name: "nonce", internalType: "uint256", type: "uint256" },
          { name: "deadline", internalType: "uint256", type: "uint256" },
          { name: "integrationId", internalType: "bytes32", type: "bytes32" },
          { name: "signature", internalType: "bytes", type: "bytes" },
        ],
      },
      { name: "account", internalType: "address", type: "address" },
      { name: "srcChainId", internalType: "uint256", type: "uint256" },
      { name: "subaccount", internalType: "address", type: "address" },
      {
        name: "params",
        internalType: "struct IBaseOrderUtils.CreateOrderParams",
        type: "tuple",
        components: [
          {
            name: "addresses",
            internalType: "struct IBaseOrderUtils.CreateOrderParamsAddresses",
            type: "tuple",
            components: [
              { name: "receiver", internalType: "address", type: "address" },
              {
                name: "cancellationReceiver",
                internalType: "address",
                type: "address",
              },
              {
                name: "callbackContract",
                internalType: "address",
                type: "address",
              },
              {
                name: "uiFeeReceiver",
                internalType: "address",
                type: "address",
              },
              { name: "market", internalType: "address", type: "address" },
              {
                name: "initialCollateralToken",
                internalType: "address",
                type: "address",
              },
              {
                name: "swapPath",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          {
            name: "numbers",
            internalType: "struct IBaseOrderUtils.CreateOrderParamsNumbers",
            type: "tuple",
            components: [
              {
                name: "sizeDeltaUsd",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "initialCollateralDeltaAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "triggerPrice",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "acceptablePrice",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "executionFee",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "callbackGasLimit",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "minOutputAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "validFromTime",
                internalType: "uint256",
                type: "uint256",
              },
            ],
          },
          {
            name: "orderType",
            internalType: "enum Order.OrderType",
            type: "uint8",
          },
          {
            name: "decreasePositionSwapType",
            internalType: "enum Order.DecreasePositionSwapType",
            type: "uint8",
          },
          { name: "isLong", internalType: "bool", type: "bool" },
          {
            name: "shouldUnwrapNativeToken",
            internalType: "bool",
            type: "bool",
          },
          { name: "autoCancel", internalType: "bool", type: "bool" },
          { name: "referralCode", internalType: "bytes32", type: "bytes32" },
          { name: "dataList", internalType: "bytes32[]", type: "bytes32[]" },
        ],
      },
    ],
    name: "createOrder",
    outputs: [{ name: "", internalType: "bytes32", type: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [],
    name: "dataStore",
    outputs: [{ name: "", internalType: "contract DataStore", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "eventEmitter",
    outputs: [{ name: "", internalType: "contract EventEmitter", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "externalHandler",
    outputs: [{ name: "", internalType: "contract IExternalHandler", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "data", internalType: "bytes[]", type: "bytes[]" }],
    name: "multicall",
    outputs: [{ name: "results", internalType: "bytes[]", type: "bytes[]" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [],
    name: "multichainVault",
    outputs: [{ name: "", internalType: "contract MultichainVault", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "oracle",
    outputs: [{ name: "", internalType: "contract IOracle", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "orderHandler",
    outputs: [{ name: "", internalType: "contract IOrderHandler", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "orderVault",
    outputs: [{ name: "", internalType: "contract OrderVault", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "relayParams",
        internalType: "struct IRelayUtils.RelayParams",
        type: "tuple",
        components: [
          {
            name: "oracleParams",
            internalType: "struct OracleUtils.SetPricesParams",
            type: "tuple",
            components: [
              { name: "tokens", internalType: "address[]", type: "address[]" },
              {
                name: "providers",
                internalType: "address[]",
                type: "address[]",
              },
              { name: "data", internalType: "bytes[]", type: "bytes[]" },
            ],
          },
          {
            name: "externalCalls",
            internalType: "struct IRelayUtils.ExternalCalls",
            type: "tuple",
            components: [
              {
                name: "sendTokens",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "sendAmounts",
                internalType: "uint256[]",
                type: "uint256[]",
              },
              {
                name: "externalCallTargets",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "externalCallDataList",
                internalType: "bytes[]",
                type: "bytes[]",
              },
              {
                name: "refundTokens",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "refundReceivers",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          {
            name: "tokenPermits",
            internalType: "struct IRelayUtils.TokenPermit[]",
            type: "tuple[]",
            components: [
              { name: "owner", internalType: "address", type: "address" },
              { name: "spender", internalType: "address", type: "address" },
              { name: "value", internalType: "uint256", type: "uint256" },
              { name: "deadline", internalType: "uint256", type: "uint256" },
              { name: "v", internalType: "uint8", type: "uint8" },
              { name: "r", internalType: "bytes32", type: "bytes32" },
              { name: "s", internalType: "bytes32", type: "bytes32" },
              { name: "token", internalType: "address", type: "address" },
            ],
          },
          {
            name: "fee",
            internalType: "struct IRelayUtils.FeeParams",
            type: "tuple",
            components: [
              { name: "feeToken", internalType: "address", type: "address" },
              { name: "feeAmount", internalType: "uint256", type: "uint256" },
              {
                name: "feeSwapPath",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          { name: "userNonce", internalType: "uint256", type: "uint256" },
          { name: "deadline", internalType: "uint256", type: "uint256" },
          { name: "signature", internalType: "bytes", type: "bytes" },
          { name: "desChainId", internalType: "uint256", type: "uint256" },
        ],
      },
      { name: "account", internalType: "address", type: "address" },
      { name: "srcChainId", internalType: "uint256", type: "uint256" },
      { name: "subaccount", internalType: "address", type: "address" },
    ],
    name: "removeSubaccount",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [],
    name: "roleStore",
    outputs: [{ name: "", internalType: "contract RoleStore", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "router",
    outputs: [{ name: "", internalType: "contract Router", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "receiver", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "sendNativeToken",
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [
      { name: "token", internalType: "address", type: "address" },
      { name: "receiver", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "sendTokens",
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [
      { name: "receiver", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "sendWnt",
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [{ name: "", internalType: "address", type: "address" }],
    name: "subaccountApprovalNonces",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "swapHandler",
    outputs: [{ name: "", internalType: "contract ISwapHandler", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "relayParams",
        internalType: "struct IRelayUtils.RelayParams",
        type: "tuple",
        components: [
          {
            name: "oracleParams",
            internalType: "struct OracleUtils.SetPricesParams",
            type: "tuple",
            components: [
              { name: "tokens", internalType: "address[]", type: "address[]" },
              {
                name: "providers",
                internalType: "address[]",
                type: "address[]",
              },
              { name: "data", internalType: "bytes[]", type: "bytes[]" },
            ],
          },
          {
            name: "externalCalls",
            internalType: "struct IRelayUtils.ExternalCalls",
            type: "tuple",
            components: [
              {
                name: "sendTokens",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "sendAmounts",
                internalType: "uint256[]",
                type: "uint256[]",
              },
              {
                name: "externalCallTargets",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "externalCallDataList",
                internalType: "bytes[]",
                type: "bytes[]",
              },
              {
                name: "refundTokens",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "refundReceivers",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          {
            name: "tokenPermits",
            internalType: "struct IRelayUtils.TokenPermit[]",
            type: "tuple[]",
            components: [
              { name: "owner", internalType: "address", type: "address" },
              { name: "spender", internalType: "address", type: "address" },
              { name: "value", internalType: "uint256", type: "uint256" },
              { name: "deadline", internalType: "uint256", type: "uint256" },
              { name: "v", internalType: "uint8", type: "uint8" },
              { name: "r", internalType: "bytes32", type: "bytes32" },
              { name: "s", internalType: "bytes32", type: "bytes32" },
              { name: "token", internalType: "address", type: "address" },
            ],
          },
          {
            name: "fee",
            internalType: "struct IRelayUtils.FeeParams",
            type: "tuple",
            components: [
              { name: "feeToken", internalType: "address", type: "address" },
              { name: "feeAmount", internalType: "uint256", type: "uint256" },
              {
                name: "feeSwapPath",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          { name: "userNonce", internalType: "uint256", type: "uint256" },
          { name: "deadline", internalType: "uint256", type: "uint256" },
          { name: "signature", internalType: "bytes", type: "bytes" },
          { name: "desChainId", internalType: "uint256", type: "uint256" },
        ],
      },
      {
        name: "subaccountApproval",
        internalType: "struct SubaccountApproval",
        type: "tuple",
        components: [
          { name: "subaccount", internalType: "address", type: "address" },
          { name: "shouldAdd", internalType: "bool", type: "bool" },
          { name: "expiresAt", internalType: "uint256", type: "uint256" },
          { name: "maxAllowedCount", internalType: "uint256", type: "uint256" },
          { name: "actionType", internalType: "bytes32", type: "bytes32" },
          { name: "nonce", internalType: "uint256", type: "uint256" },
          { name: "deadline", internalType: "uint256", type: "uint256" },
          { name: "integrationId", internalType: "bytes32", type: "bytes32" },
          { name: "signature", internalType: "bytes", type: "bytes" },
        ],
      },
      { name: "account", internalType: "address", type: "address" },
      { name: "srcChainId", internalType: "uint256", type: "uint256" },
      { name: "subaccount", internalType: "address", type: "address" },
      {
        name: "params",
        internalType: "struct UpdateOrderParams",
        type: "tuple",
        components: [
          { name: "key", internalType: "bytes32", type: "bytes32" },
          { name: "sizeDeltaUsd", internalType: "uint256", type: "uint256" },
          { name: "acceptablePrice", internalType: "uint256", type: "uint256" },
          { name: "triggerPrice", internalType: "uint256", type: "uint256" },
          { name: "minOutputAmount", internalType: "uint256", type: "uint256" },
          { name: "validFromTime", internalType: "uint256", type: "uint256" },
          { name: "autoCancel", internalType: "bool", type: "bool" },
          {
            name: "executionFeeIncrease",
            internalType: "uint256",
            type: "uint256",
          },
        ],
      },
    ],
    name: "updateOrder",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "", internalType: "address", type: "address" }],
    name: "userNonces",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

/**
 * [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x2CAEB911C921Fc0f5B0dE3825F4EfdD737ef5f4c)
 */
export const multichainSubaccountRouterAddress = {
  421614: "0x2CAEB911C921Fc0f5B0dE3825F4EfdD737ef5f4c",
} as const;

/**
 * [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x2CAEB911C921Fc0f5B0dE3825F4EfdD737ef5f4c)
 */
export const multichainSubaccountRouterConfig = {
  address: multichainSubaccountRouterAddress,
  abi: multichainSubaccountRouterAbi,
} as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MultichainTransferRouter
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x0C5Ac8CB91138a3551DF186BD0c467d05aD1ae07)
 */
export const multichainTransferRouterAbi = [
  {
    type: "constructor",
    inputs: [
      {
        name: "params",
        internalType: "struct MultichainRouter.BaseConstructorParams",
        type: "tuple",
        components: [
          { name: "router", internalType: "contract Router", type: "address" },
          {
            name: "roleStore",
            internalType: "contract RoleStore",
            type: "address",
          },
          {
            name: "dataStore",
            internalType: "contract DataStore",
            type: "address",
          },
          {
            name: "eventEmitter",
            internalType: "contract EventEmitter",
            type: "address",
          },
          { name: "oracle", internalType: "contract IOracle", type: "address" },
          {
            name: "orderVault",
            internalType: "contract OrderVault",
            type: "address",
          },
          {
            name: "orderHandler",
            internalType: "contract IOrderHandler",
            type: "address",
          },
          {
            name: "swapHandler",
            internalType: "contract ISwapHandler",
            type: "address",
          },
          {
            name: "externalHandler",
            internalType: "contract IExternalHandler",
            type: "address",
          },
          {
            name: "multichainVault",
            internalType: "contract MultichainVault",
            type: "address",
          },
        ],
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "error",
    inputs: [
      { name: "currentTimestamp", internalType: "uint256", type: "uint256" },
      { name: "deadline", internalType: "uint256", type: "uint256" },
    ],
    name: "DeadlinePassed",
  },
  {
    type: "error",
    inputs: [{ name: "key", internalType: "bytes32", type: "bytes32" }],
    name: "DisabledFeature",
  },
  { type: "error", inputs: [], name: "EmptyHoldingAddress" },
  { type: "error", inputs: [], name: "EmptyReceiver" },
  { type: "error", inputs: [], name: "EmptyRelayFeeAddress" },
  {
    type: "error",
    inputs: [{ name: "token", internalType: "address", type: "address" }],
    name: "EmptyTokenTranferGasLimit",
  },
  {
    type: "error",
    inputs: [
      { name: "requiredRelayFee", internalType: "uint256", type: "uint256" },
      { name: "availableFeeAmount", internalType: "uint256", type: "uint256" },
    ],
    name: "InsufficientRelayFee",
  },
  {
    type: "error",
    inputs: [{ name: "desChainId", internalType: "uint256", type: "uint256" }],
    name: "InvalidDestinationChainId",
  },
  {
    type: "error",
    inputs: [
      { name: "sendTokensLength", internalType: "uint256", type: "uint256" },
      { name: "sendAmountsLength", internalType: "uint256", type: "uint256" },
    ],
    name: "InvalidExternalCalls",
  },
  {
    type: "error",
    inputs: [{ name: "provider", internalType: "address", type: "address" }],
    name: "InvalidMultichainProvider",
  },
  {
    type: "error",
    inputs: [
      { name: "spender", internalType: "address", type: "address" },
      { name: "expectedSpender", internalType: "address", type: "address" },
    ],
    name: "InvalidPermitSpender",
  },
  {
    type: "error",
    inputs: [{ name: "srcChainId", internalType: "uint256", type: "uint256" }],
    name: "InvalidSrcChainId",
  },
  {
    type: "error",
    inputs: [
      { name: "storedUserNonce", internalType: "uint256", type: "uint256" },
      { name: "userNonce", internalType: "uint256", type: "uint256" },
    ],
    name: "InvalidUserNonce",
  },
  {
    type: "error",
    inputs: [
      { name: "feeUsd", internalType: "uint256", type: "uint256" },
      { name: "maxFeeUsd", internalType: "uint256", type: "uint256" },
    ],
    name: "MaxRelayFeeSwapForSubaccountExceeded",
  },
  {
    type: "error",
    inputs: [],
    name: "NonEmptyExternalCallsForSubaccountOrder",
  },
  {
    type: "error",
    inputs: [{ name: "calldataLength", internalType: "uint256", type: "uint256" }],
    name: "RelayCalldataTooLong",
  },
  { type: "error", inputs: [], name: "TokenPermitsNotAllowedForMultichain" },
  {
    type: "error",
    inputs: [
      { name: "token", internalType: "address", type: "address" },
      { name: "receiver", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "TokenTransferError",
  },
  {
    type: "error",
    inputs: [
      { name: "msgSender", internalType: "address", type: "address" },
      { name: "role", internalType: "string", type: "string" },
    ],
    name: "Unauthorized",
  },
  {
    type: "error",
    inputs: [
      { name: "feeToken", internalType: "address", type: "address" },
      { name: "expectedFeeToken", internalType: "address", type: "address" },
    ],
    name: "UnexpectedRelayFeeToken",
  },
  {
    type: "error",
    inputs: [
      { name: "feeToken", internalType: "address", type: "address" },
      { name: "expectedFeeToken", internalType: "address", type: "address" },
    ],
    name: "UnsupportedRelayFeeToken",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [{ name: "version", internalType: "uint8", type: "uint8", indexed: false }],
    name: "Initialized",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "reason",
        internalType: "string",
        type: "string",
        indexed: false,
      },
      {
        name: "returndata",
        internalType: "bytes",
        type: "bytes",
        indexed: false,
      },
    ],
    name: "TokenTransferReverted",
  },
  {
    type: "function",
    inputs: [
      { name: "account", internalType: "address", type: "address" },
      { name: "token", internalType: "address", type: "address" },
    ],
    name: "bridgeIn",
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [
      {
        name: "relayParams",
        internalType: "struct IRelayUtils.RelayParams",
        type: "tuple",
        components: [
          {
            name: "oracleParams",
            internalType: "struct OracleUtils.SetPricesParams",
            type: "tuple",
            components: [
              { name: "tokens", internalType: "address[]", type: "address[]" },
              {
                name: "providers",
                internalType: "address[]",
                type: "address[]",
              },
              { name: "data", internalType: "bytes[]", type: "bytes[]" },
            ],
          },
          {
            name: "externalCalls",
            internalType: "struct IRelayUtils.ExternalCalls",
            type: "tuple",
            components: [
              {
                name: "sendTokens",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "sendAmounts",
                internalType: "uint256[]",
                type: "uint256[]",
              },
              {
                name: "externalCallTargets",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "externalCallDataList",
                internalType: "bytes[]",
                type: "bytes[]",
              },
              {
                name: "refundTokens",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "refundReceivers",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          {
            name: "tokenPermits",
            internalType: "struct IRelayUtils.TokenPermit[]",
            type: "tuple[]",
            components: [
              { name: "owner", internalType: "address", type: "address" },
              { name: "spender", internalType: "address", type: "address" },
              { name: "value", internalType: "uint256", type: "uint256" },
              { name: "deadline", internalType: "uint256", type: "uint256" },
              { name: "v", internalType: "uint8", type: "uint8" },
              { name: "r", internalType: "bytes32", type: "bytes32" },
              { name: "s", internalType: "bytes32", type: "bytes32" },
              { name: "token", internalType: "address", type: "address" },
            ],
          },
          {
            name: "fee",
            internalType: "struct IRelayUtils.FeeParams",
            type: "tuple",
            components: [
              { name: "feeToken", internalType: "address", type: "address" },
              { name: "feeAmount", internalType: "uint256", type: "uint256" },
              {
                name: "feeSwapPath",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          { name: "userNonce", internalType: "uint256", type: "uint256" },
          { name: "deadline", internalType: "uint256", type: "uint256" },
          { name: "signature", internalType: "bytes", type: "bytes" },
          { name: "desChainId", internalType: "uint256", type: "uint256" },
        ],
      },
      { name: "account", internalType: "address", type: "address" },
      { name: "srcChainId", internalType: "uint256", type: "uint256" },
      {
        name: "params",
        internalType: "struct IRelayUtils.BridgeOutParams",
        type: "tuple",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "amount", internalType: "uint256", type: "uint256" },
          { name: "provider", internalType: "address", type: "address" },
          { name: "data", internalType: "bytes", type: "bytes" },
        ],
      },
    ],
    name: "bridgeOut",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [
      {
        name: "relayParams",
        internalType: "struct IRelayUtils.RelayParams",
        type: "tuple",
        components: [
          {
            name: "oracleParams",
            internalType: "struct OracleUtils.SetPricesParams",
            type: "tuple",
            components: [
              { name: "tokens", internalType: "address[]", type: "address[]" },
              {
                name: "providers",
                internalType: "address[]",
                type: "address[]",
              },
              { name: "data", internalType: "bytes[]", type: "bytes[]" },
            ],
          },
          {
            name: "externalCalls",
            internalType: "struct IRelayUtils.ExternalCalls",
            type: "tuple",
            components: [
              {
                name: "sendTokens",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "sendAmounts",
                internalType: "uint256[]",
                type: "uint256[]",
              },
              {
                name: "externalCallTargets",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "externalCallDataList",
                internalType: "bytes[]",
                type: "bytes[]",
              },
              {
                name: "refundTokens",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "refundReceivers",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          {
            name: "tokenPermits",
            internalType: "struct IRelayUtils.TokenPermit[]",
            type: "tuple[]",
            components: [
              { name: "owner", internalType: "address", type: "address" },
              { name: "spender", internalType: "address", type: "address" },
              { name: "value", internalType: "uint256", type: "uint256" },
              { name: "deadline", internalType: "uint256", type: "uint256" },
              { name: "v", internalType: "uint8", type: "uint8" },
              { name: "r", internalType: "bytes32", type: "bytes32" },
              { name: "s", internalType: "bytes32", type: "bytes32" },
              { name: "token", internalType: "address", type: "address" },
            ],
          },
          {
            name: "fee",
            internalType: "struct IRelayUtils.FeeParams",
            type: "tuple",
            components: [
              { name: "feeToken", internalType: "address", type: "address" },
              { name: "feeAmount", internalType: "uint256", type: "uint256" },
              {
                name: "feeSwapPath",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          { name: "userNonce", internalType: "uint256", type: "uint256" },
          { name: "deadline", internalType: "uint256", type: "uint256" },
          { name: "signature", internalType: "bytes", type: "bytes" },
          { name: "desChainId", internalType: "uint256", type: "uint256" },
        ],
      },
      { name: "account", internalType: "address", type: "address" },
      { name: "srcChainId", internalType: "uint256", type: "uint256" },
      {
        name: "params",
        internalType: "struct IRelayUtils.BridgeOutParams",
        type: "tuple",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "amount", internalType: "uint256", type: "uint256" },
          { name: "provider", internalType: "address", type: "address" },
          { name: "data", internalType: "bytes", type: "bytes" },
        ],
      },
    ],
    name: "bridgeOutFromController",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [],
    name: "dataStore",
    outputs: [{ name: "", internalType: "contract DataStore", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "eventEmitter",
    outputs: [{ name: "", internalType: "contract EventEmitter", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "externalHandler",
    outputs: [{ name: "", internalType: "contract IExternalHandler", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [{ name: "_multichainProvider", internalType: "address", type: "address" }],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "data", internalType: "bytes[]", type: "bytes[]" }],
    name: "multicall",
    outputs: [{ name: "results", internalType: "bytes[]", type: "bytes[]" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [],
    name: "multichainProvider",
    outputs: [
      {
        name: "",
        internalType: "contract IMultichainProvider",
        type: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "multichainVault",
    outputs: [{ name: "", internalType: "contract MultichainVault", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "oracle",
    outputs: [{ name: "", internalType: "contract IOracle", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "orderHandler",
    outputs: [{ name: "", internalType: "contract IOrderHandler", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "orderVault",
    outputs: [{ name: "", internalType: "contract OrderVault", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "roleStore",
    outputs: [{ name: "", internalType: "contract RoleStore", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [],
    name: "router",
    outputs: [{ name: "", internalType: "contract Router", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      { name: "receiver", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "sendNativeToken",
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [
      { name: "token", internalType: "address", type: "address" },
      { name: "receiver", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "sendTokens",
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [
      { name: "receiver", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "sendWnt",
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    inputs: [],
    name: "swapHandler",
    outputs: [{ name: "", internalType: "contract ISwapHandler", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "params",
        internalType: "struct IRelayUtils.BridgeOutParams",
        type: "tuple",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "amount", internalType: "uint256", type: "uint256" },
          { name: "provider", internalType: "address", type: "address" },
          { name: "data", internalType: "bytes", type: "bytes" },
        ],
      },
    ],
    name: "transferOut",
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    inputs: [{ name: "", internalType: "address", type: "address" }],
    name: "userNonces",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

/**
 * [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x0C5Ac8CB91138a3551DF186BD0c467d05aD1ae07)
 */
export const multichainTransferRouterAddress = {
  421614: "0x0C5Ac8CB91138a3551DF186BD0c467d05aD1ae07",
} as const;

/**
 * [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x0C5Ac8CB91138a3551DF186BD0c467d05aD1ae07)
 */
export const multichainTransferRouterConfig = {
  address: multichainTransferRouterAddress,
  abi: multichainTransferRouterAbi,
} as const;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SyntheticsReader
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const syntheticsReaderAbi = [
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      { name: "account", internalType: "address", type: "address" },
      { name: "start", internalType: "uint256", type: "uint256" },
      { name: "end", internalType: "uint256", type: "uint256" },
    ],
    name: "getAccountOrders",
    outputs: [
      {
        name: "",
        internalType: "struct ReaderUtils.OrderInfo[]",
        type: "tuple[]",
        components: [
          { name: "orderKey", internalType: "bytes32", type: "bytes32" },
          {
            name: "order",
            internalType: "struct Order.Props",
            type: "tuple",
            components: [
              {
                name: "addresses",
                internalType: "struct Order.Addresses",
                type: "tuple",
                components: [
                  { name: "account", internalType: "address", type: "address" },
                  {
                    name: "receiver",
                    internalType: "address",
                    type: "address",
                  },
                  {
                    name: "cancellationReceiver",
                    internalType: "address",
                    type: "address",
                  },
                  {
                    name: "callbackContract",
                    internalType: "address",
                    type: "address",
                  },
                  {
                    name: "uiFeeReceiver",
                    internalType: "address",
                    type: "address",
                  },
                  { name: "market", internalType: "address", type: "address" },
                  {
                    name: "initialCollateralToken",
                    internalType: "address",
                    type: "address",
                  },
                  {
                    name: "swapPath",
                    internalType: "address[]",
                    type: "address[]",
                  },
                ],
              },
              {
                name: "numbers",
                internalType: "struct Order.Numbers",
                type: "tuple",
                components: [
                  {
                    name: "orderType",
                    internalType: "enum Order.OrderType",
                    type: "uint8",
                  },
                  {
                    name: "decreasePositionSwapType",
                    internalType: "enum Order.DecreasePositionSwapType",
                    type: "uint8",
                  },
                  {
                    name: "sizeDeltaUsd",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "initialCollateralDeltaAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "triggerPrice",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "acceptablePrice",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "executionFee",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "callbackGasLimit",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "minOutputAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "updatedAtTime",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "validFromTime",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "srcChainId",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "flags",
                internalType: "struct Order.Flags",
                type: "tuple",
                components: [
                  { name: "isLong", internalType: "bool", type: "bool" },
                  {
                    name: "shouldUnwrapNativeToken",
                    internalType: "bool",
                    type: "bool",
                  },
                  { name: "isFrozen", internalType: "bool", type: "bool" },
                  { name: "autoCancel", internalType: "bool", type: "bool" },
                ],
              },
              {
                name: "_dataList",
                internalType: "bytes32[]",
                type: "bytes32[]",
              },
            ],
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      {
        name: "referralStorage",
        internalType: "contract IReferralStorage",
        type: "address",
      },
      { name: "account", internalType: "address", type: "address" },
      { name: "markets", internalType: "address[]", type: "address[]" },
      {
        name: "marketPrices",
        internalType: "struct MarketUtils.MarketPrices[]",
        type: "tuple[]",
        components: [
          {
            name: "indexTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "longTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "shortTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
        ],
      },
      { name: "uiFeeReceiver", internalType: "address", type: "address" },
      { name: "start", internalType: "uint256", type: "uint256" },
      { name: "end", internalType: "uint256", type: "uint256" },
    ],
    name: "getAccountPositionInfoList",
    outputs: [
      {
        name: "",
        internalType: "struct ReaderPositionUtils.PositionInfo[]",
        type: "tuple[]",
        components: [
          { name: "positionKey", internalType: "bytes32", type: "bytes32" },
          {
            name: "position",
            internalType: "struct Position.Props",
            type: "tuple",
            components: [
              {
                name: "addresses",
                internalType: "struct Position.Addresses",
                type: "tuple",
                components: [
                  { name: "account", internalType: "address", type: "address" },
                  { name: "market", internalType: "address", type: "address" },
                  {
                    name: "collateralToken",
                    internalType: "address",
                    type: "address",
                  },
                ],
              },
              {
                name: "numbers",
                internalType: "struct Position.Numbers",
                type: "tuple",
                components: [
                  {
                    name: "sizeInUsd",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "sizeInTokens",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "collateralAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "pendingImpactAmount",
                    internalType: "int256",
                    type: "int256",
                  },
                  {
                    name: "borrowingFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "fundingFeeAmountPerSize",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "longTokenClaimableFundingAmountPerSize",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "shortTokenClaimableFundingAmountPerSize",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "increasedAtTime",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "decreasedAtTime",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "flags",
                internalType: "struct Position.Flags",
                type: "tuple",
                components: [{ name: "isLong", internalType: "bool", type: "bool" }],
              },
            ],
          },
          {
            name: "fees",
            internalType: "struct PositionPricingUtils.PositionFees",
            type: "tuple",
            components: [
              {
                name: "referral",
                internalType: "struct PositionPricingUtils.PositionReferralFees",
                type: "tuple",
                components: [
                  {
                    name: "referralCode",
                    internalType: "bytes32",
                    type: "bytes32",
                  },
                  {
                    name: "affiliate",
                    internalType: "address",
                    type: "address",
                  },
                  { name: "trader", internalType: "address", type: "address" },
                  {
                    name: "totalRebateFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "affiliateRewardFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "adjustedAffiliateRewardFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "traderDiscountFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "totalRebateAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "traderDiscountAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "affiliateRewardAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "pro",
                internalType: "struct PositionPricingUtils.PositionProFees",
                type: "tuple",
                components: [
                  {
                    name: "traderTier",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "traderDiscountFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "traderDiscountAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "funding",
                internalType: "struct PositionPricingUtils.PositionFundingFees",
                type: "tuple",
                components: [
                  {
                    name: "fundingFeeAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "claimableLongTokenAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "claimableShortTokenAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "latestFundingFeeAmountPerSize",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "latestLongTokenClaimableFundingAmountPerSize",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "latestShortTokenClaimableFundingAmountPerSize",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "borrowing",
                internalType: "struct PositionPricingUtils.PositionBorrowingFees",
                type: "tuple",
                components: [
                  {
                    name: "borrowingFeeUsd",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "borrowingFeeAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "borrowingFeeReceiverFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "borrowingFeeAmountForFeeReceiver",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "ui",
                internalType: "struct PositionPricingUtils.PositionUiFees",
                type: "tuple",
                components: [
                  {
                    name: "uiFeeReceiver",
                    internalType: "address",
                    type: "address",
                  },
                  {
                    name: "uiFeeReceiverFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "uiFeeAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "liquidation",
                internalType: "struct PositionPricingUtils.PositionLiquidationFees",
                type: "tuple",
                components: [
                  {
                    name: "liquidationFeeUsd",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "liquidationFeeAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "liquidationFeeReceiverFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "liquidationFeeAmountForFeeReceiver",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "collateralTokenPrice",
                internalType: "struct Price.Props",
                type: "tuple",
                components: [
                  { name: "min", internalType: "uint256", type: "uint256" },
                  { name: "max", internalType: "uint256", type: "uint256" },
                ],
              },
              {
                name: "positionFeeFactor",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "protocolFeeAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "positionFeeReceiverFactor",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "feeReceiverAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "feeAmountForPool",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "positionFeeAmountForPool",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "positionFeeAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "totalCostAmountExcludingFunding",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "totalCostAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "totalDiscountAmount",
                internalType: "uint256",
                type: "uint256",
              },
            ],
          },
          {
            name: "executionPriceResult",
            internalType: "struct ReaderPricingUtils.ExecutionPriceResult",
            type: "tuple",
            components: [
              {
                name: "priceImpactUsd",
                internalType: "int256",
                type: "int256",
              },
              {
                name: "executionPrice",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "balanceWasImproved",
                internalType: "bool",
                type: "bool",
              },
            ],
          },
          { name: "basePnlUsd", internalType: "int256", type: "int256" },
          {
            name: "uncappedBasePnlUsd",
            internalType: "int256",
            type: "int256",
          },
          {
            name: "pnlAfterPriceImpactUsd",
            internalType: "int256",
            type: "int256",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      { name: "account", internalType: "address", type: "address" },
      { name: "start", internalType: "uint256", type: "uint256" },
      { name: "end", internalType: "uint256", type: "uint256" },
    ],
    name: "getAccountPositions",
    outputs: [
      {
        name: "",
        internalType: "struct Position.Props[]",
        type: "tuple[]",
        components: [
          {
            name: "addresses",
            internalType: "struct Position.Addresses",
            type: "tuple",
            components: [
              { name: "account", internalType: "address", type: "address" },
              { name: "market", internalType: "address", type: "address" },
              {
                name: "collateralToken",
                internalType: "address",
                type: "address",
              },
            ],
          },
          {
            name: "numbers",
            internalType: "struct Position.Numbers",
            type: "tuple",
            components: [
              { name: "sizeInUsd", internalType: "uint256", type: "uint256" },
              {
                name: "sizeInTokens",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "collateralAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "pendingImpactAmount",
                internalType: "int256",
                type: "int256",
              },
              {
                name: "borrowingFactor",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "fundingFeeAmountPerSize",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "longTokenClaimableFundingAmountPerSize",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "shortTokenClaimableFundingAmountPerSize",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "increasedAtTime",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "decreasedAtTime",
                internalType: "uint256",
                type: "uint256",
              },
            ],
          },
          {
            name: "flags",
            internalType: "struct Position.Flags",
            type: "tuple",
            components: [{ name: "isLong", internalType: "bool", type: "bool" }],
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      { name: "market", internalType: "address", type: "address" },
      { name: "isLong", internalType: "bool", type: "bool" },
      {
        name: "prices",
        internalType: "struct MarketUtils.MarketPrices",
        type: "tuple",
        components: [
          {
            name: "indexTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "longTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "shortTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
        ],
      },
    ],
    name: "getAdlState",
    outputs: [
      { name: "", internalType: "uint256", type: "uint256" },
      { name: "", internalType: "bool", type: "bool" },
      { name: "", internalType: "int256", type: "int256" },
      { name: "", internalType: "uint256", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      { name: "key", internalType: "bytes32", type: "bytes32" },
    ],
    name: "getDeposit",
    outputs: [
      {
        name: "",
        internalType: "struct Deposit.Props",
        type: "tuple",
        components: [
          {
            name: "addresses",
            internalType: "struct Deposit.Addresses",
            type: "tuple",
            components: [
              { name: "account", internalType: "address", type: "address" },
              { name: "receiver", internalType: "address", type: "address" },
              {
                name: "callbackContract",
                internalType: "address",
                type: "address",
              },
              {
                name: "uiFeeReceiver",
                internalType: "address",
                type: "address",
              },
              { name: "market", internalType: "address", type: "address" },
              {
                name: "initialLongToken",
                internalType: "address",
                type: "address",
              },
              {
                name: "initialShortToken",
                internalType: "address",
                type: "address",
              },
              {
                name: "longTokenSwapPath",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "shortTokenSwapPath",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          {
            name: "numbers",
            internalType: "struct Deposit.Numbers",
            type: "tuple",
            components: [
              {
                name: "initialLongTokenAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "initialShortTokenAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "minMarketTokens",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "updatedAtTime",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "executionFee",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "callbackGasLimit",
                internalType: "uint256",
                type: "uint256",
              },
              { name: "srcChainId", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "flags",
            internalType: "struct Deposit.Flags",
            type: "tuple",
            components: [
              {
                name: "shouldUnwrapNativeToken",
                internalType: "bool",
                type: "bool",
              },
            ],
          },
          { name: "_dataList", internalType: "bytes32[]", type: "bytes32[]" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      {
        name: "market",
        internalType: "struct Market.Props",
        type: "tuple",
        components: [
          { name: "marketToken", internalType: "address", type: "address" },
          { name: "indexToken", internalType: "address", type: "address" },
          { name: "longToken", internalType: "address", type: "address" },
          { name: "shortToken", internalType: "address", type: "address" },
        ],
      },
      {
        name: "prices",
        internalType: "struct MarketUtils.MarketPrices",
        type: "tuple",
        components: [
          {
            name: "indexTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "longTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "shortTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
        ],
      },
      { name: "longTokenAmount", internalType: "uint256", type: "uint256" },
      { name: "shortTokenAmount", internalType: "uint256", type: "uint256" },
      { name: "uiFeeReceiver", internalType: "address", type: "address" },
      {
        name: "swapPricingType",
        internalType: "enum ISwapPricingUtils.SwapPricingType",
        type: "uint8",
      },
      {
        name: "includeVirtualInventoryImpact",
        internalType: "bool",
        type: "bool",
      },
    ],
    name: "getDepositAmountOut",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      { name: "marketKey", internalType: "address", type: "address" },
      {
        name: "prices",
        internalType: "struct MarketUtils.MarketPrices",
        type: "tuple",
        components: [
          {
            name: "indexTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "longTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "shortTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
        ],
      },
      { name: "positionSizeInUsd", internalType: "uint256", type: "uint256" },
      {
        name: "positionSizeInTokens",
        internalType: "uint256",
        type: "uint256",
      },
      { name: "sizeDeltaUsd", internalType: "int256", type: "int256" },
      { name: "isLong", internalType: "bool", type: "bool" },
    ],
    name: "getExecutionPrice",
    outputs: [
      {
        name: "",
        internalType: "struct ReaderPricingUtils.ExecutionPriceResult",
        type: "tuple",
        components: [
          { name: "priceImpactUsd", internalType: "int256", type: "int256" },
          { name: "executionPrice", internalType: "uint256", type: "uint256" },
          { name: "balanceWasImproved", internalType: "bool", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      { name: "key", internalType: "address", type: "address" },
    ],
    name: "getMarket",
    outputs: [
      {
        name: "",
        internalType: "struct Market.Props",
        type: "tuple",
        components: [
          { name: "marketToken", internalType: "address", type: "address" },
          { name: "indexToken", internalType: "address", type: "address" },
          { name: "longToken", internalType: "address", type: "address" },
          { name: "shortToken", internalType: "address", type: "address" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      { name: "salt", internalType: "bytes32", type: "bytes32" },
    ],
    name: "getMarketBySalt",
    outputs: [
      {
        name: "",
        internalType: "struct Market.Props",
        type: "tuple",
        components: [
          { name: "marketToken", internalType: "address", type: "address" },
          { name: "indexToken", internalType: "address", type: "address" },
          { name: "longToken", internalType: "address", type: "address" },
          { name: "shortToken", internalType: "address", type: "address" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      {
        name: "prices",
        internalType: "struct MarketUtils.MarketPrices",
        type: "tuple",
        components: [
          {
            name: "indexTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "longTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "shortTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
        ],
      },
      { name: "marketKey", internalType: "address", type: "address" },
    ],
    name: "getMarketInfo",
    outputs: [
      {
        name: "",
        internalType: "struct ReaderUtils.MarketInfo",
        type: "tuple",
        components: [
          {
            name: "market",
            internalType: "struct Market.Props",
            type: "tuple",
            components: [
              { name: "marketToken", internalType: "address", type: "address" },
              { name: "indexToken", internalType: "address", type: "address" },
              { name: "longToken", internalType: "address", type: "address" },
              { name: "shortToken", internalType: "address", type: "address" },
            ],
          },
          {
            name: "borrowingFactorPerSecondForLongs",
            internalType: "uint256",
            type: "uint256",
          },
          {
            name: "borrowingFactorPerSecondForShorts",
            internalType: "uint256",
            type: "uint256",
          },
          {
            name: "baseFunding",
            internalType: "struct ReaderUtils.BaseFundingValues",
            type: "tuple",
            components: [
              {
                name: "fundingFeeAmountPerSize",
                internalType: "struct MarketUtils.PositionType",
                type: "tuple",
                components: [
                  {
                    name: "long",
                    internalType: "struct MarketUtils.CollateralType",
                    type: "tuple",
                    components: [
                      {
                        name: "longToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                      {
                        name: "shortToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                    ],
                  },
                  {
                    name: "short",
                    internalType: "struct MarketUtils.CollateralType",
                    type: "tuple",
                    components: [
                      {
                        name: "longToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                      {
                        name: "shortToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                    ],
                  },
                ],
              },
              {
                name: "claimableFundingAmountPerSize",
                internalType: "struct MarketUtils.PositionType",
                type: "tuple",
                components: [
                  {
                    name: "long",
                    internalType: "struct MarketUtils.CollateralType",
                    type: "tuple",
                    components: [
                      {
                        name: "longToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                      {
                        name: "shortToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                    ],
                  },
                  {
                    name: "short",
                    internalType: "struct MarketUtils.CollateralType",
                    type: "tuple",
                    components: [
                      {
                        name: "longToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                      {
                        name: "shortToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            name: "nextFunding",
            internalType: "struct MarketUtils.GetNextFundingAmountPerSizeResult",
            type: "tuple",
            components: [
              { name: "longsPayShorts", internalType: "bool", type: "bool" },
              {
                name: "fundingFactorPerSecond",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "nextSavedFundingFactorPerSecond",
                internalType: "int256",
                type: "int256",
              },
              {
                name: "fundingFeeAmountPerSizeDelta",
                internalType: "struct MarketUtils.PositionType",
                type: "tuple",
                components: [
                  {
                    name: "long",
                    internalType: "struct MarketUtils.CollateralType",
                    type: "tuple",
                    components: [
                      {
                        name: "longToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                      {
                        name: "shortToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                    ],
                  },
                  {
                    name: "short",
                    internalType: "struct MarketUtils.CollateralType",
                    type: "tuple",
                    components: [
                      {
                        name: "longToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                      {
                        name: "shortToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                    ],
                  },
                ],
              },
              {
                name: "claimableFundingAmountPerSizeDelta",
                internalType: "struct MarketUtils.PositionType",
                type: "tuple",
                components: [
                  {
                    name: "long",
                    internalType: "struct MarketUtils.CollateralType",
                    type: "tuple",
                    components: [
                      {
                        name: "longToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                      {
                        name: "shortToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                    ],
                  },
                  {
                    name: "short",
                    internalType: "struct MarketUtils.CollateralType",
                    type: "tuple",
                    components: [
                      {
                        name: "longToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                      {
                        name: "shortToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            name: "virtualInventory",
            internalType: "struct ReaderUtils.VirtualInventory",
            type: "tuple",
            components: [
              {
                name: "virtualPoolAmountForLongToken",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "virtualPoolAmountForShortToken",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "virtualInventoryForPositions",
                internalType: "int256",
                type: "int256",
              },
            ],
          },
          { name: "isDisabled", internalType: "bool", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      {
        name: "marketPricesList",
        internalType: "struct MarketUtils.MarketPrices[]",
        type: "tuple[]",
        components: [
          {
            name: "indexTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "longTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "shortTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
        ],
      },
      { name: "start", internalType: "uint256", type: "uint256" },
      { name: "end", internalType: "uint256", type: "uint256" },
    ],
    name: "getMarketInfoList",
    outputs: [
      {
        name: "",
        internalType: "struct ReaderUtils.MarketInfo[]",
        type: "tuple[]",
        components: [
          {
            name: "market",
            internalType: "struct Market.Props",
            type: "tuple",
            components: [
              { name: "marketToken", internalType: "address", type: "address" },
              { name: "indexToken", internalType: "address", type: "address" },
              { name: "longToken", internalType: "address", type: "address" },
              { name: "shortToken", internalType: "address", type: "address" },
            ],
          },
          {
            name: "borrowingFactorPerSecondForLongs",
            internalType: "uint256",
            type: "uint256",
          },
          {
            name: "borrowingFactorPerSecondForShorts",
            internalType: "uint256",
            type: "uint256",
          },
          {
            name: "baseFunding",
            internalType: "struct ReaderUtils.BaseFundingValues",
            type: "tuple",
            components: [
              {
                name: "fundingFeeAmountPerSize",
                internalType: "struct MarketUtils.PositionType",
                type: "tuple",
                components: [
                  {
                    name: "long",
                    internalType: "struct MarketUtils.CollateralType",
                    type: "tuple",
                    components: [
                      {
                        name: "longToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                      {
                        name: "shortToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                    ],
                  },
                  {
                    name: "short",
                    internalType: "struct MarketUtils.CollateralType",
                    type: "tuple",
                    components: [
                      {
                        name: "longToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                      {
                        name: "shortToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                    ],
                  },
                ],
              },
              {
                name: "claimableFundingAmountPerSize",
                internalType: "struct MarketUtils.PositionType",
                type: "tuple",
                components: [
                  {
                    name: "long",
                    internalType: "struct MarketUtils.CollateralType",
                    type: "tuple",
                    components: [
                      {
                        name: "longToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                      {
                        name: "shortToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                    ],
                  },
                  {
                    name: "short",
                    internalType: "struct MarketUtils.CollateralType",
                    type: "tuple",
                    components: [
                      {
                        name: "longToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                      {
                        name: "shortToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            name: "nextFunding",
            internalType: "struct MarketUtils.GetNextFundingAmountPerSizeResult",
            type: "tuple",
            components: [
              { name: "longsPayShorts", internalType: "bool", type: "bool" },
              {
                name: "fundingFactorPerSecond",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "nextSavedFundingFactorPerSecond",
                internalType: "int256",
                type: "int256",
              },
              {
                name: "fundingFeeAmountPerSizeDelta",
                internalType: "struct MarketUtils.PositionType",
                type: "tuple",
                components: [
                  {
                    name: "long",
                    internalType: "struct MarketUtils.CollateralType",
                    type: "tuple",
                    components: [
                      {
                        name: "longToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                      {
                        name: "shortToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                    ],
                  },
                  {
                    name: "short",
                    internalType: "struct MarketUtils.CollateralType",
                    type: "tuple",
                    components: [
                      {
                        name: "longToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                      {
                        name: "shortToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                    ],
                  },
                ],
              },
              {
                name: "claimableFundingAmountPerSizeDelta",
                internalType: "struct MarketUtils.PositionType",
                type: "tuple",
                components: [
                  {
                    name: "long",
                    internalType: "struct MarketUtils.CollateralType",
                    type: "tuple",
                    components: [
                      {
                        name: "longToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                      {
                        name: "shortToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                    ],
                  },
                  {
                    name: "short",
                    internalType: "struct MarketUtils.CollateralType",
                    type: "tuple",
                    components: [
                      {
                        name: "longToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                      {
                        name: "shortToken",
                        internalType: "uint256",
                        type: "uint256",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            name: "virtualInventory",
            internalType: "struct ReaderUtils.VirtualInventory",
            type: "tuple",
            components: [
              {
                name: "virtualPoolAmountForLongToken",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "virtualPoolAmountForShortToken",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "virtualInventoryForPositions",
                internalType: "int256",
                type: "int256",
              },
            ],
          },
          { name: "isDisabled", internalType: "bool", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      {
        name: "market",
        internalType: "struct Market.Props",
        type: "tuple",
        components: [
          { name: "marketToken", internalType: "address", type: "address" },
          { name: "indexToken", internalType: "address", type: "address" },
          { name: "longToken", internalType: "address", type: "address" },
          { name: "shortToken", internalType: "address", type: "address" },
        ],
      },
      {
        name: "indexTokenPrice",
        internalType: "struct Price.Props",
        type: "tuple",
        components: [
          { name: "min", internalType: "uint256", type: "uint256" },
          { name: "max", internalType: "uint256", type: "uint256" },
        ],
      },
      {
        name: "longTokenPrice",
        internalType: "struct Price.Props",
        type: "tuple",
        components: [
          { name: "min", internalType: "uint256", type: "uint256" },
          { name: "max", internalType: "uint256", type: "uint256" },
        ],
      },
      {
        name: "shortTokenPrice",
        internalType: "struct Price.Props",
        type: "tuple",
        components: [
          { name: "min", internalType: "uint256", type: "uint256" },
          { name: "max", internalType: "uint256", type: "uint256" },
        ],
      },
      { name: "pnlFactorType", internalType: "bytes32", type: "bytes32" },
      { name: "maximize", internalType: "bool", type: "bool" },
    ],
    name: "getMarketTokenPrice",
    outputs: [
      { name: "", internalType: "int256", type: "int256" },
      {
        name: "",
        internalType: "struct MarketPoolValueInfo.Props",
        type: "tuple",
        components: [
          { name: "poolValue", internalType: "int256", type: "int256" },
          { name: "longPnl", internalType: "int256", type: "int256" },
          { name: "shortPnl", internalType: "int256", type: "int256" },
          { name: "netPnl", internalType: "int256", type: "int256" },
          { name: "longTokenAmount", internalType: "uint256", type: "uint256" },
          {
            name: "shortTokenAmount",
            internalType: "uint256",
            type: "uint256",
          },
          { name: "longTokenUsd", internalType: "uint256", type: "uint256" },
          { name: "shortTokenUsd", internalType: "uint256", type: "uint256" },
          {
            name: "totalBorrowingFees",
            internalType: "uint256",
            type: "uint256",
          },
          {
            name: "borrowingFeePoolFactor",
            internalType: "uint256",
            type: "uint256",
          },
          {
            name: "impactPoolAmount",
            internalType: "uint256",
            type: "uint256",
          },
          {
            name: "lentImpactPoolAmount",
            internalType: "uint256",
            type: "uint256",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      { name: "start", internalType: "uint256", type: "uint256" },
      { name: "end", internalType: "uint256", type: "uint256" },
    ],
    name: "getMarkets",
    outputs: [
      {
        name: "",
        internalType: "struct Market.Props[]",
        type: "tuple[]",
        components: [
          { name: "marketToken", internalType: "address", type: "address" },
          { name: "indexToken", internalType: "address", type: "address" },
          { name: "longToken", internalType: "address", type: "address" },
          { name: "shortToken", internalType: "address", type: "address" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      {
        name: "market",
        internalType: "struct Market.Props",
        type: "tuple",
        components: [
          { name: "marketToken", internalType: "address", type: "address" },
          { name: "indexToken", internalType: "address", type: "address" },
          { name: "longToken", internalType: "address", type: "address" },
          { name: "shortToken", internalType: "address", type: "address" },
        ],
      },
      {
        name: "indexTokenPrice",
        internalType: "struct Price.Props",
        type: "tuple",
        components: [
          { name: "min", internalType: "uint256", type: "uint256" },
          { name: "max", internalType: "uint256", type: "uint256" },
        ],
      },
      { name: "maximize", internalType: "bool", type: "bool" },
    ],
    name: "getNetPnl",
    outputs: [{ name: "", internalType: "int256", type: "int256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      {
        name: "market",
        internalType: "struct Market.Props",
        type: "tuple",
        components: [
          { name: "marketToken", internalType: "address", type: "address" },
          { name: "indexToken", internalType: "address", type: "address" },
          { name: "longToken", internalType: "address", type: "address" },
          { name: "shortToken", internalType: "address", type: "address" },
        ],
      },
      {
        name: "indexTokenPrice",
        internalType: "struct Price.Props",
        type: "tuple",
        components: [
          { name: "min", internalType: "uint256", type: "uint256" },
          { name: "max", internalType: "uint256", type: "uint256" },
        ],
      },
      { name: "isLong", internalType: "bool", type: "bool" },
      { name: "maximize", internalType: "bool", type: "bool" },
    ],
    name: "getOpenInterestWithPnl",
    outputs: [{ name: "", internalType: "int256", type: "int256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      { name: "key", internalType: "bytes32", type: "bytes32" },
    ],
    name: "getOrder",
    outputs: [
      {
        name: "",
        internalType: "struct Order.Props",
        type: "tuple",
        components: [
          {
            name: "addresses",
            internalType: "struct Order.Addresses",
            type: "tuple",
            components: [
              { name: "account", internalType: "address", type: "address" },
              { name: "receiver", internalType: "address", type: "address" },
              {
                name: "cancellationReceiver",
                internalType: "address",
                type: "address",
              },
              {
                name: "callbackContract",
                internalType: "address",
                type: "address",
              },
              {
                name: "uiFeeReceiver",
                internalType: "address",
                type: "address",
              },
              { name: "market", internalType: "address", type: "address" },
              {
                name: "initialCollateralToken",
                internalType: "address",
                type: "address",
              },
              {
                name: "swapPath",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          {
            name: "numbers",
            internalType: "struct Order.Numbers",
            type: "tuple",
            components: [
              {
                name: "orderType",
                internalType: "enum Order.OrderType",
                type: "uint8",
              },
              {
                name: "decreasePositionSwapType",
                internalType: "enum Order.DecreasePositionSwapType",
                type: "uint8",
              },
              {
                name: "sizeDeltaUsd",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "initialCollateralDeltaAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "triggerPrice",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "acceptablePrice",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "executionFee",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "callbackGasLimit",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "minOutputAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "updatedAtTime",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "validFromTime",
                internalType: "uint256",
                type: "uint256",
              },
              { name: "srcChainId", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "flags",
            internalType: "struct Order.Flags",
            type: "tuple",
            components: [
              { name: "isLong", internalType: "bool", type: "bool" },
              {
                name: "shouldUnwrapNativeToken",
                internalType: "bool",
                type: "bool",
              },
              { name: "isFrozen", internalType: "bool", type: "bool" },
              { name: "autoCancel", internalType: "bool", type: "bool" },
            ],
          },
          { name: "_dataList", internalType: "bytes32[]", type: "bytes32[]" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      { name: "market", internalType: "address", type: "address" },
    ],
    name: "getPendingPositionImpactPoolDistributionAmount",
    outputs: [
      { name: "", internalType: "uint256", type: "uint256" },
      { name: "", internalType: "uint256", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      {
        name: "market",
        internalType: "struct Market.Props",
        type: "tuple",
        components: [
          { name: "marketToken", internalType: "address", type: "address" },
          { name: "indexToken", internalType: "address", type: "address" },
          { name: "longToken", internalType: "address", type: "address" },
          { name: "shortToken", internalType: "address", type: "address" },
        ],
      },
      {
        name: "indexTokenPrice",
        internalType: "struct Price.Props",
        type: "tuple",
        components: [
          { name: "min", internalType: "uint256", type: "uint256" },
          { name: "max", internalType: "uint256", type: "uint256" },
        ],
      },
      { name: "isLong", internalType: "bool", type: "bool" },
      { name: "maximize", internalType: "bool", type: "bool" },
    ],
    name: "getPnl",
    outputs: [{ name: "", internalType: "int256", type: "int256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      { name: "marketAddress", internalType: "address", type: "address" },
      {
        name: "prices",
        internalType: "struct MarketUtils.MarketPrices",
        type: "tuple",
        components: [
          {
            name: "indexTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "longTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "shortTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
        ],
      },
      { name: "isLong", internalType: "bool", type: "bool" },
      { name: "maximize", internalType: "bool", type: "bool" },
    ],
    name: "getPnlToPoolFactor",
    outputs: [{ name: "", internalType: "int256", type: "int256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      { name: "key", internalType: "bytes32", type: "bytes32" },
    ],
    name: "getPosition",
    outputs: [
      {
        name: "",
        internalType: "struct Position.Props",
        type: "tuple",
        components: [
          {
            name: "addresses",
            internalType: "struct Position.Addresses",
            type: "tuple",
            components: [
              { name: "account", internalType: "address", type: "address" },
              { name: "market", internalType: "address", type: "address" },
              {
                name: "collateralToken",
                internalType: "address",
                type: "address",
              },
            ],
          },
          {
            name: "numbers",
            internalType: "struct Position.Numbers",
            type: "tuple",
            components: [
              { name: "sizeInUsd", internalType: "uint256", type: "uint256" },
              {
                name: "sizeInTokens",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "collateralAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "pendingImpactAmount",
                internalType: "int256",
                type: "int256",
              },
              {
                name: "borrowingFactor",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "fundingFeeAmountPerSize",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "longTokenClaimableFundingAmountPerSize",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "shortTokenClaimableFundingAmountPerSize",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "increasedAtTime",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "decreasedAtTime",
                internalType: "uint256",
                type: "uint256",
              },
            ],
          },
          {
            name: "flags",
            internalType: "struct Position.Flags",
            type: "tuple",
            components: [{ name: "isLong", internalType: "bool", type: "bool" }],
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      {
        name: "referralStorage",
        internalType: "contract IReferralStorage",
        type: "address",
      },
      { name: "positionKey", internalType: "bytes32", type: "bytes32" },
      {
        name: "prices",
        internalType: "struct MarketUtils.MarketPrices",
        type: "tuple",
        components: [
          {
            name: "indexTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "longTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "shortTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
        ],
      },
      { name: "sizeDeltaUsd", internalType: "uint256", type: "uint256" },
      { name: "uiFeeReceiver", internalType: "address", type: "address" },
      {
        name: "usePositionSizeAsSizeDeltaUsd",
        internalType: "bool",
        type: "bool",
      },
    ],
    name: "getPositionInfo",
    outputs: [
      {
        name: "",
        internalType: "struct ReaderPositionUtils.PositionInfo",
        type: "tuple",
        components: [
          { name: "positionKey", internalType: "bytes32", type: "bytes32" },
          {
            name: "position",
            internalType: "struct Position.Props",
            type: "tuple",
            components: [
              {
                name: "addresses",
                internalType: "struct Position.Addresses",
                type: "tuple",
                components: [
                  { name: "account", internalType: "address", type: "address" },
                  { name: "market", internalType: "address", type: "address" },
                  {
                    name: "collateralToken",
                    internalType: "address",
                    type: "address",
                  },
                ],
              },
              {
                name: "numbers",
                internalType: "struct Position.Numbers",
                type: "tuple",
                components: [
                  {
                    name: "sizeInUsd",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "sizeInTokens",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "collateralAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "pendingImpactAmount",
                    internalType: "int256",
                    type: "int256",
                  },
                  {
                    name: "borrowingFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "fundingFeeAmountPerSize",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "longTokenClaimableFundingAmountPerSize",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "shortTokenClaimableFundingAmountPerSize",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "increasedAtTime",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "decreasedAtTime",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "flags",
                internalType: "struct Position.Flags",
                type: "tuple",
                components: [{ name: "isLong", internalType: "bool", type: "bool" }],
              },
            ],
          },
          {
            name: "fees",
            internalType: "struct PositionPricingUtils.PositionFees",
            type: "tuple",
            components: [
              {
                name: "referral",
                internalType: "struct PositionPricingUtils.PositionReferralFees",
                type: "tuple",
                components: [
                  {
                    name: "referralCode",
                    internalType: "bytes32",
                    type: "bytes32",
                  },
                  {
                    name: "affiliate",
                    internalType: "address",
                    type: "address",
                  },
                  { name: "trader", internalType: "address", type: "address" },
                  {
                    name: "totalRebateFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "affiliateRewardFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "adjustedAffiliateRewardFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "traderDiscountFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "totalRebateAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "traderDiscountAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "affiliateRewardAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "pro",
                internalType: "struct PositionPricingUtils.PositionProFees",
                type: "tuple",
                components: [
                  {
                    name: "traderTier",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "traderDiscountFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "traderDiscountAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "funding",
                internalType: "struct PositionPricingUtils.PositionFundingFees",
                type: "tuple",
                components: [
                  {
                    name: "fundingFeeAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "claimableLongTokenAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "claimableShortTokenAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "latestFundingFeeAmountPerSize",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "latestLongTokenClaimableFundingAmountPerSize",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "latestShortTokenClaimableFundingAmountPerSize",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "borrowing",
                internalType: "struct PositionPricingUtils.PositionBorrowingFees",
                type: "tuple",
                components: [
                  {
                    name: "borrowingFeeUsd",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "borrowingFeeAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "borrowingFeeReceiverFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "borrowingFeeAmountForFeeReceiver",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "ui",
                internalType: "struct PositionPricingUtils.PositionUiFees",
                type: "tuple",
                components: [
                  {
                    name: "uiFeeReceiver",
                    internalType: "address",
                    type: "address",
                  },
                  {
                    name: "uiFeeReceiverFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "uiFeeAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "liquidation",
                internalType: "struct PositionPricingUtils.PositionLiquidationFees",
                type: "tuple",
                components: [
                  {
                    name: "liquidationFeeUsd",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "liquidationFeeAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "liquidationFeeReceiverFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "liquidationFeeAmountForFeeReceiver",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "collateralTokenPrice",
                internalType: "struct Price.Props",
                type: "tuple",
                components: [
                  { name: "min", internalType: "uint256", type: "uint256" },
                  { name: "max", internalType: "uint256", type: "uint256" },
                ],
              },
              {
                name: "positionFeeFactor",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "protocolFeeAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "positionFeeReceiverFactor",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "feeReceiverAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "feeAmountForPool",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "positionFeeAmountForPool",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "positionFeeAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "totalCostAmountExcludingFunding",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "totalCostAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "totalDiscountAmount",
                internalType: "uint256",
                type: "uint256",
              },
            ],
          },
          {
            name: "executionPriceResult",
            internalType: "struct ReaderPricingUtils.ExecutionPriceResult",
            type: "tuple",
            components: [
              {
                name: "priceImpactUsd",
                internalType: "int256",
                type: "int256",
              },
              {
                name: "executionPrice",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "balanceWasImproved",
                internalType: "bool",
                type: "bool",
              },
            ],
          },
          { name: "basePnlUsd", internalType: "int256", type: "int256" },
          {
            name: "uncappedBasePnlUsd",
            internalType: "int256",
            type: "int256",
          },
          {
            name: "pnlAfterPriceImpactUsd",
            internalType: "int256",
            type: "int256",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      {
        name: "referralStorage",
        internalType: "contract IReferralStorage",
        type: "address",
      },
      { name: "positionKeys", internalType: "bytes32[]", type: "bytes32[]" },
      {
        name: "prices",
        internalType: "struct MarketUtils.MarketPrices[]",
        type: "tuple[]",
        components: [
          {
            name: "indexTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "longTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "shortTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
        ],
      },
      { name: "uiFeeReceiver", internalType: "address", type: "address" },
    ],
    name: "getPositionInfoList",
    outputs: [
      {
        name: "",
        internalType: "struct ReaderPositionUtils.PositionInfo[]",
        type: "tuple[]",
        components: [
          { name: "positionKey", internalType: "bytes32", type: "bytes32" },
          {
            name: "position",
            internalType: "struct Position.Props",
            type: "tuple",
            components: [
              {
                name: "addresses",
                internalType: "struct Position.Addresses",
                type: "tuple",
                components: [
                  { name: "account", internalType: "address", type: "address" },
                  { name: "market", internalType: "address", type: "address" },
                  {
                    name: "collateralToken",
                    internalType: "address",
                    type: "address",
                  },
                ],
              },
              {
                name: "numbers",
                internalType: "struct Position.Numbers",
                type: "tuple",
                components: [
                  {
                    name: "sizeInUsd",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "sizeInTokens",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "collateralAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "pendingImpactAmount",
                    internalType: "int256",
                    type: "int256",
                  },
                  {
                    name: "borrowingFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "fundingFeeAmountPerSize",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "longTokenClaimableFundingAmountPerSize",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "shortTokenClaimableFundingAmountPerSize",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "increasedAtTime",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "decreasedAtTime",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "flags",
                internalType: "struct Position.Flags",
                type: "tuple",
                components: [{ name: "isLong", internalType: "bool", type: "bool" }],
              },
            ],
          },
          {
            name: "fees",
            internalType: "struct PositionPricingUtils.PositionFees",
            type: "tuple",
            components: [
              {
                name: "referral",
                internalType: "struct PositionPricingUtils.PositionReferralFees",
                type: "tuple",
                components: [
                  {
                    name: "referralCode",
                    internalType: "bytes32",
                    type: "bytes32",
                  },
                  {
                    name: "affiliate",
                    internalType: "address",
                    type: "address",
                  },
                  { name: "trader", internalType: "address", type: "address" },
                  {
                    name: "totalRebateFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "affiliateRewardFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "adjustedAffiliateRewardFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "traderDiscountFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "totalRebateAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "traderDiscountAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "affiliateRewardAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "pro",
                internalType: "struct PositionPricingUtils.PositionProFees",
                type: "tuple",
                components: [
                  {
                    name: "traderTier",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "traderDiscountFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "traderDiscountAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "funding",
                internalType: "struct PositionPricingUtils.PositionFundingFees",
                type: "tuple",
                components: [
                  {
                    name: "fundingFeeAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "claimableLongTokenAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "claimableShortTokenAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "latestFundingFeeAmountPerSize",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "latestLongTokenClaimableFundingAmountPerSize",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "latestShortTokenClaimableFundingAmountPerSize",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "borrowing",
                internalType: "struct PositionPricingUtils.PositionBorrowingFees",
                type: "tuple",
                components: [
                  {
                    name: "borrowingFeeUsd",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "borrowingFeeAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "borrowingFeeReceiverFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "borrowingFeeAmountForFeeReceiver",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "ui",
                internalType: "struct PositionPricingUtils.PositionUiFees",
                type: "tuple",
                components: [
                  {
                    name: "uiFeeReceiver",
                    internalType: "address",
                    type: "address",
                  },
                  {
                    name: "uiFeeReceiverFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "uiFeeAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "liquidation",
                internalType: "struct PositionPricingUtils.PositionLiquidationFees",
                type: "tuple",
                components: [
                  {
                    name: "liquidationFeeUsd",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "liquidationFeeAmount",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "liquidationFeeReceiverFactor",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "liquidationFeeAmountForFeeReceiver",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "collateralTokenPrice",
                internalType: "struct Price.Props",
                type: "tuple",
                components: [
                  { name: "min", internalType: "uint256", type: "uint256" },
                  { name: "max", internalType: "uint256", type: "uint256" },
                ],
              },
              {
                name: "positionFeeFactor",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "protocolFeeAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "positionFeeReceiverFactor",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "feeReceiverAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "feeAmountForPool",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "positionFeeAmountForPool",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "positionFeeAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "totalCostAmountExcludingFunding",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "totalCostAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "totalDiscountAmount",
                internalType: "uint256",
                type: "uint256",
              },
            ],
          },
          {
            name: "executionPriceResult",
            internalType: "struct ReaderPricingUtils.ExecutionPriceResult",
            type: "tuple",
            components: [
              {
                name: "priceImpactUsd",
                internalType: "int256",
                type: "int256",
              },
              {
                name: "executionPrice",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "balanceWasImproved",
                internalType: "bool",
                type: "bool",
              },
            ],
          },
          { name: "basePnlUsd", internalType: "int256", type: "int256" },
          {
            name: "uncappedBasePnlUsd",
            internalType: "int256",
            type: "int256",
          },
          {
            name: "pnlAfterPriceImpactUsd",
            internalType: "int256",
            type: "int256",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      {
        name: "market",
        internalType: "struct Market.Props",
        type: "tuple",
        components: [
          { name: "marketToken", internalType: "address", type: "address" },
          { name: "indexToken", internalType: "address", type: "address" },
          { name: "longToken", internalType: "address", type: "address" },
          { name: "shortToken", internalType: "address", type: "address" },
        ],
      },
      {
        name: "prices",
        internalType: "struct MarketUtils.MarketPrices",
        type: "tuple",
        components: [
          {
            name: "indexTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "longTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "shortTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
        ],
      },
      { name: "positionKey", internalType: "bytes32", type: "bytes32" },
      { name: "sizeDeltaUsd", internalType: "uint256", type: "uint256" },
    ],
    name: "getPositionPnlUsd",
    outputs: [
      { name: "", internalType: "int256", type: "int256" },
      { name: "", internalType: "int256", type: "int256" },
      { name: "", internalType: "uint256", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      { name: "key", internalType: "bytes32", type: "bytes32" },
    ],
    name: "getShift",
    outputs: [
      {
        name: "",
        internalType: "struct Shift.Props",
        type: "tuple",
        components: [
          {
            name: "addresses",
            internalType: "struct Shift.Addresses",
            type: "tuple",
            components: [
              { name: "account", internalType: "address", type: "address" },
              { name: "receiver", internalType: "address", type: "address" },
              {
                name: "callbackContract",
                internalType: "address",
                type: "address",
              },
              {
                name: "uiFeeReceiver",
                internalType: "address",
                type: "address",
              },
              { name: "fromMarket", internalType: "address", type: "address" },
              { name: "toMarket", internalType: "address", type: "address" },
            ],
          },
          {
            name: "numbers",
            internalType: "struct Shift.Numbers",
            type: "tuple",
            components: [
              {
                name: "marketTokenAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "minMarketTokens",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "updatedAtTime",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "executionFee",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "callbackGasLimit",
                internalType: "uint256",
                type: "uint256",
              },
              { name: "srcChainId", internalType: "uint256", type: "uint256" },
            ],
          },
          { name: "_dataList", internalType: "bytes32[]", type: "bytes32[]" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      {
        name: "market",
        internalType: "struct Market.Props",
        type: "tuple",
        components: [
          { name: "marketToken", internalType: "address", type: "address" },
          { name: "indexToken", internalType: "address", type: "address" },
          { name: "longToken", internalType: "address", type: "address" },
          { name: "shortToken", internalType: "address", type: "address" },
        ],
      },
      {
        name: "prices",
        internalType: "struct MarketUtils.MarketPrices",
        type: "tuple",
        components: [
          {
            name: "indexTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "longTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "shortTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
        ],
      },
      { name: "tokenIn", internalType: "address", type: "address" },
      { name: "amountIn", internalType: "uint256", type: "uint256" },
      { name: "uiFeeReceiver", internalType: "address", type: "address" },
    ],
    name: "getSwapAmountOut",
    outputs: [
      { name: "", internalType: "uint256", type: "uint256" },
      { name: "", internalType: "int256", type: "int256" },
      {
        name: "fees",
        internalType: "struct SwapPricingUtils.SwapFees",
        type: "tuple",
        components: [
          {
            name: "feeReceiverAmount",
            internalType: "uint256",
            type: "uint256",
          },
          {
            name: "feeAmountForPool",
            internalType: "uint256",
            type: "uint256",
          },
          { name: "amountAfterFees", internalType: "uint256", type: "uint256" },
          { name: "uiFeeReceiver", internalType: "address", type: "address" },
          {
            name: "uiFeeReceiverFactor",
            internalType: "uint256",
            type: "uint256",
          },
          { name: "uiFeeAmount", internalType: "uint256", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      { name: "marketKey", internalType: "address", type: "address" },
      { name: "tokenIn", internalType: "address", type: "address" },
      { name: "tokenOut", internalType: "address", type: "address" },
      { name: "amountIn", internalType: "uint256", type: "uint256" },
      {
        name: "tokenInPrice",
        internalType: "struct Price.Props",
        type: "tuple",
        components: [
          { name: "min", internalType: "uint256", type: "uint256" },
          { name: "max", internalType: "uint256", type: "uint256" },
        ],
      },
      {
        name: "tokenOutPrice",
        internalType: "struct Price.Props",
        type: "tuple",
        components: [
          { name: "min", internalType: "uint256", type: "uint256" },
          { name: "max", internalType: "uint256", type: "uint256" },
        ],
      },
    ],
    name: "getSwapPriceImpact",
    outputs: [
      { name: "", internalType: "int256", type: "int256" },
      { name: "", internalType: "int256", type: "int256" },
      { name: "", internalType: "int256", type: "int256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      { name: "key", internalType: "bytes32", type: "bytes32" },
    ],
    name: "getWithdrawal",
    outputs: [
      {
        name: "",
        internalType: "struct Withdrawal.Props",
        type: "tuple",
        components: [
          {
            name: "addresses",
            internalType: "struct Withdrawal.Addresses",
            type: "tuple",
            components: [
              { name: "account", internalType: "address", type: "address" },
              { name: "receiver", internalType: "address", type: "address" },
              {
                name: "callbackContract",
                internalType: "address",
                type: "address",
              },
              {
                name: "uiFeeReceiver",
                internalType: "address",
                type: "address",
              },
              { name: "market", internalType: "address", type: "address" },
              {
                name: "longTokenSwapPath",
                internalType: "address[]",
                type: "address[]",
              },
              {
                name: "shortTokenSwapPath",
                internalType: "address[]",
                type: "address[]",
              },
            ],
          },
          {
            name: "numbers",
            internalType: "struct Withdrawal.Numbers",
            type: "tuple",
            components: [
              {
                name: "marketTokenAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "minLongTokenAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "minShortTokenAmount",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "updatedAtTime",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "executionFee",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "callbackGasLimit",
                internalType: "uint256",
                type: "uint256",
              },
              { name: "srcChainId", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "flags",
            internalType: "struct Withdrawal.Flags",
            type: "tuple",
            components: [
              {
                name: "shouldUnwrapNativeToken",
                internalType: "bool",
                type: "bool",
              },
            ],
          },
          { name: "_dataList", internalType: "bytes32[]", type: "bytes32[]" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      {
        name: "market",
        internalType: "struct Market.Props",
        type: "tuple",
        components: [
          { name: "marketToken", internalType: "address", type: "address" },
          { name: "indexToken", internalType: "address", type: "address" },
          { name: "longToken", internalType: "address", type: "address" },
          { name: "shortToken", internalType: "address", type: "address" },
        ],
      },
      {
        name: "prices",
        internalType: "struct MarketUtils.MarketPrices",
        type: "tuple",
        components: [
          {
            name: "indexTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "longTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "shortTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
        ],
      },
      { name: "marketTokenAmount", internalType: "uint256", type: "uint256" },
      { name: "uiFeeReceiver", internalType: "address", type: "address" },
      {
        name: "swapPricingType",
        internalType: "enum ISwapPricingUtils.SwapPricingType",
        type: "uint8",
      },
    ],
    name: "getWithdrawalAmountOut",
    outputs: [
      { name: "", internalType: "uint256", type: "uint256" },
      { name: "", internalType: "uint256", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    inputs: [
      {
        name: "dataStore",
        internalType: "contract DataStore",
        type: "address",
      },
      {
        name: "referralStorage",
        internalType: "contract IReferralStorage",
        type: "address",
      },
      { name: "positionKey", internalType: "bytes32", type: "bytes32" },
      {
        name: "market",
        internalType: "struct Market.Props",
        type: "tuple",
        components: [
          { name: "marketToken", internalType: "address", type: "address" },
          { name: "indexToken", internalType: "address", type: "address" },
          { name: "longToken", internalType: "address", type: "address" },
          { name: "shortToken", internalType: "address", type: "address" },
        ],
      },
      {
        name: "prices",
        internalType: "struct MarketUtils.MarketPrices",
        type: "tuple",
        components: [
          {
            name: "indexTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "longTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "shortTokenPrice",
            internalType: "struct Price.Props",
            type: "tuple",
            components: [
              { name: "min", internalType: "uint256", type: "uint256" },
              { name: "max", internalType: "uint256", type: "uint256" },
            ],
          },
        ],
      },
      {
        name: "shouldValidateMinCollateralUsd",
        internalType: "bool",
        type: "bool",
      },
      { name: "forLiquidation", internalType: "bool", type: "bool" },
    ],
    name: "isPositionLiquidatable",
    outputs: [
      { name: "", internalType: "bool", type: "bool" },
      { name: "", internalType: "string", type: "string" },
      {
        name: "",
        internalType: "struct PositionUtils.IsPositionLiquidatableInfo",
        type: "tuple",
        components: [
          {
            name: "remainingCollateralUsd",
            internalType: "int256",
            type: "int256",
          },
          { name: "minCollateralUsd", internalType: "int256", type: "int256" },
          {
            name: "minCollateralUsdForLeverage",
            internalType: "int256",
            type: "int256",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
] as const;

export const syntheticsReaderAddress = "0x13E39B888504Ea4e53D0d6c43B1576D84D6311C9" as const;

export const syntheticsReaderConfig = {
  address: syntheticsReaderAddress,
  abi: syntheticsReaderAbi,
} as const;
