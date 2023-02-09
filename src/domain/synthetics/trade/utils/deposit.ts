// import { MarketsFeesConfigsData, getMarketFeesConfig, getPriceImpactUsd } from "domain/synthetics/fees";
// import { Market, MarketTokenData, MarketsData, MarketsPoolsData, getPoolUsd } from "domain/synthetics/markets";
// import { TokensData, TokensRatio, convertToTokenAmount, convertToUsd, getTokenData } from "domain/synthetics/tokens";
// import { BigNumber } from "ethers";
// import { PRECISION } from "lib/legacy";
// import { applyFactor } from "lib/numbers";

// export function getDepositAmounts(p: {
//   marketsData: MarketsData;
//   tokensData: TokensData;
//   poolsData: MarketsPoolsData;
//   feesConfigs: MarketsFeesConfigsData;
//   market?: Market;
//   marketToken?: MarketTokenData;
//   marketTokenAmount?: BigNumber;
//   longTokenAmount?: BigNumber;
//   shortTokenAmount?: BigNumber;
//   longToShortRatio?: TokensRatio;
//   includeLongToken?: boolean;
//   includeShortToken?: boolean;
// }) {
//   const feesConfig = getMarketFeesConfig(p.feesConfigs, p.market?.marketTokenAddress);
//   const longToken = getTokenData(p.tokensData, p.market?.longTokenAddress);
//   const shortToken = getTokenData(p.tokensData, p.market?.shortTokenAddress);

//   const longPoolUsd = getPoolUsd(
//     p.marketsData,
//     p.poolsData,
//     p.tokensData,
//     p.market?.marketTokenAddress,
//     p.market?.longTokenAddress,
//     "midPrice"
//   );

//   const shortPoolUsd = getPoolUsd(
//     p.marketsData,
//     p.poolsData,
//     p.tokensData,
//     p.market?.marketTokenAddress,
//     p.market?.shortTokenAddress,
//     "midPrice"
//   );

//   if (!p.marketTokenAmount && (p.longTokenAmount?.gt(0) || p.shortTokenAmount?.gt(0))) {
//     // TODO: calculate market token amount by long and short token amounts
//     const longTokenUsd = convertToUsd(p.longTokenAmount, longToken?.decimals, longToken?.prices?.minPrice);
//     const shortTokenUsd = convertToUsd(p.shortTokenAmount, shortToken?.decimals, shortToken?.prices?.minPrice);

//     let marketTokenUsd = longTokenUsd?.add(shortTokenUsd!);

//     if (!marketTokenUsd) {
//       return undefined;
//     }

//     const swapFeeUsd = applyFactor(marketTokenUsd, feesConfig?.swapFeeFactor!);

//     marketTokenUsd = marketTokenUsd.sub(swapFeeUsd);

//     const swapPriceImpactDeltaUsd = getPriceImpactUsd({
//       currentLongUsd: longPoolUsd,
//       currentShortUsd: shortPoolUsd,
//       longDeltaUsd: longTokenUsd || BigNumber.from(0),
//       shortDeltaUsd: shortTokenUsd || BigNumber.from(0),
//       factorPositive: feesConfig?.swapImpactFactorPositive,
//       factorNegative: feesConfig?.swapImpactFactorNegative,
//       exponentFactor: feesConfig?.swapImpactExponentFactor,
//     });

//     if (!swapPriceImpactDeltaUsd) {
//       return undefined;
//     }

//     marketTokenUsd = marketTokenUsd.add(swapPriceImpactDeltaUsd);

//     const marketTokenAmount = convertToTokenAmount(
//       marketTokenUsd,
//       p.marketToken?.decimals,
//       p.marketToken?.prices?.minPrice!
//     );

//     return {
//       marketTokenAmount,
//       marketTokenUsd,
//       longTokenAmount: p.longTokenAmount,
//       longTokenUsd,
//       shortTokenAmount: p.shortTokenAmount,
//       shortTokenUsd,
//       swapFeeUsd,
//       swapPriceImpactDeltaUsd,
//     };
//   } else if (!p.longTokenAmount && !p.shortTokenAmount && p.marketTokenAmount?.gt(0)) {
//     const marketTokenUsd = convertToUsd(p.marketTokenAmount, p.marketToken?.decimals, p.marketToken?.prices?.minPrice!);

//     if (!marketTokenUsd || !longToken?.prices || !shortToken?.prices) {
//       return undefined;
//     }

//     let longTokenUsd: BigNumber;
//     let shortTokenUsd: BigNumber;

//     if (p.includeLongToken && p.includeShortToken && p.longToShortRatio) {
//       if (p.longToShortRatio.largestAddress === longToken.address) {
//         longTokenUsd = marketTokenUsd.mul(PRECISION).div(p.longToShortRatio.ratio);
//         shortTokenUsd = marketTokenUsd.sub(longTokenUsd);
//       } else {
//         shortTokenUsd = marketTokenUsd.mul(PRECISION).div(p.longToShortRatio.ratio);
//         longTokenUsd = marketTokenUsd.sub(shortTokenUsd);
//       }
//     } else if (p.includeLongToken) {
//       longTokenUsd = marketTokenUsd;
//       shortTokenUsd = BigNumber.from(0);
//     } else if (p.includeShortToken) {
//       shortTokenUsd = marketTokenUsd;
//       longTokenUsd = BigNumber.from(0);
//     } else {
//       return undefined;
//     }

//     const longTokenAmount = convertToTokenAmount(longTokenUsd, longToken?.decimals, longToken?.prices?.minPrice!);
//     const shortTokenAmount = convertToTokenAmount(shortTokenUsd, shortToken?.decimals, shortToken?.prices?.minPrice!);

//     return {
//       marketTokenAmount: p.marketTokenAmount,
//       marketTokenUsd,
//       longTokenAmount,
//       longTokenUsd,
//       shortTokenAmount,
//       shortTokenUsd,
//       swapFeeUsd: BigNumber.from(0),
//       swapPriceImpactDeltaUsd: BigNumber.from(0),
//     };
//   }
// }
