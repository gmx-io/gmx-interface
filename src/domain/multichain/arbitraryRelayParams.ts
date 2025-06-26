import type { Provider } from "ethers";
import { Address, encodePacked, Hex } from "viem";

import { getCustomError } from "ab/testMultichain/parseError/enabled";
import type { ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { GMX_SIMULATION_ORIGIN } from "config/dataStore";
import type { NoncesData } from "context/ExpressNoncesContext/ExpressNoncesContextProvider";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectAccount,
  selectChainId,
  selectSrcChainId,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  ExpressTransactionBuilder,
  ExpressTxnParams,
  GasPaymentParams,
  getRawRelayerParams,
  getRelayerFeeParams,
  GlobalExpressParams,
  RawMultichainRelayParamsPayload,
  RawRelayParamsPayload,
  RelayFeePayload,
} from "domain/synthetics/express";
import { estimateExpressParams, getGasPaymentValidations } from "domain/synthetics/express/expressOrderUtils";
import { getSubaccountValidations } from "domain/synthetics/subaccount";
import type { Subaccount } from "domain/synthetics/subaccount/types";
import { convertToTokenAmount } from "domain/tokens";
import { extendError } from "lib/errors";
import { estimateGasLimit } from "lib/gas/estimateGasLimit";
import { metrics } from "lib/metrics";
import { expandDecimals, USD_DECIMALS } from "lib/numbers";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "lib/objects";
import { useJsonRpcProvider } from "lib/rpc";
import { AsyncResult, useThrottledAsync } from "lib/useThrottledAsync";
import { gelatoRelay } from "sdk/utils/gelatoRelay";
import { getEmptyExternalCallsPayload, type ExternalCallsPayload } from "sdk/utils/orderTransactions";

const DEBUG_ARBITRARY_RELAY_PARAMS = true;

export function getRawBaseRelayerParams({
  chainId,
  account,
  globalExpressParams,
  additionalNetworkFee,
}: {
  chainId: ContractsChainId;
  account: string;
  globalExpressParams: GlobalExpressParams;
  additionalNetworkFee?: bigint;
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
    totalRelayerFeeTokenAmount: baseRelayerFeeAmount + (additionalNetworkFee ?? 0n),
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
  noncesData,
  subaccount,
  chainId,
}: {
  chainId: ContractsChainId;
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
    [
      baseTxnData.callData as Hex,
      getContract(chainId, "GelatoRelayAddress"),
      baseTxnData.feeToken as Address,
      baseTxnData.feeAmount,
    ]
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
    chainId,
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
  globalExpressParams,
}: {
  chainId: ContractsChainId;
  isGmxAccount: boolean;
  account: string;
  relayerFeeAmount: bigint;
  additionalNetworkFee?: bigint;
  globalExpressParams: GlobalExpressParams;
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

    gasPaymentToken: globalExpressParams.gasPaymentToken,
    relayerFeeToken: globalExpressParams.relayerFeeToken,
    relayerFeeAmount: relayerFeeAmount,
    totalRelayerFeeTokenAmount: networkFee,
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

  const relayParamsPayload = getRawRelayerParams({
    chainId,
    gasPaymentTokenAddress: relayFeeParams.gasPaymentParams.gasPaymentTokenAddress,
    relayerFeeTokenAddress: relayFeeParams.gasPaymentParams.relayerFeeTokenAddress,
    feeParams: relayFeeParams.feeParams,
    externalCalls: getEmptyExternalCallsPayload(),
    tokenPermits: [],
    marketsInfoData: globalExpressParams.marketsInfoData,
  });

  const gasPaymentValidations = getGasPaymentValidations({
    gasPaymentToken: globalExpressParams.gasPaymentToken,
    gasPaymentTokenAmount: relayFeeParams.gasPaymentParams.totalRelayerFeeTokenAmount,
    gasPaymentTokenAsCollateralAmount: 0n,
    gasPaymentAllowanceData: globalExpressParams.gasPaymentAllowanceData ?? EMPTY_OBJECT,
    tokenPermits: globalExpressParams.tokenPermits,
    isGmxAccount,
  });

  const subaccountValidations =
    globalExpressParams.subaccount &&
    getSubaccountValidations({
      requiredActions: 1,
      subaccount: globalExpressParams.subaccount,
    });

  return {
    relayFeeParams,
    relayParamsPayload,
    gasPaymentValidations,
    subaccountValidations,
  };
}

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
        globalExpressParams: p.globalExpressParams,
        additionalNetworkFee: additionalNetworkFee,
      });

      if (baseRelayFeeSwapParams === undefined || rawBaseRelayParamsPayload === undefined) {
        if (DEBUG_ARBITRARY_RELAY_PARAMS) {
          throw new Error("no baseRelayFeeSwapParams or rawBaseRelayParamsPayload");
        }
        return undefined;
      }

      let gasLimit: bigint | undefined;

      try {
        gasLimit = await estimateArbitraryGasLimit({
          chainId,
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
        if (DEBUG_ARBITRARY_RELAY_PARAMS) {
          throw extendedError;
        }
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
            transactionExternalCalls: getEmptyExternalCallsPayload(),
            executionFeeAmount: p.additionalNetworkFee ?? 0n,
            gasPaymentTokenAsCollateralAmount: 0n,
            subaccountActions: 0,
            transactionPayloadGasLimit: gasLimit,
            expressTransactionBuilder: p.expressTransactionBuilder,
          },
        });

        return expressParams;
      } catch (error) {
        if (DEBUG_ARBITRARY_RELAY_PARAMS) {
          throw new Error("no expressParams");
        }
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
              additionalNetworkFee,
            }
          : undefined,
    }
  );

  return expressTxnParamsAsyncResult;
}
