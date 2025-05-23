import { Provider } from "ethers";
import { DependencyList, useMemo } from "react";
import useSWR from "swr";
import { Address, encodePacked, Hex } from "viem";

import { UiContractsChain } from "config/chains";
import { GMX_SIMULATION_ORIGIN } from "config/dataStore";
import {
  selectExpressFindSwapPath,
  selectGasPaymentToken,
  selectRelayerFeeToken,
} from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectAccount,
  selectChainId,
  selectGasPaymentTokenAllowance,
  selectGasPrice,
  selectMarketsInfoData,
  selectSrcChainId,
  selectSubaccountForAction,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectTokenPermits } from "context/SyntheticsStateContext/selectors/tokenPermitsSelectors";
import { createSelector, useSelector } from "context/SyntheticsStateContext/utils";
import {
  GasPaymentParams,
  GasPaymentValidations,
  getRawRelayerParams,
  getRelayerFeeParams,
  getRelayRouterNonceForMultichain,
  MultichainRelayParamsPayload,
  RawMultichainRelayParamsPayload,
  RawRelayParamsPayload,
  RelayFeePayload,
  RelayParamsPayload,
} from "domain/synthetics/express";
import { getGasPaymentValidations } from "domain/synthetics/express/expressOrderUtils";
import { GELATO_RELAY_ADDRESS } from "domain/synthetics/gassless/txns/expressOrderDebug";
import { getSubaccountValidations } from "domain/synthetics/subaccount";
import { SubaccountValidations } from "domain/synthetics/subaccount/types";
import { convertToTokenAmount } from "domain/tokens";
import { estimateGasLimit } from "lib/gas/estimateGasLimit";
import { expandDecimals, USD_DECIMALS } from "lib/numbers";
import { EMPTY_OBJECT } from "lib/objects";
import { useJsonRpcProvider } from "lib/rpc";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { ExpressTxnData } from "lib/transactions";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION, DEFAULT_SUBACCOUNT_DEADLINE_DURATION } from "sdk/configs/express";
import { gelatoRelay } from "sdk/utils/gelatoRelay";
import { ExternalCallsPayload } from "sdk/utils/orderTransactions";
import { nowInSeconds } from "sdk/utils/time";

type PreparedGetTxnData = (opts: {
  emptySignature: boolean;
  relayParamsPayload: RelayParamsPayload | MultichainRelayParamsPayload;
}) => Promise<ExpressTxnData | undefined>;

const selectBasePreparedRelayParamsPayload = createSelector<
  RawRelayParamsPayload | RawMultichainRelayParamsPayload | undefined
>((q) => {
  const chainId = q(selectChainId);
  const srcChainId = q(selectSrcChainId);
  const account = q(selectAccount);
  const gasPaymentToken = q(selectGasPaymentToken);
  const relayerFeeToken = q(selectRelayerFeeToken);
  const tokensData = q(selectTokensData);
  const marketsInfoData = q(selectMarketsInfoData);
  const gasPrice = q(selectGasPrice);

  const findSwapPath = q(selectExpressFindSwapPath);

  if (
    !gasPaymentToken ||
    !relayerFeeToken ||
    !srcChainId ||
    !account ||
    !tokensData ||
    !marketsInfoData ||
    gasPrice === undefined
  ) {
    return undefined;
  }

  const baseRelayerFeeAmount = convertToTokenAmount(
    // -2 decimals
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
    findFeeSwapPath: findSwapPath,

    transactionExternalCalls: EMPTY_EXTERNAL_CALLS,
    feeExternalSwapQuote: undefined,
  });

  if (baseRelayFeeSwapParams === undefined) {
    return undefined;
  }

  const preparedRelayParamsPayload = getRawRelayerParams({
    chainId,
    gasPaymentTokenAddress: baseRelayFeeSwapParams.gasPaymentParams.gasPaymentTokenAddress,
    relayerFeeTokenAddress: baseRelayFeeSwapParams.gasPaymentParams.relayerFeeTokenAddress,
    feeParams: baseRelayFeeSwapParams.feeParams,
    externalCalls: EMPTY_EXTERNAL_CALLS,
    tokenPermits: [],
    marketsInfoData,
    isMultichain: srcChainId !== undefined,
  });

  return preparedRelayParamsPayload;
});

function useArbitraryRelayFee(
  {
    relayRouterAddress,
    getTxnData,
  }: {
    relayRouterAddress: string;
    getTxnData: PreparedGetTxnData | undefined;
  },
  dependencies: DependencyList
): {
  relayFeeAmount: bigint | undefined;
} {
  const chainId = useSelector(selectChainId);

  const account = useSelector(selectAccount);
  const { provider } = useJsonRpcProvider(chainId);

  const preparedRelayParamsPayload = useSelector(selectBasePreparedRelayParamsPayload);

  const queryCondition = account && provider && getTxnData !== undefined && preparedRelayParamsPayload;
  const { data: relayFeeAmount } = useSWR<bigint | undefined>(queryCondition && [chainId, account, ...dependencies], {
    fetcher: async (): Promise<bigint | undefined> => {
      if (!queryCondition) {
        return;
      }

      return estimateArbitraryRelayFee({
        chainId,
        relayRouterAddress,
        provider,
        account: account as Address,
        rawRelayParamsPayload: preparedRelayParamsPayload,
        getTxnData,
      });
    },
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
  });

  return {
    relayFeeAmount,
  };
}

const EMPTY_EXTERNAL_CALLS: ExternalCallsPayload = {
  sendTokens: [],
  sendAmounts: [],
  externalCallTargets: [],
  externalCallDataList: [],
  refundTokens: [],
  refundReceivers: [],
};

async function estimateArbitraryRelayFee({
  chainId,
  relayRouterAddress,
  provider,
  account,
  rawRelayParamsPayload,
  getTxnData,
}: {
  chainId: UiContractsChain;
  relayRouterAddress: string;
  provider: Provider;
  account: string;
  rawRelayParamsPayload: RawRelayParamsPayload | RawMultichainRelayParamsPayload;
  getTxnData: ({
    emptySignature,
    relayParamsPayload,
  }: {
    emptySignature: boolean;
    relayParamsPayload: RelayParamsPayload | MultichainRelayParamsPayload;
  }) => Promise<ExpressTxnData | undefined>;
}) {
  const userNonce = await getRelayRouterNonceForMultichain(provider, account, relayRouterAddress);

  const baseTxnData = await getTxnData({
    emptySignature: true,
    relayParamsPayload: {
      ...rawRelayParamsPayload,
      userNonce,
      deadline: BigInt(nowInSeconds() + DEFAULT_SUBACCOUNT_DEADLINE_DURATION),
    },
  });

  if (baseTxnData === undefined) {
    return;
  }

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

  const fee = await gelatoRelay.getEstimatedFee(BigInt(chainId), baseTxnData.feeToken as Address, gasLimit, false);

  return fee;
}

const selectArbitraryRelayParamsAndPayload = createSelector(function selectArbitraruRelayParamsAndPayload(q):
  | ((dynamicFees: { relayFeeAmount: bigint; additionalNetworkFee?: bigint }) => Partial<{
      relayFeeParams: {
        feeParams: RelayFeePayload;
        externalCalls: ExternalCallsPayload;
        feeExternalSwapGasLimit: bigint;
        gasPaymentParams: GasPaymentParams;
      };
      relayParamsPayload: RawRelayParamsPayload | RawMultichainRelayParamsPayload;
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

  if (!account || !gasPaymentToken || !relayerFeeToken || !marketsInfoData) {
    return undefined;
  }

  return ({ relayFeeAmount, additionalNetworkFee }: { relayFeeAmount: bigint; additionalNetworkFee?: bigint }) => {
    if (relayFeeAmount === undefined) {
      return {
        relayFeeParams: undefined,
        relayParamsPayload: undefined,
        fetchRelayParamsPayload: undefined,
        gasPaymentValidations: undefined,
        subaccountValidations: undefined,
      };
    }

    const networkFee = relayFeeAmount + (additionalNetworkFee ?? 0n);

    const relayFeeParams = getRelayerFeeParams({
      chainId: chainId,
      account: account,

      gasPaymentToken,
      relayerFeeToken,
      relayerFeeAmount: relayFeeAmount,
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
      isMultichain: srcChainId !== undefined,
    });

    const fetchRelayParamsPayload = async (
      provider: Provider,
      relayRouterAddress: string
    ): Promise<RelayParamsPayload | MultichainRelayParamsPayload> => {
      const userNonce = await getRelayRouterNonceForMultichain(provider, account, relayRouterAddress);

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
  {
    relayRouterAddress,
    getTxnData,
    additionalNetworkFee,
    isSubaccountApplicable,
  }: {
    relayRouterAddress: string;
    getTxnData: PreparedGetTxnData | undefined;
    additionalNetworkFee?: bigint;
    isSubaccountApplicable?: boolean;
  },
  dependencies: DependencyList
): Partial<{
  relayFeeAmount: bigint;
  relayFeeParams: {
    feeParams: RelayFeePayload;
    externalCalls: ExternalCallsPayload;
    feeExternalSwapGasLimit: bigint;
    gasPaymentParams: GasPaymentParams;
  };
  relayParamsPayload: RawRelayParamsPayload | RawMultichainRelayParamsPayload;
  fetchLatestParamsPayload: (provider: Provider) => Promise<RelayParamsPayload | MultichainRelayParamsPayload>;
  gasPaymentValidations: GasPaymentValidations;
  subaccountValidations: SubaccountValidations;
}> {
  const { relayFeeAmount } = useArbitraryRelayFee({ relayRouterAddress, getTxnData }, dependencies);

  const getRelayParamsAndPayload = useSelector(selectArbitraryRelayParamsAndPayload);

  const relayParamsAndPayload = useMemo(() => {
    if (relayFeeAmount === undefined || !getRelayParamsAndPayload) {
      return undefined;
    }
    return getRelayParamsAndPayload({ relayFeeAmount, additionalNetworkFee });
  }, [additionalNetworkFee, getRelayParamsAndPayload, relayFeeAmount]);

  const internalFetchRelayParamsPayload = relayParamsAndPayload?.fetchRelayParamsPayload;

  const fetchLatestParamsPayload = useMemo(() => {
    if (!internalFetchRelayParamsPayload) {
      return undefined;
    }

    return (provider: Provider) => internalFetchRelayParamsPayload?.(provider, relayRouterAddress);
  }, [internalFetchRelayParamsPayload, relayRouterAddress]);

  return {
    relayFeeAmount,
    ...relayParamsAndPayload,
    fetchLatestParamsPayload,
    subaccountValidations: isSubaccountApplicable ? relayParamsAndPayload?.subaccountValidations : undefined,
  };
}
