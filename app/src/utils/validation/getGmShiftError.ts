import { BN_ONE, BN_ZERO } from '@/config/constants';
import { GmSwapFees } from '@/selectors/fee/types';
import { MarketInfo } from '@/selectors/market/types';
import { TokenData } from '@/selectors/token/types';
import { isGlvInfo } from '@/utils/glv/isGlvInfo';
import { getGmMintableMarketToken } from '@/utils/gm/getGmMintableMarketToken';
import { getGmSellableMarketToken } from '@/utils/gm/getGmSellableMarketToken';
import { expandDecimals } from '@/utils/legacy/decimals';
import { BN } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';

export function getGmShiftError({
  fromMarketInfo,
  fromToken,
  fromTokenAmount,
  fromTokenUsd,
  fromLongTokenAmount,
  fromShortTokenAmount,
  toMarketInfo,
  toToken,
  toTokenAmount,
  fees,
  consentError,
  priceImpactUsd,
}: {
  fromMarketInfo: MarketInfo | undefined;
  fromToken: TokenData | undefined;
  fromTokenAmount: BN | undefined;
  fromTokenUsd: BN | undefined;
  fromLongTokenAmount: BN | undefined;
  fromShortTokenAmount: BN | undefined;
  toMarketInfo: MarketInfo | undefined;
  toToken: TokenData | undefined;
  toTokenAmount: BN | undefined;
  fees: GmSwapFees | undefined;
  consentError: boolean;
  priceImpactUsd: BN | undefined;
}) {
  const isGlv = isGlvInfo(toMarketInfo);

  if (!fromMarketInfo || !fromToken || !toMarketInfo || !toToken) {
    return [t`Loading...`];
  }

  if (consentError) {
    return [t`Acknowledgment Required`];
  }

  if (priceImpactUsd !== undefined && priceImpactUsd.gt(BN_ZERO)) {
    const { impactAmount } = applySwapImpactWithCap(
      toMarketInfo,
      priceImpactUsd
    );
    const newPoolAmount = applyDeltaToPoolAmount(toMarketInfo, impactAmount);

    if (!getIsValidPoolAmount(toMarketInfo, newPoolAmount)) {
      return [t`Max pool amount exceeded`];
    }
  }

  if (!getIsValidPoolUsdForDeposit(toMarketInfo)) {
    return [t`Max pool USD exceeded`];
  }

  const sellable = getGmSellableMarketToken(fromMarketInfo, fromToken);

  if (
    fromTokenAmount !== undefined &&
    sellable.totalAmount?.lt(fromTokenAmount)
  ) {
    return [t`Max ${fromToken?.symbol} sellable amount exceeded`];
  }

  const mintableInfo = getGmMintableMarketToken(toMarketInfo, toToken);

  const longExceedCapacity =
    fromLongTokenAmount !== undefined &&
    fromLongTokenAmount.gt(mintableInfo.longDepositCapacityAmount);
  const shortExceedCapacity =
    fromShortTokenAmount !== undefined &&
    fromShortTokenAmount.gt(mintableInfo.shortDepositCapacityAmount);

  if (!isGlv && (longExceedCapacity || shortExceedCapacity)) {
    return [t`Max ${fromToken?.symbol} buyable amount exceeded`];
  }

  const totalCollateralUsd = fromTokenUsd ?? BN_ZERO;

  const feesExistAndNegative =
    fees?.totalFees?.deltaUsd === undefined
      ? undefined
      : fees?.totalFees?.deltaUsd.lt(BN_ZERO);
  if (
    feesExistAndNegative &&
    fees?.totalFees?.deltaUsd?.abs().gt(totalCollateralUsd)
  ) {
    return [t`Fees exceed Pay amount`];
  }

  if (fromTokenAmount?.lt(BN_ZERO) || toTokenAmount?.lt(BN_ZERO)) {
    return [t`Amount should be greater than zero`];
  }

  if (
    fromTokenAmount === undefined ||
    fromTokenAmount.lte(BN_ZERO) ||
    toTokenAmount === undefined ||
    toTokenAmount.lte(BN_ZERO)
  ) {
    return [t`Enter an amount`];
  }

  if (fromTokenAmount?.gt(fromToken?.balance ?? BN_ZERO)) {
    return [t`Insufficient ${fromToken?.symbol} balance`];
  }

  return [undefined];
}

function applySwapImpactWithCap(marketInfo: MarketInfo, priceImpactUsd: BN) {
  const impactAmount = getSwapImpactAmountWithCap(marketInfo, priceImpactUsd);
  const newSwapImpactPoolAmount = applyDeltaToSwapImpactPool(
    marketInfo,
    impactAmount.neg()
  );

  return { impactAmount, newSwapImpactPoolAmount };
}

function applyDeltaToPoolAmount(marketInfo: MarketInfo, delta: BN) {
  const poolAmount = getTokenOut(marketInfo).address.equals(
    marketInfo.longToken.address
  )
    ? marketInfo.longPoolAmount
    : marketInfo.shortPoolAmount;

  return poolAmount.add(delta);
}

function getSwapImpactAmountWithCap(
  marketInfo: MarketInfo,
  priceImpactUsd: BN
) {
  const token = getTokenOut(marketInfo);
  let impactAmount = BN_ZERO;

  if (priceImpactUsd.gt(BN_ZERO) && token.prices.maxPrice.gt(BN_ZERO)) {
    // positive impact: minimize impactAmount, use tokenPrice.max
    // round positive impactAmount down, this will be deducted from the swap impact pool for the user
    impactAmount = priceImpactUsd.div(token.prices.maxPrice);

    const maxImpactAmount = getSwapImpactPoolAmount(marketInfo);
    if (impactAmount.gt(maxImpactAmount)) {
      impactAmount = maxImpactAmount;
    }
  } else {
    // negative impact: maximize impactAmount, use tokenPrice.min
    // round negative impactAmount up, this will be deducted from the user
    impactAmount = roundUpMagnitudeDivision(
      priceImpactUsd,
      token.prices.minPrice
    );
  }

  return impactAmount;
}

function applyDeltaToSwapImpactPool(marketInfo: MarketInfo, delta: BN) {
  const maxImpactAmount = getSwapImpactPoolAmount(marketInfo);

  if (delta.lt(BN_ZERO) && delta.gt(maxImpactAmount)) {
    return BN_ZERO;
  }

  return maxImpactAmount.add(delta);
}

function getTokenIn(marketInfo: MarketInfo) {
  return marketInfo.shortToken;
}

function getTokenOut(marketInfo: MarketInfo) {
  return marketInfo.longToken;
}

function getSwapImpactPoolAmount(marketInfo: MarketInfo) {
  return getTokenOut(marketInfo).address.equals(marketInfo.longToken.address)
    ? marketInfo.swapImpactLongTokenAmount
    : marketInfo.swapImpactShortTokenAmount;
}

function roundUpMagnitudeDivision(a: BN, b: BN): BN {
  if (b.isZero()) {
    return BN_ZERO;
  }

  if (a.lt(BN_ZERO)) {
    return a.sub(b).add(BN_ONE).div(b);
  }

  return a.add(b).sub(BN_ONE).div(b);
}

function getIsValidPoolAmount(marketInfo: MarketInfo, poolAmount: BN) {
  const maxPoolAmount = getTokenOut(marketInfo).address.equals(
    marketInfo.longToken.address
  )
    ? marketInfo.maxPoolAmountForLongToken
    : marketInfo.maxPoolAmountForShortToken;

  return poolAmount.lte(maxPoolAmount);
}

function getIsValidPoolUsdForDeposit(marketInfo: MarketInfo) {
  const tokenIn = getTokenIn(marketInfo);
  const poolAmount = tokenIn.address.equals(marketInfo.longToken.address)
    ? marketInfo.longPoolAmount
    : marketInfo.shortPoolAmount;
  const poolUsd = tokenIn.prices.maxPrice
    .mul(poolAmount)
    .div(expandDecimals(BN_ONE, tokenIn.decimals));
  const maxPoolUsd = tokenIn.address.equals(marketInfo.longToken.address)
    ? marketInfo.maxPoolValueForDepositForLongToken
    : marketInfo.maxPoolValueForDepositForShortToken;

  return poolUsd.lte(maxPoolUsd);
}
