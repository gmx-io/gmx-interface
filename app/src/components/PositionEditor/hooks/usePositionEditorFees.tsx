import { Operation } from '@/selectors/positionEditor/types';
import { BN_ZERO } from '@/config/constants';
import { TradeFees } from '@/selectors/fee/types';
import { getByKey } from '@/utils/lib/object';
import { selectPositionEditorEditingPosition } from '@/selectors/positionEditor/selectPositionEditorEditingPosition';
import { selectTokensData } from '@/selectors/token/selectTokensData';
import { useAppStore } from '@/zustand/useAppStore';
import { useMemo } from 'react';
import { parseValue } from '@/utils/legacy/parse';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { getFeeItem } from '@/utils/fee/getFeeItem';
import { getTotalFeeItem } from '@/utils/fee/getTotalFeeItem';
import { getExecutionFee } from '@/utils/fee/getExecutionFee';

export type Options = {
  selectedCollateralAddress?: string;
  collateralInputValue: string;
  operation: Operation;
};

export function usePositionEditorFees({
  selectedCollateralAddress,
  collateralInputValue,
  operation,
}: Options) {
  const tokensData = useAppStore(selectTokensData);
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

  // TODO: get gas limits and gas price
  // const gasLimits = useSelector(selectGasLimits);
  // const gasPrice = useSelector(selectGasPrice);
  const gasLimits = useMemo(
    () => ({
      depositSingleToken: BN_ZERO,
      depositMultiToken: BN_ZERO,
      withdrawalMultiToken: BN_ZERO,
      shift: BN_ZERO,
      singleSwap: BN_ZERO,
      swapOrder: BN_ZERO,
      increaseOrder: BN_ZERO,
      decreaseOrder: BN_ZERO,
      estimatedGasFeeBaseAmount: BN_ZERO,
      estimatedGasFeePerOraclePrice: BN_ZERO,
      estimatedFeeMultiplierFactor: BN_ZERO,
      glvDepositGasLimit: BN_ZERO,
      glvWithdrawalGasLimit: BN_ZERO,
      glvPerMarketGasLimit: BN_ZERO,
    }),
    []
  );
  const gasPrice = BN_ZERO;

  return useMemo(() => {
    if (!position || !gasLimits || !tokensData || gasPrice === undefined) {
      return {};
    }

    const collateralBasisUsd = isDeposit
      ? position.collateralUsd.add(collateralDeltaUsd)
      : position.collateralUsd;

    const fundingFee = getFeeItem(
      position.pendingFundingFeesUsd.neg(),
      collateralBasisUsd
    );
    const borrowFee = getFeeItem(
      position.pendingBorrowingFeesUsd.neg(),
      collateralBasisUsd
    );
    const totalFees = getTotalFeeItem([fundingFee, borrowFee]);

    const fees: TradeFees = {
      totalFees,
      fundingFee,
      borrowFee,
    };

    const estimatedGas = BN_ZERO;
    const oraclePriceCount = BN_ZERO;

    const executionFee = getExecutionFee(
      gasLimits,
      tokensData,
      estimatedGas,
      gasPrice,
      oraclePriceCount
    );

    return {
      fees,
      executionFee,
    };
  }, [
    collateralDeltaUsd,
    gasLimits,
    gasPrice,
    isDeposit,
    position,
    tokensData,
  ]);
}
