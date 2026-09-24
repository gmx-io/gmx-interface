import { Operation } from '@/selectors/positionEditor/types';
import { BN_ZERO } from '@/config/constants';
import { useAppStore } from '@/zustand/useAppStore';
import { useMemo } from 'react';

import { Options, usePositionEditorFees } from './usePositionEditorFees';
import { selectIsPnlInLeverage } from '@/selectors/setting/baseSelectors';
import { selectTokensData } from '@/selectors/token/selectTokensData';
import { selectPositionConstants } from '@/selectors/position/baseSelectors';
import { selectPositionEditorEditingPosition } from '@/selectors/positionEditor/selectPositionEditorEditingPosition';
import { getByKey } from '@/utils/lib/object';
import { parseValue } from '@/utils/legacy/parse';
import {
  convertTokenAmountToUsd,
  convertUsdToTokenAmount,
} from '@/utils/legacy/convert';
import { getPositionLiquidationPrice } from '@/utils/position/getPositionLiquidationPrice';
import { getPositionLeverage } from '@/utils/position/getPositionLeverage';

export function usePositionEditorData({
  selectedCollateralAddress,
  collateralInputValue,
  operation,
}: Options) {
  const isPnlInLeverage = useAppStore(selectIsPnlInLeverage);
  const tokensData = useAppStore(selectTokensData);
  const { minCollateralUsd } = useAppStore(selectPositionConstants);
  const position = useAppStore(selectPositionEditorEditingPosition);
  const isDeposit = operation === Operation.Deposit;
  const collateralToken = getByKey(tokensData, selectedCollateralAddress);
  const collateralPrice = collateralToken?.prices.minPrice;
  const collateralDeltaAmount = parseValue(
    collateralInputValue || '0',
    collateralToken?.decimals || 0
  );
  const collateralDeltaUsd = convertTokenAmountToUsd(
    collateralDeltaAmount,
    collateralToken?.decimals,
    collateralPrice
  );

  const { fees } = usePositionEditorFees({
    selectedCollateralAddress,
    collateralInputValue,
    operation,
  });

  return useMemo(() => {
    if (
      !position ||
      !position.marketInfo ||
      !position.collateralToken ||
      collateralDeltaUsd === undefined ||
      collateralDeltaUsd.lt(BN_ZERO) ||
      minCollateralUsd === undefined ||
      !fees?.totalFees ||
      !collateralToken ||
      collateralPrice === undefined
    ) {
      return {
        nextCollateralUsd: undefined,
        nextLeverage: undefined,
        nextLiqPrice: undefined,
        receiveUsd: undefined,
        receiveAmount: undefined,
      };
    }

    try {
      const totalFeesUsd = fees.totalFees.deltaUsd.abs();

      const nextCollateralUsd = isDeposit
        ? position.collateralUsd.sub(totalFeesUsd).add(collateralDeltaUsd)
        : position.collateralUsd.sub(totalFeesUsd).sub(collateralDeltaUsd);

      if (nextCollateralUsd.lte(BN_ZERO)) {
        return {
          nextCollateralUsd: undefined,
          nextLeverage: undefined,
          nextLiqPrice: undefined,
          receiveUsd: undefined,
          receiveAmount: undefined,
        };
      }

      const nextCollateralAmount =
        convertUsdToTokenAmount(
          nextCollateralUsd,
          collateralToken.decimals,
          collateralPrice
        ) ?? BN_ZERO;

      if (!nextCollateralAmount) {
        return {
          nextCollateralUsd: undefined,
          nextLeverage: undefined,
          nextLiqPrice: undefined,
          receiveUsd: undefined,
          receiveAmount: undefined,
        };
      }

      const receiveUsd = isDeposit ? BN_ZERO : collateralDeltaUsd;
      const receiveAmount =
        convertUsdToTokenAmount(
          receiveUsd,
          collateralToken.decimals,
          collateralPrice
        ) ?? BN_ZERO;

      if (!receiveAmount) {
        return {
          nextCollateralUsd: undefined,
          nextLeverage: undefined,
          nextLiqPrice: undefined,
          receiveUsd: undefined,
          receiveAmount: undefined,
        };
      }

      const nextLeverage = getPositionLeverage({
        sizeInUsd: position.sizeInUsd,
        collateralUsd: nextCollateralUsd,
        pendingBorrowingFeesUsd: BN_ZERO,
        pendingFundingFeesUsd: BN_ZERO,
        pnl: isPnlInLeverage ? position.pnl : BN_ZERO,
      });

      const nextLiqPrice = getPositionLiquidationPrice({
        sizeInUsd: position.sizeInUsd,
        sizeInTokens: position.sizeInTokens,
        collateralUsd: nextCollateralUsd,
        collateralAmount: nextCollateralAmount,
        collateralToken: position.collateralToken,
        marketInfo: position.marketInfo,
        pendingFundingFeesUsd: BN_ZERO,
        pendingBorrowingFeesUsd: BN_ZERO,
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
    } catch (error) {
      console.error('Error in usePositionEditorData:', error);
      return {
        nextCollateralUsd: undefined,
        nextLeverage: undefined,
        nextLiqPrice: undefined,
        receiveUsd: undefined,
        receiveAmount: undefined,
      };
    }
  }, [
    position,
    collateralDeltaUsd,
    minCollateralUsd,
    fees,
    collateralToken,
    collateralPrice,
    isDeposit,
    isPnlInLeverage,
  ]);
}
