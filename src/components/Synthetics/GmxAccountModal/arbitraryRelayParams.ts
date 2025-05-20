import { Provider } from "ethers";
import { DependencyList, useMemo } from "react";
import useSWR from "swr";
import { Address, encodePacked, Hex } from "viem";

import { UiContractsChain } from "config/chains";
import { GMX_SIMULATION_ORIGIN } from "config/dataStore";
import { getSwapDebugSettings } from "config/externalSwaps";
import {
  selectGasPaymentToken,
  selectRelayerFeeToken,
} from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectAccount,
  selectChainId,
  selectGasPrice,
  selectMarketsInfoData,
  selectSrcChainId,
  selectSubaccountForAction,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectGasPaymentTokenAddress } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { makeSelectFindSwapPath } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { createSelector, useSelector } from "context/SyntheticsStateContext/utils";
import {
  GasPaymentValidations,
  getOracleParamsPayload,
  getOraclePriceParamsForRelayFee,
  getRelayerFeeParams,
  getRelayRouterNonceForMultichain,
  MultichainRelayParamsPayload,
  RelayerFeeParams,
} from "domain/synthetics/express";
import { GELATO_RELAY_ADDRESS } from "domain/synthetics/gassless/txns/expressOrderDebug";
import { getSubaccountValidations } from "domain/synthetics/subaccount";
import { SubaccountValidations } from "domain/synthetics/subaccount/types";
import { TokensData } from "domain/synthetics/tokens/types";
import { convertToTokenAmount } from "domain/tokens";
import { estimateGasLimit } from "lib/gas/estimateGasLimit";
import { expandDecimals, USD_DECIMALS } from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { ExpressTxnData } from "lib/transactions";
import {
  DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION,
  DEFAULT_SUBACCOUNT_DEADLINE_DURATION,
  getRelayerFeeToken,
} from "sdk/configs/express";
import { gelatoRelay } from "sdk/utils/gelatoRelay";
import { getByKey } from "sdk/utils/objects";
import { ExternalCallsPayload } from "sdk/utils/orderTransactions";
import { getSwapAmountsByToValue } from "sdk/utils/swap";
import { nowInSeconds } from "sdk/utils/time";

type PreparedGetTxnData = (opts: {
  emptySignature: boolean;
  relayParamsPayload: MultichainRelayParamsPayload;
}) => Promise<ExpressTxnData | undefined>;

type PreparedRelayParamsPayload = Omit<MultichainRelayParamsPayload, "userNonce" | "deadline">;

const selectRelayPaymentSwapPath = createSelector((q) => {
  const chainId = q(selectChainId);
  const gasPaymentTokenAddress = q(selectGasPaymentTokenAddress);
  const relayerFeeTokenAddress = getRelayerFeeToken(chainId).address;

  return q(makeSelectFindSwapPath(gasPaymentTokenAddress, relayerFeeTokenAddress));
});

const selectBasePreparedRelayParamsPayload = createSelector((q) => {
  const chainId = q(selectChainId);
  const srcChainId = q(selectSrcChainId);
  const account = q(selectAccount);
  const gasPaymentToken = q(selectGasPaymentToken);
  const relayerFeeToken = q(selectRelayerFeeToken);
  const tokensData = q(selectTokensData);
  const marketsInfoData = q(selectMarketsInfoData);
  const gasPrice = q(selectGasPrice);

  const findSwapPath = q(selectRelayPaymentSwapPath);

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

  const externalCalls: ExternalCallsPayload = {
    sendTokens: [],
    sendAmounts: [],
    externalCallTargets: [],
    externalCallDataList: [],
    refundTokens: [],
    refundReceivers: [],
  };

  const baseRelayerFeeAmount = convertToTokenAmount(
    // -2
    expandDecimals(1, USD_DECIMALS),
    relayerFeeToken.decimals,
    relayerFeeToken.prices.maxPrice
  )!;

  const swapAmounts = getSwapAmountsByToValue({
    tokenIn: gasPaymentToken,
    tokenOut: relayerFeeToken,
    amountOut: baseRelayerFeeAmount,
    isLimit: false,
    findSwapPath,
    uiFeeFactor: 0n,
  });

  const baseRelayFeeSwapParams = getRelayerFeeParams({
    chainId: chainId,
    account: account,
    relayerFeeTokenAmount: baseRelayerFeeAmount,
    totalNetworkFeeAmount: baseRelayerFeeAmount,
    relayerFeeTokenAddress: relayerFeeToken.address,
    gasPaymentTokenAddress: gasPaymentToken.address,
    internalSwapAmounts: swapAmounts,
    feeExternalSwapQuote: undefined,
    tokenPermits: [],
    batchExternalCalls: externalCalls,
    tokensData,
    forceExternalSwaps: getSwapDebugSettings()?.forceExternalSwaps ?? false,
    gasPrice,
    l1GasLimit: 0n,
    relayerGasLimit: 0n,
  });

  if (baseRelayFeeSwapParams === undefined) {
    return undefined;
  }

  const preparedRelayParamsPayload: PreparedRelayParamsPayload = {
    oracleParams: getOracleParamsPayload(
      getOraclePriceParamsForRelayFee({
        chainId: chainId,
        marketsInfoData,
        tokensData,
        relayFeeParams: baseRelayFeeSwapParams,
      })
    ),
    tokenPermits: [],
    externalCalls,
    fee: {
      feeToken: baseRelayFeeSwapParams.gasPaymentTokenAddress,
      feeAmount: baseRelayFeeSwapParams.totalNetworkFeeAmount,
      feeSwapPath: [],
    },
    desChainId: BigInt(chainId),
  };

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
) {
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
        preparedRelayParamsPayload,
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
  preparedRelayParamsPayload,
  getTxnData,
}: {
  chainId: UiContractsChain;
  relayRouterAddress: string;
  provider: Provider;
  account: string;
  preparedRelayParamsPayload: PreparedRelayParamsPayload;
  getTxnData: ({
    emptySignature,
    relayParamsPayload,
  }: {
    emptySignature: boolean;
    relayParamsPayload: MultichainRelayParamsPayload;
  }) => Promise<ExpressTxnData | undefined>;
}) {
  const userNonce = await getRelayRouterNonceForMultichain(provider, account, relayRouterAddress);

  const baseTxnData = await getTxnData({
    emptySignature: true,
    relayParamsPayload: {
      ...preparedRelayParamsPayload,
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

function getGasPaymentArbitraryValidations({
  tokensData,
  relayFeeParams,
}: {
  tokensData: TokensData;
  relayFeeParams: RelayerFeeParams;
}): GasPaymentValidations {
  const gasPaymentToken = getByKey(tokensData, relayFeeParams.gasPaymentTokenAddress);
  const gasPaymentTokenAmount = relayFeeParams.gasPaymentTokenAmount;

  const isOutGasTokenBalance =
    gasPaymentToken?.balance === undefined || gasPaymentTokenAmount > gasPaymentToken.balance;

  return {
    isOutGasTokenBalance,
    needGasPaymentTokenApproval: false,
    isValid: !isOutGasTokenBalance,
  };
}

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
): {
  relayFeeAmount: bigint | undefined;
  relayFeeParams: RelayerFeeParams | undefined;
  relayParamsPayload: PreparedRelayParamsPayload | undefined;
  fetchParamsPayload: (() => Promise<MultichainRelayParamsPayload>) | undefined;
  gasPaymentValidations: GasPaymentValidations | undefined;
  subaccountValidations: SubaccountValidations | undefined;
} {
  const chainId = useSelector(selectChainId);
  const account = useSelector(selectAccount);
  const tokensData = useSelector(selectTokensData);
  const gasPrice = useSelector(selectGasPrice);
  const relayerFeeToken = useSelector(selectRelayerFeeToken);
  const gasPaymentToken = useSelector(selectGasPaymentToken);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const { provider } = useJsonRpcProvider(chainId);
  const subaccount = useSelector(selectSubaccountForAction);

  const selectFindSwapPath = useMemo(() => {
    return makeSelectFindSwapPath(gasPaymentToken?.address, relayerFeeToken?.address);
  }, [gasPaymentToken?.address, relayerFeeToken?.address]);
  const findSwapPath = useSelector(selectFindSwapPath);

  const { relayFeeAmount } = useArbitraryRelayFee({ relayRouterAddress, getTxnData }, dependencies);

  if (
    !account ||
    relayFeeAmount === undefined ||
    !tokensData ||
    gasPrice === undefined ||
    !gasPaymentToken ||
    !relayerFeeToken ||
    !marketsInfoData ||
    provider === undefined
  ) {
    return {
      relayFeeAmount,
      relayFeeParams: undefined,
      relayParamsPayload: undefined,
      fetchParamsPayload: undefined,
      gasPaymentValidations: undefined,
      subaccountValidations: undefined,
    };
  }

  const networkFee = relayFeeAmount + (additionalNetworkFee ?? 0n);

  const finalSwapAmounts = getSwapAmountsByToValue({
    tokenIn: gasPaymentToken,
    tokenOut: relayerFeeToken,
    amountOut: networkFee,
    isLimit: false,
    findSwapPath,
    uiFeeFactor: 0n,
  });

  const relayFeeParams = getRelayerFeeParams({
    chainId: chainId,
    account: account,
    relayerFeeTokenAmount: relayFeeAmount,
    totalNetworkFeeAmount: networkFee,
    relayerFeeTokenAddress: relayerFeeToken.address,
    gasPaymentTokenAddress: gasPaymentToken.address,
    internalSwapAmounts: finalSwapAmounts,
    feeExternalSwapQuote: undefined,
    tokenPermits: [],
    batchExternalCalls: {
      sendTokens: [],
      sendAmounts: [],
      externalCallTargets: [],
      externalCallDataList: [],
      refundTokens: [],
      refundReceivers: [],
    },
    tokensData,
    forceExternalSwaps: getSwapDebugSettings()?.forceExternalSwaps ?? false,
    gasPrice,
    l1GasLimit: 0n,
    relayerGasLimit: 0n,
  });

  if (relayFeeParams === undefined) {
    return {
      relayFeeAmount,
      relayFeeParams: undefined,
      relayParamsPayload: undefined,
      fetchParamsPayload: undefined,
      gasPaymentValidations: undefined,
      subaccountValidations: undefined,
    };
  }

  const relayParamsPayload: PreparedRelayParamsPayload = {
    oracleParams: getOracleParamsPayload(
      getOraclePriceParamsForRelayFee({
        chainId: chainId,
        marketsInfoData,
        tokensData,
        relayFeeParams,
      })
    ),
    tokenPermits: [],
    externalCalls: EMPTY_EXTERNAL_CALLS,
    fee: {
      feeToken: relayFeeParams.gasPaymentTokenAddress,
      feeAmount: relayFeeParams.totalNetworkFeeAmount,
      feeSwapPath: [],
    },
    desChainId: BigInt(chainId),
  };

  const fetchParamsPayload = async () => {
    const userNonce = await getRelayRouterNonceForMultichain(provider, account, relayRouterAddress);

    return {
      ...relayParamsPayload,
      userNonce,
      deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
    };
  };

  const gasPaymentValidations = getGasPaymentArbitraryValidations({
    tokensData,
    relayFeeParams,
  });

  const subaccountValidations =
    subaccount && isSubaccountApplicable
      ? getSubaccountValidations({
          requiredActions: 1,
          subaccount,
        })
      : undefined;

  return {
    relayFeeAmount,
    relayFeeParams,
    relayParamsPayload,
    fetchParamsPayload,
    gasPaymentValidations,
    subaccountValidations,
  };
}
