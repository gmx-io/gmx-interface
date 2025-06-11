import type { Provider } from "ethers";
import { Address, decodeErrorResult, encodePacked, Hex } from "viem";

import type { UiContractsChain } from "config/chains";
import { getContract } from "config/contracts";
import { GMX_SIMULATION_ORIGIN } from "config/dataStore";
import type { NoncesData } from "context/ExpressNoncesContext/ExpressNoncesContextProvider";
import {
  selectExpressFindSwapPath,
  selectExpressGlobalParams,
  selectGasPaymentToken,
  selectRelayerFeeToken,
} from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectAccount,
  selectChainId,
  selectExpressNoncesData,
  selectGasPaymentTokenAllowance,
  selectMarketsInfoData,
  selectSrcChainId,
  selectSubaccountForAction,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectTokenPermits } from "context/SyntheticsStateContext/selectors/tokenPermitsSelectors";
import { createSelector, useSelector } from "context/SyntheticsStateContext/utils";
import {
  ExpressTransactionBuilder,
  ExpressTxnParams,
  GasPaymentParams,
  GasPaymentValidations,
  getRawRelayerParams,
  getRelayerFeeParams,
  getRelayRouterNonceForMultichain,
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
import type { SubaccountValidations } from "domain/synthetics/subaccount/types";
import { convertToTokenAmount, TokenData } from "domain/tokens";
import { estimateGasLimit } from "lib/gas/estimateGasLimit";
import { expandDecimals, USD_DECIMALS } from "lib/numbers";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "lib/objects";
import { useJsonRpcProvider } from "lib/rpc";
import type { ExpressTxnData } from "lib/transactions";
import { AsyncResult, useThrottledAsync } from "lib/useThrottledAsync";
import { abis } from "sdk/abis";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { gelatoRelay } from "sdk/utils/gelatoRelay";
import type { ExternalCallsPayload } from "sdk/utils/orderTransactions";
import { nowInSeconds } from "sdk/utils/time";

export type PreparedGetTxnData = (opts: {
  emptySignature: boolean;
  relayParamsPayload: RelayParamsPayload | MultichainRelayParamsPayload;
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
}) => Promise<ExpressTxnData | undefined>;

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

function getRawBaseRelayerParams({
  chainId,
  account,
  expressGlobalParams,
}: {
  chainId: UiContractsChain;
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
  relayerFeeToken,
  relayerFeeAmount,
  gasPaymentToken,
  expressTransactionBuilder,
  noncesData,
}: {
  provider: Provider;
  rawRelayParamsPayload: RawRelayParamsPayload | RawMultichainRelayParamsPayload;
  relayerFeeToken: TokenData;
  gasPaymentToken: TokenData;
  relayerFeeAmount: bigint;
  expressTransactionBuilder: ExpressTransactionBuilder;
  noncesData: NoncesData | undefined;
}) {
  const gasPaymentParams: GasPaymentParams = {
    gasPaymentToken: gasPaymentToken,
    relayFeeToken: relayerFeeToken,
    gasPaymentTokenAddress: gasPaymentToken.address,
    relayerFeeTokenAddress: relayerFeeToken.address,
    relayerFeeAmount,
    totalRelayerFeeTokenAmount: relayerFeeAmount,
    gasPaymentTokenAmount: 0n,
  };

  const { txnData: baseTxnData } = await expressTransactionBuilder({
    relayParams: rawRelayParamsPayload,
    gasPaymentParams,
    subaccount: undefined,
    noncesData,
  });

  const baseData = encodePacked(
    ["bytes", "address", "address", "uint256"],
    [baseTxnData.callData as Hex, GELATO_RELAY_ADDRESS, relayerFeeToken.address as Address, baseTxnData.feeAmount]
  );

  const gasLimit = await estimateGasLimit(provider, {
    from: GMX_SIMULATION_ORIGIN as Address,
    to: baseTxnData.to as Address,
    data: baseData,
    value: 0n,
  });

  return gasLimit;
}

export async function estimateArbitraryRelayFee({
  chainId,
  relayRouterAddress,
  provider,
  account,
  rawRelayParamsPayload,
  relayerFeeTokenAddress,
  relayerFeeAmount,
  getTxnData,
}: {
  chainId: UiContractsChain;
  relayRouterAddress: string;
  provider: Provider;
  account: string;
  rawRelayParamsPayload: RawRelayParamsPayload | RawMultichainRelayParamsPayload;
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
  getTxnData: PreparedGetTxnData;
}) {
  const userNonce = await getRelayRouterNonceForMultichain(provider, account, relayRouterAddress);

  const baseTxnData = await getTxnData({
    emptySignature: true,
    relayParamsPayload: {
      ...rawRelayParamsPayload,
      userNonce,
      deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
    },
    relayerFeeTokenAddress,
    relayerFeeAmount,
  });

  if (baseTxnData === undefined) {
    return;
  }

  const baseData = encodePacked(
    ["bytes", "address", "address", "uint256"],
    [baseTxnData.callData as Hex, GELATO_RELAY_ADDRESS, relayerFeeTokenAddress as Address, baseTxnData.feeAmount]
  );

  const gasLimit = await estimateGasLimit(provider, {
    from: GMX_SIMULATION_ORIGIN as Address,
    to: baseTxnData.to as Address,
    data: baseData,
    value: 0n,
  });

  const fee = await gelatoRelay.getEstimatedFee(BigInt(chainId), relayerFeeTokenAddress, gasLimit, false);

  return fee;
}

export const selectArbitraryRelayParamsAndPayload = createSelector(function selectArbitraruRelayParamsAndPayload(q):
  | ((dynamicFees: { relayerFeeAmount: bigint; additionalNetworkFee?: bigint }) => Partial<{
      relayFeeParams: {
        feeParams: RelayFeePayload;
        externalCalls: ExternalCallsPayload;
        feeExternalSwapGasLimit: bigint;
        gasPaymentParams: GasPaymentParams;
      };
      relayParamsPayload: RawRelayParamsPayload | RawMultichainRelayParamsPayload;
      latestParamsPayload: RelayParamsPayload | MultichainRelayParamsPayload;
      fetchRelayParamsPayload: (
        provider: Provider,
        relayRouterAddress: string
      ) => Promise<RelayParamsPayload | MultichainRelayParamsPayload>;
      gasPaymentValidations: GasPaymentValidations;
      subaccountValidations: SubaccountValidations;
    }>)
  | undefined {
  const chainId = q(selectChainId);
  const srcChainId = q(selectSrcChainId);
  const account = q(selectAccount);
  const relayerFeeToken = q(selectRelayerFeeToken);
  const gasPaymentToken = q(selectGasPaymentToken);
  const marketsInfoData = q(selectMarketsInfoData);
  const subaccount = q(selectSubaccountForAction);
  const tokenPermits = q(selectTokenPermits);
  const gasPaymentAllowanceData = q(selectGasPaymentTokenAllowance);
  const findSwapPath = q(selectExpressFindSwapPath);
  const noncesData = q(selectExpressNoncesData);

  if (!account || !gasPaymentToken || !relayerFeeToken || !marketsInfoData) {
    return undefined;
  }

  return ({ relayerFeeAmount, additionalNetworkFee }: { relayerFeeAmount: bigint; additionalNetworkFee?: bigint }) => {
    if (relayerFeeAmount === undefined) {
      return {
        relayFeeParams: undefined,
        relayParamsPayload: undefined,
        fetchRelayParamsPayload: undefined,
        gasPaymentValidations: undefined,
        subaccountValidations: undefined,
      };
    }

    const networkFee = relayerFeeAmount + (additionalNetworkFee ?? 0n);

    const relayFeeParams = getRelayerFeeParams({
      chainId: chainId,
      account: account,

      gasPaymentToken,
      relayerFeeToken,
      relayerFeeAmount: relayerFeeAmount,
      totalRelayerFeeTokenAmount: networkFee,
      findFeeSwapPath: findSwapPath,

      transactionExternalCalls: EMPTY_EXTERNAL_CALLS,
      feeExternalSwapQuote: undefined,
    });

    if (relayFeeParams === undefined) {
      return {
        relayFeeParams: undefined,
        relayParamsPayload: undefined,
        fetchRelayParamsPayload: undefined,
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
      marketsInfoData,
      // isMultichain: srcChainId !== undefined,
    });

    const fetchRelayParamsPayload = async (
      provider: Provider,
      relayRouterAddress: string
    ): Promise<RelayParamsPayload | MultichainRelayParamsPayload> => {
      const cache =
        getContract(chainId, "MultichainTransferRouter") === relayRouterAddress
          ? noncesData?.multichainTransferRouter?.nonce
          : undefined;
      const userNonce = cache ?? (await getRelayRouterNonceForMultichain(provider, account, relayRouterAddress));

      return {
        ...relayParamsPayload,
        userNonce,
        deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
      };
    };

    const gasPaymentValidations = getGasPaymentValidations({
      gasPaymentToken,
      gasPaymentTokenAmount: relayFeeParams.gasPaymentParams.totalRelayerFeeTokenAmount,
      gasPaymentTokenAsCollateralAmount: 0n,
      gasPaymentAllowanceData: gasPaymentAllowanceData?.tokensAllowanceData ?? EMPTY_OBJECT,
      tokenPermits,
      isMultichain: srcChainId !== undefined,
    });

    const subaccountValidations =
      subaccount &&
      getSubaccountValidations({
        requiredActions: 1,
        subaccount,
      });

    return {
      relayFeeParams,
      relayParamsPayload,
      fetchRelayParamsPayload,
      gasPaymentValidations,
      subaccountValidations,
    };
  };
});

export function useArbitraryRelayParamsAndPayload(
  name: string,
  {
    additionalNetworkFee,
    expressTransactionBuilder,
  }: { expressTransactionBuilder: ExpressTransactionBuilder | undefined; additionalNetworkFee?: bigint }
): AsyncResult<ExpressTxnParams | undefined> {
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
        throw new Error("Failed to get base relay params");
      }

      let gasLimit: bigint | undefined;

      try {
        gasLimit = await estimateArbitraryGasLimit({
          provider: p.provider,
          expressTransactionBuilder: p.expressTransactionBuilder,
          gasPaymentToken: p.globalExpressParams.gasPaymentToken,
          relayerFeeToken: p.globalExpressParams.relayerFeeToken,
          rawRelayParamsPayload: rawBaseRelayParamsPayload,
          relayerFeeAmount: baseRelayFeeSwapParams.gasPaymentParams.relayerFeeAmount + (additionalNetworkFee ?? 0n),
          noncesData: p.globalExpressParams.noncesData,
        });
      } catch (error) {
        rethrowCustomError(error);
      }

      if (gasLimit === undefined) {
        throw new Error("Failed to estimate gas limit");
      }

      try {
        const expressParams = await estimateExpressParams({
          chainId,
          srcChainId,
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
        rethrowCustomError(error);
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

function rethrowCustomError(error: Error): never {
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
    throw error;
  }

  const prettyError = new Error(prettyErrorMessage);
  prettyError.name = prettyErrorName;

  throw prettyError;
}
