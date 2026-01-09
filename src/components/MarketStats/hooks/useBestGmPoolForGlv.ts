import { useEffect, useMemo } from "react";

import {
  selectPoolsDetailsFlags,
  selectPoolsDetailsIsMarketForGlvSelectedManually,
  selectPoolsDetailsFocusedInput,
  selectPoolsDetailsGlvInfo,
  selectPoolsDetailsGlvTokenAmount,
  selectPoolsDetailsIsMarketTokenDeposit,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsLongTokenAmount,
  selectPoolsDetailsSelectedMarketAddressForGlv,
  selectPoolsDetailsSetSelectedMarketAddressForGlv,
  selectPoolsDetailsShortTokenAddress,
  selectPoolsDetailsShortTokenAmount,
} from "context/PoolsDetailsContext/selectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getAvailableUsdLiquidityForCollateral } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { TokensData } from "domain/synthetics/tokens";
import { getDepositAmounts } from "domain/synthetics/trade/utils/deposit";
import { getGmSwapError } from "domain/synthetics/trade/utils/validation";
import { useChainId } from "lib/chains";
import { usePrevious } from "lib/usePrevious";

import type { useDepositWithdrawalFees } from "components/GmSwap/GmSwapBox/GmDepositWithdrawalBox/useDepositWithdrawalFees";

import { useGlvGmMarketsWithComposition } from "./useMarketGlvGmMarketsCompositions";

export const useBestGmPoolAddressForGlv = ({
  fees,
  uiFeeFactor,
  marketTokenAmount,
  marketTokensData,
}: {
  uiFeeFactor: bigint;
  marketTokenAmount: bigint;
  marketTokensData: TokensData | undefined;
  fees: ReturnType<typeof useDepositWithdrawalFees>["logicalFees"];
}) => {
  const { chainId, srcChainId } = useChainId();

  const glvInfo = useSelector(selectPoolsDetailsGlvInfo);
  const glvTokenAmount = useSelector(selectPoolsDetailsGlvTokenAmount);
  const { isDeposit } = useSelector(selectPoolsDetailsFlags);
  const marketsWithComposition = useGlvGmMarketsWithComposition(isDeposit, glvInfo?.glvTokenAddress);
  const isMarketTokenDeposit = useSelector(selectPoolsDetailsIsMarketTokenDeposit);
  const focusedInput = useSelector(selectPoolsDetailsFocusedInput);
  const isMarketForGlvSelectedManually = useSelector(selectPoolsDetailsIsMarketForGlvSelectedManually);

  const isEligible = useMemo(() => {
    return glvInfo && isGlvInfo(glvInfo) && marketsWithComposition.length > 0 && !isMarketTokenDeposit;
  }, [glvInfo, marketsWithComposition, isMarketTokenDeposit]);

  const longTokenAmount = useSelector(selectPoolsDetailsLongTokenAmount);
  const longTokenAddress = useSelector(selectPoolsDetailsLongTokenAddress);
  const shortTokenAmount = useSelector(selectPoolsDetailsShortTokenAmount);
  const shortTokenAddress = useSelector(selectPoolsDetailsShortTokenAddress);
  const selectedMarketForGlv = useSelector(selectPoolsDetailsSelectedMarketAddressForGlv);
  const setSelectedMarketAddressForGlv = useSelector(selectPoolsDetailsSetSelectedMarketAddressForGlv);

  const markets = useMemo(() => {
    if (!isEligible || !glvInfo) {
      return [];
    }

    const halfOfLong = longTokenAmount !== undefined ? longTokenAmount / 2n : undefined;

    return [...marketsWithComposition].map((marketConfig) => {
      const marketInfo = marketConfig.market;

      const adjustedLongTokenAmount = (marketInfo.isSameCollaterals ? halfOfLong : longTokenAmount) ?? 0n;
      const adjustedShortTokenAmount =
        (marketInfo.isSameCollaterals
          ? longTokenAmount !== undefined
            ? longTokenAmount - longTokenAmount
            : undefined
          : shortTokenAmount) ?? 0n;

      const amounts = getDepositAmounts({
        marketInfo,
        marketToken: marketConfig.token,
        longToken: marketInfo.longToken,
        shortToken: marketInfo.shortToken,
        longTokenAmount: adjustedLongTokenAmount,
        shortTokenAmount: adjustedShortTokenAmount,
        marketTokenAmount,
        includeLongToken: adjustedLongTokenAmount > 0n,
        includeShortToken: adjustedShortTokenAmount > 0n,
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
        paySource: "settlementChain",
        isPair: false,
        chainId,
        srcChainId,
        isMarketTokenDeposit,
      });

      return {
        isValid: error === undefined,
        market: marketConfig.market,
        amount: amounts.glvTokenUsd,
        composition: marketConfig.composition,
      };
    });
  }, [
    isEligible,
    glvInfo,
    longTokenAmount,
    marketsWithComposition,
    shortTokenAmount,
    marketTokenAmount,
    uiFeeFactor,
    glvTokenAmount,
    focusedInput,
    isDeposit,
    fees,
    marketTokensData,
    chainId,
    srcChainId,
    isMarketTokenDeposit,
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
        (longTokenAmount === 0n || longTokenAmount === undefined) &&
        (shortTokenAmount === 0n || shortTokenAmount === undefined)
      ) {
        return byComposition[0]?.marketTokenAddress;
      }

      return byAmount[0]?.marketTokenAddress;
    } else {
      return byComposition[0]?.marketTokenAddress;
    }
  }, [
    isMarketTokenDeposit,
    selectedMarketForGlv,
    isMarketForGlvSelectedManually,
    isDeposit,
    longTokenAmount,
    shortTokenAmount,
    byAmount,
    byComposition,
  ]);

  const previousLongAmount = usePrevious(longTokenAmount);
  const previousShortAmount = usePrevious(shortTokenAmount);
  const previousMarketTokenAmount = usePrevious(marketTokenAmount);
  const previousLongTokenAddress = usePrevious(longTokenAddress);
  const previousShortTokenAddress = usePrevious(shortTokenAddress);

  useEffect(() => {
    if (!isEligible) {
      return;
    }

    const shouldSetBestGmMarket =
      !isMarketForGlvSelectedManually &&
      (previousLongAmount !== longTokenAmount ||
        previousShortAmount !== shortTokenAmount ||
        previousMarketTokenAmount !== marketTokenAmount ||
        previousLongTokenAddress !== longTokenAddress ||
        previousShortTokenAddress !== shortTokenAddress);

    if (
      ((!selectedMarketForGlv && bestGmMarketAddress) || shouldSetBestGmMarket) &&
      bestGmMarketAddress !== selectedMarketForGlv
    ) {
      setSelectedMarketAddressForGlv(bestGmMarketAddress);
    }
  }, [
    bestGmMarketAddress,
    setSelectedMarketAddressForGlv,
    selectedMarketForGlv,
    isMarketForGlvSelectedManually,
    marketTokenAmount,
    previousLongAmount,
    previousShortAmount,
    previousMarketTokenAmount,
    previousLongTokenAddress,
    previousShortTokenAddress,
    isEligible,
    isDeposit,
    longTokenAmount,
    shortTokenAmount,
    longTokenAddress,
    shortTokenAddress,
  ]);
};
