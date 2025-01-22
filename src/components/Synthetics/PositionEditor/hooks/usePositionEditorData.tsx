import {
  usePositionsConstants,
  useTokensData,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { getLeverage, getLiquidationPrice } from "domain/synthetics/positions";
import { convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useMemo } from "react";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { usePositionEditorPosition } from "context/SyntheticsStateContext/hooks/positionEditorHooks";
import { bigMath } from "sdk/utils/bigmath";
import { Operation } from "../types";

import { Options, usePositionEditorFees } from "./usePositionEditorFees";

export function usePositionEditorData({ selectedCollateralAddress, collateralInputValue, operation }: Options) {
  const { isPnlInLeverage } = useSettings();
  const tokensData = useTokensData();

  const { minCollateralUsd } = usePositionsConstants();
  const userReferralInfo = useUserReferralInfo();

  const position = usePositionEditorPosition();

  const isDeposit = operation === Operation.Deposit;

  const collateralToken = getByKey(tokensData, selectedCollateralAddress);

  const collateralPrice = collateralToken?.prices.minPrice;

  const collateralDeltaAmount = parseValue(collateralInputValue || "0", collateralToken?.decimals || 0);
  const collateralDeltaUsd = convertToUsd(collateralDeltaAmount, collateralToken?.decimals, collateralPrice);

  const { fees } = usePositionEditorFees({
    selectedCollateralAddress,
    collateralInputValue,
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
