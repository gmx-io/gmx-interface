import { useMemo } from "react";
import {
  encodeAbiParameters,
  encodePacked,
  EstimateGasParameters,
  keccak256,
  PublicClient,
  toHex,
  zeroHash,
} from "viem";

import type { ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { GMX_SIMULATION_ORIGIN, multichainBalanceKey } from "config/dataStore";
import { SIMULATED_MULTICHAIN_BALANCE } from "config/multichain";
import { OVERRIDE_ERC20_BYTECODE, RANDOM_SLOT } from "config/multichain";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectAccount,
  selectChainId,
  selectSubaccountForMultichainAction,
  selectSubaccountForSettlementChainAction,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectGasPaymentTokenAddress } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  ExpressTransactionBuilder,
  ExpressTxnParams,
  GasPaymentParams,
  GasPaymentValidations,
  getRawRelayerParams,
  getRelayerFeeParams,
  GlobalExpressParams,
  RawRelayParamsPayload,
  RelayFeePayload,
} from "domain/synthetics/express";
import {
  estimateExpressParams,
  ExpressEstimationInsufficientGasPaymentTokenBalanceError,
  getGasPaymentValidations,
  getOrderRelayRouterAddress,
} from "domain/synthetics/express/expressOrderUtils";
import { getSubaccountValidations } from "domain/synthetics/subaccount";
import type { Subaccount, SubaccountValidations } from "domain/synthetics/subaccount/types";
import { convertToTokenAmount } from "domain/tokens";
import { CustomError, isCustomError } from "lib/errors";
import { applyGasLimitBuffer } from "lib/gas/estimateGasLimit";
import { metrics } from "lib/metrics";
import { expandDecimals, USD_DECIMALS } from "lib/numbers";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "lib/objects";
import { usePrevious } from "lib/usePrevious";
import { AsyncResult, useThrottledAsync } from "lib/useThrottledAsync";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { gelatoRelay } from "sdk/utils/gelatoRelay";
import { getEmptyExternalCallsPayload, type ExternalCallsPayload } from "sdk/utils/orderTransactions";

import { fallbackCustomError } from "./fallbackCustomError";

export function getRawBaseRelayerParams({
  chainId,
  account,
  globalExpressParams,
  executionFeeAmount,
}: {
  chainId: ContractsChainId;
  account: string;
  globalExpressParams: GlobalExpressParams;
  executionFeeAmount?: bigint;
}): Partial<{
  rawBaseRelayParamsPayload: RawRelayParamsPayload;
  baseRelayFeeSwapParams: {
    feeParams: RelayFeePayload;
    externalCalls: ExternalCallsPayload;
    feeExternalSwapGasLimit: bigint;
    gasPaymentParams: GasPaymentParams;
  };
}> {
  const { gasPaymentToken, relayerFeeToken, tokensData, marketsInfoData, gasPrice, findFeeSwapPath } =
    globalExpressParams;

  if (!gasPaymentToken || !relayerFeeToken || !account || !tokensData || !marketsInfoData || gasPrice === undefined) {
    return EMPTY_OBJECT;
  }

  const baseRelayerFeeAmount = convertToTokenAmount(
    expandDecimals(3, USD_DECIMALS),
    relayerFeeToken.decimals,
    relayerFeeToken.prices.maxPrice
  )!;

  const baseRelayFeeSwapParams = getRelayerFeeParams({
    chainId: chainId,
    account: account,

    gasPaymentToken,
    relayerFeeToken,
    relayerFeeAmount: baseRelayerFeeAmount,
    totalRelayerFeeTokenAmount: baseRelayerFeeAmount + (executionFeeAmount ?? 0n),
    gasPaymentTokenAsCollateralAmount: 0n,
    findFeeSwapPath: findFeeSwapPath,

    transactionExternalCalls: getEmptyExternalCallsPayload(),
    feeExternalSwapQuote: undefined,
  });

  if (baseRelayFeeSwapParams === undefined) {
    return EMPTY_OBJECT;
  }

  const rawBaseRelayParamsPayload = getRawRelayerParams({
    chainId,
    gasPaymentTokenAddress: baseRelayFeeSwapParams.gasPaymentParams.gasPaymentTokenAddress,
    relayerFeeTokenAddress: baseRelayFeeSwapParams.gasPaymentParams.relayerFeeTokenAddress,
    feeParams: baseRelayFeeSwapParams.feeParams,
    externalCalls: getEmptyExternalCallsPayload(),
    tokenPermits: EMPTY_ARRAY,
  });

  return { rawBaseRelayParamsPayload, baseRelayFeeSwapParams };
}

export function calculateMappingSlot(key: string, mappingSlotIndex: number): string {
  const encodedKeyAndSlot = encodeAbiParameters(
    [{ type: "bytes32" }, { type: "uint256" }],
    [key, BigInt(mappingSlotIndex)]
  );

  const storageSlot = keccak256(encodedKeyAndSlot);
  return storageSlot;
}

export const DATASTORE_SLOT_INDEXES = {
  uintValues: 0,
};

async function estimateArbitraryGasLimit({
  client,
  rawRelayParamsPayload,
  gasPaymentParams,
  expressTransactionBuilder,
  subaccount,
  chainId,
  account,
}: {
  chainId: ContractsChainId;
  client: PublicClient;
  rawRelayParamsPayload: RawRelayParamsPayload;
  gasPaymentParams: GasPaymentParams;
  expressTransactionBuilder: ExpressTransactionBuilder;
  subaccount: Subaccount | undefined;
  account: string;
}): Promise<bigint> {
  const { txnData: baseTxnData } = await expressTransactionBuilder({
    relayParams: rawRelayParamsPayload,
    gasPaymentParams,
    subaccount,
  });

  const baseData = encodePacked(
    ["bytes", "address", "address", "uint256"],
    [baseTxnData.callData, getContract(chainId, "GelatoRelayAddress"), baseTxnData.feeToken, baseTxnData.feeAmount]
  );

  const params: EstimateGasParameters = {
    account: GMX_SIMULATION_ORIGIN,
    to: baseTxnData.to,
    data: baseData,
    value: 0n,
    stateOverride: [
      {
        address: getContract(chainId, "DataStore"),
        stateDiff: [
          {
            slot: calculateMappingSlot(
              multichainBalanceKey(account, gasPaymentParams.gasPaymentTokenAddress),
              DATASTORE_SLOT_INDEXES.uintValues
            ),
            value: toHex(SIMULATED_MULTICHAIN_BALANCE, { size: 32 }),
          },
        ],
      },
      {
        address: gasPaymentParams.relayerFeeTokenAddress,
        code: OVERRIDE_ERC20_BYTECODE,
        state: [
          {
            slot: RANDOM_SLOT,
            value: zeroHash,
          },
        ],
      },
    ],
  };

  const gasLimit = await fallbackCustomError(
    async () => client.estimateGas(params).then(applyGasLimitBuffer),
    "gasLimit"
  );

  return gasLimit;
}

export async function estimateArbitraryRelayFee({
  chainId,
  client,
  account,
  rawRelayParamsPayload,
  expressTransactionBuilder,
  gasPaymentParams,
  subaccount,
}: {
  chainId: ContractsChainId;
  client: PublicClient;
  rawRelayParamsPayload: RawRelayParamsPayload;
  expressTransactionBuilder: ExpressTransactionBuilder;
  gasPaymentParams: GasPaymentParams;
  subaccount: Subaccount | undefined;
  account: string;
}) {
  const gasLimit = await estimateArbitraryGasLimit({
    chainId,
    client,
    account,
    rawRelayParamsPayload,
    gasPaymentParams,
    expressTransactionBuilder,
    subaccount,
  });

  const fee = await gelatoRelay.getEstimatedFee(
    BigInt(chainId),
    gasPaymentParams.relayerFeeTokenAddress,
    gasLimit,
    false
  );

  return fee;
}

export function getArbitraryRelayParamsAndPayload({
  chainId,
  account,
  isGmxAccount,
  relayerFeeAmount,
  globalExpressParams,
  subaccount,
}: {
  chainId: ContractsChainId;
  isGmxAccount: boolean;
  account: string;
  relayerFeeAmount: bigint;
  globalExpressParams: GlobalExpressParams;
  subaccount: Subaccount | undefined;
}): Partial<{
  relayFeeParams:
    | {
        feeParams: RelayFeePayload;
        externalCalls: ExternalCallsPayload;
        feeExternalSwapGasLimit: bigint;
        gasPaymentParams: GasPaymentParams;
      }
    | undefined;
  relayParamsPayload: RawRelayParamsPayload | undefined;
  gasPaymentValidations: GasPaymentValidations | undefined;
  subaccountValidations: SubaccountValidations | undefined;
}> {
  if (relayerFeeAmount === undefined) {
    return {
      relayFeeParams: undefined,
      relayParamsPayload: undefined,
      gasPaymentValidations: undefined,
      subaccountValidations: undefined,
    };
  }

  const relayFeeParams = getRelayerFeeParams({
    chainId: chainId,
    account: account,

    gasPaymentToken: globalExpressParams.gasPaymentToken,
    relayerFeeToken: globalExpressParams.relayerFeeToken,
    relayerFeeAmount: relayerFeeAmount,
    totalRelayerFeeTokenAmount: relayerFeeAmount,
    gasPaymentTokenAsCollateralAmount: 0n,
    findFeeSwapPath: globalExpressParams.findFeeSwapPath,

    transactionExternalCalls: getEmptyExternalCallsPayload(),
    feeExternalSwapQuote: undefined,
  });

  if (relayFeeParams === undefined) {
    return {
      relayFeeParams: undefined,
      relayParamsPayload: undefined,
      gasPaymentValidations: undefined,
      subaccountValidations: undefined,
    };
  }

  const gasPaymentValidations = getGasPaymentValidations({
    gasPaymentToken: globalExpressParams.gasPaymentToken,
    gasPaymentTokenAmount: relayFeeParams.gasPaymentParams.totalRelayerFeeTokenAmount,
    gasPaymentTokenAsCollateralAmount: 0n,
    gasPaymentAllowanceData: globalExpressParams.gasPaymentAllowanceData ?? EMPTY_OBJECT,
    tokenPermits: globalExpressParams.tokenPermits,
    isGmxAccount,
  });

  const relayParamsPayload = getRawRelayerParams({
    chainId,
    gasPaymentTokenAddress: relayFeeParams.gasPaymentParams.gasPaymentTokenAddress,
    relayerFeeTokenAddress: relayFeeParams.gasPaymentParams.relayerFeeTokenAddress,
    feeParams: relayFeeParams.feeParams,
    externalCalls: getEmptyExternalCallsPayload(),
    tokenPermits: [],
  });

  const subaccountValidations =
    subaccount &&
    getSubaccountValidations({
      requiredActions: 1,
      subaccount,
      subaccountRouterAddress: getOrderRelayRouterAddress(chainId, true, isGmxAccount),
    });

  return {
    relayFeeParams,
    relayParamsPayload,
    gasPaymentValidations,
    subaccountValidations,
  };
}

export function useArbitraryRelayParamsAndPayload({
  expressTransactionBuilder,
  isGmxAccount,
  enabled = true,
  executionFeeAmount,
  gasPaymentTokenAsCollateralAmount,
  withLoading = true,
  requireValidations = true,
}: {
  expressTransactionBuilder: ExpressTransactionBuilder | undefined;
  isGmxAccount: boolean;
  enabled?: boolean;
  executionFeeAmount?: bigint;
  gasPaymentTokenAsCollateralAmount?: bigint;
  withLoading?: boolean;
  requireValidations?: boolean;
}): AsyncResult<ExpressTxnParams> {
  const account = useSelector(selectAccount);
  const chainId = useSelector(selectChainId);
  const globalExpressParams = useSelector(selectExpressGlobalParams);
  const subaccount = useSelector(
    isGmxAccount ? selectSubaccountForMultichainAction : selectSubaccountForSettlementChainAction
  );

  const estimationKey = `${globalExpressParams?.gasPaymentTokenAddress}`;
  const prevEstimationKey = usePrevious(estimationKey);

  const forceRecalculate = estimationKey !== prevEstimationKey;

  const expressTxnParamsAsyncResult = useThrottledAsync(
    async ({ params: p }): Promise<ExpressTxnParams> => {
      const client = getPublicClientWithRpc(chainId);

      const { baseRelayFeeSwapParams, rawBaseRelayParamsPayload } = getRawBaseRelayerParams({
        chainId,
        account: p.account,
        globalExpressParams: p.globalExpressParams,
        executionFeeAmount: p.executionFeeAmount,
      });

      if (baseRelayFeeSwapParams === undefined || rawBaseRelayParamsPayload === undefined) {
        throw new Error("no baseRelayFeeSwapParams or rawBaseRelayParamsPayload");
      }

      const gasLimit: bigint = await estimateArbitraryGasLimit({
        chainId,
        client,
        account: p.account,
        expressTransactionBuilder: p.expressTransactionBuilder,
        rawRelayParamsPayload: rawBaseRelayParamsPayload,
        gasPaymentParams: baseRelayFeeSwapParams.gasPaymentParams,
        subaccount: p.subaccount,
      }).catch((error) => {
        metrics.pushError(error, "expressArbitrary.estimateGas");
        throw error;
      });

      const expressParams = await estimateExpressParams({
        chainId,
        isGmxAccount: p.isGmxAccount,
        estimationMethod: "estimateGas",
        globalExpressParams: p.globalExpressParams,
        client,
        requireValidations: p.requireValidations,
        subaccount: p.subaccount,
        transactionParams: {
          account: p.account,
          isValid: true,
          transactionExternalCalls: getEmptyExternalCallsPayload(),
          executionFeeAmount: p.executionFeeAmount ?? 0n,
          gasPaymentTokenAsCollateralAmount: p.gasPaymentTokenAsCollateralAmount ?? 0n,
          subaccountActions: 0,
          transactionPayloadGasLimit: gasLimit,
          expressTransactionBuilder: p.expressTransactionBuilder,
          executionGasLimit: 0n,
        },
        throwOnInvalid: true,
      });

      if (expressParams === undefined) {
        throw new Error("no expressParams");
      }

      return expressParams;
    },
    {
      leading: false,
      trailing: true,
      throttleMs: 2500,
      withLoading,
      params:
        enabled && account !== undefined && globalExpressParams !== undefined && expressTransactionBuilder !== undefined
          ? {
              account,
              chainId,
              globalExpressParams,
              expressTransactionBuilder,
              isGmxAccount,
              subaccount,
              executionFeeAmount,
              gasPaymentTokenAsCollateralAmount,
              requireValidations,
            }
          : undefined,
      forceRecalculate,
    }
  );

  return expressTxnParamsAsyncResult;
}

export function useArbitraryError(
  error: ExpressEstimationInsufficientGasPaymentTokenBalanceError | CustomError | Error | undefined
):
  | {
      isOutOfTokenError?: {
        tokenAddress: string;
        isGasPaymentToken: boolean;
        balance?: bigint;
        requiredAmount?: bigint;
      };
    }
  | undefined {
  const gasPaymentTokenAddress = useSelector(selectGasPaymentTokenAddress);

  return useMemo(() => {
    if (error instanceof ExpressEstimationInsufficientGasPaymentTokenBalanceError) {
      return {
        isOutOfTokenError: {
          tokenAddress: gasPaymentTokenAddress,
          isGasPaymentToken: true,
          balance: error.params?.balance,
          requiredAmount: error.params?.requiredAmount,
        },
      };
    }

    if (!isCustomError(error)) {
      return EMPTY_OBJECT;
    }

    const isInsufficientMultichainBalance = error.name === "InsufficientMultichainBalance";

    if (isInsufficientMultichainBalance) {
      return {
        isOutOfTokenError: {
          tokenAddress: error.args[1],
          isGasPaymentToken: error.args[1] === gasPaymentTokenAddress,
          balance: error.args[2],
          requiredAmount: error.args[3],
        },
      };
    }

    return undefined;
  }, [error, gasPaymentTokenAddress]);
}
