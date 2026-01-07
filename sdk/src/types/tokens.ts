export type ERC20Address = string & { __brand: "ERC20Address" };
export type NativeTokenSupportedAddress = string & { __brand: "NativeTokenSupportedAddress" };

export type TokenAddressTypesMap = {
  wrapped: ERC20Address;
  native: NativeTokenSupportedAddress;
};

export type ContractPrice = bigint & { __brand: "contractPrice" };

export type TokenCategory = "meme" | "layer1" | "layer2" | "defi";

// Static token data
export type Token = {
  name: string;
  symbol: string;
  assetSymbol?: string;
  baseSymbol?: string;
  decimals: number;
  address: string;
  priceDecimals?: number;
  visualMultiplier?: number;
  visualPrefix?: string;
  wrappedAddress?: string;
  metamaskSymbol?: string;
  explorerSymbol?: string;
  explorerUrl?: string;
  reservesUrl?: string;
  imageUrl?: string;
  categories?: TokenCategory[];
  isPermitSupported?: boolean;
  isPermitDisabled?: boolean;
  contractVersion?: string;

  isUsdg?: boolean;
  isNative?: boolean;
  isWrapped?: boolean;
  isShortable?: boolean;
  isStable?: boolean;
  isSynthetic?: boolean;
  isTempHidden?: boolean;
  isChartDisabled?: boolean;
  isV1Available?: boolean;
  isPlatformToken?: boolean;
  isPlatformTradingToken?: boolean;
  isStaking?: boolean;
};

/**
 * @deprecated V1 TokenInfo struct
 */
export type TokenInfo = Token & {
  hasMaxAvailableLong?: boolean;
  hasMaxAvailableShort?: boolean;

  usdgAmount?: bigint;
  maxUsdgAmount?: bigint;

  poolAmount?: bigint;
  bufferAmount?: bigint;
  managedAmount?: bigint;
  managedUsd?: bigint;
  availableAmount?: bigint;
  availableUsd?: bigint;
  guaranteedUsd?: bigint;
  redemptionAmount?: bigint;
  reservedAmount?: bigint;

  balance?: bigint;

  weight?: bigint;

  maxPrice?: bigint;
  maxPrimaryPrice?: bigint;

  minPrice?: bigint;
  minPrimaryPrice?: bigint;

  contractMaxPrice?: bigint;
  contractMinPrice?: bigint;

  spread?: bigint;

  cumulativeFundingRate?: bigint;
  fundingRate?: bigint;

  globalShortSize?: bigint;

  maxAvailableLong?: bigint;
  maxAvailableShort?: bigint;

  maxGlobalLongSize?: bigint;
  maxGlobalShortSize?: bigint;

  maxLongCapacity?: bigint;
};

export type SignedTokenPermit = {
  // account address
  owner: string;
  // spender contract address
  spender: string;
  // amount
  value: bigint;
  // validity period of the permit
  deadline: bigint;
  // ECDSA signature components
  v: number;
  r: string;
  s: string;
  // token address
  token: string;
  onchainParams: {
    name: string;
    version: string;
    nonce: bigint;
  };
};

export type TokenPrices = {
  minPrice: bigint;
  maxPrice: bigint;
};

export enum TokenBalanceType {
  Wallet = 0,
  GmxAccount = 1,
  SourceChain = 2,
}

export type TokenAsyncData = {
  prices: TokenPrices;
  walletBalance?: bigint;
  gmxAccountBalance?: bigint;
  /**
   * In source chain decimals, use `getMappedTokenId` to get the decimals
   */
  sourceChainBalance?: bigint;
  balanceType?: TokenBalanceType;
  /**
   * Balance according to the balanceType
   */
  balance?: bigint;
  totalSupply?: bigint;
  hasPriceFeedProvider?: boolean;
};

export type TokenData = Token & TokenAsyncData;

export type ProgressiveTokenData = Token & Partial<TokenAsyncData>;

export type TokensRatio = {
  ratio: bigint;
  largestToken: Token;
  smallestToken: Token;
};

export type TokensRatioAndSlippage = TokensRatio & {
  allowedSwapSlippageBps: bigint;
  acceptablePrice: bigint;
};

/**
 * @deprecated V1 InfoTokens struct
 */
export type InfoTokens = {
  [key: string]: TokenInfo;
};

export type TokenBalancesData = {
  [tokenAddress: string]: bigint;
};

export type TokenPricesData = {
  [address: string]: TokenPrices;
};

export type TokensAllowanceData = {
  [tokenAddress: string]: bigint;
};

export type TokensData = {
  [address: string]: TokenData;
};

export type ProgressiveTokensData = {
  [address: string]: ProgressiveTokenData;
};
