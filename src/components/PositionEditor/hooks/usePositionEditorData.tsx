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
  selectPositionEditorSelectedCollateralToken,
} from "context/SyntheticsStateContext/selectors/positionEditorSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getMarginDepositProjections } from "domain/synthetics/orders/marginDeposit";
import { getLeverage, getLiquidationPrice } from "domain/synthetics/positions";
import { convertToTokenAmount, getIsEquivalentTokens } from "domain/synthetics/tokens";
import { bigMath } from "sdk/utils/bigmath";

import { Operation } from "../types";
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

    const totalFeesUsd = bigMath.abs(fees.totalFees.deltaUsd);

    if (isAtPriceDeposit) {
      // the deposit must resolve to the position collateral token (native and wrapped forms both qualify)
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
      ? position.collateralUsd - totalFeesUsd + collateralDeltaUsd
      : position.collateralUsd - totalFeesUsd - collateralDeltaUsd;

    const nextCollateralAmount = convertToTokenAmount(nextCollateralUsd, collateralToken?.decimals, collateralPrice)!;

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
