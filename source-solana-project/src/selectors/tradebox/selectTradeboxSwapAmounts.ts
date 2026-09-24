import { getSwapAmountsByFromValue } from '@/utils/tradebox/getSwapAmountsByFromValue';
import { getSwapAmountsByToValue } from '@/utils/tradebox/getSwapAmountsByToValue';
import { selectTradeboxFocusedInput } from './baseSelectors';
import { selectTradeboxToTokenInputValue } from './baseSelectors';
import { selectTradeboxFromTokenInputValue } from './baseSelectors';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTokensData } from '../token/selectTokensData';
import { selectTradeboxTradeMode } from './baseSelectors';
import { selectTradeboxFromTokenAddress } from './selectTradeboxFromTokenAddress';
import { selectTradeboxToTokenAddress } from './selectTradeboxToTokenAddress';
import { selectTradeboxCollateralTokenAddress } from './selectTradeboxCollateralTokenAddress';
import { selectTradeboxIsWrapOrUnwrap } from './selectTradeboxIsWrapOrUnwrap';
import { selectTradeboxTradeRatios } from './selectTradeboxTradeRatios';
import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectSwapGraph } from '../trade/selectSwapGraph';
import { selectSwapEstimator } from '../trade/selectSwapEstimator';
import { selectWrappedNativeToken } from '../token/selectWrappedNativeToken';
import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { SwapAmounts, TradeType } from '@/selectors/trade/types';
import { getByKey } from '@/utils/lib/object';
import { parseValue } from '@/utils/legacy/parse';
import { BN_ZERO } from '@/config/constants';
import { getTradeFlags } from '@/utils/tradebox/getTradeFlags';
import { BN } from '@coral-xyz/anchor';
import { findAllPaths } from '@/utils/tradebox/findAllPaths';
import { getSwapPathStats } from '@/utils/tradebox/getSwapPathStats';
import { getSwapBestPath } from '@/utils/tradebox/getSwapBestPath';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { isNativeToken } from '@/utils/token/isNativeToken';

export const selectTradeboxSwapAmounts = createAppStoreSelector(
  [
    selectTokensData,
    selectTradeboxTradeMode,
    selectTradeboxFromTokenAddress,
    selectTradeboxFromTokenInputValue,
    selectTradeboxToTokenAddress,
    selectTradeboxToTokenInputValue,
    selectTradeboxFocusedInput,
    selectTradeboxCollateralTokenAddress,
    selectTradeboxIsWrapOrUnwrap,
    selectTradeboxTradeRatios,
    selectMarketsInfo,
    selectSwapGraph,
    selectSwapEstimator,
    selectWrappedNativeToken,
  ],
  (
    tokensData,
    tradeMode,
    fromTokenAddressRaw,
    fromTokenInputValue,
    toTokenAddressRaw,
    toTokenInputValue,
    amountBy,
    collateralTokenAddress,
    isWrapOrUnwrap,
    { markRatio, triggerRatio },
    marketsInfo,
    marketsGraph,
    swapEstimator,
    wrappedNativeToken
  ): SwapAmounts | undefined => {
    const fromTokenAddress = isNativeToken(fromTokenAddressRaw)
      ? WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58()
      : fromTokenAddressRaw;
    const toTokenAddress = isNativeToken(toTokenAddressRaw)
      ? WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58()
      : toTokenAddressRaw;

    const fromToken = fromTokenAddress
      ? getByKey(tokensData, fromTokenAddress)
      : undefined;
    const fromTokenAmount = fromToken
      ? (parseValue(fromTokenInputValue || '0', fromToken.decimals) ?? BN_ZERO)
      : BN_ZERO;
    const toToken = toTokenAddress
      ? getByKey(tokensData, toTokenAddress)
      : undefined;
    const toTokenAmount = toToken
      ? (parseValue(toTokenInputValue || '0', toToken.decimals) ?? BN_ZERO)
      : BN_ZERO;
    const tradeFlags = getTradeFlags(TradeType.Swap, tradeMode);

    const fromTokenPrice = fromToken?.prices.minPrice;

    if (
      !fromToken ||
      !toToken ||
      fromTokenPrice === undefined ||
      !wrappedNativeToken
    ) {
      return undefined;
    }

    const findSwapPath = (usdIn: BN, opts: { byLiquidity?: boolean }) => {
      const targetTokenAddress = tradeFlags.isPosition
        ? collateralTokenAddress
        : toTokenAddress;

      if (
        !marketsInfo ||
        !marketsGraph ||
        !swapEstimator ||
        !fromTokenAddress ||
        !targetTokenAddress
      ) {
        return undefined;
      }

      const allPaths = findAllPaths(
        marketsInfo,
        marketsGraph,
        fromTokenAddress,
        targetTokenAddress
      );

      if (!allPaths?.length) {
        return undefined;
      }

      let swapPath: string[] | undefined = undefined;

      if (opts.byLiquidity) {
        swapPath = allPaths[0].path;
      } else {
        swapPath = getSwapBestPath(allPaths, usdIn, swapEstimator);
      }

      if (!swapPath) {
        return undefined;
      }

      return getSwapPathStats({
        marketsInfo,
        swapPath,
        initialCollateralAddress: fromTokenAddress,
        wrappedNativeTokenAddress: WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58(),
        shouldUnwrapNativeToken:
          isNativeToken(toTokenAddress) || isNativeToken(fromTokenAddress),
        shouldApplyPriceImpact: true,
        usdIn,
      });
    };

    if (isWrapOrUnwrap) {
      const tokenAmount = amountBy === 'from' ? fromTokenAmount : toTokenAmount;
      const usdAmount = convertTokenAmountToUsd(
        tokenAmount,
        fromToken.decimals,
        fromTokenPrice
      );
      const price = fromTokenPrice;

      return {
        amountIn: tokenAmount,
        usdIn: usdAmount,
        amountOut: tokenAmount,
        usdOut: usdAmount,
        swapPathStats: undefined,
        priceIn: price,
        priceOut: price,
        minOutputAmount: tokenAmount,
      };
    }

    return amountBy === 'from'
      ? getSwapAmountsByFromValue({
          tokenInRaw: fromToken,
          tokenOutRaw: toToken,
          amountIn: fromTokenAmount,
          triggerRatio: triggerRatio || markRatio,
          isLimit: tradeFlags.isLimit,
          findSwapPath,
          wrappedNativeToken,
        })
      : getSwapAmountsByToValue({
          tokenInRaw: fromToken,
          tokenOutRaw: toToken,
          amountOut: toTokenAmount,
          triggerRatio: triggerRatio || markRatio,
          isLimit: tradeFlags.isLimit,
          findSwapPath,
          wrappedNativeToken,
        });
  }
);
