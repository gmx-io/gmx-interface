import { t } from "@lingui/macro";
import chunk from "lodash/chunk";
import { useCallback, useMemo } from "react";
import { Hex, bytesToHex, hexToBytes, numberToHex, zeroAddress } from "viem";

import { SettlementChainId } from "config/chains";
import { DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { CHAIN_ID_TO_ENDPOINT_ID, getMultichainTokenId } from "config/multichain";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectBlockTimestampData,
  selectChainId,
  selectSrcChainId,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { makeSelectFindSwapPath } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { CodecUiHelper, GMX_DATA_ACTION_HASH, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { getTransferRequests } from "domain/multichain/getTransferRequests";
import { TransferRequests } from "domain/multichain/types";
import { CreateDepositParamsStruct, CreateGlvDepositParamsStruct, createDepositTxn } from "domain/synthetics/markets";
import { createGlvDepositTxn } from "domain/synthetics/markets/createGlvDepositTxn";
import { createMultichainDepositTxn } from "domain/synthetics/markets/createMultichainDepositTxn";
import { createMultichainGlvDepositTxn } from "domain/synthetics/markets/createMultichainGlvDepositTxn";
import { createSourceChainDepositTxn } from "domain/synthetics/markets/createSourceChainDepositTxn";
import { createSourceChainGlvDepositTxn } from "domain/synthetics/markets/createSourceChainGlvDepositTxn";
import { convertToTokenAmount, getMidPrice, getTokenData } from "domain/tokens";
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
import { getContract } from "sdk/configs/contracts";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { convertTokenAddress } from "sdk/configs/tokens";
import { nowInSeconds } from "sdk/utils/time";
import { applySlippageToMinOut } from "sdk/utils/trade";

import type { UseLpTransactionProps } from "./useLpTransactions";
import { useMultichainDepositExpressTxnParams } from "./useMultichainDepositExpressTxnParams";

export const useDepositTransactions = ({
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
}: UseLpTransactionProps): {
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

  const transferRequests = useMemo((): TransferRequests => {
    const vaultAddress = isGlv ? getContract(chainId, "GlvVault") : getContract(chainId, "DepositVault");
    return getTransferRequests([
      {
        to: vaultAddress,
        token: initialLongTokenAddress,
        amount: longTokenAmount,
      },
      {
        to: vaultAddress,
        token: initialShortTokenAddress,
        amount: shortTokenAmount,
      },
    ]);
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
      if (!srcChainId) {
        return undefined;
      }

      const actionHash = CodecUiHelper.encodeMultichainActionData({
        actionType: MultichainActionType.BridgeOut,
        actionData: {
          deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
          desChainId: chainId,
          provider: getMultichainTokenId(chainId, marketTokenAddress)!.stargate,
          providerData: numberToHex(CHAIN_ID_TO_ENDPOINT_ID[srcChainId], { size: 32 }),
          minAmountOut: minMarketTokens,
          secondaryProvider: zeroAddress,
          secondaryProviderData: zeroAddress,
          secondaryMinAmountOut: 0n,
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
        uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? zeroAddress,
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

    let dataList: string[] = EMPTY_ARRAY;
    if (paySource === "sourceChain") {
      if (!srcChainId) {
        return undefined;
      }

      const tokenId = getMultichainTokenId(chainId, glvInfo!.glvTokenAddress);
      if (!tokenId) {
        return undefined;
      }

      const actionHash = CodecUiHelper.encodeMultichainActionData({
        actionType: MultichainActionType.BridgeOut,
        actionData: {
          deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
          desChainId: chainId,
          minAmountOut: minGlvTokens,
          provider: tokenId.stargate,
          providerData: numberToHex(CHAIN_ID_TO_ENDPOINT_ID[srcChainId], { size: 32 }),
          secondaryProvider: zeroAddress,
          secondaryProviderData: zeroAddress,
          secondaryMinAmountOut: 0n,
        },
      });
      const bytes = hexToBytes(actionHash as Hex);

      const bytes32array = chunk(bytes, 32).map((b) => bytesToHex(Uint8Array.from(b)));

      dataList = [GMX_DATA_ACTION_HASH, ...bytes32array];
    }

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
      dataList,
    };

    return params;
  }, [
    account,
    chainId,
    executionFeeTokenAmount,
    glvInfo,
    glvTokenAmount,
    initialLongTokenAddress,
    initialShortTokenAddress,
    isGlv,
    isMarketTokenDeposit,
    marketInfo,
    marketTokenAmount,
    paySource,
    selectedMarketForGlv,
    shouldUnwrapNativeToken,
    srcChainId,
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
    async function onCreateGmDeposit() {
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
      } else if (paySource === "gmxAccount") {
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

      return await promise
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

  // TODO MLTCH make it pretty
  const tokenAddress = longTokenAmount! > 0n ? longTokenAddress! : shortTokenAddress!;
  const wrappedTokenAddress = longTokenAmount! > 0n ? initialLongTokenAddress! : initialShortTokenAddress!;
  const tokenAmount = longTokenAmount! > 0n ? longTokenAmount! : shortTokenAmount!;

  const tokenData = getTokenData(tokensData, tokenAddress);

  const selectFindSwapPath = useMemo(
    () =>
      makeSelectFindSwapPath(
        wrappedTokenAddress,
        executionFee?.feeToken.address
          ? convertTokenAddress(chainId, executionFee.feeToken.address, "wrapped")
          : undefined
      ),
    [chainId, executionFee?.feeToken.address, wrappedTokenAddress]
  );
  const findSwapPath = useSelector(selectFindSwapPath);

  const onCreateGlvDeposit = useCallback(
    async function onCreateGlvDeposit() {
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

      let promise: Promise<void>;
      if (paySource === "sourceChain") {
        if (longTokenAmount! > 0n && shortTokenAmount! > 0n) {
          throw new Error("Pay source sourceChain does not support both long and short token deposits");
        }

        if (!tokenData) {
          throw new Error("Price not found");
        }

        const feeSwapPathStats = findSwapPath(executionFee.feeUsd);
        const feeSwapPath = feeSwapPathStats?.swapPath ?? [];

        const feeAmount =
          (convertToTokenAmount(executionFee.feeUsd, tokenData.decimals, getMidPrice(tokenData.prices))! * 11n) / 10n;

        promise = createSourceChainGlvDepositTxn({
          chainId: chainId as SettlementChainId,
          srcChainId: srcChainId!,
          signer,
          transferRequests,
          params: glvParams!,
          account,
          tokenAddress,
          tokenAmount,
          globalExpressParams: globalExpressParams!,
          relayFeePayload: {
            feeToken: wrappedTokenAddress,
            feeAmount,
            feeSwapPath,
          },
        });
      } else if (paySource === "gmxAccount") {
        const expressTxnParams = await multichainDepositExpressTxnParams.promise;
        if (!expressTxnParams) {
          throw new Error("Express txn params are not set");
        }

        promise = createMultichainGlvDepositTxn({
          chainId,
          srcChainId,
          signer,
          transferRequests,
          expressTxnParams,
          params: glvParams!,
        });
      } else if (paySource === "settlementChain") {
        promise = createGlvDepositTxn({
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
        });
      } else {
        throw new Error(`Invalid pay source: ${paySource}`);
      }

      return await promise
        .then(makeTxnSentMetricsHandler(metricData.metricId))
        .catch(makeTxnErrorMetricsHandler(metricData.metricId))
        .catch(makeUserAnalyticsOrderFailResultHandler(chainId, metricData.metricId));
    },
    [
      account,
      blockTimestampData,
      chainId,
      executionFee,
      findSwapPath,
      getDepositMetricData,
      globalExpressParams,
      glvParams,
      isGlv,
      longTokenAddress,
      longTokenAmount,
      marketInfo,
      marketToken,
      marketTokenAmount,
      multichainDepositExpressTxnParams.promise,
      paySource,
      setPendingDeposit,
      setPendingTxns,
      shortTokenAddress,
      shortTokenAmount,
      shouldDisableValidation,
      signer,
      srcChainId,
      tokenAddress,
      tokenAmount,
      tokenData,
      tokensData,
      transferRequests,
      wrappedTokenAddress,
    ]
  );

  const onCreateDeposit = isGlv ? onCreateGlvDeposit : onCreateGmDeposit;

  return {
    onCreateDeposit,
  };
};
