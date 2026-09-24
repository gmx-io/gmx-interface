import { BN_ZERO } from '@/config/constants';
import { getExecutionFee } from '@/utils/fee/getExecutionFee';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectTradeboxTradeFeesType } from './selectTradeboxTradeFeesType';
import { selectTradeboxSwapAmounts } from './selectTradeboxSwapAmounts';
import { selectTradeboxIncreasePositionAmounts } from './selectTradeboxIncreasePositionAmounts';
import { selectTradeboxDecreasePositionAmounts } from './selectTradeboxDecreasePositionAmounts';
import { selectTokensData } from '../token/selectTokensData';
import { ExecutionFee } from '@/selectors/fee/types';
import { BN } from '@coral-xyz/anchor';
import { DecreasePositionSwapType } from '@/utils/tradebox/types';

export const selectTradeboxExecutionFee = createAppStoreSelector(
  selectTradeboxTradeFeesType,
  selectTradeboxSwapAmounts,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxDecreasePositionAmounts,
  selectTokensData,
  (
    tradeFeesType,
    swapAmounts,
    increaseAmounts,
    decreaseAmounts,
    tokensData
  ): ExecutionFee | undefined => {
    if (!tradeFeesType || !tokensData) return undefined;

    // Define base gas limits structure
    const gasLimits = {
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
    };

    let estimatedGas = BN_ZERO;
    let oraclePriceCount = BN_ZERO;

    switch (tradeFeesType) {
      case 'swap': {
        if (!swapAmounts || !swapAmounts.swapPathStats) return undefined;
        estimatedGas = gasLimits.swapOrder;
        oraclePriceCount = new BN(swapAmounts.swapPathStats.swapPath.length);
        break;
      }
      case 'increase': {
        if (!increaseAmounts) return undefined;
        estimatedGas = gasLimits.increaseOrder;
        oraclePriceCount = new BN(
          increaseAmounts.swapPathStats?.swapPath.length || 0
        );
        break;
      }
      case 'decrease': {
        if (!decreaseAmounts) return undefined;
        estimatedGas = gasLimits.decreaseOrder;
        // For decrease orders, we add 1 to swapsCount if there's a decrease swap
        const swapsCount =
          decreaseAmounts.decreaseSwapType !== DecreasePositionSwapType.NoSwap
            ? 1
            : 0;
        oraclePriceCount = new BN(swapsCount);
        break;
      }
      case 'edit':
        return undefined;
      default:
        return undefined;
    }

    // For Solana implementation, we're using BN_ZERO for gasPrice
    const gasPrice = BN_ZERO;

    return getExecutionFee(
      gasLimits,
      tokensData,
      estimatedGas,
      gasPrice,
      oraclePriceCount
    );
  }
);
