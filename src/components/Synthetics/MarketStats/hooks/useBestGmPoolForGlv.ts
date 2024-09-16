import { useEffect, useMemo } from "react";

import { TokenInputState } from "components/Synthetics/GmSwap/GmSwapBox/GmDepositWithdrawalBox/types";
import type { useDepositWithdrawalFees } from "components/Synthetics/GmSwap/GmSwapBox/GmDepositWithdrawalBox/useDepositWithdrawalFees";

import { GlvInfo, MarketsInfoData } from "domain/synthetics/markets";
import { getMaxUsdBuyableAmountInMarketWithGm, getSellableInfoGlv, isGlv } from "domain/synthetics/markets/glv";

import { TokensData } from "domain/synthetics/tokens";
import { getDepositAmounts } from "domain/synthetics/trade/utils/deposit";
import { getGmSwapError } from "domain/synthetics/trade/utils/validation";

import { usePrevious } from "lib/usePrevious";

import { useGlvGmMarketsWithComposition } from "./useMarketGlvGmMarketsCompositions";

export const useBestGmPoolAddressForGlv = ({
  isDeposit,
  glvInfo,
  selectedGlvGmMarket,

  uiFeeFactor,
  focusedInput,

  longTokenInputState,
  shortTokenInputState,
  fromMarketTokenInputState,
  longTokenLiquidityUsd,
  shortTokenLiquidityUsd,

  marketTokenAmount,
  isMarketTokenDeposit,

  isGmPoolSelectedManually,
  onSelectGlvGmMarket,

  marketsInfoData,
  marketTokensData,

  fees,
}: {
  isDeposit: boolean;
  glvInfo: GlvInfo | undefined;
  selectedGlvGmMarket?: string;

  uiFeeFactor: bigint;
  focusedInput: string;

  longTokenInputState: TokenInputState | undefined;
  shortTokenInputState: TokenInputState | undefined;
  fromMarketTokenInputState: TokenInputState | undefined;
  longTokenLiquidityUsd?: bigint | undefined;
  shortTokenLiquidityUsd?: bigint | undefined;

  marketTokenAmount: bigint;
  isMarketTokenDeposit: boolean;

  marketsInfoData: MarketsInfoData;
  marketTokensData: TokensData | undefined;

  fees: ReturnType<typeof useDepositWithdrawalFees>["fees"];

  isGmPoolSelectedManually: boolean;
  onSelectGlvGmMarket?: (marketAddress?: string) => void;
}) => {
  const marketsWithComposition = useGlvGmMarketsWithComposition(isDeposit, glvInfo?.indexTokenAddress);

  const isEligible = useMemo(() => {
    return glvInfo && isGlv(glvInfo) && marketsWithComposition.length > 0 && !isMarketTokenDeposit;
  }, [glvInfo, marketsWithComposition, isMarketTokenDeposit]);

  const byComposition = useMemo(() => {
    if (!isEligible) {
      return [];
    }

    const sortedMarketsWithComposition = [...marketsWithComposition]
      .sort((a, b) => {
        return b.comp - a.comp;
      })
      .filter((marketConfig) => {
        const availableBuyableGmUsd = getMaxUsdBuyableAmountInMarketWithGm(
          marketConfig.glvMarket,
          glvInfo!,
          marketConfig.market,
          marketConfig.token
        );

        return availableBuyableGmUsd > 0;
      });

    return sortedMarketsWithComposition;
  }, [glvInfo, marketsWithComposition, isEligible]);

  const byGlv = useMemo(() => {
    if (!isEligible) {
      return [];
    }

    const halfOfLong = longTokenInputState?.amount !== undefined ? longTokenInputState.amount / 2n : undefined;
    const vaultSellableAmount = glvInfo
      ? getSellableInfoGlv(glvInfo, marketsInfoData, marketTokensData, selectedGlvGmMarket)
      : undefined;

    return [...marketsWithComposition]
      .map((marketConfig) => {
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
          gmToken: undefined,
          longTokenAmount,
          shortTokenAmount,
          gmTokenAmount: undefined,
          marketTokenAmount,
          includeLongToken: Boolean(longTokenInputState?.address),
          includeShortToken: Boolean(shortTokenInputState?.address),
          uiFeeFactor,
          strategy: focusedInput === "market" ? "byMarketToken" : "byCollaterals",
          isMarketTokenDeposit: false,
          glvInfo,
        });

        const [error] = getGmSwapError({
          isDeposit,
          marketInfo,
          glvInfo,
          marketToken: marketConfig.token,
          longToken: marketInfo.longToken,
          shortToken: marketInfo.shortToken,
          gmToken: undefined,
          marketTokenAmount,
          marketTokenUsd: amounts?.marketTokenUsd,
          longTokenAmount: amounts?.longTokenAmount,
          shortTokenAmount: amounts?.shortTokenAmount,
          longTokenUsd: amounts?.longTokenUsd,
          shortTokenUsd: amounts?.shortTokenUsd,
          gmTokenAmount: amounts?.gmTokenAmount,
          longTokenLiquidityUsd: longTokenLiquidityUsd,
          shortTokenLiquidityUsd: shortTokenLiquidityUsd,
          fees,
          isHighPriceImpact: false,
          isHighPriceImpactAccepted: true,
          priceImpactUsd: fees?.swapPriceImpact?.deltaUsd,
          vaultSellableAmount: vaultSellableAmount?.totalAmount,
          marketTokensData,
        });

        return {
          isValid: error === undefined,
          market: marketConfig.market,
          amount: amounts.marketTokenUsd,
        };
      })
      .sort((a, b) => {
        if (a.isValid && !b.isValid) {
          return -1;
        }

        if (!a.isValid && b.isValid) {
          return 1;
        }
        return b.amount > a.amount ? 1 : -1;
      })
      .map(({ market }) => market);
  }, [
    marketsWithComposition,
    marketTokenAmount,
    longTokenInputState,
    shortTokenInputState,
    uiFeeFactor,
    focusedInput,
    glvInfo,
    isEligible,
    longTokenLiquidityUsd,
    shortTokenLiquidityUsd,
    selectedGlvGmMarket,
    isDeposit,
    fees,
    marketsInfoData,
    marketTokensData,
  ]);

  const bestGmMarketAddress = useMemo(() => {
    if (isMarketTokenDeposit) {
      return undefined;
    }

    if (selectedGlvGmMarket && isGmPoolSelectedManually) {
      return selectedGlvGmMarket;
    }

    if (isDeposit) {
      if (
        (longTokenInputState?.amount === 0n || longTokenInputState?.amount === undefined) &&
        (shortTokenInputState?.amount === 0n || shortTokenInputState?.amount === undefined)
      ) {
        return byComposition[0]?.market.marketTokenAddress;
      }

      return byGlv[0]?.marketTokenAddress;
    } else {
      return byComposition[0]?.market.marketTokenAddress;
    }
  }, [
    byComposition,
    isDeposit,
    selectedGlvGmMarket,
    byGlv,
    isMarketTokenDeposit,
    longTokenInputState,
    shortTokenInputState,
    isGmPoolSelectedManually,
  ]);

  const previousLongAmount = usePrevious(longTokenInputState?.amount);
  const previousShortAmount = usePrevious(shortTokenInputState?.amount);
  const previousMarketTokenAmount = usePrevious(marketTokenAmount);
  const previousLongTokenAddress = usePrevious(longTokenInputState?.address);
  const previousShortTokenAddress = usePrevious(shortTokenInputState?.address);

  useEffect(() => {
    if (!isEligible) {
      if (!selectedGlvGmMarket) {
        onSelectGlvGmMarket?.(fromMarketTokenInputState?.address);
      }

      return;
    }

    const shouldSetBestGmMarket =
      !isGmPoolSelectedManually &&
      (previousLongAmount !== longTokenInputState?.amount ||
        previousShortAmount !== shortTokenInputState?.amount ||
        previousMarketTokenAmount !== marketTokenAmount ||
        previousLongTokenAddress !== longTokenInputState?.address ||
        previousShortTokenAddress !== shortTokenInputState?.address);

    if (
      ((!selectedGlvGmMarket && bestGmMarketAddress) || shouldSetBestGmMarket) &&
      bestGmMarketAddress !== selectedGlvGmMarket
    ) {
      onSelectGlvGmMarket?.(bestGmMarketAddress);
    }
  }, [
    bestGmMarketAddress,
    onSelectGlvGmMarket,
    selectedGlvGmMarket,
    isGmPoolSelectedManually,
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
  ]);
};
