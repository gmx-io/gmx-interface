import { useMemo } from "react";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { usePositionsConstants, useUserReferralInfo } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  usePositionEditorDepositMode,
  usePositionEditorPosition,
  usePositionEditorTriggerPrice,
} from "context/SyntheticsStateContext/hooks/positionEditorHooks";
import {
  selectPositionEditorCollateralInputAmountAndUsd,
  selectPositionEditorDepositSwapAmounts,
  selectPositionEditorSelectedCollateralToken,
} from "context/SyntheticsStateContext/selectors/positionEditorSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getMarginDepositProjections } from "domain/synthetics/orders/marginDeposit";
import { getLeverage, getLiquidationPrice } from "domain/synthetics/positions";
import { convertToTokenAmount, getIsEquivalentTokens } from "domain/synthetics/tokens";
import { Operation } from "domain/synthetics/trade/usePositionEditorState";
import { getIsSwapPathFillable } from "domain/synthetics/usdgPools/usdcConversion";
import { bigMath } from "sdk/utils/bigmath";

import { Options, usePositionEditorFees } from "./usePositionEditorFees";

export function usePositionEditorData({ operation }: Options) {
  const { isPnlInLeverage } = useSettings();

  const { minCollateralUsd } = usePositionsConstants();
  const userReferralInfo = useUserReferralInfo();

  const position = usePositionEditorPosition();

  const isDeposit = operation === Operation.Deposit;

  const [depositMode] = usePositionEditorDepositMode();
  const triggerPrice = usePositionEditorTriggerPrice();
  const isAtPriceDeposit = isDeposit && depositMode === "atPrice";

  const collateralToken = useSelector(selectPositionEditorSelectedCollateralToken);
  const { collateralDeltaAmount, collateralDeltaUsd } = useSelector(selectPositionEditorCollateralInputAmountAndUsd);
  const depositSwapAmounts = useSelector(selectPositionEditorDepositSwapAmounts);

  const collateralPrice = collateralToken?.prices.minPrice;

  const { fees } = usePositionEditorFees({
    operation,
  });

  return useMemo(() => {
    if (
      !position?.marketInfo ||
      collateralDeltaUsd === undefined ||
      collateralDeltaUsd < 0 ||
      minCollateralUsd === undefined ||
      !fees?.totalFees
    ) {
      return {};
    }

    // swap fees are already taken out of the converted amount
    const depositSwap = isDeposit ? depositSwapAmounts : undefined;

    if (depositSwap && !getIsSwapPathFillable(depositSwap.swapStrategy.swapPathStats)) {
      return {};
    }
    const totalFeesUsd = depositSwap
      ? bigMath.abs((fees.borrowFee?.deltaUsd ?? 0n) + (fees.fundingFee?.deltaUsd ?? 0n))
      : bigMath.abs(fees.totalFees.deltaUsd);

    if (isAtPriceDeposit) {
      const isPositionCollateralSelected =
        collateralToken !== undefined && getIsEquivalentTokens(collateralToken, position.collateralToken);

      if (!isPositionCollateralSelected || triggerPrice === undefined || collateralDeltaAmount === undefined) {
        return {};
      }

      const projections = getMarginDepositProjections({
        position,
        depositAmount: collateralDeltaAmount,
        triggerPrice,
        minCollateralUsd,
        userReferralInfo,
        pendingFeesUsd: totalFeesUsd,
        isPnlInLeverage,
      });

      if (!projections) {
        return {};
      }

      return {
        nextCollateralUsd: projections.nextCollateralUsd,
        nextLeverage: projections.nextLeverage,
        nextLiqPrice: projections.nextLiqPrice,
        receiveUsd: 0n,
        receiveAmount: 0n,
      };
    }

    const nextCollateralUsd = isDeposit
      ? position.collateralUsd - totalFeesUsd + (depositSwap?.usdOut ?? collateralDeltaUsd)
      : position.collateralUsd - totalFeesUsd - collateralDeltaUsd;

    const nextCollateralAmount = convertToTokenAmount(
      nextCollateralUsd,
      position.collateralToken.decimals,
      position.collateralToken.prices.minPrice
    )!;

    const receiveUsd = isDeposit ? 0n : collateralDeltaUsd;
    const receiveAmount = convertToTokenAmount(receiveUsd, collateralToken?.decimals, collateralPrice)!;

    const nextLeverage = getLeverage({
      sizeInUsd: position.sizeInUsd,
      collateralUsd: nextCollateralUsd,
      pendingBorrowingFeesUsd: 0n,
      pendingFundingFeesUsd: 0n,
      pnl: isPnlInLeverage ? position.pnl : 0n,
    });

    const nextLiqPrice = getLiquidationPrice({
      sizeInUsd: position.sizeInUsd,
      sizeInTokens: position.sizeInTokens,
      collateralUsd: nextCollateralUsd,
      collateralAmount: nextCollateralAmount,
      collateralToken: position.collateralToken,
      marketInfo: position.marketInfo,
      pendingImpactAmount: position.pendingImpactAmount,
      userReferralInfo,
      pendingFundingFeesUsd: 0n,
      pendingBorrowingFeesUsd: 0n,
      isLong: position.isLong,
      minCollateralUsd,
    });

    return {
      nextCollateralUsd,
      nextLeverage,
      nextLiqPrice,
      receiveUsd,
      receiveAmount,
    };
  }, [
    collateralDeltaAmount,
    collateralDeltaUsd,
    collateralPrice,
    collateralToken,
    depositSwapAmounts,
    fees,
    isAtPriceDeposit,
    isDeposit,
    minCollateralUsd,
    position,
    isPnlInLeverage,
    triggerPrice,
    userReferralInfo,
  ]);
}
