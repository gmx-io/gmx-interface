export type ERC20Address = string & { __brand: "ERC20Address" };
export type NativeTokenSupportedAddress = string & { __brand: "NativeTokenSupportedAddress" };

export type TokenAddressTypesMap = {
  wrapped: ERC20Address;
  native: NativeTokenSupportedAddress;
};

export type ContractPrice = bigint & { __brand: "contractPrice" };

export type TokenCategory = "meme" | "layer1" | "layer2" | "defi";

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
  coingeckoUrl?: string;
  coingeckoSymbol?: string;
  metamaskSymbol?: string;
  explorerSymbol?: string;
  explorerUrl?: string;
  reservesUrl?: string;
  imageUrl?: string;
  categories?: TokenCategory[];
  isPermitSupported?: boolean;

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
  shouldResetAllowance?: boolean;
};

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
};

export type InfoTokens = {
  [key: string]: TokenInfo;
};

export type TokenPrices = {
  minPrice: bigint;
  maxPrice: bigint;
};

export type TokenData = Token & {
  prices: TokenPrices;
  balance?: bigint;
  totalSupply?: bigint;
  priceFeedAddress?: string;
  permitConfig?: PermitConfig;
};

export type PermitConfig = {
  domainSeparator: string;
  nonce: bigint;
  name: string;
  version: string;
};

export type TokensRatio = {
  ratio: bigint;
  largestToken: Token;
  smallestToken: Token;
};

export type TokensRatioAndSlippage = TokensRatio & {
  allowedSwapSlippageBps: bigint;
  acceptablePrice: bigint;
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
