import {
  Abi,
  Address,
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
  WalletClient,
  withRetry,
} from "viem";

import { Accounts } from "modules/accounts/accounts";
import { Markets } from "modules/markets";
import { Orders } from "modules/orders/orders";
import { Positions } from "modules/positions/positions";
import { Tokens } from "modules/tokens/tokens";
import { Trades } from "modules/trades/trades";
import { Oracle } from "modules/oracle";

import { BATCH_CONFIGS } from "configs/batch";
import { getContract } from "configs/contracts";
import { EXECUTION_FEE_CONFIG_V2, GAS_PRICE_PREMIUM_MAP, getChain, MAX_PRIORITY_FEE_PER_GAS_MAP } from "configs/chains";
import {
  decreaseOrderGasLimitKey,
  depositGasLimitKey,
  ESTIMATED_GAS_FEE_BASE_AMOUNT_V2_1,
  ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR,
  ESTIMATED_GAS_FEE_PER_ORACLE_PRICE,
  GLV_DEPOSIT_GAS_LIMIT,
  GLV_PER_MARKET_GAS_LIMIT,
  GLV_WITHDRAWAL_GAS_LIMIT,
  increaseOrderGasLimitKey,
  shiftGasLimitKey,
  singleSwapGasLimitKey,
  swapOrderGasLimitKey,
  withdrawalGasLimitKey,
} from "configs/dataStore";

import DataStore from "abis/DataStore.json";

import type { GmxSdkConfig } from "types/sdk";
import type { IncreasePositionAmounts } from "types/amounts";
import type { GasLimitsConfig } from "types/fees";
import type { DecreasePositionAmounts, SwapAmounts, TradeFeesType } from "types/trade";

import { bigMath } from "utils/bigmath";
import { callContract, CallContractOpts } from "utils/callContract";
import { estimateOrderOraclePriceCount } from "utils/fees/estimateOraclePriceCount";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  estimateExecuteSwapOrderGasLimit,
  getExecutionFee,
} from "utils/fees/executionFee";
import { getSwapCount } from "utils/trade";
import { MAX_TIMEOUT, Multicall, MulticallRequestConfig } from "utils/multicall";

export class GmxSdk {
  public readonly markets = new Markets(this);
  public readonly tokens = new Tokens(this);
  public readonly positions = new Positions(this);
  public readonly orders = new Orders(this);
  public readonly trades = new Trades(this);
  public readonly accounts = new Accounts(this);
  public readonly oracle: Oracle;

  public publicClient: PublicClient;
  public walletClient: WalletClient;

  constructor(public config: GmxSdkConfig) {
    this.oracle = new Oracle(this);

    this.publicClient =
      config.publicClient ??
      createPublicClient({
        transport: http(this.config.rpcUrl, {
          // retries works strangely in viem, so we disable them
          retryCount: 0,
          retryDelay: 10000000,
          batch: BATCH_CONFIGS[this.config.chainId].http,
          timeout: MAX_TIMEOUT,
        }),
        pollingInterval: undefined,
        batch: BATCH_CONFIGS[this.config.chainId].client,
        chain: getChain(this.config.chainId),
      });
    this.walletClient =
      config.walletClient ??
      createWalletClient({
        account: config.account as Address,
        chain: getChain(config.chainId),
        transport: http(config.rpcUrl, {
          retryCount: 0,
          retryDelay: 10000000,
          batch: BATCH_CONFIGS[config.chainId].http,
          timeout: MAX_TIMEOUT,
        }),
      });
  }

  setAccount(account: Address) {
    this.config.account = account;
  }

  async executeMulticall<T = any>(request: MulticallRequestConfig<any>) {
    const multicall = await Multicall.getInstance(this);
    return multicall?.call(request, MAX_TIMEOUT) as Promise<T>;
  }

  async callContract(address: Address, abi: Abi, method: string, params: any[], opts?: CallContractOpts) {
    return callContract(this, address, abi, method, params, opts);
  }

  get chainId() {
    return this.config.chainId;
  }

  get chain() {
    return getChain(this.chainId);
  }

  get account() {
    return this.config.account as Address;
  }

  _gasLimits: GasLimitsConfig | null = null;
  async getGasLimits(): Promise<GasLimitsConfig> {
    if (this._gasLimits) {
      return this._gasLimits;
    }

    const gasLimits = await this.executeMulticall({
      dataStore: {
        contractAddress: getContract(this.chainId, "DataStore"),
        abi: DataStore.abi,
        calls: {
          depositSingleToken: {
            methodName: "getUint",
            params: [depositGasLimitKey(true)],
          },
          depositMultiToken: {
            methodName: "getUint",
            params: [depositGasLimitKey(false)],
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
        },
      },
    }).then((res) => {
      const results = res.data.dataStore;

      function getBigInt(key: keyof typeof results) {
        return BigInt(results[key].returnValues[0]);
      }

      return {
        depositSingleToken: getBigInt("depositSingleToken"),
        depositMultiToken: getBigInt("depositMultiToken"),
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
      };
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
    const { tokensData } = await this.tokens.getTokensData();
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

    return getExecutionFee(this, gasLimits, tokensData, estimatedGas, gasPrice, oraclePriceCount);
  }

  async getGasPrice() {
    const executionFeeConfig = EXECUTION_FEE_CONFIG_V2[this.chainId];

    const feeData = await withRetry(
      () =>
        this.publicClient.estimateFeesPerGas({
          chain: getChain(this.chainId),
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
}
