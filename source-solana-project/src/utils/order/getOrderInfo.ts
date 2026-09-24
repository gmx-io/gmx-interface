import { BN_10, BN_ZERO } from '@/config/constants';
import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { MarketsInfo } from '@/selectors/market/types';
import {
  Order,
  PositionOrderInfo,
  SwapOrderInfo,
} from '@/selectors/order/types';
import { Token, TokensData } from '@/selectors/token/types';
import {
  convertTokenAmountToUsd,
  convertUsdToTokenAmount,
} from '@/utils/legacy/convert';
import { EMPTY_ARRAY, getByKey } from '@/utils/lib/object';
import { getTriggerThresholdType } from '@/utils/order/getTriggerThresholdType';
import {
  isIncreaseOrderType,
  isSwapOrderType,
} from '@/utils/order/isOrderType';
import { getTokensRatioByAmounts } from '@/utils/token/getTokensRatioByAmounts';
import { getSwapPathOutputAddresses } from '@/utils/tradebox/getSwapPathOutputAddresses';
import { getSwapPathStats } from '@/utils/tradebox/getSwapPathStats';
import { BN } from '@coral-xyz/anchor';
import { isNativeToken } from '@/utils/token/isNativeToken';

export function getOrderInfo(p: {
  marketsInfoData: MarketsInfo;
  tokensData: TokensData;
  wrappedNativeToken: Token;
  order: Order;
}) {
  const { marketsInfoData, tokensData, wrappedNativeToken, order } = p;

  if (isSwapOrderType(order.orderType)) {
    const initialCollateralToken = getByKey(
      tokensData,
      order.initialCollateralTokenAddress.toBase58()
    );
    const { outTokenAddress } = getSwapPathOutputAddresses({
      marketsInfo: marketsInfoData,
      swapPath: order.primarySwapPath ?? EMPTY_ARRAY,
      initialCollateralAddress: order.initialCollateralTokenAddress.toBase58(),
      wrappedNativeTokenAddress: wrappedNativeToken.address.toBase58(),
      shouldUnwrapNativeToken: isNativeToken(order.finalOutputTokenAddress),
      isIncrease: false,
    });

    const targetCollateralToken = getByKey(tokensData, outTokenAddress);

    if (!initialCollateralToken || !targetCollateralToken) {
      return undefined;
    }

    const swapPathStats = getSwapPathStats({
      marketsInfo: marketsInfoData,
      swapPath: order.primarySwapPath ?? EMPTY_ARRAY,
      initialCollateralAddress: order.initialCollateralTokenAddress.toBase58(),
      wrappedNativeTokenAddress: WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58(),
      usdIn: convertTokenAmountToUsd(
        order.initialCollateralDeltaAmount,
        initialCollateralToken.decimals,
        initialCollateralToken.prices.minPrice
      ),
      shouldUnwrapNativeToken: isNativeToken(order.finalOutputTokenAddress),
      shouldApplyPriceImpact: true,
    });

    const priceImpactAmount =
      convertUsdToTokenAmount(
        swapPathStats?.totalSwapPriceImpactDeltaUsd,
        targetCollateralToken.decimals,
        targetCollateralToken.prices.minPrice
      ) ?? BN_ZERO;

    const swapFeeAmount =
      convertUsdToTokenAmount(
        swapPathStats?.totalSwapFeeUsd,
        targetCollateralToken.decimals,
        targetCollateralToken.prices.minPrice
      ) ?? BN_ZERO;

    const toAmount = order.minOutputAmount
      .sub(priceImpactAmount ?? BN_ZERO)
      .add(swapFeeAmount ?? BN_ZERO);

    const triggerRatio = getTokensRatioByAmounts({
      fromToken: initialCollateralToken,
      toToken: targetCollateralToken,
      fromTokenAmount: order.initialCollateralDeltaAmount,
      toTokenAmount: toAmount,
    });

    const orderInfo: SwapOrderInfo = {
      ...order,
      swapPathStats,
      triggerRatio,
      initialCollateralToken,
      targetCollateralToken,
    };

    return orderInfo;
  } else {
    const marketInfo = getByKey(
      marketsInfoData,
      order.marketTokenAddress.toBase58()
    );
    const indexToken = marketInfo?.indexToken;

    const initialCollateralToken = getByKey(
      tokensData,
      order.initialCollateralTokenAddress.toBase58()
    );

    const { outTokenAddress } = getSwapPathOutputAddresses({
      marketsInfo: marketsInfoData,
      swapPath: order.primarySwapPath ?? EMPTY_ARRAY,
      initialCollateralAddress: order.initialCollateralTokenAddress.toBase58(),
      wrappedNativeTokenAddress: wrappedNativeToken.address.toBase58(),
      shouldUnwrapNativeToken: isNativeToken(order.finalOutputTokenAddress),
      isIncrease: isIncreaseOrderType(order.orderType),
    });

    const targetCollateralToken = getByKey(tokensData, outTokenAddress);

    if (
      !marketInfo ||
      !indexToken ||
      !initialCollateralToken ||
      !targetCollateralToken
    ) {
      return undefined;
    }

    const acceptablePrice = order.acceptablePrice
      ? order.acceptablePrice.mul(BN_10.pow(new BN(indexToken.decimals)))
      : BN_ZERO;
    const triggerPrice = order.triggerPrice
      ? order.triggerPrice.mul(BN_10.pow(new BN(indexToken.decimals)))
      : BN_ZERO;

    const swapPathStats = getSwapPathStats({
      marketsInfo: marketsInfoData,
      swapPath: order.primarySwapPath ?? EMPTY_ARRAY,
      initialCollateralAddress: order.initialCollateralTokenAddress.toBase58(),
      wrappedNativeTokenAddress: wrappedNativeToken.address.toBase58(),
      usdIn: convertTokenAmountToUsd(
        order.initialCollateralDeltaAmount,
        initialCollateralToken.decimals,
        initialCollateralToken.prices.minPrice
      ),
      shouldUnwrapNativeToken: isNativeToken(order.finalOutputTokenAddress),
      shouldApplyPriceImpact: true,
    });

    const triggerThresholdType = getTriggerThresholdType(
      order.orderType,
      order.isLong
    );

    const orderInfo: PositionOrderInfo = {
      ...order,
      swapPathStats,
      marketInfo,
      indexToken,
      initialCollateralToken,
      targetCollateralToken,
      acceptablePrice,
      triggerPrice,
      triggerThresholdType,
    };

    return orderInfo;
  }
}
