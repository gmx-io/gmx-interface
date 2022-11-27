import { InfoTokens } from "domain/tokens";
import { BigNumber } from "ethers";
import { expandDecimals } from "lib/numbers";
import { TokenBalancesData, TokenConfigsData, TokenPricesData } from "./types";

export function getTokenPriceData(tokensData: TokenPricesData, tokenAddress?: string) {
  if (!tokenAddress) return undefined;

  return tokensData.tokenPrices[tokenAddress];
}

export function getTokenPrice(tokensData: TokenPricesData, tokenAddress?: string, useMaxPrice?: boolean) {
  const priceData = getTokenPriceData(tokensData, tokenAddress);

  if (!priceData) return undefined;

  return useMaxPrice ? priceData.maxPrice : priceData.minPrice;
}

export function getTokenConfig(tokensData: TokenConfigsData, tokenAddress?: string) {
  if (!tokenAddress) return undefined;

  return tokensData.tokenConfigs[tokenAddress];
}

export function getUsdFromTokenAmount(
  tokensData: TokenPricesData & TokenConfigsData,
  tokenAddress?: string,
  amount?: BigNumber,
  useMaxPrice?: boolean
) {
  const tokenConfig = getTokenConfig(tokensData, tokenAddress);
  const price = getTokenPrice(tokensData, tokenAddress, useMaxPrice);

  if (!tokenConfig || !price || !amount) {
    return undefined;
  }

  return convertToUsdByPrice(amount, tokenConfig.decimals, price);
}

export function getTokenAmountFromUsd(
  tokensData: TokenConfigsData & TokenPricesData,
  tokenAddress?: string,
  usdAmount?: BigNumber,
  useMaxPrice?: boolean
) {
  const tokenConfig = getTokenConfig(tokensData, tokenAddress);
  const price = getTokenPrice(tokensData, tokenAddress, useMaxPrice);

  if (!tokenConfig || !price || !usdAmount) {
    return undefined;
  }

  return convertFromUsdByPrice(usdAmount, tokenConfig.decimals, price);
}

export function adaptToInfoTokens(tokensData: TokenConfigsData & TokenPricesData & TokenBalancesData): InfoTokens {
  const infoTokens = Object.keys(tokensData.tokenConfigs).reduce((acc, address) => {
    const tokenConfigData = getTokenConfig(tokensData, address);

    if (!tokenConfigData) return acc;

    const balance = getTokenBalance(tokensData, address) || BigNumber.from(0);
    const priceData = getTokenPriceData(tokensData, address) || ({} as TokenPricesData);

    acc[address] = {
      ...tokenConfigData,
      ...priceData,
      balance,
    };

    return acc;
  }, {} as InfoTokens);

  return infoTokens;
}

// export function getTokenAmountFromUsd(
//     infoTokens: InfoTokens,
//     tokenAddress: string,
//     usdAmount?: BigNumber,
//     opts: {
//       max?: boolean;
//       overridePrice?: BigNumber;
//     } = {}
//   ) {
//     if (!usdAmount) {
//       return;
//     }

//     if (tokenAddress === USDG_ADDRESS) {
//       return usdAmount.mul(expandDecimals(1, 18)).div(PRECISION);
//     }

//     const info: TokenInfo | undefined = getTokenInfo(infoTokens, tokenAddress);

//     if (!info) {
//       return;
//     }

//     const price = opts.overridePrice || (opts.max ? info.maxPrice : info.minPrice);

//     if (!BigNumber.isBigNumber(price) || price.lte(0)) {
//       return;
//     }

//     return usdAmount.mul(expandDecimals(1, info.decimals)).div(price);
//   }

export function getTokenBalance(tokensData: TokenBalancesData, tokenAddress?: string) {
  if (!tokenAddress) return undefined;

  return tokensData.tokenBalances[tokenAddress];
}

export function convertFromUsdByPrice(usdAmount: BigNumber, tokenDecimals: number, price: BigNumber) {
  if (price.lte(0)) return undefined;

  return usdAmount.mul(expandDecimals(1, tokenDecimals)).div(price);
}

export function convertToUsdByPrice(tokenAmount: BigNumber, tokenDecimals: number, price: BigNumber) {
  return tokenAmount.mul(price).div(expandDecimals(1, tokenDecimals));
}
