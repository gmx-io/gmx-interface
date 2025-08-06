import { t } from "@lingui/macro";
import chunk from "lodash/chunk";
import { useCallback, useMemo, useState } from "react";
import { bytesToHex, Hex, hexToBytes, numberToHex, zeroAddress } from "viem";

import { ContractsChainId, SettlementChainId } from "config/chains";
import { getContract } from "config/contracts";
import { DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { CHAIN_ID_TO_ENDPOINT_ID } from "config/multichain";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectBlockTimestampData,
  selectChainId,
  selectSrcChainId,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useArbitraryRelayParamsAndPayload } from "domain/multichain/arbitraryRelayParams";
import { CodecUiHelper, GMX_DATA_ACTION_HASH, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { ExecutionFee } from "domain/synthetics/fees";
import {
  CreateDepositParamsStruct,
  createDepositTxn,
  CreateGlvDepositParamsStruct,
  createWithdrawalTxn,
  GlvInfo,
  MarketInfo,
} from "domain/synthetics/markets";
import { createGlvDepositTxn } from "domain/synthetics/markets/createGlvDepositTxn";
import { createGlvWithdrawalTxn } from "domain/synthetics/markets/createGlvWithdrawalTxn";
import {
  buildAndSignMultichainDepositTxn,
  createMultichainDepositTxn,
} from "domain/synthetics/markets/createMultichainDepositTxn";
import {
  buildAndSignMultichainGlvDepositTxn,
  createMultichainGlvDepositTxn,
} from "domain/synthetics/markets/createMultichainGlvDepositTxn";
import { TokenData, TokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import {
  initGLVSwapMetricData,
  initGMSwapMetricData,
  makeTxnErrorMetricsHandler,
  makeTxnSentMetricsHandler,
  sendOrderSubmittedMetric,
  sendTxnValidationErrorMetric,
} from "lib/metrics";
import { EMPTY_ARRAY } from "lib/objects";
import { makeUserAnalyticsOrderFailResultHandler, sendUserAnalyticsOrderConfirmClickEvent } from "lib/userAnalytics";
import useWallet from "lib/wallets/useWallet";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { convertTokenAddress, getWrappedToken } from "sdk/configs/tokens";
import { nowInSeconds } from "sdk/utils/time";
import { applySlippageToMinOut } from "sdk/utils/trade";
import { IRelayUtils } from "typechain-types/MultichainGmRouter";

import { createSourceChainDepositTxn } from "../../../../../domain/synthetics/markets/createSourceChainDepositTxn";
import { Operation } from "../types";
import type { GmOrGlvPaySource } from "./types";

interface Props {
  marketInfo?: MarketInfo;
  glvInfo?: GlvInfo;
  marketToken: TokenData | undefined;
  operation: Operation;
  longTokenAddress: string | undefined;
  shortTokenAddress: string | undefined;

  marketTokenAmount: bigint | undefined;
  marketTokenUsd: bigint | undefined;
  longTokenAmount: bigint | undefined;
  shortTokenAmount: bigint | undefined;

  glvTokenAmount: bigint | undefined;
  glvTokenUsd: bigint | undefined;

  shouldDisableValidation?: boolean;

  tokensData: TokensData | undefined;
  executionFee: ExecutionFee | undefined;
  selectedMarketForGlv?: string;
  selectedMarketInfoForGlv?: MarketInfo;
  isMarketTokenDeposit?: boolean;
  isFirstBuy: boolean;
  paySource: GmOrGlvPaySource;
}

function getTransferRequests({
  chainId,
  longTokenAddress,
  longTokenAmount,
  shortTokenAddress,
  shortTokenAmount,
  feeTokenAmount,
  isGlv,
}: {
  chainId: ContractsChainId;
  longTokenAddress: string | undefined;
  longTokenAmount: bigint | undefined;
  shortTokenAddress: string | undefined;
  shortTokenAmount: bigint | undefined;
  feeTokenAmount: bigint | undefined;
  isGlv: boolean;
}): IRelayUtils.TransferRequestsStruct {
  const requests: IRelayUtils.TransferRequestsStruct = {
    tokens: [],
    receivers: [],
    amounts: [],
  };

  const vaultAddress = isGlv ? getContract(chainId, "GlvVault") : getContract(chainId, "DepositVault");
  const routerAddress = isGlv
    ? getContract(chainId, "MultichainGlvRouter")
    : getContract(chainId, "MultichainGmRouter");

  if (longTokenAddress && longTokenAmount !== undefined && longTokenAmount > 0n) {
    requests.tokens.push(longTokenAddress);
    requests.receivers.push(vaultAddress);
    requests.amounts.push(longTokenAmount);
  }

  if (shortTokenAddress && shortTokenAmount !== undefined && shortTokenAmount > 0n) {
    requests.tokens.push(shortTokenAddress);
    requests.receivers.push(vaultAddress);
    requests.amounts.push(shortTokenAmount);
  }

  if (feeTokenAmount !== undefined && feeTokenAmount > 0n) {
    requests.tokens.push(getWrappedToken(chainId).address);
    requests.receivers.push(routerAddress);
    requests.amounts.push(feeTokenAmount);
  }

  return requests;
}

function useMultichainDepositExpressTxnParams({
  transferRequests,
  paySource,
  gmParams,
  glvParams,
}: {
  transferRequests: IRelayUtils.TransferRequestsStruct;
  paySource: GmOrGlvPaySource;
  gmParams: CreateDepositParamsStruct | undefined;
  glvParams: CreateGlvDepositParamsStruct | undefined;
}) {
  const { chainId, srcChainId } = useChainId();
  const { signer } = useWallet();

  const multichainDepositExpressTxnParams = useArbitraryRelayParamsAndPayload({
    isGmxAccount: srcChainId !== undefined,
    enabled: paySource !== "settlementChain",
    executionFeeAmount: glvParams ? glvParams.executionFee : gmParams?.executionFee,
    expressTransactionBuilder: async ({ relayParams, gasPaymentParams }) => {
      if ((!gmParams && !glvParams) || !srcChainId || !signer) {
        throw new Error("Invalid params");
      }

      if (glvParams) {
        const txnData = await buildAndSignMultichainGlvDepositTxn({
          emptySignature: true,
          account: glvParams!.addresses.receiver,
          chainId,
          params: glvParams!,
          srcChainId,
          relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
          relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
          relayParams: {
            ...relayParams,
            deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
          },
          signer,
          transferRequests,
        });

        return {
          txnData,
        };
      }

      const txnData = await buildAndSignMultichainDepositTxn({
        emptySignature: true,
        account: gmParams!.addresses.receiver,
        chainId,
        params: gmParams!,
        srcChainId,
        relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
        relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
        relayParams: {
          ...relayParams,
          deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
        },
        signer,
        transferRequests,
      });

      return {
        txnData,
      };
    },
  });

  return multichainDepositExpressTxnParams;
}

const useDepositTransactions = ({
  marketInfo,
  marketToken,
  longTokenAddress = marketInfo?.longTokenAddress,
  longTokenAmount,
  shortTokenAddress = marketInfo?.shortTokenAddress,
  shortTokenAmount,
  glvTokenAmount,
  glvTokenUsd,

  marketTokenAmount,
  marketTokenUsd,
  shouldDisableValidation,
  tokensData,
  executionFee,
  selectedMarketForGlv,
  selectedMarketInfoForGlv,
  glvInfo,
  isMarketTokenDeposit,
  isFirstBuy,
  paySource,
}: Props): {
  onCreateDeposit: () => Promise<void>;
} => {
  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const { signer, account } = useWallet();
  const { setPendingDeposit } = useSyntheticsEvents();
  const { setPendingTxns } = usePendingTxns();
  const blockTimestampData = useSelector(selectBlockTimestampData);
  const globalExpressParams = useSelector(selectExpressGlobalParams);

  const marketTokenAddress = marketToken?.address || marketInfo?.marketTokenAddress;
  const executionFeeTokenAmount = executionFee?.feeTokenAmount;

  const shouldUnwrapNativeToken =
    (longTokenAddress === zeroAddress && longTokenAmount !== undefined && longTokenAmount > 0n) ||
    (shortTokenAddress === zeroAddress && shortTokenAmount !== undefined && shortTokenAmount > 0n);

  const initialLongTokenAddress = longTokenAddress
    ? convertTokenAddress(chainId, longTokenAddress, "wrapped")
    : undefined;
  const initialShortTokenAddress =
    shortTokenAddress && initialLongTokenAddress
      ? convertTokenAddress(
          chainId,
          marketInfo?.isSameCollaterals ? initialLongTokenAddress : shortTokenAddress,
          "wrapped"
        )
      : undefined;

  const isGlv = glvInfo !== undefined && selectedMarketForGlv !== undefined;

  const transferRequests = useMemo((): IRelayUtils.TransferRequestsStruct => {
    return getTransferRequests({
      chainId,
      longTokenAddress: initialLongTokenAddress,
      longTokenAmount,
      shortTokenAddress: initialShortTokenAddress,
      shortTokenAmount,
      feeTokenAmount: 0n, // executionFeeTokenAmount,
      isGlv,
    });
  }, [chainId, initialLongTokenAddress, initialShortTokenAddress, isGlv, longTokenAmount, shortTokenAmount]);

  const gmParams = useMemo((): CreateDepositParamsStruct | undefined => {
    if (
      !account ||
      !marketTokenAddress ||
      marketTokenAmount === undefined ||
      executionFeeTokenAmount === undefined ||
      isGlv ||
      !initialLongTokenAddress ||
      !initialShortTokenAddress
    ) {
      return undefined;
    }

    const minMarketTokens = applySlippageToMinOut(DEFAULT_SLIPPAGE_AMOUNT, marketTokenAmount);

    let dataList: string[] = EMPTY_ARRAY;

    if (paySource === "sourceChain") {
      const actionHash = CodecUiHelper.encodeMultichainActionData({
        actionType: MultichainActionType.BridgeOut,
        actionData: {
          deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
          desChainId: chainId,
          minAmountOut: minMarketTokens / 2n,
          provider: "0xe4ebcac4a2e6cbee385ee407f7d5e278bc07e11e",
          providerData: numberToHex(CHAIN_ID_TO_ENDPOINT_ID[srcChainId!], { size: 32 }),
        },
      });
      const bytes = hexToBytes(actionHash as Hex);

      const bytes32array = chunk(bytes, 32).map((b) => bytesToHex(Uint8Array.from(b)));

      dataList = [GMX_DATA_ACTION_HASH, ...bytes32array];
    }

    const params: CreateDepositParamsStruct = {
      addresses: {
        receiver: account,
        callbackContract: zeroAddress,
        uiFeeReceiver: zeroAddress,
        market: marketTokenAddress,
        initialLongToken: initialLongTokenAddress,
        initialShortToken: initialShortTokenAddress,
        longTokenSwapPath: [],
        shortTokenSwapPath: [],
      },
      minMarketTokens,
      shouldUnwrapNativeToken: false,
      executionFee: executionFeeTokenAmount,
      callbackGasLimit: 0n,
      dataList,
    };

    return params;
  }, [
    account,
    chainId,
    executionFeeTokenAmount,
    initialLongTokenAddress,
    initialShortTokenAddress,
    isGlv,
    marketTokenAddress,
    marketTokenAmount,
    paySource,
    srcChainId,
  ]);

  const glvParams = useMemo((): CreateGlvDepositParamsStruct | undefined => {
    if (
      !account ||
      !marketInfo ||
      marketTokenAmount === undefined ||
      executionFeeTokenAmount === undefined ||
      !isGlv ||
      glvTokenAmount === undefined ||
      !initialLongTokenAddress ||
      !initialShortTokenAddress
    ) {
      return undefined;
    }

    const minGlvTokens = applySlippageToMinOut(DEFAULT_SLIPPAGE_AMOUNT, glvTokenAmount);
    const params: CreateGlvDepositParamsStruct = {
      addresses: {
        glv: glvInfo!.glvTokenAddress,
        market: selectedMarketForGlv!,
        receiver: glvInfo!.glvToken.totalSupply === 0n ? numberToHex(1, { size: 20 }) : account,
        callbackContract: zeroAddress,
        uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? zeroAddress,
        initialLongToken: isMarketTokenDeposit ? zeroAddress : initialLongTokenAddress,
        initialShortToken: isMarketTokenDeposit ? zeroAddress : initialShortTokenAddress,
        longTokenSwapPath: [],
        shortTokenSwapPath: [],
      },
      minGlvTokens,
      executionFee: executionFeeTokenAmount,
      callbackGasLimit: 0n,
      shouldUnwrapNativeToken,
      isMarketTokenDeposit: Boolean(isMarketTokenDeposit),
      dataList: [],
    };

    // console.log({
    //   params,
    //   transferRequests,
    // });

    return params;
  }, [
    account,
    executionFeeTokenAmount,
    glvInfo,
    glvTokenAmount,
    initialLongTokenAddress,
    initialShortTokenAddress,
    isGlv,
    isMarketTokenDeposit,
    marketInfo,
    marketTokenAmount,
    selectedMarketForGlv,
    shouldUnwrapNativeToken,
  ]);

  const multichainDepositExpressTxnParams = useMultichainDepositExpressTxnParams({
    transferRequests,
    paySource,
    gmParams,
    glvParams,
  });

  const getDepositMetricData = useCallback(() => {
    if (isGlv) {
      return initGLVSwapMetricData({
        chainId,
        longTokenAddress,
        shortTokenAddress,
        selectedMarketForGlv,
        isDeposit: true,
        executionFee,
        glvAddress: glvInfo!.glvTokenAddress,
        glvToken: glvInfo!.glvToken,
        longTokenAmount,
        shortTokenAmount,
        marketTokenAmount,
        glvTokenAmount,
        marketName: selectedMarketInfoForGlv?.name,
        glvTokenUsd: glvTokenUsd,
        isFirstBuy,
      });
    }

    return initGMSwapMetricData({
      chainId,
      longTokenAddress,
      shortTokenAddress,
      marketToken,
      isDeposit: true,
      executionFee,
      marketInfo,
      longTokenAmount,
      shortTokenAmount,
      marketTokenAmount,
      marketTokenUsd,
      isFirstBuy,
    });
  }, [
    chainId,
    executionFee,
    glvInfo,
    glvTokenAmount,
    glvTokenUsd,
    isFirstBuy,
    isGlv,
    longTokenAddress,
    longTokenAmount,
    marketInfo,
    marketToken,
    marketTokenAmount,
    marketTokenUsd,
    selectedMarketForGlv,
    selectedMarketInfoForGlv?.name,
    shortTokenAddress,
    shortTokenAmount,
  ]);

  const onCreateGmDeposit = useCallback(
    function onCreateGmDeposit() {
      const metricData = getDepositMetricData();

      sendOrderSubmittedMetric(metricData.metricId);

      if (!executionFee || !tokensData || !account || !signer || !gmParams) {
        helperToast.error(t`Error submitting order`);
        sendTxnValidationErrorMetric(metricData.metricId);
        return Promise.resolve();
      }

      sendUserAnalyticsOrderConfirmClickEvent(chainId, metricData.metricId);

      let promise: Promise<void>;

      if (paySource === "sourceChain") {
        if (longTokenAmount! > 0n && shortTokenAmount! > 0n) {
          throw new Error("Pay source sourceChain does not support both long and short token deposits");
        }

        const tokenAddress = longTokenAmount! > 0n ? longTokenAddress! : shortTokenAddress!;
        const tokenAmount = longTokenAmount! > 0n ? longTokenAmount! : shortTokenAmount!;

        promise = createSourceChainDepositTxn({
          chainId: chainId as SettlementChainId,
          globalExpressParams: globalExpressParams!,
          srcChainId: srcChainId!,
          signer,
          transferRequests,
          params: gmParams!,
          account,
          tokenAddress,
          tokenAmount,
          executionFee: executionFee.feeTokenAmount,
        });
      } else if (paySource === "gmxAccount" && srcChainId !== undefined) {
        promise = createMultichainDepositTxn({
          chainId,
          srcChainId,
          signer,
          transferRequests,
          asyncExpressTxnResult: multichainDepositExpressTxnParams,
          params: gmParams!,
        });
      } else if (paySource === "settlementChain") {
        promise = createDepositTxn({
          chainId,
          signer,
          blockTimestampData,
          longTokenAmount: longTokenAmount ?? 0n,
          shortTokenAmount: shortTokenAmount ?? 0n,
          executionFee: executionFee.feeTokenAmount,
          executionGasLimit: executionFee.gasLimit,
          skipSimulation: shouldDisableValidation,
          tokensData,
          metricId: metricData.metricId,
          params: gmParams!,
          setPendingTxns,
          setPendingDeposit,
        });
      } else {
        throw new Error(`Invalid pay source: ${paySource}`);
      }

      return promise
        .then(makeTxnSentMetricsHandler(metricData.metricId))
        .catch(makeTxnErrorMetricsHandler(metricData.metricId))
        .catch(makeUserAnalyticsOrderFailResultHandler(chainId, metricData.metricId));
    },
    [
      account,
      blockTimestampData,
      chainId,
      executionFee,
      getDepositMetricData,
      globalExpressParams,
      gmParams,
      longTokenAddress,
      longTokenAmount,
      multichainDepositExpressTxnParams,
      paySource,
      setPendingDeposit,
      setPendingTxns,
      shortTokenAddress,
      shortTokenAmount,
      shouldDisableValidation,
      signer,
      srcChainId,
      tokensData,
      transferRequests,
    ]
  );

  const onCreateGlvDeposit = useCallback(
    function onCreateGlvDeposit() {
      const metricData = getDepositMetricData();

      sendOrderSubmittedMetric(metricData.metricId);

      if (
        !account ||
        !executionFee ||
        !marketToken ||
        !marketInfo ||
        marketTokenAmount === undefined ||
        !tokensData ||
        !signer ||
        (isGlv && !glvParams)
      ) {
        helperToast.error(t`Error submitting order`);
        sendTxnValidationErrorMetric(metricData.metricId);
        return Promise.resolve();
      }

      sendUserAnalyticsOrderConfirmClickEvent(chainId, metricData.metricId);

      if (srcChainId !== undefined) {
        return createMultichainGlvDepositTxn({
          chainId,
          srcChainId,
          signer,
          transferRequests,
          asyncExpressTxnResult: multichainDepositExpressTxnParams,
          params: glvParams!,
        });
      }

      return createGlvDepositTxn({
        chainId,
        signer,
        params: glvParams!,
        longTokenAddress: longTokenAddress!,
        shortTokenAddress: shortTokenAddress!,
        longTokenAmount: longTokenAmount ?? 0n,
        shortTokenAmount: shortTokenAmount ?? 0n,
        marketTokenAmount: marketTokenAmount ?? 0n,
        executionFee: executionFee.feeTokenAmount,
        executionGasLimit: executionFee.gasLimit,
        skipSimulation: shouldDisableValidation,
        tokensData,
        blockTimestampData,
        setPendingTxns,
        setPendingDeposit,
      })
        .then(makeTxnSentMetricsHandler(metricData.metricId))
        .catch(makeTxnErrorMetricsHandler(metricData.metricId))
        .catch(makeUserAnalyticsOrderFailResultHandler(chainId, metricData.metricId));
    },
    [
      account,
      blockTimestampData,
      chainId,
      executionFee,
      getDepositMetricData,
      glvParams,
      isGlv,
      longTokenAddress,
      longTokenAmount,
      marketInfo,
      marketToken,
      marketTokenAmount,
      multichainDepositExpressTxnParams,
      setPendingDeposit,
      setPendingTxns,
      shortTokenAddress,
      shortTokenAmount,
      shouldDisableValidation,
      signer,
      srcChainId,
      tokensData,
      transferRequests,
    ]
  );

  const onCreateDeposit = isGlv ? onCreateGlvDeposit : onCreateGmDeposit;

  return {
    onCreateDeposit,
  };
};

export const useDepositWithdrawalTransactions = (
  props: Props
): {
  onSubmit: () => void;
  isSubmitting: boolean;
} => {
  const {
    marketInfo,
    marketToken,
    operation,
    longTokenAddress,
    longTokenAmount,
    shortTokenAddress,
    shortTokenAmount,
    glvTokenAmount,
    glvTokenUsd,

    marketTokenAmount,
    marketTokenUsd,
    shouldDisableValidation,
    tokensData,
    executionFee,
    selectedMarketForGlv,
    selectedMarketInfoForGlv,
    glvInfo,
    isFirstBuy,
  } = props;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const chainId = useSelector(selectChainId);
  const { signer, account } = useWallet();
  const { setPendingWithdrawal } = useSyntheticsEvents();
  const { setPendingTxns } = usePendingTxns();
  const blockTimestampData = useSelector(selectBlockTimestampData);

  const { onCreateDeposit } = useDepositTransactions(props);

  const onCreateWithdrawal = useCallback(
    function onCreateWithdrawal() {
      const metricData =
        glvInfo && selectedMarketForGlv
          ? initGLVSwapMetricData({
              chainId,
              longTokenAddress,
              shortTokenAddress,
              selectedMarketForGlv,
              isDeposit: false,
              executionFee,
              glvAddress: glvInfo.glvTokenAddress,
              glvToken: glvInfo.glvToken,
              longTokenAmount,
              shortTokenAmount,
              marketTokenAmount,
              glvTokenAmount,
              marketName: selectedMarketInfoForGlv?.name,
              glvTokenUsd,
              isFirstBuy,
            })
          : initGMSwapMetricData({
              chainId,
              longTokenAddress,
              shortTokenAddress,
              marketToken,
              isDeposit: false,
              executionFee,
              marketInfo,
              longTokenAmount,
              shortTokenAmount,
              marketTokenAmount,
              marketTokenUsd,
              isFirstBuy,
            });

      if (
        !account ||
        !marketInfo ||
        !marketToken ||
        !executionFee ||
        longTokenAmount === undefined ||
        shortTokenAmount === undefined ||
        !tokensData ||
        !signer
      ) {
        helperToast.error(t`Error submitting order`);
        sendTxnValidationErrorMetric(metricData.metricId);
        return Promise.resolve();
      }

      if (glvInfo && selectedMarketForGlv) {
        return createGlvWithdrawalTxn(chainId, signer, {
          account,
          initialLongTokenAddress: longTokenAddress || marketInfo.longTokenAddress,
          initialShortTokenAddress: shortTokenAddress || marketInfo.shortTokenAddress,
          longTokenSwapPath: [],
          shortTokenSwapPath: [],
          glvTokenAddress: glvInfo.glvTokenAddress,
          glvTokenAmount: glvTokenAmount!,
          minLongTokenAmount: longTokenAmount,
          minShortTokenAmount: shortTokenAmount,
          executionFee: executionFee.feeTokenAmount,
          executionGasLimit: executionFee.gasLimit,
          allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
          skipSimulation: shouldDisableValidation,
          tokensData,
          setPendingTxns,
          setPendingWithdrawal,
          selectedGmMarket: selectedMarketForGlv,
          glv: glvInfo.glvTokenAddress,
          blockTimestampData,
        })
          .then(makeTxnSentMetricsHandler(metricData.metricId))
          .catch(makeTxnErrorMetricsHandler(metricData.metricId));
      }

      return createWithdrawalTxn(chainId, signer, {
        account,
        initialLongTokenAddress: longTokenAddress || marketInfo.longTokenAddress,
        initialShortTokenAddress: shortTokenAddress || marketInfo.shortTokenAddress,
        longTokenSwapPath: [],
        shortTokenSwapPath: [],
        marketTokenAmount: marketTokenAmount!,
        minLongTokenAmount: longTokenAmount,
        minShortTokenAmount: shortTokenAmount,
        marketTokenAddress: marketToken.address,
        executionFee: executionFee.feeTokenAmount,
        executionGasLimit: executionFee.gasLimit,
        allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
        tokensData,
        skipSimulation: shouldDisableValidation,
        setPendingTxns,
        setPendingWithdrawal,
        blockTimestampData,
      })
        .then(makeTxnSentMetricsHandler(metricData.metricId))
        .catch(makeTxnErrorMetricsHandler(metricData.metricId));
    },
    [
      glvInfo,
      selectedMarketForGlv,
      longTokenAddress,
      shortTokenAddress,
      executionFee,
      longTokenAmount,
      shortTokenAmount,
      marketTokenAmount,
      glvTokenAmount,
      selectedMarketInfoForGlv?.name,
      glvTokenUsd,
      isFirstBuy,
      marketToken,
      marketInfo,
      marketTokenUsd,
      account,
      tokensData,
      signer,
      chainId,
      shouldDisableValidation,
      setPendingTxns,
      setPendingWithdrawal,
      blockTimestampData,
    ]
  );

  const onSubmit = useCallback(() => {
    setIsSubmitting(true);

    let txnPromise: Promise<any>;

    if (operation === Operation.Deposit) {
      txnPromise = onCreateDeposit();
    } else if (operation === Operation.Withdrawal) {
      txnPromise = onCreateWithdrawal();
    } else {
      throw new Error("Invalid operation");
    }

    txnPromise
      .catch((error) => {
        throw error;
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [operation, onCreateDeposit, onCreateWithdrawal]);

  return {
    onSubmit,
    isSubmitting,
  };
};
