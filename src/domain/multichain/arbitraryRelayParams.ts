import type { Provider } from "ethers";
import { useMemo } from "react";
import { Address, encodePacked, Hex } from "viem";

import type { ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { GMX_SIMULATION_ORIGIN } from "config/dataStore";
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
import { useJsonRpcProvider } from "lib/rpc";
import { usePrevious } from "lib/usePrevious";
import { AsyncResult, useThrottledAsync } from "lib/useThrottledAsync";
import { gelatoRelay } from "sdk/utils/gelatoRelay";
import { getEmptyExternalCallsPayload, type ExternalCallsPayload } from "sdk/utils/orderTransactions";

import { fallbackCustomError } from "./fallbackCustomError";

export function getRawBaseRelayerParams({
  chainId,
  account,
  globalExpressParams,
}: {
  chainId: ContractsChainId;
  account: string;
  globalExpressParams: GlobalExpressParams;
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
    expandDecimals(1, USD_DECIMALS),
    relayerFeeToken.decimals,
    relayerFeeToken.prices.maxPrice
  )!;

  const baseRelayFeeSwapParams = getRelayerFeeParams({
    chainId: chainId,
    account: account,

    gasPaymentToken,
    relayerFeeToken,
    relayerFeeAmount: baseRelayerFeeAmount,
    totalRelayerFeeTokenAmount: baseRelayerFeeAmount,
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
    marketsInfoData,
  });

  return { rawBaseRelayParamsPayload, baseRelayFeeSwapParams };
}

async function estimateArbitraryGasLimit({
  provider,
  rawRelayParamsPayload,
  gasPaymentParams,
  expressTransactionBuilder,
  subaccount,
  chainId,
}: {
  chainId: ContractsChainId;
  provider: Provider;
  rawRelayParamsPayload: RawRelayParamsPayload;
  gasPaymentParams: GasPaymentParams;
  expressTransactionBuilder: ExpressTransactionBuilder;
  subaccount: Subaccount | undefined;
}): Promise<bigint> {
  const { txnData: baseTxnData } = await expressTransactionBuilder({
    relayParams: rawRelayParamsPayload,
    gasPaymentParams,
    subaccount,
  });

  const baseData = encodePacked(
    ["bytes", "address", "address", "uint256"],
    [
      baseTxnData.callData as Hex,
      getContract(chainId, "GelatoRelayAddress"),
      baseTxnData.feeToken as Address,
      baseTxnData.feeAmount,
    ]
  );

  const gasLimit = await fallbackCustomError(
    async () =>
      provider
        .estimateGas({
          from: GMX_SIMULATION_ORIGIN as Address,
          to: baseTxnData.to as Address,
          data: baseData,
          value: 0n,
        })
        .then(applyGasLimitBuffer),
    "gasLimit"
  );

  return gasLimit;
}

export async function estimateArbitraryRelayFee({
  chainId,
  provider,
  rawRelayParamsPayload,
  expressTransactionBuilder,
  gasPaymentParams,
  subaccount,
}: {
  chainId: ContractsChainId;
  provider: Provider;
  rawRelayParamsPayload: RawRelayParamsPayload;
  expressTransactionBuilder: ExpressTransactionBuilder;
  gasPaymentParams: GasPaymentParams;
  subaccount: Subaccount | undefined;
}) {
  const gasLimit = await estimateArbitraryGasLimit({
    chainId,
    provider,
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
    marketsInfoData: globalExpressParams.marketsInfoData,
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
}: {
  expressTransactionBuilder: ExpressTransactionBuilder | undefined;
  isGmxAccount: boolean;
}): AsyncResult<ExpressTxnParams | undefined> {
  const account = useSelector(selectAccount);
  const chainId = useSelector(selectChainId);
  const globalExpressParams = useSelector(selectExpressGlobalParams);
  const subaccount = useSelector(
    isGmxAccount ? selectSubaccountForMultichainAction : selectSubaccountForSettlementChainAction
  );
  const { provider } = useJsonRpcProvider(chainId);

  const estimationKey = `${globalExpressParams?.gasPaymentTokenAddress}`;
  const prevEstimationKey = usePrevious(estimationKey);

  const forceRecalculate = estimationKey !== prevEstimationKey;

  const expressTxnParamsAsyncResult = useThrottledAsync(
    async ({ params: p }) => {
      const { baseRelayFeeSwapParams, rawBaseRelayParamsPayload } = getRawBaseRelayerParams({
        chainId,
        account: p.account,
        globalExpressParams: p.globalExpressParams,
      });

      if (baseRelayFeeSwapParams === undefined || rawBaseRelayParamsPayload === undefined) {
        throw new Error("no baseRelayFeeSwapParams or rawBaseRelayParamsPayload");
      }

      let gasLimit: bigint = await fallbackCustomError(
        async () =>
          await estimateArbitraryGasLimit({
            chainId,
            provider: p.provider,
            expressTransactionBuilder: p.expressTransactionBuilder,
            rawRelayParamsPayload: rawBaseRelayParamsPayload,
            gasPaymentParams: baseRelayFeeSwapParams.gasPaymentParams,
            subaccount: p.subaccount,
          }),
        "gasLimit"
      ).catch((error) => {
        metrics.pushError(error, "expressArbitrary.estimateGas");
        throw error;
      });

      try {
        const expressParams = await estimateExpressParams({
          chainId,
          isGmxAccount: p.isGmxAccount,
          estimationMethod: "estimateGas",
          globalExpressParams: p.globalExpressParams,
          provider: p.provider,
          requireValidations: true,
          subaccount: p.subaccount,
          transactionParams: {
            account: p.account,
            isValid: true,
            transactionExternalCalls: getEmptyExternalCallsPayload(),
            executionFeeAmount: 0n,
            gasPaymentTokenAsCollateralAmount: 0n,
            subaccountActions: 0,
            transactionPayloadGasLimit: gasLimit,
            expressTransactionBuilder: p.expressTransactionBuilder,
            executionGasLimit: 0n,
          },
        });
        return expressParams;
      } catch (error) {
        throw new Error("no expressParams");
      }
    },
    {
      leading: false,
      trailing: true,
      throttleMs: 2500,
      withLoading: true,
      params:
        account !== undefined &&
        provider !== undefined &&
        globalExpressParams !== undefined &&
        expressTransactionBuilder !== undefined
          ? {
              account,
              chainId,
              provider,
              globalExpressParams,
              expressTransactionBuilder,
              isGmxAccount,
              subaccount,
            }
          : undefined,
      forceRecalculate,
    }
  );

  return expressTxnParamsAsyncResult;
}

export function useArbitraryError(error: CustomError | Error | undefined):
  | {
      isOutOfTokenError?: {
        tokenAddress: string;
        isGasPaymentToken: boolean;
        balance: bigint;
        requiredAmount: bigint;
      };
    }
  | undefined {
  const gasPaymentTokenAddress = useSelector(selectGasPaymentTokenAddress);

  return useMemo(() => {
    if (!isCustomError(error)) {
      return {
        isOutOfTokenError: undefined,
      };
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
