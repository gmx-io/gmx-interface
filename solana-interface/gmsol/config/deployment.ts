export interface GMSOLDeployment {
  store: string;
  oracle: string;
  config: string;
  treasury_vault_config: string;
  market_tokens: string[];
  glv_tokens: string[];
  tokens: Tokens;
}

export interface Tokens {
  [address: string]: TokenConfig;
}

export interface TokenConfig {
  symbol: string;
  decimals: number;
  decimals_gmx?: number;
  isStable?: boolean;
  priceDecimals?: number;
  wrappedAddress?: string;
  isSynthetic?: boolean;
  isSpl2022Mint?: boolean;
  shouldWrap?: boolean;
}
