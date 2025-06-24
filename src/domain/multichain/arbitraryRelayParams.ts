import type { Provider } from "ethers";
import { Address, decodeErrorResult, encodePacked, Hex } from "viem";

import type { ContractsChainId } from "config/chains";
import { GMX_SIMULATION_ORIGIN } from "config/dataStore";
import type { NoncesData } from "context/ExpressNoncesContext/ExpressNoncesContextProvider";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectAccount,
  selectChainId,
  selectSrcChainId,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { createSelector, useSelector } from "context/SyntheticsStateContext/utils";
import {
  ExpressTransactionBuilder,
  ExpressTxnParams,
  GasPaymentParams,
  GasPaymentValidations,
  getRawRelayerParams,
  getRelayerFeeParams,
  GlobalExpressParams,
  MultichainRelayParamsPayload,
  RawMultichainRelayParamsPayload,
  RawRelayParamsPayload,
  RelayFeePayload,
  RelayParamsPayload,
} from "domain/synthetics/express";
import { estimateExpressParams, getGasPaymentValidations } from "domain/synthetics/express/expressOrderUtils";
import { GELATO_RELAY_ADDRESS } from "domain/synthetics/gassless/txns/expressOrderDebug";
import { getSubaccountValidations } from "domain/synthetics/subaccount";
import type { Subaccount, SubaccountValidations } from "domain/synthetics/subaccount/types";
import { convertToTokenAmount } from "domain/tokens";
import { extendError } from "lib/errors";
import { estimateGasLimit } from "lib/gas/estimateGasLimit";
import { metrics } from "lib/metrics";
import { expandDecimals, USD_DECIMALS } from "lib/numbers";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "lib/objects";
import { useJsonRpcProvider } from "lib/rpc";
import { AsyncResult, useThrottledAsync } from "lib/useThrottledAsync";
import { abis } from "sdk/abis";
import { gelatoRelay } from "sdk/utils/gelatoRelay";
import type { ExternalCallsPayload } from "sdk/utils/orderTransactions";

/**
 * Just a dummy relay params payload with hardcoded fee
 */
export const selectRawBasePreparedRelayParamsPayload = createSelector<
  Partial<{
    rawBaseRelayParamsPayload: RawRelayParamsPayload | RawMultichainRelayParamsPayload | undefined;
    baseRelayFeeSwapParams: {
      feeParams: RelayFeePayload;
      externalCalls: ExternalCallsPayload;
      feeExternalSwapGasLimit: bigint;
      gasPaymentParams: GasPaymentParams;
    };
  }>
>((q) => {
  const chainId = q(selectChainId);
  const account = q(selectAccount);
  const expressGlobalParams = q(selectExpressGlobalParams);

  if (!expressGlobalParams || !account) {
    return EMPTY_OBJECT;
  }

  return getRawBaseRelayerParams({
    chainId,
    account,
    expressGlobalParams,
  });
});

export function getRawBaseRelayerParams({
  chainId,
  account,
  expressGlobalParams,
}: {
  chainId: ContractsChainId;
  account: string;
  expressGlobalParams: GlobalExpressParams;
}): Partial<{
  rawBaseRelayParamsPayload: RawRelayParamsPayload | RawMultichainRelayParamsPayload;
  baseRelayFeeSwapParams: {
    feeParams: RelayFeePayload;
    externalCalls: ExternalCallsPayload;
    feeExternalSwapGasLimit: bigint;
    gasPaymentParams: GasPaymentParams;
  };
}> {
  const { gasPaymentToken, relayerFeeToken, tokensData, marketsInfoData, gasPrice, findFeeSwapPath } =
    expressGlobalParams;

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
    findFeeSwapPath: findFeeSwapPath,

    transactionExternalCalls: EMPTY_EXTERNAL_CALLS,
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
    externalCalls: EMPTY_EXTERNAL_CALLS,
    tokenPermits: EMPTY_ARRAY,
    marketsInfoData,
  });

  return { rawBaseRelayParamsPayload, baseRelayFeeSwapParams };
}

export const EMPTY_EXTERNAL_CALLS: ExternalCallsPayload = {
  sendTokens: EMPTY_ARRAY,
  sendAmounts: EMPTY_ARRAY,
  externalCallTargets: EMPTY_ARRAY,
  externalCallDataList: EMPTY_ARRAY,
  refundTokens: EMPTY_ARRAY,
  refundReceivers: EMPTY_ARRAY,
};

async function estimateArbitraryGasLimit({
  provider,
  rawRelayParamsPayload,
  gasPaymentParams,
  expressTransactionBuilder,
  noncesData,
  subaccount,
}: {
  provider: Provider;
  rawRelayParamsPayload: RawRelayParamsPayload | RawMultichainRelayParamsPayload;
  gasPaymentParams: GasPaymentParams;
  expressTransactionBuilder: ExpressTransactionBuilder;
  noncesData: NoncesData | undefined;
  subaccount: Subaccount | undefined;
}): Promise<bigint> {
  const { txnData: baseTxnData } = await expressTransactionBuilder({
    relayParams: rawRelayParamsPayload,
    gasPaymentParams,
    subaccount,
    noncesData,
  });

  const baseData = encodePacked(
    ["bytes", "address", "address", "uint256"],
    [baseTxnData.callData as Hex, GELATO_RELAY_ADDRESS, baseTxnData.feeToken as Address, baseTxnData.feeAmount]
  );

  const gasLimit = await estimateGasLimit(provider, {
    from: GMX_SIMULATION_ORIGIN as Address,
    to: baseTxnData.to as Address,
    data: baseData,
    value: 0n,
  });

  return gasLimit + 100_000n;
}

export async function estimateArbitraryRelayFee({
  chainId,
  provider,
  rawRelayParamsPayload,
  expressTransactionBuilder,
  noncesData,
  gasPaymentParams,
  subaccount,
}: {
  chainId: ContractsChainId;
  provider: Provider;
  rawRelayParamsPayload: RawRelayParamsPayload | RawMultichainRelayParamsPayload;
  expressTransactionBuilder: ExpressTransactionBuilder;
  gasPaymentParams: GasPaymentParams;
  noncesData: NoncesData | undefined;
  subaccount: Subaccount | undefined;
}) {
  const gasLimit = await estimateArbitraryGasLimit({
    provider,
    rawRelayParamsPayload,
    gasPaymentParams,
    expressTransactionBuilder,
    noncesData,
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
  additionalNetworkFee,
  expressGlobalParams,
}: {
  chainId: ContractsChainId;
  isGmxAccount: boolean;
  account: string;
  relayerFeeAmount: bigint;
  additionalNetworkFee?: bigint;
  expressGlobalParams: GlobalExpressParams;
}) {
  if (relayerFeeAmount === undefined) {
    return {
      relayFeeParams: undefined,
      relayParamsPayload: undefined,
      gasPaymentValidations: undefined,
      subaccountValidations: undefined,
    };
  }

  const networkFee = relayerFeeAmount + (additionalNetworkFee ?? 0n);

  const relayFeeParams = getRelayerFeeParams({
    chainId: chainId,
    account: account,

    gasPaymentToken: expressGlobalParams.gasPaymentToken,
    relayerFeeToken: expressGlobalParams.relayerFeeToken,
    relayerFeeAmount: relayerFeeAmount,
    totalRelayerFeeTokenAmount: networkFee,
    findFeeSwapPath: expressGlobalParams.findFeeSwapPath,

    transactionExternalCalls: EMPTY_EXTERNAL_CALLS,
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

  const relayParamsPayload = getRawRelayerParams({
    chainId,
    gasPaymentTokenAddress: relayFeeParams.gasPaymentParams.gasPaymentTokenAddress,
    relayerFeeTokenAddress: relayFeeParams.gasPaymentParams.relayerFeeTokenAddress,
    feeParams: relayFeeParams.feeParams,
    externalCalls: EMPTY_EXTERNAL_CALLS,
    tokenPermits: [],
    marketsInfoData: expressGlobalParams.marketsInfoData,
  });

  const gasPaymentValidations = getGasPaymentValidations({
    gasPaymentToken: expressGlobalParams.gasPaymentToken,
    gasPaymentTokenAmount: relayFeeParams.gasPaymentParams.totalRelayerFeeTokenAmount,
    gasPaymentTokenAsCollateralAmount: 0n,
    gasPaymentAllowanceData: expressGlobalParams.gasPaymentAllowanceData ?? EMPTY_OBJECT,
    tokenPermits: expressGlobalParams.tokenPermits,
    isGmxAccount,
  });

  const subaccountValidations =
    expressGlobalParams.subaccount &&
    getSubaccountValidations({
      requiredActions: 1,
      subaccount: expressGlobalParams.subaccount,
    });

  return {
    relayFeeParams,
    relayParamsPayload,
    gasPaymentValidations,
    subaccountValidations,
  };
}

export const selectArbitraryRelayParamsAndPayload = createSelector(function selectArbitraruRelayParamsAndPayload(q):
  | ((dynamicFees: { relayerFeeAmount: bigint; additionalNetworkFee?: bigint; isGmxAccount: boolean }) => Partial<{
      relayFeeParams: {
        feeParams: RelayFeePayload;
        externalCalls: ExternalCallsPayload;
        feeExternalSwapGasLimit: bigint;
        gasPaymentParams: GasPaymentParams;
      };
      relayParamsPayload: RawRelayParamsPayload | RawMultichainRelayParamsPayload;
      latestParamsPayload: RelayParamsPayload | MultichainRelayParamsPayload;
      gasPaymentValidations: GasPaymentValidations;
      subaccountValidations: SubaccountValidations;
    }>)
  | undefined {
  const chainId = q(selectChainId);
  const account = q(selectAccount);
  const expressGlobalParams = q(selectExpressGlobalParams);

  if (!account || !expressGlobalParams) {
    return undefined;
  }

  return ({
    relayerFeeAmount,
    additionalNetworkFee,
    isGmxAccount,
  }: {
    relayerFeeAmount: bigint;
    additionalNetworkFee?: bigint;
    isGmxAccount: boolean;
  }) => {
    return getArbitraryRelayParamsAndPayload({
      chainId,
      account,
      isGmxAccount,
      relayerFeeAmount,
      additionalNetworkFee,
      expressGlobalParams,
    });
  };
});

export function useArbitraryRelayParamsAndPayload({
  additionalNetworkFee,
  expressTransactionBuilder,
}: {
  expressTransactionBuilder: ExpressTransactionBuilder | undefined;
  additionalNetworkFee?: bigint;
}): AsyncResult<ExpressTxnParams | undefined> {
  const account = useSelector(selectAccount);
  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const globalExpressParams = useSelector(selectExpressGlobalParams);
  const { provider } = useJsonRpcProvider(chainId);

  const expressTxnParamsAsyncResult = useThrottledAsync(
    async ({ params: p }) => {
      const { baseRelayFeeSwapParams, rawBaseRelayParamsPayload } = getRawBaseRelayerParams({
        chainId,
        account: p.account,
        expressGlobalParams: p.globalExpressParams,
      });

      if (baseRelayFeeSwapParams === undefined || rawBaseRelayParamsPayload === undefined) {
        return undefined;
      }

      let gasLimit: bigint | undefined;

      try {
        gasLimit = await estimateArbitraryGasLimit({
          provider: p.provider,
          expressTransactionBuilder: p.expressTransactionBuilder,
          rawRelayParamsPayload: rawBaseRelayParamsPayload,
          gasPaymentParams: baseRelayFeeSwapParams.gasPaymentParams,
          subaccount: p.globalExpressParams.subaccount,
          noncesData: p.globalExpressParams.noncesData,
        });
      } catch (error) {
        const customError = getCustomError(error);
        const extendedError = extendError(customError, {
          data: {
            estimationMethod: "estimateGas",
          },
        });

        metrics.pushError(extendedError, "expressArbitrary.estimateGas");
        return undefined;
      }

      try {
        const expressParams = await estimateExpressParams({
          chainId,
          isGmxAccount: srcChainId !== undefined,
          estimationMethod: "estimateGas",
          globalExpressParams: p.globalExpressParams,
          provider: p.provider,
          requireValidations: true,
          transactionParams: {
            account: p.account,
            isValid: true,
            transactionExternalCalls: EMPTY_EXTERNAL_CALLS,
            executionFeeAmount: additionalNetworkFee ?? 0n,
            gasPaymentTokenAsCollateralAmount: 0n,
            subaccountActions: 0,
            transactionPayloadGasLimit: gasLimit,
            expressTransactionBuilder: p.expressTransactionBuilder,
          },
        });

        return expressParams;
      } catch (error) {
        return undefined;
      }
    },
    {
      leading: true,
      trailing: true,
      throttleMs: 5000,
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
            }
          : undefined,
    }
  );

  return expressTxnParamsAsyncResult;
}

function getCustomError(error: Error): Error {
  const data = (error as any)?.info?.error?.data ?? (error as any)?.data;

  let prettyErrorName = error.name;
  let prettyErrorMessage = error.message;

  try {
    const parsedError = decodeErrorResult({
      abi: abis.CustomErrorsArbitrumSepolia,
      data: data,
    });

    prettyErrorName = parsedError.errorName;
    prettyErrorMessage = JSON.stringify(parsedError, null, 2);
  } catch (decodeError) {
    return error;
  }

  const prettyError = new Error(prettyErrorMessage);
  prettyError.name = prettyErrorName;

  return prettyError;
}
