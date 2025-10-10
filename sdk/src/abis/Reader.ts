export default [
  {
    inputs: [],
    name: "BASIS_POINTS_DIVISOR",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "contract IVault", name: "_vault", type: "address" },
      { internalType: "address", name: "_tokenIn", type: "address" },
      { internalType: "address", name: "_tokenOut", type: "address" },
      { internalType: "uint256", name: "_amountIn", type: "uint256" },
    ],
    name: "getAmountOut",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_vault", type: "address" },
      { internalType: "address[]", name: "_tokens", type: "address[]" },
    ],
    name: "getFees",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_vault", type: "address" },
      { internalType: "address", name: "_weth", type: "address" },
      { internalType: "address[]", name: "_tokens", type: "address[]" },
    ],
    name: "getFundingRates",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "contract IVault", name: "_vault", type: "address" },
      { internalType: "address", name: "_tokenIn", type: "address" },
      { internalType: "address", name: "_tokenOut", type: "address" },
    ],
    name: "getMaxAmountIn",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_factory", type: "address" },
      { internalType: "address[]", name: "_tokens", type: "address[]" },
    ],
    name: "getPairInfo",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_vault", type: "address" },
      { internalType: "address", name: "_account", type: "address" },
      { internalType: "address[]", name: "_collateralTokens", type: "address[]" },
      { internalType: "address[]", name: "_indexTokens", type: "address[]" },
      { internalType: "bool[]", name: "_isLong", type: "bool[]" },
    ],
    name: "getPositions",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_account", type: "address" },
      { internalType: "address[]", name: "_yieldTrackers", type: "address[]" },
    ],
    name: "getStakingInfo",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_account", type: "address" },
      { internalType: "address[]", name: "_tokens", type: "address[]" },
    ],
    name: "getTokenBalances",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_account", type: "address" },
      { internalType: "address[]", name: "_tokens", type: "address[]" },
    ],
    name: "getTokenBalancesWithSupplies",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "contract IERC20", name: "_token", type: "address" },
      { internalType: "address[]", name: "_excludedAccounts", type: "address[]" },
    ],
    name: "getTokenSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address[]", name: "_yieldTokens", type: "address[]" }],
    name: "getTotalStaked",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_vault", type: "address" },
      { internalType: "address", name: "_weth", type: "address" },
      { internalType: "uint256", name: "_usdgAmount", type: "uint256" },
      { internalType: "address[]", name: "_tokens", type: "address[]" },
    ],
    name: "getVaultTokenInfo",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
