import { withRetry } from "viem";

import {
  EXECUTION_FEE_CONFIG_V2,
  GAS_LIMITS_STATIC_CONFIG,
  GAS_PRICE_PREMIUM_MAP,
  getViemChain,
  MAX_PRIORITY_FEE_PER_GAS_MAP,
} from "configs/chains";
import { getContract } from "configs/contracts";
import {
  decreaseOrderGasLimitKey,
  depositGasLimitKey,
  ESTIMATED_GAS_FEE_BASE_AMOUNT_V2_1,
  ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR,
  ESTIMATED_GAS_FEE_PER_ORACLE_PRICE,
  GELATO_RELAY_FEE_MULTIPLIER_FACTOR_KEY,
  GLV_DEPOSIT_GAS_LIMIT,
  GLV_PER_MARKET_GAS_LIMIT,
  GLV_WITHDRAWAL_GAS_LIMIT,
  increaseOrderGasLimitKey,
  shiftGasLimitKey,
  singleSwapGasLimitKey,
  swapOrderGasLimitKey,
  uiFeeFactorKey,
  withdrawalGasLimitKey,
} from "configs/dataStore";
import type { GasLimitsConfig } from "types/fees";
import { TokensData } from "types/tokens";
import type { IncreasePositionAmounts } from "types/trade";
import type { DecreasePositionAmounts, SwapAmounts, TradeFeesType } from "types/trade";
import { bigMath } from "utils/bigmath";
import { estimateOrderOraclePriceCount } from "utils/fees/estimateOraclePriceCount";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  estimateExecuteSwapOrderGasLimit,
  getExecutionFee,
} from "utils/fees/executionFee";
import { getSwapCount } from "utils/trade";

import { Module } from "../base";

const DEFAULT_UI_FEE_RECEIVER_ACCOUNT = "0xff00000000000000000000000000000000000001";

export class Utils extends Module {
  private _gasLimits: GasLimitsConfig | null = null;
  async getGasLimits(): Promise<GasLimitsConfig> {
    if (this._gasLimits) {
      return this._gasLimits;
    }

    const gasLimits = await this.sdk
      .executeMulticall({
        dataStore: {
          contractAddress: getContract(this.chainId, "DataStore"),
          abiId: "DataStore",
          calls: {
            depositToken: {
              methodName: "getUint",
              params: [depositGasLimitKey()],
            },
            withdrawalMultiToken: {
              methodName: "getUint",
              params: [withdrawalGasLimitKey()],
            },
            shift: {
              methodName: "getUint",
              params: [shiftGasLimitKey()],
            },
            singleSwap: {
              methodName: "getUint",
              params: [singleSwapGasLimitKey()],
            },
            swapOrder: {
              methodName: "getUint",
              params: [swapOrderGasLimitKey()],
            },
            increaseOrder: {
              methodName: "getUint",
              params: [increaseOrderGasLimitKey()],
            },
            decreaseOrder: {
              methodName: "getUint",
              params: [decreaseOrderGasLimitKey()],
            },
            estimatedGasFeeBaseAmount: {
              methodName: "getUint",
              params: [ESTIMATED_GAS_FEE_BASE_AMOUNT_V2_1],
            },
            estimatedGasFeePerOraclePrice: {
              methodName: "getUint",
              params: [ESTIMATED_GAS_FEE_PER_ORACLE_PRICE],
            },
            estimatedFeeMultiplierFactor: {
              methodName: "getUint",
              params: [ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR],
            },
            glvDepositGasLimit: {
              methodName: "getUint",
              params: [GLV_DEPOSIT_GAS_LIMIT],
            },
            glvWithdrawalGasLimit: {
              methodName: "getUint",
              params: [GLV_WITHDRAWAL_GAS_LIMIT],
            },
            glvPerMarketGasLimit: {
              methodName: "getUint",
              params: [GLV_PER_MARKET_GAS_LIMIT],
            },
            gelatoRelayFeeMultiplierFactor: {
              methodName: "getUint",
              params: [GELATO_RELAY_FEE_MULTIPLIER_FACTOR_KEY],
            },
          },
        },
      })
      .then((res) => {
        const results = res.data.dataStore;

        function getBigInt(key: keyof typeof results) {
          return BigInt(results[key].returnValues[0]);
        }

        const staticGasLimits = GAS_LIMITS_STATIC_CONFIG[this.chainId];

        return {
          depositToken: getBigInt("depositToken"),
          withdrawalMultiToken: getBigInt("withdrawalMultiToken"),
          shift: getBigInt("shift"),
          singleSwap: getBigInt("singleSwap"),
          swapOrder: getBigInt("swapOrder"),
          increaseOrder: getBigInt("increaseOrder"),
          decreaseOrder: getBigInt("decreaseOrder"),
          estimatedGasFeeBaseAmount: getBigInt("estimatedGasFeeBaseAmount"),
          estimatedGasFeePerOraclePrice: getBigInt("estimatedGasFeePerOraclePrice"),
          estimatedFeeMultiplierFactor: getBigInt("estimatedFeeMultiplierFactor"),
          glvDepositGasLimit: getBigInt("glvDepositGasLimit"),
          glvWithdrawalGasLimit: getBigInt("glvWithdrawalGasLimit"),
          glvPerMarketGasLimit: getBigInt("glvPerMarketGasLimit"),
          createOrderGasLimit: staticGasLimits.createOrderGasLimit,
          updateOrderGasLimit: staticGasLimits.updateOrderGasLimit,
          cancelOrderGasLimit: staticGasLimits.cancelOrderGasLimit,
          tokenPermitGasLimit: staticGasLimits.tokenPermitGasLimit,
          gmxAccountCollateralOverhead: staticGasLimits.gmxAccountCollateralOverhead,
          gelatoRelayFeeMultiplierFactor: getBigInt("gelatoRelayFeeMultiplierFactor"),
        } satisfies GasLimitsConfig;
      });

    this._gasLimits = gasLimits;

    return gasLimits;
  }

  async getEstimatedGasFee(
    tradeFeesType: TradeFeesType,
    {
      increaseAmounts,
      decreaseAmounts,
      swapAmounts,
    }: {
      swapAmounts?: SwapAmounts;
      decreaseAmounts?: DecreasePositionAmounts;
      increaseAmounts?: IncreasePositionAmounts;
    }
  ) {
    const gasLimits = await this.getGasLimits();

    switch (tradeFeesType) {
      case "swap": {
        if (!swapAmounts || !swapAmounts.swapPathStats) return null;

        return estimateExecuteSwapOrderGasLimit(gasLimits, {
          swapsCount: swapAmounts.swapPathStats.swapPath.length,
          callbackGasLimit: 0n,
        });
      }
      case "increase": {
        if (!increaseAmounts) return null;

        return estimateExecuteIncreaseOrderGasLimit(gasLimits, {
          swapsCount: increaseAmounts.swapPathStats?.swapPath.length,
        });
      }
      case "decrease": {
        if (!decreaseAmounts) return null;

        return estimateExecuteDecreaseOrderGasLimit(gasLimits, {
          callbackGasLimit: 0n,
          decreaseSwapType: decreaseAmounts.decreaseSwapType,
          swapsCount: 0,
        });
      }
      case "edit":
        return null;
    }
  }

  async getExecutionFee(
    tradeFeesType: TradeFeesType,
    tokensData: TokensData,
    {
      increaseAmounts,
      decreaseAmounts,
      swapAmounts,
    }: {
      swapAmounts?: SwapAmounts;
      decreaseAmounts?: DecreasePositionAmounts;
      increaseAmounts?: IncreasePositionAmounts;
    }
  ) {
    const gasLimits = await this.getGasLimits();
    const gasPrice = await this.getGasPrice();

    const estimatedGas = await this.getEstimatedGasFee(tradeFeesType, {
      increaseAmounts,
      decreaseAmounts,
      swapAmounts,
    });

    if (estimatedGas === null || estimatedGas === undefined) return undefined;

    const swapsCount = getSwapCount({
      isSwap: tradeFeesType === "swap",
      isIncrease: tradeFeesType === "increase",
      increaseAmounts,
      decreaseAmounts,
      swapAmounts,
    });

    if (swapsCount === undefined) return undefined;
    if (tokensData === undefined) return undefined;
    if (gasPrice === undefined) return undefined;

    const oraclePriceCount = estimateOrderOraclePriceCount(swapsCount);

    return getExecutionFee(this.chainId, gasLimits, tokensData, estimatedGas, gasPrice, oraclePriceCount);
  }

  async getGasPrice() {
    const executionFeeConfig = EXECUTION_FEE_CONFIG_V2[this.chainId];

    const feeData = await withRetry(
      () =>
        this.sdk.publicClient.estimateFeesPerGas({
          chain: getViemChain(this.chainId),
          type: "legacy",
        }),
      {
        retryCount: 2,
        shouldRetry: ({ error }) => {
          const isInvalidBlockError = error?.message?.includes("invalid value for value.hash");

          return isInvalidBlockError;
        },
      }
    );

    let gasPrice = feeData.gasPrice ?? 0n;

    if (executionFeeConfig.shouldUseMaxPriorityFeePerGas) {
      const maxPriorityFeePerGas = bigMath.max(
        feeData?.maxPriorityFeePerGas ?? 0n,
        MAX_PRIORITY_FEE_PER_GAS_MAP[this.chainId] ?? 0n
      );

      gasPrice = gasPrice + maxPriorityFeePerGas;
    }

    const premium = GAS_PRICE_PREMIUM_MAP[this.chainId] ?? 0n;
    const price = gasPrice + premium;

    return price === undefined ? undefined : BigInt(gasPrice);
  }

  private _uiFeeFactor = 0n;
  async getUiFeeFactor() {
    if (this._uiFeeFactor) {
      return this._uiFeeFactor;
    }

    const uiFeeReceiverAccount = this.sdk.config.settings?.uiFeeReceiverAccount ?? DEFAULT_UI_FEE_RECEIVER_ACCOUNT;

    const uiFeeFactor = await this.sdk
      .executeMulticall({
        dataStore: {
          contractAddress: getContract(this.chainId, "DataStore"),
          abiId: "DataStore",
          calls: {
            keys: {
              methodName: "getUint",
              params: [uiFeeFactorKey(uiFeeReceiverAccount)],
            },
          },
        },
      })
      .then((res) => {
        return BigInt(res.data.dataStore.keys.returnValues[0]);
      });

    return uiFeeFactor ?? 0n;
  }
}
