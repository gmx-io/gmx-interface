export default [
  { inputs: [], name: "ActionAlreadySignalled", type: "error" },
  { inputs: [], name: "ActionNotSignalled", type: "error" },
  { inputs: [], name: "AdlNotEnabled", type: "error" },
  {
    inputs: [
      { internalType: "int256", name: "pnlToPoolFactor", type: "int256" },
      { internalType: "uint256", name: "maxPnlFactorForAdl", type: "uint256" },
    ],
    name: "AdlNotRequired",
    type: "error",
  },
  {
    inputs: [
      { internalType: "bytes[]", name: "values", type: "bytes[]" },
      { internalType: "uint256", name: "index", type: "uint256" },
      { internalType: "string", name: "label", type: "string" },
    ],
    name: "ArrayOutOfBoundsBytes",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256[]", name: "values", type: "uint256[]" },
      { internalType: "uint256", name: "index", type: "uint256" },
      { internalType: "string", name: "label", type: "string" },
    ],
    name: "ArrayOutOfBoundsUint256",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "feeToken", type: "address" },
      { internalType: "address", name: "buybackToken", type: "address" },
      { internalType: "uint256", name: "availableFeeAmount", type: "uint256" },
    ],
    name: "AvailableFeeAmountIsZero",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "minOracleBlockNumber", type: "uint256" },
      { internalType: "uint256", name: "prevMinOracleBlockNumber", type: "uint256" },
    ],
    name: "BlockNumbersNotSorted",
    type: "error",
  },
  { inputs: [], name: "BridgeOutNotSupportedDuringShift", type: "error" },
  {
    inputs: [
      { internalType: "address", name: "feeToken", type: "address" },
      { internalType: "address", name: "buybackToken", type: "address" },
    ],
    name: "BuybackAndFeeTokenAreEqual",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "timestamp", type: "uint256" },
      { internalType: "uint256", name: "heartbeatDuration", type: "uint256" },
    ],
    name: "ChainlinkPriceFeedNotUpdated",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "adjustedClaimableAmount", type: "uint256" },
      { internalType: "uint256", name: "claimedAmount", type: "uint256" },
    ],
    name: "CollateralAlreadyClaimed",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256[]", name: "compactedValues", type: "uint256[]" },
      { internalType: "uint256", name: "index", type: "uint256" },
      { internalType: "uint256", name: "slotIndex", type: "uint256" },
      { internalType: "string", name: "label", type: "string" },
    ],
    name: "CompactedArrayOutOfBounds",
    type: "error",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "baseKey", type: "bytes32" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "ConfigValueExceedsAllowedRange",
    type: "error",
  },
  { inputs: [], name: "DataListLengthExceeded", type: "error" },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "DataStreamIdAlreadyExistsForToken",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "currentTimestamp", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "DeadlinePassed",
    type: "error",
  },
  { inputs: [{ internalType: "bytes32", name: "key", type: "bytes32" }], name: "DepositNotFound", type: "error" },
  { inputs: [{ internalType: "bytes32", name: "key", type: "bytes32" }], name: "DisabledFeature", type: "error" },
  { inputs: [{ internalType: "address", name: "market", type: "address" }], name: "DisabledMarket", type: "error" },
  {
    inputs: [{ internalType: "uint256", name: "existingDistributionId", type: "uint256" }],
    name: "DuplicateClaimTerms",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "index", type: "uint256" },
      { internalType: "string", name: "label", type: "string" },
    ],
    name: "DuplicatedIndex",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "market", type: "address" }],
    name: "DuplicatedMarketInSwapPath",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "EdgeDataStreamIdAlreadyExistsForToken",
    type: "error",
  },
  { inputs: [], name: "EmptyAccount", type: "error" },
  {
    inputs: [
      { internalType: "address", name: "market", type: "address" },
      { internalType: "address", name: "token", type: "address" },
    ],
    name: "EmptyAddressInMarketTokenBalanceValidation",
    type: "error",
  },
  { inputs: [], name: "EmptyAmount", type: "error" },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "EmptyChainlinkPriceFeed",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "EmptyChainlinkPriceFeedMultiplier",
    type: "error",
  },
  { inputs: [], name: "EmptyClaimFeesMarket", type: "error" },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "EmptyClaimableAmount",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "EmptyDataStreamFeedId",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "EmptyDataStreamMultiplier",
    type: "error",
  },
  { inputs: [], name: "EmptyDeposit", type: "error" },
  { inputs: [], name: "EmptyDepositAmounts", type: "error" },
  { inputs: [], name: "EmptyDepositAmountsAfterSwap", type: "error" },
  { inputs: [], name: "EmptyFundingAccount", type: "error" },
  { inputs: [{ internalType: "address", name: "glv", type: "address" }], name: "EmptyGlv", type: "error" },
  { inputs: [], name: "EmptyGlvDeposit", type: "error" },
  { inputs: [], name: "EmptyGlvDepositAmounts", type: "error" },
  { inputs: [], name: "EmptyGlvMarketAmount", type: "error" },
  { inputs: [], name: "EmptyGlvTokenSupply", type: "error" },
  { inputs: [], name: "EmptyGlvWithdrawal", type: "error" },
  { inputs: [], name: "EmptyGlvWithdrawalAmount", type: "error" },
  { inputs: [], name: "EmptyHoldingAddress", type: "error" },
  { inputs: [], name: "EmptyMarket", type: "error" },
  { inputs: [{ internalType: "address", name: "market", type: "address" }], name: "EmptyMarketPrice", type: "error" },
  { inputs: [], name: "EmptyMarketTokenSupply", type: "error" },
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
    ],
    name: "EmptyMultichainTransferOutAmount",
    type: "error",
  },
  { inputs: [], name: "EmptyOrder", type: "error" },
  { inputs: [], name: "EmptyPosition", type: "error" },
  { inputs: [], name: "EmptyPositionImpactWithdrawalAmount", type: "error" },
  { inputs: [{ internalType: "address", name: "token", type: "address" }], name: "EmptyPrimaryPrice", type: "error" },
  { inputs: [], name: "EmptyReceiver", type: "error" },
  { inputs: [], name: "EmptyReduceLentAmount", type: "error" },
  { inputs: [], name: "EmptyRelayFeeAddress", type: "error" },
  { inputs: [], name: "EmptyShift", type: "error" },
  { inputs: [], name: "EmptyShiftAmount", type: "error" },
  { inputs: [], name: "EmptySizeDeltaInTokens", type: "error" },
  { inputs: [], name: "EmptyTarget", type: "error" },
  { inputs: [], name: "EmptyToken", type: "error" },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "EmptyTokenTranferGasLimit",
    type: "error",
  },
  { inputs: [], name: "EmptyValidatedPrices", type: "error" },
  { inputs: [], name: "EmptyWithdrawal", type: "error" },
  { inputs: [], name: "EmptyWithdrawalAmount", type: "error" },
  { inputs: [], name: "EndOfOracleSimulation", type: "error" },
  { inputs: [{ internalType: "string", name: "key", type: "string" }], name: "EventItemNotFound", type: "error" },
  { inputs: [{ internalType: "bytes", name: "data", type: "bytes" }], name: "ExternalCallFailed", type: "error" },
  { inputs: [{ internalType: "bytes32", name: "key", type: "bytes32" }], name: "FeeBatchNotFound", type: "error" },
  {
    inputs: [
      { internalType: "bytes32", name: "salt", type: "bytes32" },
      { internalType: "address", name: "glv", type: "address" },
    ],
    name: "GlvAlreadyExists",
    type: "error",
  },
  { inputs: [{ internalType: "bytes32", name: "key", type: "bytes32" }], name: "GlvDepositNotFound", type: "error" },
  {
    inputs: [
      { internalType: "address", name: "glv", type: "address" },
      { internalType: "address", name: "market", type: "address" },
    ],
    name: "GlvDisabledMarket",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "glv", type: "address" },
      { internalType: "address", name: "market", type: "address" },
    ],
    name: "GlvEnabledMarket",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "glv", type: "address" },
      { internalType: "address", name: "market", type: "address" },
      { internalType: "uint256", name: "marketTokenBalance", type: "uint256" },
      { internalType: "uint256", name: "marketTokenAmount", type: "uint256" },
    ],
    name: "GlvInsufficientMarketTokenBalance",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "glv", type: "address" },
      { internalType: "address", name: "provided", type: "address" },
      { internalType: "address", name: "expected", type: "address" },
    ],
    name: "GlvInvalidLongToken",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "glv", type: "address" },
      { internalType: "address", name: "provided", type: "address" },
      { internalType: "address", name: "expected", type: "address" },
    ],
    name: "GlvInvalidShortToken",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "glv", type: "address" },
      { internalType: "address", name: "market", type: "address" },
    ],
    name: "GlvMarketAlreadyExists",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "glv", type: "address" },
      { internalType: "uint256", name: "glvMaxMarketCount", type: "uint256" },
    ],
    name: "GlvMaxMarketCountExceeded",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "glv", type: "address" },
      { internalType: "address", name: "market", type: "address" },
      { internalType: "uint256", name: "maxMarketTokenBalanceAmount", type: "uint256" },
      { internalType: "uint256", name: "marketTokenBalanceAmount", type: "uint256" },
    ],
    name: "GlvMaxMarketTokenBalanceAmountExceeded",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "glv", type: "address" },
      { internalType: "address", name: "market", type: "address" },
      { internalType: "uint256", name: "maxMarketTokenBalanceUsd", type: "uint256" },
      { internalType: "uint256", name: "marketTokenBalanceUsd", type: "uint256" },
    ],
    name: "GlvMaxMarketTokenBalanceUsdExceeded",
    type: "error",
  },
  { inputs: [], name: "GlvNameTooLong", type: "error" },
  {
    inputs: [
      { internalType: "address", name: "glv", type: "address" },
      { internalType: "address", name: "market", type: "address" },
    ],
    name: "GlvNegativeMarketPoolValue",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "glv", type: "address" },
      { internalType: "address", name: "market", type: "address" },
    ],
    name: "GlvNonZeroMarketBalance",
    type: "error",
  },
  { inputs: [{ internalType: "address", name: "key", type: "address" }], name: "GlvNotFound", type: "error" },
  {
    inputs: [
      { internalType: "uint256", name: "currentTimestamp", type: "uint256" },
      { internalType: "uint256", name: "lastGlvShiftExecutedAt", type: "uint256" },
      { internalType: "uint256", name: "glvShiftMinInterval", type: "uint256" },
    ],
    name: "GlvShiftIntervalNotYetPassed",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "effectivePriceImpactFactor", type: "uint256" },
      { internalType: "uint256", name: "glvMaxShiftPriceImpactFactor", type: "uint256" },
    ],
    name: "GlvShiftMaxPriceImpactExceeded",
    type: "error",
  },
  { inputs: [{ internalType: "bytes32", name: "key", type: "bytes32" }], name: "GlvShiftNotFound", type: "error" },
  { inputs: [], name: "GlvSymbolTooLong", type: "error" },
  {
    inputs: [
      { internalType: "address", name: "glv", type: "address" },
      { internalType: "address", name: "market", type: "address" },
    ],
    name: "GlvUnsupportedMarket",
    type: "error",
  },
  { inputs: [{ internalType: "bytes32", name: "key", type: "bytes32" }], name: "GlvWithdrawalNotFound", type: "error" },
  { inputs: [{ internalType: "uint256", name: "signerIndex", type: "uint256" }], name: "GmEmptySigner", type: "error" },
  {
    inputs: [
      { internalType: "uint256", name: "minOracleBlockNumber", type: "uint256" },
      { internalType: "uint256", name: "currentBlockNumber", type: "uint256" },
    ],
    name: "GmInvalidBlockNumber",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "minOracleBlockNumber", type: "uint256" },
      { internalType: "uint256", name: "maxOracleBlockNumber", type: "uint256" },
    ],
    name: "GmInvalidMinMaxBlockNumber",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "oracleSigners", type: "uint256" },
      { internalType: "uint256", name: "maxOracleSigners", type: "uint256" },
    ],
    name: "GmMaxOracleSigners",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "price", type: "uint256" },
      { internalType: "uint256", name: "prevPrice", type: "uint256" },
    ],
    name: "GmMaxPricesNotSorted",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "signerIndex", type: "uint256" },
      { internalType: "uint256", name: "maxSignerIndex", type: "uint256" },
    ],
    name: "GmMaxSignerIndex",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "oracleSigners", type: "uint256" },
      { internalType: "uint256", name: "minOracleSigners", type: "uint256" },
    ],
    name: "GmMinOracleSigners",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "price", type: "uint256" },
      { internalType: "uint256", name: "prevPrice", type: "uint256" },
    ],
    name: "GmMinPricesNotSorted",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "feeToken", type: "address" },
      { internalType: "address", name: "buybackToken", type: "address" },
      { internalType: "uint256", name: "outputAmount", type: "uint256" },
      { internalType: "uint256", name: "minOutputAmount", type: "uint256" },
    ],
    name: "InsufficientBuybackOutputAmount",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "collateralAmount", type: "uint256" },
      { internalType: "int256", name: "collateralDeltaAmount", type: "int256" },
    ],
    name: "InsufficientCollateralAmount",
    type: "error",
  },
  {
    inputs: [{ internalType: "int256", name: "remainingCollateralUsd", type: "int256" }],
    name: "InsufficientCollateralUsd",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "minExecutionFee", type: "uint256" },
      { internalType: "uint256", name: "executionFee", type: "uint256" },
    ],
    name: "InsufficientExecutionFee",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startingGas", type: "uint256" },
      { internalType: "uint256", name: "estimatedGasLimit", type: "uint256" },
      { internalType: "uint256", name: "minAdditionalGasForExecution", type: "uint256" },
    ],
    name: "InsufficientExecutionGas",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "startingGas", type: "uint256" },
      { internalType: "uint256", name: "minHandleErrorGas", type: "uint256" },
    ],
    name: "InsufficientExecutionGasForErrorHandling",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "feeProvided", type: "uint256" },
      { internalType: "uint256", name: "feeRequired", type: "uint256" },
    ],
    name: "InsufficientFee",
    type: "error",
  },
  { inputs: [{ internalType: "address", name: "token", type: "address" }], name: "InsufficientFunds", type: "error" },
  {
    inputs: [
      { internalType: "uint256", name: "remainingCostUsd", type: "uint256" },
      { internalType: "string", name: "step", type: "string" },
    ],
    name: "InsufficientFundsToPayForCosts",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "gas", type: "uint256" },
      { internalType: "uint256", name: "minHandleExecutionErrorGas", type: "uint256" },
    ],
    name: "InsufficientGasForAutoCancellation",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "gas", type: "uint256" },
      { internalType: "uint256", name: "minHandleExecutionErrorGas", type: "uint256" },
    ],
    name: "InsufficientGasForCancellation",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "gas", type: "uint256" },
      { internalType: "uint256", name: "estimatedGasLimit", type: "uint256" },
    ],
    name: "InsufficientGasLeft",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "gasToBeForwarded", type: "uint256" },
      { internalType: "uint256", name: "callbackGasLimit", type: "uint256" },
    ],
    name: "InsufficientGasLeftForCallback",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "gas", type: "uint256" },
      { internalType: "uint256", name: "minHandleExecutionErrorGas", type: "uint256" },
    ],
    name: "InsufficientHandleExecutionErrorGas",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "withdrawalAmount", type: "uint256" },
      { internalType: "uint256", name: "poolValue", type: "uint256" },
      { internalType: "int256", name: "totalPendingImpactAmount", type: "int256" },
    ],
    name: "InsufficientImpactPoolValueForWithdrawal",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "balance", type: "uint256" },
      { internalType: "uint256", name: "expected", type: "uint256" },
    ],
    name: "InsufficientMarketTokens",
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
    inputs: [
      { internalType: "uint256", name: "outputAmount", type: "uint256" },
      { internalType: "uint256", name: "minOutputAmount", type: "uint256" },
    ],
    name: "InsufficientOutputAmount",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "poolAmount", type: "uint256" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "InsufficientPoolAmount",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "requiredRelayFee", type: "uint256" },
      { internalType: "uint256", name: "availableFeeAmount", type: "uint256" },
    ],
    name: "InsufficientRelayFee",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "reservedUsd", type: "uint256" },
      { internalType: "uint256", name: "maxReservedUsd", type: "uint256" },
    ],
    name: "InsufficientReserve",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "reservedUsd", type: "uint256" },
      { internalType: "uint256", name: "maxReservedUsd", type: "uint256" },
    ],
    name: "InsufficientReserveForOpenInterest",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "outputAmount", type: "uint256" },
      { internalType: "uint256", name: "minOutputAmount", type: "uint256" },
    ],
    name: "InsufficientSwapOutputAmount",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "wntAmount", type: "uint256" },
      { internalType: "uint256", name: "executionFee", type: "uint256" },
    ],
    name: "InsufficientWntAmountForExecutionFee",
    type: "error",
  },
  {
    inputs: [
      { internalType: "int256", name: "nextPnlToPoolFactor", type: "int256" },
      { internalType: "int256", name: "pnlToPoolFactor", type: "int256" },
    ],
    name: "InvalidAdl",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "remainingAmount", type: "uint256" },
    ],
    name: "InvalidAmountInForFeeBatch",
    type: "error",
  },
  { inputs: [{ internalType: "bytes32", name: "baseKey", type: "bytes32" }], name: "InvalidBaseKey", type: "error" },
  {
    inputs: [
      { internalType: "uint256", name: "largestMinBlockNumber", type: "uint256" },
      { internalType: "uint256", name: "smallestMaxBlockNumber", type: "uint256" },
    ],
    name: "InvalidBlockRangeSet",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "InvalidBridgeOutToken",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "buybackToken", type: "address" }],
    name: "InvalidBuybackToken",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "cancellationReceiver", type: "address" },
      { internalType: "address", name: "expectedCancellationReceiver", type: "address" },
    ],
    name: "InvalidCancellationReceiverForSubaccountOrder",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "marketsLength", type: "uint256" },
      { internalType: "uint256", name: "tokensLength", type: "uint256" },
    ],
    name: "InvalidClaimAffiliateRewardsInput",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "marketsLength", type: "uint256" },
      { internalType: "uint256", name: "tokensLength", type: "uint256" },
      { internalType: "uint256", name: "timeKeysLength", type: "uint256" },
    ],
    name: "InvalidClaimCollateralInput",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "marketsLength", type: "uint256" },
      { internalType: "uint256", name: "tokensLength", type: "uint256" },
    ],
    name: "InvalidClaimFundingFeesInput",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "recoveredSigner", type: "address" },
      { internalType: "address", name: "expectedSigner", type: "address" },
    ],
    name: "InvalidClaimTermsSignature",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "expectedSigner", type: "address" }],
    name: "InvalidClaimTermsSignatureForContract",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "marketsLength", type: "uint256" },
      { internalType: "uint256", name: "tokensLength", type: "uint256" },
    ],
    name: "InvalidClaimUiFeesInput",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "value", type: "uint256" }],
    name: "InvalidClaimableFactor",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "value", type: "uint256" }],
    name: "InvalidClaimableReductionFactor",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "market", type: "address" },
      { internalType: "address", name: "token", type: "address" },
    ],
    name: "InvalidCollateralTokenForMarket",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "InvalidContributorToken",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "int192", name: "bid", type: "int192" },
      { internalType: "int192", name: "ask", type: "int192" },
    ],
    name: "InvalidDataStreamBidAsk",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "bytes32", name: "feedId", type: "bytes32" },
      { internalType: "bytes32", name: "expectedFeedId", type: "bytes32" },
    ],
    name: "InvalidDataStreamFeedId",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "int192", name: "bid", type: "int192" },
      { internalType: "int192", name: "ask", type: "int192" },
    ],
    name: "InvalidDataStreamPrices",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "spreadReductionFactor", type: "uint256" },
    ],
    name: "InvalidDataStreamSpreadReductionFactor",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "sizeDeltaUsd", type: "uint256" },
      { internalType: "uint256", name: "positionSizeInUsd", type: "uint256" },
    ],
    name: "InvalidDecreaseOrderSize",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "decreasePositionSwapType", type: "uint256" }],
    name: "InvalidDecreasePositionSwapType",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "desChainId", type: "uint256" }],
    name: "InvalidDestinationChainId",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "bid", type: "uint256" },
      { internalType: "uint256", name: "ask", type: "uint256" },
    ],
    name: "InvalidEdgeDataStreamBidAsk",
    type: "error",
  },
  {
    inputs: [{ internalType: "int256", name: "expo", type: "int256" }],
    name: "InvalidEdgeDataStreamExpo",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "bid", type: "uint256" },
      { internalType: "uint256", name: "ask", type: "uint256" },
    ],
    name: "InvalidEdgeDataStreamPrices",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "recoverError", type: "uint256" }],
    name: "InvalidEdgeSignature",
    type: "error",
  },
  { inputs: [], name: "InvalidEdgeSigner", type: "error" },
  { inputs: [{ internalType: "uint256", name: "eid", type: "uint256" }], name: "InvalidEid", type: "error" },
  {
    inputs: [
      { internalType: "uint256", name: "executionFee", type: "uint256" },
      { internalType: "uint256", name: "minExecutionFee", type: "uint256" },
      { internalType: "uint256", name: "maxExecutionFee", type: "uint256" },
    ],
    name: "InvalidExecutionFee",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "totalExecutionFee", type: "uint256" },
      { internalType: "uint256", name: "msgValue", type: "uint256" },
    ],
    name: "InvalidExecutionFeeForMigration",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "targetsLength", type: "uint256" },
      { internalType: "uint256", name: "dataListLength", type: "uint256" },
    ],
    name: "InvalidExternalCallInput",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "target", type: "address" }],
    name: "InvalidExternalCallTarget",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "sendTokensLength", type: "uint256" },
      { internalType: "uint256", name: "sendAmountsLength", type: "uint256" },
    ],
    name: "InvalidExternalCalls",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "refundTokensLength", type: "uint256" },
      { internalType: "uint256", name: "refundReceiversLength", type: "uint256" },
    ],
    name: "InvalidExternalReceiversInput",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "tokenIndex", type: "uint256" },
      { internalType: "uint256", name: "feeBatchTokensLength", type: "uint256" },
    ],
    name: "InvalidFeeBatchTokenIndex",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "receiver", type: "address" }],
    name: "InvalidFeeReceiver",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "int256", name: "price", type: "int256" },
    ],
    name: "InvalidFeedPrice",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "totalGlpAmountToRedeem", type: "uint256" },
      { internalType: "uint256", name: "totalGlpAmount", type: "uint256" },
    ],
    name: "InvalidGlpAmount",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "initialLongToken", type: "address" }],
    name: "InvalidGlvDepositInitialLongToken",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "initialShortToken", type: "address" }],
    name: "InvalidGlvDepositInitialShortToken",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "longTokenSwapPathLength", type: "uint256" },
      { internalType: "uint256", name: "shortTokenSwapPathLength", type: "uint256" },
    ],
    name: "InvalidGlvDepositSwapPath",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "minPrice", type: "uint256" },
      { internalType: "uint256", name: "maxPrice", type: "uint256" },
    ],
    name: "InvalidGmMedianMinMaxPrice",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "InvalidGmOraclePrice",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "recoveredSigner", type: "address" },
      { internalType: "address", name: "expectedSigner", type: "address" },
    ],
    name: "InvalidGmSignature",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "minPrice", type: "uint256" },
      { internalType: "uint256", name: "maxPrice", type: "uint256" },
    ],
    name: "InvalidGmSignerMinMaxPrice",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "InvalidHoldingAddress",
    type: "error",
  },
  { inputs: [], name: "InvalidInitializer", type: "error" },
  {
    inputs: [{ internalType: "address", name: "keeper", type: "address" }],
    name: "InvalidKeeperForFrozenOrder",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "market", type: "address" },
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "balance", type: "uint256" },
      { internalType: "uint256", name: "expectedMinBalance", type: "uint256" },
    ],
    name: "InvalidMarketTokenBalance",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "market", type: "address" },
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "balance", type: "uint256" },
      { internalType: "uint256", name: "claimableFundingFeeAmount", type: "uint256" },
    ],
    name: "InvalidMarketTokenBalanceForClaimableFunding",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "market", type: "address" },
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "balance", type: "uint256" },
      { internalType: "uint256", name: "collateralAmount", type: "uint256" },
    ],
    name: "InvalidMarketTokenBalanceForCollateralAmount",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "minGlvTokens", type: "uint256" },
      { internalType: "uint256", name: "expectedMinGlvTokens", type: "uint256" },
    ],
    name: "InvalidMinGlvTokensForFirstGlvDeposit",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "minMarketTokens", type: "uint256" },
      { internalType: "uint256", name: "expectedMinMarketTokens", type: "uint256" },
    ],
    name: "InvalidMinMarketTokensForFirstDeposit",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "min", type: "uint256" },
      { internalType: "uint256", name: "max", type: "uint256" },
    ],
    name: "InvalidMinMaxForPrice",
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
    inputs: [{ internalType: "address", name: "msgSender", type: "address" }],
    name: "InvalidNativeTokenSender",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "provider", type: "address" }],
    name: "InvalidOracleProvider",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "provider", type: "address" },
      { internalType: "address", name: "expectedProvider", type: "address" },
    ],
    name: "InvalidOracleProviderForToken",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "tokensLength", type: "uint256" },
      { internalType: "uint256", name: "dataLength", type: "uint256" },
    ],
    name: "InvalidOracleSetPricesDataParam",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "tokensLength", type: "uint256" },
      { internalType: "uint256", name: "providersLength", type: "uint256" },
    ],
    name: "InvalidOracleSetPricesProvidersParam",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "signer", type: "address" }],
    name: "InvalidOracleSigner",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "primaryPriceMin", type: "uint256" },
      { internalType: "uint256", name: "primaryPriceMax", type: "uint256" },
      { internalType: "uint256", name: "triggerPrice", type: "uint256" },
      { internalType: "uint256", name: "orderType", type: "uint256" },
    ],
    name: "InvalidOrderPrices",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenOut", type: "address" },
      { internalType: "address", name: "expectedTokenOut", type: "address" },
    ],
    name: "InvalidOutputToken",
    type: "error",
  },
  { inputs: [{ internalType: "string", name: "reason", type: "string" }], name: "InvalidParams", type: "error" },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "address", name: "expectedSpender", type: "address" },
    ],
    name: "InvalidPermitSpender",
    type: "error",
  },
  {
    inputs: [{ internalType: "int256", name: "poolValue", type: "int256" }],
    name: "InvalidPoolValueForDeposit",
    type: "error",
  },
  {
    inputs: [{ internalType: "int256", name: "poolValue", type: "int256" }],
    name: "InvalidPoolValueForWithdrawal",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "distributionAmount", type: "uint256" },
      { internalType: "uint256", name: "positionImpactPoolAmount", type: "uint256" },
    ],
    name: "InvalidPositionImpactPoolDistributionRate",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "market", type: "address" }],
    name: "InvalidPositionMarket",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "sizeInUsd", type: "uint256" },
      { internalType: "uint256", name: "sizeInTokens", type: "uint256" },
    ],
    name: "InvalidPositionSizeValues",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "primaryTokensLength", type: "uint256" },
      { internalType: "uint256", name: "primaryPricesLength", type: "uint256" },
    ],
    name: "InvalidPrimaryPricesForSimulation",
    type: "error",
  },
  { inputs: [{ internalType: "address", name: "receiver", type: "address" }], name: "InvalidReceiver", type: "error" },
  {
    inputs: [
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "address", name: "expectedReceiver", type: "address" },
    ],
    name: "InvalidReceiverForFirstDeposit",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "address", name: "expectedReceiver", type: "address" },
    ],
    name: "InvalidReceiverForFirstGlvDeposit",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "address", name: "expectedReceiver", type: "address" },
    ],
    name: "InvalidReceiverForSubaccountOrder",
    type: "error",
  },
  {
    inputs: [
      { internalType: "string", name: "signatureType", type: "string" },
      { internalType: "address", name: "recovered", type: "address" },
      { internalType: "address", name: "recoveredFromMinified", type: "address" },
      { internalType: "address", name: "expectedSigner", type: "address" },
    ],
    name: "InvalidRecoveredSigner",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "tokensLength", type: "uint256" },
      { internalType: "uint256", name: "amountsLength", type: "uint256" },
    ],
    name: "InvalidSetContributorPaymentInput",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "tokensLength", type: "uint256" },
      { internalType: "uint256", name: "amountsLength", type: "uint256" },
    ],
    name: "InvalidSetMaxTotalContributorTokenAmountInput",
    type: "error",
  },
  {
    inputs: [{ internalType: "string", name: "signatureType", type: "string" }],
    name: "InvalidSignature",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "sizeDeltaUsd", type: "uint256" },
      { internalType: "uint256", name: "positionSizeInUsd", type: "uint256" },
    ],
    name: "InvalidSizeDeltaForAdl",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "srcChainId", type: "uint256" }],
    name: "InvalidSrcChainId",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "desChainId", type: "uint256" }],
    name: "InvalidSubaccountApprovalDesChainId",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "storedNonce", type: "uint256" },
      { internalType: "uint256", name: "nonce", type: "uint256" },
    ],
    name: "InvalidSubaccountApprovalNonce",
    type: "error",
  },
  { inputs: [], name: "InvalidSubaccountApprovalSubaccount", type: "error" },
  { inputs: [{ internalType: "address", name: "market", type: "address" }], name: "InvalidSwapMarket", type: "error" },
  {
    inputs: [
      { internalType: "address", name: "outputToken", type: "address" },
      { internalType: "address", name: "expectedOutputToken", type: "address" },
    ],
    name: "InvalidSwapOutputToken",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address[]", name: "path", type: "address[]" },
      { internalType: "address", name: "bridgingToken", type: "address" },
    ],
    name: "InvalidSwapPathForV1",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "timelockDelay", type: "uint256" }],
    name: "InvalidTimelockDelay",
    type: "error",
  },
  { inputs: [{ internalType: "address", name: "token", type: "address" }], name: "InvalidToken", type: "error" },
  {
    inputs: [
      { internalType: "address", name: "tokenIn", type: "address" },
      { internalType: "address", name: "market", type: "address" },
    ],
    name: "InvalidTokenIn",
    type: "error",
  },
  { inputs: [], name: "InvalidTransferRequestsLength", type: "error" },
  { inputs: [], name: "InvalidTrustedSignerAddress", type: "error" },
  {
    inputs: [
      { internalType: "uint256", name: "uiFeeFactor", type: "uint256" },
      { internalType: "uint256", name: "maxUiFeeFactor", type: "uint256" },
    ],
    name: "InvalidUiFeeFactor",
    type: "error",
  },
  { inputs: [{ internalType: "bytes32", name: "digest", type: "bytes32" }], name: "InvalidUserDigest", type: "error" },
  { inputs: [{ internalType: "uint256", name: "version", type: "uint256" }], name: "InvalidVersion", type: "error" },
  {
    inputs: [
      { internalType: "string", name: "reason", type: "string" },
      { internalType: "int256", name: "remainingCollateralUsd", type: "int256" },
      { internalType: "int256", name: "minCollateralUsd", type: "int256" },
      { internalType: "int256", name: "minCollateralUsdForLeverage", type: "int256" },
    ],
    name: "LiquidatablePosition",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "fromMarketLongToken", type: "address" },
      { internalType: "address", name: "toMarketLongToken", type: "address" },
    ],
    name: "LongTokensAreNotEqual",
    type: "error",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "salt", type: "bytes32" },
      { internalType: "address", name: "existingMarketAddress", type: "address" },
    ],
    name: "MarketAlreadyExists",
    type: "error",
  },
  { inputs: [{ internalType: "address", name: "key", type: "address" }], name: "MarketNotFound", type: "error" },
  {
    inputs: [
      { internalType: "uint256", name: "index", type: "uint256" },
      { internalType: "string", name: "label", type: "string" },
    ],
    name: "MaskIndexOutOfBounds",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "count", type: "uint256" },
      { internalType: "uint256", name: "maxAutoCancelOrders", type: "uint256" },
    ],
    name: "MaxAutoCancelOrdersExceeded",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "priceTimestamp", type: "uint256" },
      { internalType: "uint256", name: "buybackMaxPriceAge", type: "uint256" },
      { internalType: "uint256", name: "currentTimestamp", type: "uint256" },
    ],
    name: "MaxBuybackPriceAgeExceeded",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "callbackGasLimit", type: "uint256" },
      { internalType: "uint256", name: "maxCallbackGasLimit", type: "uint256" },
    ],
    name: "MaxCallbackGasLimitExceeded",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "dataLength", type: "uint256" },
      { internalType: "uint256", name: "maxDataLength", type: "uint256" },
    ],
    name: "MaxDataListLengthExceeded",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "maxFundingFactorPerSecond", type: "uint256" },
      { internalType: "uint256", name: "limit", type: "uint256" },
    ],
    name: "MaxFundingFactorPerSecondLimitExceeded",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "poolUsd", type: "uint256" },
      { internalType: "uint256", name: "maxLendableUsd", type: "uint256" },
      { internalType: "uint256", name: "lentUsd", type: "uint256" },
    ],
    name: "MaxLendableFactorForWithdrawalsExceeded",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "openInterest", type: "uint256" },
      { internalType: "uint256", name: "maxOpenInterest", type: "uint256" },
    ],
    name: "MaxOpenInterestExceeded",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "range", type: "uint256" },
      { internalType: "uint256", name: "maxRange", type: "uint256" },
    ],
    name: "MaxOracleTimestampRangeExceeded",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "poolAmount", type: "uint256" },
      { internalType: "uint256", name: "maxPoolAmount", type: "uint256" },
    ],
    name: "MaxPoolAmountExceeded",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "poolUsd", type: "uint256" },
      { internalType: "uint256", name: "maxPoolUsdForDeposit", type: "uint256" },
    ],
    name: "MaxPoolUsdForDepositExceeded",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "oracleTimestamp", type: "uint256" },
      { internalType: "uint256", name: "currentTimestamp", type: "uint256" },
    ],
    name: "MaxPriceAgeExceeded",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "price", type: "uint256" },
      { internalType: "uint256", name: "refPrice", type: "uint256" },
      { internalType: "uint256", name: "maxRefPriceDeviationFactor", type: "uint256" },
    ],
    name: "MaxRefPriceDeviationExceeded",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "feeUsd", type: "uint256" },
      { internalType: "uint256", name: "maxFeeUsd", type: "uint256" },
    ],
    name: "MaxRelayFeeSwapForSubaccountExceeded",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "address", name: "subaccount", type: "address" },
      { internalType: "uint256", name: "count", type: "uint256" },
      { internalType: "uint256", name: "maxCount", type: "uint256" },
    ],
    name: "MaxSubaccountActionCountExceeded",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "swapPathLengh", type: "uint256" },
      { internalType: "uint256", name: "maxSwapPathLength", type: "uint256" },
    ],
    name: "MaxSwapPathLengthExceeded",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "timelockDelay", type: "uint256" }],
    name: "MaxTimelockDelayExceeded",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "totalCallbackGasLimit", type: "uint256" },
      { internalType: "uint256", name: "maxTotalCallbackGasLimit", type: "uint256" },
    ],
    name: "MaxTotalCallbackGasLimitForAutoCancelOrdersExceeded",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "totalAmount", type: "uint256" },
      { internalType: "uint256", name: "maxTotalAmount", type: "uint256" },
    ],
    name: "MaxTotalContributorTokenAmountExceeded",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "interval", type: "uint256" }],
    name: "MinContributorPaymentIntervalBelowAllowedRange",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "minPaymentInterval", type: "uint256" }],
    name: "MinContributorPaymentIntervalNotYetPassed",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "received", type: "uint256" },
      { internalType: "uint256", name: "expected", type: "uint256" },
    ],
    name: "MinGlvTokens",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "received", type: "uint256" },
      { internalType: "uint256", name: "expected", type: "uint256" },
    ],
    name: "MinLongTokens",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "received", type: "uint256" },
      { internalType: "uint256", name: "expected", type: "uint256" },
    ],
    name: "MinMarketTokens",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "positionSizeInUsd", type: "uint256" },
      { internalType: "uint256", name: "minPositionSizeUsd", type: "uint256" },
    ],
    name: "MinPositionSize",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "received", type: "uint256" },
      { internalType: "uint256", name: "expected", type: "uint256" },
    ],
    name: "MinShortTokens",
    type: "error",
  },
  {
    inputs: [
      { internalType: "int256", name: "executionPrice", type: "int256" },
      { internalType: "uint256", name: "price", type: "uint256" },
      { internalType: "uint256", name: "positionSizeInUsd", type: "uint256" },
      { internalType: "int256", name: "priceImpactUsd", type: "int256" },
      { internalType: "uint256", name: "sizeDeltaUsd", type: "uint256" },
    ],
    name: "NegativeExecutionPrice",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "provider", type: "address" }],
    name: "NonAtomicOracleProvider",
    type: "error",
  },
  { inputs: [], name: "NonEmptyExternalCallsForSubaccountOrder", type: "error" },
  {
    inputs: [{ internalType: "uint256", name: "tokensWithPricesLength", type: "uint256" }],
    name: "NonEmptyTokensWithPrices",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "market", type: "address" }],
    name: "OpenInterestCannotBeUpdatedForSwapOnlyMarket",
    type: "error",
  },
  { inputs: [], name: "OraclePriceOutdated", type: "error" },
  {
    inputs: [
      { internalType: "address", name: "oracle", type: "address" },
      { internalType: "address", name: "token", type: "address" },
    ],
    name: "OracleProviderAlreadyExistsForToken",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "provider", type: "address" },
    ],
    name: "OracleProviderMinChangeDelayNotYetPassed",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "maxOracleTimestamp", type: "uint256" },
      { internalType: "uint256", name: "requestTimestamp", type: "uint256" },
      { internalType: "uint256", name: "requestExpirationTime", type: "uint256" },
    ],
    name: "OracleTimestampsAreLargerThanRequestExpirationTime",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "minOracleTimestamp", type: "uint256" },
      { internalType: "uint256", name: "expectedTimestamp", type: "uint256" },
    ],
    name: "OracleTimestampsAreSmallerThanRequired",
    type: "error",
  },
  { inputs: [], name: "OrderAlreadyFrozen", type: "error" },
  { inputs: [{ internalType: "bytes32", name: "key", type: "bytes32" }], name: "OrderNotFound", type: "error" },
  {
    inputs: [
      { internalType: "uint256", name: "price", type: "uint256" },
      { internalType: "uint256", name: "acceptablePrice", type: "uint256" },
    ],
    name: "OrderNotFulfillableAtAcceptablePrice",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "orderType", type: "uint256" }],
    name: "OrderNotUpdatable",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "orderType", type: "uint256" }],
    name: "OrderTypeCannotBeCreated",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "validFromTime", type: "uint256" },
      { internalType: "uint256", name: "currentTimestamp", type: "uint256" },
    ],
    name: "OrderValidFromTimeNotReached",
    type: "error",
  },
  {
    inputs: [
      { internalType: "int256", name: "pnlToPoolFactor", type: "int256" },
      { internalType: "uint256", name: "maxPnlFactor", type: "uint256" },
    ],
    name: "PnlFactorExceededForLongs",
    type: "error",
  },
  {
    inputs: [
      { internalType: "int256", name: "pnlToPoolFactor", type: "int256" },
      { internalType: "uint256", name: "maxPnlFactor", type: "uint256" },
    ],
    name: "PnlFactorExceededForShorts",
    type: "error",
  },
  {
    inputs: [
      { internalType: "int256", name: "nextPnlToPoolFactor", type: "int256" },
      { internalType: "uint256", name: "minPnlFactorForAdl", type: "uint256" },
    ],
    name: "PnlOvercorrected",
    type: "error",
  },
  { inputs: [{ internalType: "bytes32", name: "key", type: "bytes32" }], name: "PositionNotFound", type: "error" },
  {
    inputs: [
      { internalType: "string", name: "reason", type: "string" },
      { internalType: "int256", name: "remainingCollateralUsd", type: "int256" },
      { internalType: "int256", name: "minCollateralUsd", type: "int256" },
      { internalType: "int256", name: "minCollateralUsdForLeverage", type: "int256" },
    ],
    name: "PositionShouldNotBeLiquidated",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "minPrice", type: "uint256" },
      { internalType: "uint256", name: "maxPrice", type: "uint256" },
    ],
    name: "PriceAlreadySet",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "PriceFeedAlreadyExistsForToken",
    type: "error",
  },
  {
    inputs: [
      { internalType: "int256", name: "priceImpactUsd", type: "int256" },
      { internalType: "uint256", name: "sizeDeltaUsd", type: "uint256" },
    ],
    name: "PriceImpactLargerThanOrderSize",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "lentAmount", type: "uint256" },
      { internalType: "uint256", name: "totalReductionAmount", type: "uint256" },
    ],
    name: "ReductionExceedsLentAmount",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "calldataLength", type: "uint256" }],
    name: "RelayCalldataTooLong",
    type: "error",
  },
  { inputs: [], name: "RelayEmptyBatch", type: "error" },
  {
    inputs: [
      { internalType: "uint256", name: "requestAge", type: "uint256" },
      { internalType: "uint256", name: "requestExpirationAge", type: "uint256" },
      { internalType: "string", name: "requestType", type: "string" },
    ],
    name: "RequestNotYetCancellable",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "receiver", type: "address" }],
    name: "SelfTransferNotSupported",
    type: "error",
  },
  { inputs: [], name: "SequencerDown", type: "error" },
  {
    inputs: [
      { internalType: "uint256", name: "timeSinceUp", type: "uint256" },
      { internalType: "uint256", name: "sequencerGraceDuration", type: "uint256" },
    ],
    name: "SequencerGraceDurationNotYetPassed",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "market", type: "address" }],
    name: "ShiftFromAndToMarketAreEqual",
    type: "error",
  },
  { inputs: [{ internalType: "bytes32", name: "key", type: "bytes32" }], name: "ShiftNotFound", type: "error" },
  {
    inputs: [
      { internalType: "address", name: "fromMarketLongToken", type: "address" },
      { internalType: "address", name: "toMarketLongToken", type: "address" },
    ],
    name: "ShortTokensAreNotEqual",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "signalTime", type: "uint256" }],
    name: "SignalTimeNotYetPassed",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "currentTimestamp", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "SubaccountApprovalDeadlinePassed",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "address", name: "subaccount", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint256", name: "currentTimestamp", type: "uint256" },
    ],
    name: "SubaccountApprovalExpired",
    type: "error",
  },
  {
    inputs: [{ internalType: "bytes32", name: "integrationId", type: "bytes32" }],
    name: "SubaccountIntegrationIdDisabled",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "address", name: "subaccount", type: "address" },
    ],
    name: "SubaccountNotAuthorized",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountAfterFees", type: "uint256" },
      { internalType: "int256", name: "negativeImpactAmount", type: "int256" },
    ],
    name: "SwapPriceImpactExceedsAmountIn",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "longTokenSwapPathLength", type: "uint256" },
      { internalType: "uint256", name: "shortTokenSwapPathLength", type: "uint256" },
    ],
    name: "SwapsNotAllowedForAtomicWithdrawal",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "marketsLength", type: "uint256" },
      { internalType: "uint256", name: "parametersLength", type: "uint256" },
    ],
    name: "SyncConfigInvalidInputLengths",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "market", type: "address" },
      { internalType: "address", name: "marketFromData", type: "address" },
    ],
    name: "SyncConfigInvalidMarketFromData",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "market", type: "address" }],
    name: "SyncConfigUpdatesDisabledForMarket",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "market", type: "address" },
      { internalType: "string", name: "parameter", type: "string" },
    ],
    name: "SyncConfigUpdatesDisabledForMarketParameter",
    type: "error",
  },
  {
    inputs: [{ internalType: "string", name: "parameter", type: "string" }],
    name: "SyncConfigUpdatesDisabledForParameter",
    type: "error",
  },
  { inputs: [], name: "ThereMustBeAtLeastOneRoleAdmin", type: "error" },
  { inputs: [], name: "ThereMustBeAtLeastOneTimelockMultiSig", type: "error" },
  { inputs: [], name: "TokenPermitsNotAllowedForMultichain", type: "error" },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "TokenTransferError",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "length", type: "uint256" }],
    name: "Uint256AsBytesLengthExceeds32Bytes",
    type: "error",
  },
  { inputs: [], name: "UnableToGetBorrowingFactorEmptyPoolUsd", type: "error" },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "market", type: "address" },
    ],
    name: "UnableToGetCachedTokenPrice",
    type: "error",
  },
  { inputs: [], name: "UnableToGetFundingFactorEmptyOpenInterest", type: "error" },
  {
    inputs: [
      { internalType: "address", name: "inputToken", type: "address" },
      { internalType: "address", name: "market", type: "address" },
    ],
    name: "UnableToGetOppositeToken",
    type: "error",
  },
  { inputs: [], name: "UnableToPayOrderFee", type: "error" },
  { inputs: [], name: "UnableToPayOrderFeeFromCollateral", type: "error" },
  {
    inputs: [{ internalType: "int256", name: "estimatedRemainingCollateralUsd", type: "int256" }],
    name: "UnableToWithdrawCollateral",
    type: "error",
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
      { internalType: "uint256", name: "positionBorrowingFactor", type: "uint256" },
      { internalType: "uint256", name: "cumulativeBorrowingFactor", type: "uint256" },
    ],
    name: "UnexpectedBorrowingFactor",
    type: "error",
  },
  { inputs: [], name: "UnexpectedMarket", type: "error" },
  {
    inputs: [{ internalType: "int256", name: "poolValue", type: "int256" }],
    name: "UnexpectedPoolValue",
    type: "error",
  },
  { inputs: [], name: "UnexpectedPositionState", type: "error" },
  {
    inputs: [
      { internalType: "address", name: "feeToken", type: "address" },
      { internalType: "address", name: "expectedFeeToken", type: "address" },
    ],
    name: "UnexpectedRelayFeeToken",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "feeToken", type: "address" },
      { internalType: "address", name: "expectedFeeToken", type: "address" },
    ],
    name: "UnexpectedRelayFeeTokenAfterSwap",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "market", type: "address" },
    ],
    name: "UnexpectedTokenForVirtualInventory",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "orderType", type: "uint256" }],
    name: "UnexpectedValidFromTime",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "orderType", type: "uint256" }],
    name: "UnsupportedOrderType",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "orderType", type: "uint256" }],
    name: "UnsupportedOrderTypeForAutoCancellation",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "feeToken", type: "address" },
      { internalType: "address", name: "expectedFeeToken", type: "address" },
    ],
    name: "UnsupportedRelayFeeToken",
    type: "error",
  },
  {
    inputs: [
      { internalType: "int256", name: "usdDelta", type: "int256" },
      { internalType: "uint256", name: "longOpenInterest", type: "uint256" },
    ],
    name: "UsdDeltaExceedsLongOpenInterest",
    type: "error",
  },
  {
    inputs: [
      { internalType: "int256", name: "usdDelta", type: "int256" },
      { internalType: "uint256", name: "poolUsd", type: "uint256" },
    ],
    name: "UsdDeltaExceedsPoolValue",
    type: "error",
  },
  {
    inputs: [
      { internalType: "int256", name: "usdDelta", type: "int256" },
      { internalType: "uint256", name: "shortOpenInterest", type: "uint256" },
    ],
    name: "UsdDeltaExceedsShortOpenInterest",
    type: "error",
  },
  { inputs: [{ internalType: "bytes32", name: "key", type: "bytes32" }], name: "WithdrawalNotFound", type: "error" },
] as const;
