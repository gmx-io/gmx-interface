import { usePositionsConstants, useUserReferralInfo } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { getLeverage, getLiquidationPrice } from "domain/synthetics/positions";
import { convertToTokenAmount } from "domain/synthetics/tokens";
import { useMemo } from "react";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { usePositionEditorPosition } from "context/SyntheticsStateContext/hooks/positionEditorHooks";
import { bigMath } from "sdk/utils/bigmath";
import { Operation } from "../types";

import {
  selectPositionEditorCollateralInputAmountAndUsd,
  selectPositionEditorSelectedCollateralToken,
} from "context/SyntheticsStateContext/selectors/positionEditorSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { Options, usePositionEditorFees } from "./usePositionEditorFees";

export function usePositionEditorData({ operation }: Options) {
  const { isPnlInLeverage } = useSettings();

  const { minCollateralUsd } = usePositionsConstants();
  const userReferralInfo = useUserReferralInfo();

  const position = usePositionEditorPosition();

  const isDeposit = operation === Operation.Deposit;

  const collateralToken = useSelector(selectPositionEditorSelectedCollateralToken);
  const { collateralDeltaUsd } = useSelector(selectPositionEditorCollateralInputAmountAndUsd);

  const collateralPrice = collateralToken?.prices.minPrice;

  const { fees } = usePositionEditorFees({
    operation,
  });

  return useMemo(() => {
    if (
      !position ||
      collateralDeltaUsd === undefined ||
      collateralDeltaUsd < 0 ||
      minCollateralUsd === undefined ||
      !fees?.totalFees
    ) {
      return {};
    }

    const totalFeesUsd = bigMath.abs(fees.totalFees.deltaUsd);

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
    collateralDeltaUsd,
    collateralPrice,
    collateralToken,
    fees,
    isDeposit,
    minCollateralUsd,
    position,
    isPnlInLeverage,
    userReferralInfo,
  ]);
}
