import { t } from "@lingui/macro";
import chunk from "lodash/chunk";
import { useCallback, useMemo } from "react";
import { bytesToHex, Hex, hexToBytes, numberToHex, zeroAddress } from "viem";

import { getLayerZeroEndpointId, getStargatePoolAddress, isSettlementChain } from "config/multichain";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import {
  selectPoolsDetailsGlvInfo,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsMarketInfo,
  selectPoolsDetailsMarketTokenData,
} from "context/PoolsDetailsContext/PoolsDetailsContext";
import { selectPoolsDetailsShortTokenAddress } from "context/PoolsDetailsContext/PoolsDetailsContext";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { selectBlockTimestampData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { CodecUiHelper, GMX_DATA_ACTION_HASH, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { getTransferRequests } from "domain/multichain/getTransferRequests";
import { TransferRequests } from "domain/multichain/types";
import {
  CreateGlvWithdrawalParams,
  CreateWithdrawalParams,
  createWithdrawalTxn,
  RawCreateGlvWithdrawalParams,
  RawCreateWithdrawalParams,
} from "domain/synthetics/markets";
import { createGlvWithdrawalTxn } from "domain/synthetics/markets/createGlvWithdrawalTxn";
import { createMultichainGlvWithdrawalTxn } from "domain/synthetics/markets/createMultichainGlvWithdrawalTxn";
import { createMultichainWithdrawalTxn } from "domain/synthetics/markets/createMultichainWithdrawalTxn";
import { createSourceChainGlvWithdrawalTxn } from "domain/synthetics/markets/createSourceChainGlvWithdrawalTxn";
import { createSourceChainWithdrawalTxn } from "domain/synthetics/markets/createSourceChainWithdrawalTxn";
import { SourceChainGlvWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvWithdrawalFees";
import { SourceChainWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainWithdrawalFees";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import {
  initGLVSwapMetricData,
  initGMSwapMetricData,
  makeTxnErrorMetricsHandler,
  makeTxnSentMetricsHandler,
  sendTxnValidationErrorMetric,
} from "lib/metrics";
import { EMPTY_ARRAY } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import { getContract } from "sdk/configs/contracts";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { convertTokenAddress, getWrappedToken } from "sdk/configs/tokens";
import { ExecutionFee } from "sdk/types/fees";
import { nowInSeconds } from "sdk/utils/time";

import type { UseLpTransactionProps } from "./useLpTransactions";
import { useMultichainWithdrawalExpressTxnParams } from "./useMultichainWithdrawalExpressTxnParams";

export const useWithdrawalTransactions = ({
  // glvInfo,
  selectedMarketForGlv,
  // longTokenAddress,
  // shortTokenAddress,
  longTokenAmount,
  longTokenSwapPath,
  shortTokenSwapPath,
  shortTokenAmount,
  marketTokenAmount,
  marketTokenUsd,
  glvTokenAmount,
  glvTokenUsd,
  isFirstBuy,
  paySource,
  technicalFees,
  selectedMarketInfoForGlv,
  // marketToken,
  tokensData,
  // marketInfo,
  shouldDisableValidation,
}: UseLpTransactionProps) => {
  const { chainId, srcChainId } = useChainId();
  const { signer, account } = useWallet();
  const { setPendingWithdrawal } = useSyntheticsEvents();
  const { setPendingTxns } = usePendingTxns();
  const blockTimestampData = useSelector(selectBlockTimestampData);
  const globalExpressParams = useSelector(selectExpressGlobalParams);
  const longTokenAddress = useSelector(selectPoolsDetailsLongTokenAddress);
  const shortTokenAddress = useSelector(selectPoolsDetailsShortTokenAddress);

  const glvInfo = useSelector(selectPoolsDetailsGlvInfo);
  const isGlv = glvInfo !== undefined && selectedMarketForGlv !== undefined;
  // const marketTokenAddress = useSelector(selectmarkettokenaddress);
  const marketInfo = useSelector(selectPoolsDetailsMarketInfo);
  const marketToken = useSelector(selectPoolsDetailsMarketTokenData);
  const marketTokenAddress = marketToken?.address;
  const glvTokenAddress = glvInfo?.glvTokenAddress;
  const glvTokenTotalSupply = glvInfo?.glvToken.totalSupply;
  // const executionFeeTokenAmount = (technicalFees as SourceChainWithdrawalFees)?.executionFee;
  const executionFeeTokenDecimals = getWrappedToken(chainId)!.decimals;
  // const initialLongTokenAddress = longTokenAddress
  //   ? convertTokenAddress(chainId, longTokenAddress, "wrapped")
  //   : undefined;
  // const initialShortTokenAddress =
  //   shortTokenAddress && initialLongTokenAddress
  //     ? convertTokenAddress(
  //         chainId,
  //         marketInfo?.isSameCollaterals ? initialLongTokenAddress : shortTokenAddress,
  //         "wrapped"
  //       )
  //     : undefined;

  const transferRequests = useMemo((): TransferRequests | undefined => {
    if (isGlv) {
      if (!glvTokenAddress) {
        return undefined;
      }
      return getTransferRequests([
        {
          to: getContract(chainId, "GlvVault"),
          token: glvTokenAddress,
          amount: glvTokenAmount,
        },
      ]);
    }

    if (!marketTokenAddress) {
      return undefined;
    }

    return getTransferRequests([
      {
        to: getContract(chainId, "WithdrawalVault"),
        token: marketTokenAddress,
        amount: marketTokenAmount,
      },
    ]);
  }, [chainId, glvTokenAddress, glvTokenAmount, isGlv, marketTokenAddress, marketTokenAmount]);

  // const { provider: settlementChainRpcProvider } = useJsonRpcProvider(chainId);

  const longTokenProviderTokenAddress = longTokenAddress;
  const shortTokenProviderTokenAddress = shortTokenAddress;
  const longOftProvider = longTokenProviderTokenAddress
    ? getStargatePoolAddress(chainId, convertTokenAddress(chainId, longTokenProviderTokenAddress, "native"))
    : undefined;
  const shortOftProvider = shortTokenProviderTokenAddress
    ? getStargatePoolAddress(chainId, convertTokenAddress(chainId, shortTokenProviderTokenAddress, "native"))
    : undefined;

  // const longTokenBaseSendParams = useMemo(() => {
  //   if (!srcChainId || !account) {
  //     return undefined;
  //   }

  //   if (longTokenAmount === undefined || longTokenAmount === 0n) {
  //     return undefined;
  //   }

  //   return getMultichainTransferSendParams({
  //     dstChainId: srcChainId,
  //     account,
  //     amount: longTokenAmount,
  //     isToGmx: false,
  //     srcChainId: chainId,
  //   });
  // }, [account, chainId, longTokenAmount, srcChainId]);

  // const shortTokenBaseSendParams = useMemo(() => {
  //   if (!srcChainId || !account) {
  //     return undefined;
  //   }

  //   if (shortTokenAmount === undefined || shortTokenAmount === 0n) {
  //     return undefined;
  //   }

  //   return getMultichainTransferSendParams({
  //     dstChainId: srcChainId,
  //     account,
  //     amount: shortTokenAmount,
  //     isToGmx: false,
  //     srcChainId: chainId,
  //   });
  // }, [account, chainId, shortTokenAmount, srcChainId]);

  // const longTokenQuoteSend = useQuoteSend({
  //   fromChainId: chainId,
  //   toChainId: srcChainId,
  //   sendParams: longTokenBaseSendParams,
  //   fromChainProvider: settlementChainRpcProvider,
  //   fromStargateAddress: longOftProvider,
  // });

  // const shortTokenQuoteSend = useQuoteSend({
  //   fromChainId: chainId,
  //   toChainId: srcChainId,
  //   sendParams: shortTokenBaseSendParams,
  //   fromChainProvider: settlementChainRpcProvider,
  //   fromStargateAddress: shortOftProvider,
  // });

  const rawGmParams = useMemo((): RawCreateWithdrawalParams | undefined => {
    if (
      !account ||
      !marketTokenAddress ||
      marketTokenAmount === undefined ||
      // executionFeeTokenAmount === undefined ||
      isGlv
    ) {
      return undefined;
    }

    // const minMarketTokens = applySlippageToMinOut(DEFAULT_SLIPPAGE_AMOUNT, marketTokenAmount);

    let dataList: string[] = EMPTY_ARRAY;

    // let executionFee = executionFeeTokenAmount;

    if (paySource === "sourceChain") {
      if (!srcChainId) {
        return undefined;
      }

      const provider = longOftProvider ?? shortOftProvider;

      if (!provider) {
        return undefined;
      }

      const secondaryProvider = provider === shortOftProvider ? undefined : shortTokenAddress;

      const dstEid = getLayerZeroEndpointId(srcChainId);

      if (!dstEid) {
        return undefined;
      }

      const providerData = numberToHex(dstEid, { size: 32 });

      const actionHash = CodecUiHelper.encodeMultichainActionData({
        actionType: MultichainActionType.BridgeOut,
        actionData: {
          deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
          desChainId: chainId,
          provider: provider,
          providerData: providerData,
          // TODO MLTCH apply some slippage
          minAmountOut: 0n,
          // TODO MLTCH put secondary provider and data
          secondaryProvider: secondaryProvider ?? zeroAddress,
          secondaryProviderData: secondaryProvider ? providerData : "0x",
          secondaryMinAmountOut: 0n,
        },
      });
      const bytes = hexToBytes(actionHash as Hex);
      const bytes32array = chunk(bytes, 32).map((b) => bytesToHex(Uint8Array.from(b)));

      dataList = [GMX_DATA_ACTION_HASH, ...bytes32array];
    }

    let shouldUnwrapNativeToken = false;
    if (paySource === "settlementChain") {
      shouldUnwrapNativeToken = longTokenAddress === zeroAddress || shortTokenAddress === zeroAddress ? true : false;
    }

    const params: RawCreateWithdrawalParams = {
      addresses: {
        market: marketTokenAddress,
        receiver: account,
        callbackContract: zeroAddress,
        uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? zeroAddress,
        longTokenSwapPath: longTokenSwapPath ?? [],
        shortTokenSwapPath: shortTokenSwapPath ?? [],
      },
      // TODO MLTCH: do not forget to apply slippage here
      // minLongTokenAmount: applySlippageToMinOut(DEFAULT_SLIPPAGE_AMOUNT, longTokenAmount ?? 0n),
      minLongTokenAmount: 0n,
      // TODO MLTCH: do not forget to apply slippage
      // minShortTokenAmount: applySlippageToMinOut(DEFAULT_SLIPPAGE_AMOUNT, shortTokenAmount ?? 0n),
      minShortTokenAmount: 0n,
      shouldUnwrapNativeToken,
      callbackGasLimit: 0n,
      dataList,
    };

    return params;
  }, [
    account,
    chainId,
    isGlv,
    longOftProvider,
    longTokenAddress,
    longTokenSwapPath,
    marketTokenAddress,
    marketTokenAmount,
    paySource,
    shortOftProvider,
    shortTokenAddress,
    shortTokenSwapPath,
    srcChainId,
  ]);

  const rawGlvParams = useMemo((): RawCreateGlvWithdrawalParams | undefined => {
    if (!account || !isGlv || glvTokenAmount === undefined) {
      return undefined;
    }

    let dataList: string[] = EMPTY_ARRAY;
    if (paySource === "sourceChain") {
      if (!srcChainId) {
        return undefined;
      }

      const provider = longOftProvider ?? shortOftProvider;

      if (!provider) {
        return undefined;
      }

      const secondaryProvider = provider === shortOftProvider ? undefined : shortTokenAddress;

      const dstEid = getLayerZeroEndpointId(srcChainId);

      if (!dstEid) {
        return undefined;
      }

      const providerData = numberToHex(dstEid, { size: 32 });

      const actionHash = CodecUiHelper.encodeMultichainActionData({
        actionType: MultichainActionType.BridgeOut,
        actionData: {
          deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
          desChainId: chainId,
          provider: provider,
          providerData: providerData,
          // TODO MLTCH apply some slippage
          minAmountOut: 0n,
          secondaryProvider: secondaryProvider ?? zeroAddress,
          secondaryProviderData: secondaryProvider ? providerData : "0x",
          secondaryMinAmountOut: 0n,
        },
      });
      const bytes = hexToBytes(actionHash as Hex);

      const bytes32array = chunk(bytes, 32).map((b) => bytesToHex(Uint8Array.from(b)));

      dataList = [GMX_DATA_ACTION_HASH, ...bytes32array];
    }

    let shouldUnwrapNativeToken = false;
    if (paySource === "settlementChain") {
      shouldUnwrapNativeToken = longTokenAddress === zeroAddress || shortTokenAddress === zeroAddress ? true : false;
    }

    const params: RawCreateGlvWithdrawalParams = {
      addresses: {
        glv: glvTokenAddress!,
        market: selectedMarketForGlv!,
        receiver: glvTokenTotalSupply === 0n ? numberToHex(1, { size: 20 }) : account,
        callbackContract: zeroAddress,
        uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? zeroAddress,
        longTokenSwapPath: longTokenSwapPath ?? [],
        shortTokenSwapPath: shortTokenSwapPath ?? [],
      },
      // minLongTokenAmount: applySlippageToMinOut(DEFAULT_SLIPPAGE_AMOUNT, longTokenAmount ?? 0n),
      minLongTokenAmount: 0n,
      // minShortTokenAmount: applySlippageToMinOut(DEFAULT_SLIPPAGE_AMOUNT, shortTokenAmount ?? 0n),
      minShortTokenAmount: 0n,
      callbackGasLimit: 0n,
      shouldUnwrapNativeToken,
      dataList,
    };

    return params;
  }, [
    account,
    chainId,
    glvTokenAddress,
    glvTokenAmount,
    glvTokenTotalSupply,
    isGlv,
    longOftProvider,
    longTokenAddress,
    longTokenSwapPath,
    paySource,
    selectedMarketForGlv,
    shortOftProvider,
    shortTokenAddress,
    shortTokenSwapPath,
    srcChainId,
  ]);

  const gmParams = useMemo((): CreateWithdrawalParams | undefined => {
    if (!rawGmParams || !technicalFees) {
      // console.log("no gm params becayse no", { rawGmParams, technicalFees });

      return undefined;
    }

    const executionFee =
      paySource === "sourceChain"
        ? (technicalFees as SourceChainWithdrawalFees).executionFee
        : (technicalFees as ExecutionFee).feeTokenAmount;

    return {
      ...rawGmParams,
      executionFee,
    };
  }, [rawGmParams, technicalFees, paySource]);

  const glvParams = useMemo((): CreateGlvWithdrawalParams | undefined => {
    if (!rawGlvParams || !technicalFees) {
      return undefined;
    }

    const executionFee =
      paySource === "sourceChain"
        ? (technicalFees as SourceChainGlvWithdrawalFees).executionFee
        : (technicalFees as ExecutionFee).feeTokenAmount;

    return {
      ...rawGlvParams,
      executionFee,
    };
  }, [paySource, rawGlvParams, technicalFees]);

  const multichainWithdrawalExpressTxnParams = useMultichainWithdrawalExpressTxnParams({
    transferRequests,
    paySource,
    gmParams,
    glvParams,
  });

  const getWithdrawalMetricData = useCallback(() => {
    const metricData =
      glvInfo && selectedMarketForGlv
        ? initGLVSwapMetricData({
            chainId,
            longTokenAddress,
            shortTokenAddress,
            selectedMarketForGlv,
            isDeposit: false,
            executionFeeTokenAmount: glvParams?.executionFee,
            executionFeeTokenDecimals,
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

            executionFeeTokenAmount: gmParams?.executionFee,
            executionFeeTokenDecimals,
            marketInfo,
            longTokenAmount,
            shortTokenAmount,
            marketTokenAmount,
            marketTokenUsd,
            isFirstBuy,
          });

    return metricData;
  }, [
    chainId,
    glvParams?.executionFee,
    gmParams?.executionFee,
    executionFeeTokenDecimals,
    glvInfo,
    glvTokenAmount,
    glvTokenUsd,
    isFirstBuy,
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

  const onCreateGlvWithdrawal = useCallback(
    async function onCreateWithdrawal() {
      const metricData = getWithdrawalMetricData();

      if (
        !account ||
        !marketInfo ||
        !marketToken ||
        longTokenAmount === undefined ||
        shortTokenAmount === undefined ||
        !transferRequests ||
        !tokensData ||
        !signer ||
        !glvParams
      ) {
        helperToast.error(t`Error submitting order`);
        sendTxnValidationErrorMetric(metricData.metricId);
        return Promise.resolve();
      }

      let promise: Promise<void>;

      if (paySource === "sourceChain") {
        if (!isSettlementChain(chainId) || !srcChainId || !globalExpressParams) {
          throw new Error("An error occurred");
        }

        promise = createSourceChainGlvWithdrawalTxn({
          chainId,
          srcChainId,
          signer,
          transferRequests,
          params: glvParams,
          tokenAmount: glvTokenAmount!,
          fees: technicalFees as SourceChainGlvWithdrawalFees,
        });
      } else if (paySource === "gmxAccount") {
        const expressTxnParams = await multichainWithdrawalExpressTxnParams.promise;
        if (!expressTxnParams) {
          throw new Error("Express txn params are not set");
        }

        promise = createMultichainGlvWithdrawalTxn({
          chainId,
          signer,
          params: glvParams,
          expressTxnParams,
          transferRequests,
          srcChainId,
        });
      } else if (paySource === "settlementChain") {
        promise = createGlvWithdrawalTxn({
          chainId,
          signer,
          params: glvParams,
          executionGasLimit: (technicalFees as ExecutionFee).gasLimit,
          tokensData,
          setPendingTxns,
          setPendingWithdrawal,
          blockTimestampData,
          glvTokenAmount: glvTokenAmount!,
        });
      } else {
        throw new Error(`Invalid pay source: ${paySource}`);
      }

      return promise
        .then(makeTxnSentMetricsHandler(metricData.metricId))
        .catch(makeTxnErrorMetricsHandler(metricData.metricId));
    },
    [
      getWithdrawalMetricData,
      account,
      marketInfo,
      marketToken,
      longTokenAmount,
      shortTokenAmount,
      tokensData,
      signer,
      glvParams,
      paySource,
      chainId,
      srcChainId,
      globalExpressParams,
      transferRequests,
      glvTokenAmount,
      technicalFees,
      multichainWithdrawalExpressTxnParams.promise,
      setPendingTxns,
      setPendingWithdrawal,
      blockTimestampData,
    ]
  );

  const onCreateGmWithdrawal = useCallback(
    async function onCreateWithdrawal() {
      const metricData = getWithdrawalMetricData();

      if (
        !account ||
        !marketInfo ||
        !marketToken ||
        longTokenAmount === undefined ||
        shortTokenAmount === undefined ||
        !transferRequests ||
        !tokensData ||
        !signer ||
        !gmParams
      ) {
        helperToast.error(t`Error submitting order`);
        sendTxnValidationErrorMetric(metricData.metricId);
        return Promise.resolve();
      }

      let promise: Promise<void>;

      if (paySource === "sourceChain") {
        if (!isSettlementChain(chainId) || !srcChainId || !globalExpressParams || !technicalFees || !rawGmParams) {
          throw new Error("An error occurred");
        }

        // throw new Error("Not implemented");
        promise = createSourceChainWithdrawalTxn({
          chainId,
          srcChainId,
          signer,
          fees: technicalFees as SourceChainWithdrawalFees,
          transferRequests,
          params: rawGmParams!,
          tokenAmount: marketTokenAmount!,
        });
      } else if (paySource === "gmxAccount") {
        const expressTxnParams = await multichainWithdrawalExpressTxnParams.promise;
        if (!expressTxnParams) {
          throw new Error("Express txn params are not set");
        }

        promise = createMultichainWithdrawalTxn({
          chainId,
          signer,
          params: gmParams,
          expressTxnParams,
          transferRequests,
          srcChainId,
        });
      } else if (paySource === "settlementChain") {
        promise = createWithdrawalTxn({
          chainId,
          signer,
          marketTokenAmount: marketTokenAmount!,
          executionGasLimit: (technicalFees as ExecutionFee).gasLimit,
          params: gmParams,
          tokensData,
          skipSimulation: shouldDisableValidation,
          setPendingTxns,
          setPendingWithdrawal,
          blockTimestampData,
        });
      } else {
        throw new Error(`Invalid pay source: ${paySource}`);
      }

      return promise
        .then(makeTxnSentMetricsHandler(metricData.metricId))
        .catch(makeTxnErrorMetricsHandler(metricData.metricId));
    },
    [
      getWithdrawalMetricData,
      account,
      marketInfo,
      marketToken,
      longTokenAmount,
      shortTokenAmount,
      tokensData,
      signer,
      gmParams,
      paySource,
      chainId,
      srcChainId,
      globalExpressParams,
      technicalFees,
      rawGmParams,
      transferRequests,
      marketTokenAmount,
      multichainWithdrawalExpressTxnParams.promise,
      shouldDisableValidation,
      setPendingTxns,
      setPendingWithdrawal,
      blockTimestampData,
    ]
  );

  const onCreateWithdrawal = isGlv ? onCreateGlvWithdrawal : onCreateGmWithdrawal;

  return {
    onCreateWithdrawal,
  };
};
