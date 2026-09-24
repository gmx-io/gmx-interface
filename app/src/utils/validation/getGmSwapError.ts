import { BN_ONE, BN_ZERO } from '@/config/constants';
import { GmSwapFees } from '@/selectors/fee/types';
import { MarketInfo } from '@/selectors/market/types';
import { TokenData, TokensData } from '@/selectors/token/types';
import { getGlvDisplayName } from '@/utils/glv/getGlvDisplayName';
import { getGlvMarketMaxBuyableUsdWithGm } from '@/utils/glv/getGlvMarketMaxBuyableUsdWithGm';
import { getGlvSellableInfoInMarket } from '@/utils/glv/getGlvSellableInfoInGlvMarket';
import { GlvInfo } from '@/selectors/glv/types';
import { getGmMintableMarketToken } from '@/utils/gm/getGmMintableMarketToken';
import { getGmSellableMarketToken } from '@/utils/gm/getGmSellableMarketToken';
import { expandDecimals } from '@/utils/legacy/decimals';
import { getMarketIndexName } from '@/utils/market/getMarketIndexName';
import { getMarketPoolName } from '@/utils/market/getMarketPoolName';
import { BN } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';

export function getGmSwapError(p: {
  isDeposit: boolean;
  marketInfo: MarketInfo | undefined;
  marketToken: TokenData | undefined;
  longToken: TokenData | undefined;
  shortToken: TokenData | undefined;
  glvToken: TokenData | undefined;
  glvTokenAmount: BN | undefined;
  glvTokenUsd: BN | undefined;
  longTokenAmount: BN | undefined;
  shortTokenAmount: BN | undefined;
  longTokenUsd: BN | undefined;
  shortTokenUsd: BN | undefined;
  marketTokenAmount: BN | undefined;
  marketTokenUsd: BN | undefined;
  longTokenLiquidityUsd: BN | undefined;
  shortTokenLiquidityUsd: BN | undefined;
  fees: GmSwapFees | undefined;
  consentError: boolean;
  priceImpactUsd: BN | undefined;
  glvInfo?: GlvInfo;
  marketTokensData?: TokensData;
  isMarketTokenDeposit?: boolean;
}) {
  const {
    isDeposit,
    marketInfo,
    marketToken,
    longToken,
    shortToken,
    glvToken,
    glvTokenAmount,
    longTokenAmount,
    shortTokenAmount,
    longTokenUsd,
    shortTokenUsd,
    marketTokenAmount,
    marketTokenUsd,
    longTokenLiquidityUsd,
    shortTokenLiquidityUsd,
    fees,
    consentError,
    priceImpactUsd,
    glvInfo,
    marketTokensData,
    isMarketTokenDeposit,
  } = p;

  if (!marketInfo || !marketToken) {
    return [t`Loading...`];
  }

  if (consentError) {
    return [t`Acknowledgment Required`];
  }

  const glvTooltipMessage = t`The buyable cap for the pool GM: ${marketInfo.name} using the pay token selected is reached. Please choose a different pool, reduce the buy size, or pick a different composition of tokens.`;

  if (isDeposit) {
    if (priceImpactUsd !== undefined && priceImpactUsd.gt(BN_ZERO)) {
      const { impactAmount } = applySwapImpactWithCap(
        marketInfo,
        priceImpactUsd
      );
      const newPoolAmount = applyDeltaToPoolAmount(marketInfo, impactAmount);

      if (!getIsValidPoolAmount(marketInfo, newPoolAmount)) {
        const error = [t`Max pool amount exceeded`];

        if (glvInfo) {
          error.push(glvTooltipMessage);
        }
      }
    }

    if (!getIsValidPoolUsdForDeposit(marketInfo)) {
      const error = [t`Max pool USD exceeded`];

      if (glvInfo) {
        error.push(glvTooltipMessage);
      }
    }

    const totalCollateralUsd = (longTokenUsd ?? BN_ZERO).add(
      shortTokenUsd ?? BN_ZERO
    );

    if (
      (fees?.totalFees?.deltaUsd === undefined
        ? undefined
        : fees?.totalFees?.deltaUsd.lt(BN_ZERO)) &&
      fees?.totalFees?.deltaUsd?.abs().gt(totalCollateralUsd)
    ) {
      return [t`Fees exceed Pay amount`];
    }

    if (glvInfo) {
      const glvMarket =
        marketToken &&
        glvInfo.markets.find(({ marketTokenAddress }) =>
          marketTokenAddress.equals(marketToken.address)
        );

      if (glvMarket) {
        const maxBuyableUsdInGm = getGlvMarketMaxBuyableUsdWithGm(
          glvMarket,
          marketInfo,
          marketToken
        );
        if (
          marketTokenUsd !== undefined &&
          maxBuyableUsdInGm.lt(marketTokenUsd)
        ) {
          return [t`Max pool amount reached`, glvTooltipMessage];
        }
      }

      const mintableInfo = getGmMintableMarketToken(marketInfo, marketToken);
      const maxLongExceeded =
        longTokenAmount !== undefined &&
        longTokenAmount.gt(mintableInfo.longDepositCapacityAmount);
      const maxShortExceeded =
        shortTokenAmount !== undefined &&
        shortTokenAmount.gt(mintableInfo.shortDepositCapacityAmount);

      if (maxLongExceeded || maxShortExceeded) {
        return [t`Max GM buyable amount reached`, glvTooltipMessage];
      }
    } else {
      const mintableInfo = getGmMintableMarketToken(marketInfo, marketToken);
      if (
        longTokenAmount !== undefined &&
        longTokenAmount.gt(mintableInfo.longDepositCapacityAmount)
      ) {
        return [t`Max ${longToken?.symbol} amount exceeded`];
      }

      if (
        shortTokenAmount !== undefined &&
        shortTokenAmount.gt(mintableInfo.shortDepositCapacityAmount)
      ) {
        return [t`Max ${shortToken?.symbol} amount exceeded`];
      }
    }
  } else if (
    fees?.totalFees?.deltaUsd?.lt(BN_ZERO) &&
    fees?.totalFees?.deltaUsd?.abs().gt(marketTokenUsd ?? BN_ZERO)
  ) {
    return [t`Fees exceed Pay amount`];
  }

  if (
    (longTokenAmount ?? BN_ZERO).lt(BN_ZERO) ||
    (shortTokenAmount ?? BN_ZERO).lt(BN_ZERO) ||
    (marketTokenAmount ?? BN_ZERO).lt(BN_ZERO)
  ) {
    return [t`Amount should be greater than zero`];
  }

  if (
    marketTokenAmount === undefined ||
    marketTokenAmount.lt(BN_ZERO) ||
    (marketTokenAmount.isZero() &&
      longTokenAmount?.isZero() &&
      shortTokenAmount?.isZero())
  ) {
    return [t`Enter an amount`];
  }

  if (isDeposit) {
    if (marketInfo.isSingle) {
      if (
        longTokenAmount
          ?.add(shortTokenAmount ?? BN_ZERO)
          .gt(longToken?.balance ?? BN_ZERO)
      ) {
        return [t`Insufficient ${longToken?.symbol} balance`];
      }
    } else {
      if (longTokenAmount?.gt(longToken?.balance ?? BN_ZERO)) {
        return [t`Insufficient ${longToken?.symbol} balance`];
      }

      if (shortTokenAmount?.gt(shortToken?.balance ?? BN_ZERO)) {
        return [t`Insufficient ${shortToken?.symbol} balance`];
      }
    }

    if (glvInfo) {
      if (
        isMarketTokenDeposit &&
        marketToken &&
        marketTokenAmount?.gt(marketToken?.balance ?? BN_ZERO)
      ) {
        return [t`Insufficient GM balance`];
      }

      const mintableInfo = getGmMintableMarketToken(marketInfo, marketToken);
      const glvGmMarket = glvInfo.markets.find(({ marketTokenAddress }) =>
        marketTokenAddress.equals(marketInfo.marketTokenAddress)
      );
      const gmToken =
        marketTokensData?.[marketInfo.marketTokenAddress.toBase58()];

      if (!gmToken) {
        return [t`Loading...`];
      }

      const maxMintableInMarketUsd = glvGmMarket
        ? getGlvMarketMaxBuyableUsdWithGm(glvGmMarket, marketInfo, gmToken)
        : BN_ZERO;

      if (
        marketTokenUsd !== undefined &&
        (mintableInfo.mintableUsd.lt(marketTokenUsd) ||
          maxMintableInMarketUsd.lt(marketTokenUsd))
      ) {
        return [
          t`Max pool amount reached`,
          longToken?.symbol === 'GM'
            ? t`The buyable cap for the pool GM: ${marketInfo.name} in ${getGlvDisplayName(glvInfo)} [${getMarketPoolName(glvInfo)}] has been reached. Please reduce the buy size, pick a different GM token, or shift the GM tokens to a different pool and try again.`
            : t`The buyable cap for the pool GM: ${marketInfo.name} in ${getGlvDisplayName(glvInfo)} [${getMarketPoolName(glvInfo)}] has been reached. Please choose a different pool or reduce the buy size.`,
        ];
      }
    }
  } else {
    if (glvInfo) {
      if ((glvTokenAmount ?? BN_ZERO).gt(glvToken?.balance ?? BN_ZERO)) {
        return [t`Insufficient ${glvToken?.symbol} balance`];
      }
    } else {
      if (marketTokenAmount.gt(marketToken?.balance ?? BN_ZERO)) {
        return [t`Insufficient ${marketToken?.symbol} balance`];
      }
    }

    if (glvInfo) {
      const sellableGlvInMarket = getGlvSellableInfoInMarket(
        glvInfo,
        marketToken
      );

      if (
        (glvTokenAmount ?? BN_ZERO).gt(
          sellableGlvInMarket.sellableAmount ?? BN_ZERO
        )
      ) {
        return [
          t`Insufficient GLV liquidity`,
          t`There isn't enough GM: ${getMarketIndexName(marketInfo)} [${getMarketPoolName(marketInfo)}] liquidity in GLV to fulfill your sell request. Please choose a different pool, reduce the sell size, or split your withdrawal from multiple pools.`,
        ];
      }

      const sellableWithinMarket = getGmSellableMarketToken(
        marketInfo,
        marketToken
      );

      if (
        (marketTokenUsd ?? BN_ZERO).gt(sellableWithinMarket.totalUsd ?? BN_ZERO)
      ) {
        return [
          t`Insufficient liquidity in GM Pool`,
          t`The sellable cap for the pool GM: ${getMarketIndexName(marketInfo)} [${getMarketPoolName(marketInfo)}]  has been reached, as the tokens are reserved by traders. Please choose a different pool, reduce the sell size, or split your withdrawal from multiple pools.`,
        ];
      }
    }

    if ((longTokenUsd ?? BN_ZERO).gt(longTokenLiquidityUsd ?? BN_ZERO)) {
      return [t`Insufficient ${longToken?.symbol} liquidity`];
    }

    if ((shortTokenUsd ?? BN_ZERO).gt(shortTokenLiquidityUsd ?? BN_ZERO)) {
      return [t`Insufficient ${shortToken?.symbol} liquidity`];
    }
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
