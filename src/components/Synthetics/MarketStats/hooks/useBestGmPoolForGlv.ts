import { useEffect, useMemo } from "react";

import { getAvailableUsdLiquidityForCollateral, GlvInfo } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { TokensData } from "domain/synthetics/tokens";
import { getDepositAmounts } from "domain/synthetics/trade/utils/deposit";
import { getGmSwapError } from "domain/synthetics/trade/utils/validation";
import { usePrevious } from "lib/usePrevious";

import { TokenInputState } from "components/Synthetics/GmSwap/GmSwapBox/GmDepositWithdrawalBox/types";
import type { useDepositWithdrawalFees } from "components/Synthetics/GmSwap/GmSwapBox/GmDepositWithdrawalBox/useDepositWithdrawalFees";

import { useGlvGmMarketsWithComposition } from "./useMarketGlvGmMarketsCompositions";

export const useBestGmPoolAddressForGlv = ({
  fees,
  uiFeeFactor,
  focusedInput,
  isDeposit,

  fromMarketTokenInputState,
  longTokenInputState,
  shortTokenInputState,

  isMarketForGlvSelectedManually,
  isMarketTokenDeposit,
  selectedMarketForGlv,

  glvInfo,
  glvTokenAmount,

  marketTokenAmount,
  marketTokensData,

  onSelectedMarketForGlv,
}: {
  isDeposit: boolean;
  glvInfo: GlvInfo | undefined;
  selectedMarketForGlv?: string;

  uiFeeFactor: bigint;
  focusedInput: string;

  longTokenInputState: TokenInputState | undefined;
  shortTokenInputState: TokenInputState | undefined;
  fromMarketTokenInputState: TokenInputState | undefined;

  marketTokenAmount: bigint;
  isMarketTokenDeposit: boolean;
  glvTokenAmount: bigint | undefined;

  marketTokensData: TokensData | undefined;

  fees: ReturnType<typeof useDepositWithdrawalFees>["fees"];

  isMarketForGlvSelectedManually: boolean;
  onSelectedMarketForGlv?: (marketAddress?: string) => void;
}) => {
  const marketsWithComposition = useGlvGmMarketsWithComposition(isDeposit, glvInfo?.glvTokenAddress);

  const isEligible = useMemo(() => {
    return glvInfo && isGlvInfo(glvInfo) && marketsWithComposition.length > 0 && !isMarketTokenDeposit;
  }, [glvInfo, marketsWithComposition, isMarketTokenDeposit]);

  const markets = useMemo(() => {
    if (!isEligible || !glvInfo) {
      return [];
    }

    const halfOfLong = longTokenInputState?.amount !== undefined ? longTokenInputState.amount / 2n : undefined;

    return [...marketsWithComposition].map((marketConfig) => {
      const marketInfo = marketConfig.market;

      const longTokenAmount = (marketInfo.isSameCollaterals ? halfOfLong : longTokenInputState?.amount) || 0n;
      const shortTokenAmount =
        (marketInfo.isSameCollaterals
          ? longTokenInputState?.amount !== undefined
            ? longTokenInputState.amount - longTokenAmount
            : undefined
          : shortTokenInputState?.amount) || 0n;

      const amounts = getDepositAmounts({
        marketInfo,
        marketToken: marketConfig.token,
        longToken: marketInfo.longToken,
        shortToken: marketInfo.shortToken,
        longTokenAmount,
        shortTokenAmount,
        marketTokenAmount,
        includeLongToken: Boolean(longTokenInputState?.address),
        includeShortToken: Boolean(shortTokenInputState?.address),
        uiFeeFactor,
        glvTokenAmount: glvTokenAmount ?? 0n,
        strategy: focusedInput === "market" ? "byMarketToken" : "byCollaterals",
        isMarketTokenDeposit: false,
        glvInfo,
        glvToken: glvInfo.glvToken,
      });

      const longTokenLiquidityUsd = getAvailableUsdLiquidityForCollateral(marketInfo, true);
      const shortTokenLiquidityUsd = getAvailableUsdLiquidityForCollateral(marketInfo, false);

      const [error] = getGmSwapError({
        isDeposit,
        marketInfo,
        glvInfo,
        marketToken: marketConfig.token,
        longToken: marketInfo.longToken,
        shortToken: marketInfo.shortToken,
        marketTokenAmount,
        glvTokenAmount: glvTokenAmount ?? 0n,
        glvToken: glvInfo.glvToken,
        glvTokenUsd: amounts?.glvTokenUsd,
        marketTokenUsd: amounts?.marketTokenUsd,
        longTokenAmount: amounts?.longTokenAmount,
        shortTokenAmount: amounts?.shortTokenAmount,
        longTokenUsd: amounts?.longTokenUsd,
        shortTokenUsd: amounts?.shortTokenUsd,
        longTokenLiquidityUsd,
        shortTokenLiquidityUsd,
        fees,
        priceImpactUsd: fees?.swapPriceImpact?.deltaUsd,
        marketTokensData,
      });

      return {
        isValid: error === undefined,
        market: marketConfig.market,
        amount: amounts.glvTokenUsd,
        composition: marketConfig.composition,
      };
    });
  }, [
    marketsWithComposition,
    marketTokenAmount,
    longTokenInputState,
    shortTokenInputState,
    uiFeeFactor,
    focusedInput,
    glvInfo,
    isEligible,
    isDeposit,
    fees,
    marketTokensData,
    glvTokenAmount,
  ]);

  const byAmount = useMemo(
    () =>
      [...markets]
        .sort((a, b) => {
          if (a.isValid && !b.isValid) {
            return -1;
          }

          if (!a.isValid && b.isValid) {
            return 1;
          }

          return b.amount > a.amount ? 1 : -1;
        })
        .map(({ market }) => market),
    [markets]
  );

  const byComposition = useMemo(
    () =>
      [...markets]
        .sort((a, b) => {
          if (a.isValid && !b.isValid) {
            return -1;
          }

          if (!a.isValid && b.isValid) {
            return 1;
          }

          return b.composition > a.composition ? 1 : -1;
        })
        .map(({ market }) => market),
    [markets]
  );

  const bestGmMarketAddress = useMemo(() => {
    if (isMarketTokenDeposit) {
      return undefined;
    }

    if (selectedMarketForGlv && isMarketForGlvSelectedManually) {
      return selectedMarketForGlv;
    }

    if (isDeposit) {
      if (
        (longTokenInputState?.amount === 0n || longTokenInputState?.amount === undefined) &&
        (shortTokenInputState?.amount === 0n || shortTokenInputState?.amount === undefined)
      ) {
        return byComposition[0]?.marketTokenAddress;
      }

      return byAmount[0]?.marketTokenAddress;
    } else {
      return byComposition[0]?.marketTokenAddress;
    }
  }, [
    byComposition,
    isDeposit,
    selectedMarketForGlv,
    byAmount,
    isMarketTokenDeposit,
    longTokenInputState,
    shortTokenInputState,
    isMarketForGlvSelectedManually,
  ]);

  const previousLongAmount = usePrevious(longTokenInputState?.amount);
  const previousShortAmount = usePrevious(shortTokenInputState?.amount);
  const previousMarketTokenAmount = usePrevious(marketTokenAmount);
  const previousLongTokenAddress = usePrevious(longTokenInputState?.address);
  const previousShortTokenAddress = usePrevious(shortTokenInputState?.address);

  useEffect(() => {
    if (!isEligible) {
      if (selectedMarketForGlv !== fromMarketTokenInputState?.address) {
        onSelectedMarketForGlv?.(fromMarketTokenInputState?.address);
      }

      return;
    }

    const shouldSetBestGmMarket =
      !isMarketForGlvSelectedManually &&
      (previousLongAmount !== longTokenInputState?.amount ||
        previousShortAmount !== shortTokenInputState?.amount ||
        previousMarketTokenAmount !== marketTokenAmount ||
        previousLongTokenAddress !== longTokenInputState?.address ||
        previousShortTokenAddress !== shortTokenInputState?.address);

    if (
      ((!selectedMarketForGlv && bestGmMarketAddress) || shouldSetBestGmMarket) &&
      bestGmMarketAddress !== selectedMarketForGlv
    ) {
      onSelectedMarketForGlv?.(bestGmMarketAddress);
    }
  }, [
    bestGmMarketAddress,
    onSelectedMarketForGlv,
    selectedMarketForGlv,
    isMarketForGlvSelectedManually,
    longTokenInputState,
    shortTokenInputState,
    marketTokenAmount,
    previousLongAmount,
    previousShortAmount,
    previousMarketTokenAmount,
    previousLongTokenAddress,
    previousShortTokenAddress,
    isEligible,
    fromMarketTokenInputState,
    isDeposit,
  ]);
};
