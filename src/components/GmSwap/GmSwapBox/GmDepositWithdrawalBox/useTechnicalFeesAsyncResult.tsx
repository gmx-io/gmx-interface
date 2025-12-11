import { SettlementChainId, SourceChainId } from "config/chains";
import {
  selectPoolsDetailsFirstTokenAddress,
  selectPoolsDetailsFirstTokenAmount,
  selectPoolsDetailsFlags,
  selectPoolsDetailsGlvInfo,
  selectPoolsDetailsMarketOrGlvTokenAmount,
  selectPoolsDetailsOperation,
  selectPoolsDetailsPaySource,
  selectPoolsDetailsSecondTokenAddress,
  selectPoolsDetailsSecondTokenAmount,
  selectPoolsDetailsSelectedMarketAddressForGlv,
} from "context/PoolsDetailsContext/selectors";
import { selectDepositWithdrawalAmounts } from "context/PoolsDetailsContext/selectors/selectDepositWithdrawalAmounts";
import { selectPoolsDetailsParams } from "context/PoolsDetailsContext/selectors/selectPoolsDetailsParams";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectGasLimits,
  selectGasPrice,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { estimateArbitraryRelayFee, getRawBaseRelayerParams } from "domain/multichain/arbitraryRelayParams";
import { buildDepositTransferRequests } from "domain/multichain/buildDepositTransferRequests";
import { buildWithdrawalTransferRequests } from "domain/multichain/buildWithdrawalTransferRequests";
import { TechnicalGmFees } from "domain/multichain/technical-fees-types";
import { ExpressTransactionBuilder } from "domain/synthetics/express/types";
import {
  RawCreateDepositParams,
  RawCreateGlvDepositParams,
  RawCreateGlvWithdrawalParams,
  RawCreateWithdrawalParams,
} from "domain/synthetics/markets";
import { buildAndSignMultichainDepositTxn } from "domain/synthetics/markets/createMultichainDepositTxn";
import { buildAndSignMultichainGlvDepositTxn } from "domain/synthetics/markets/createMultichainGlvDepositTxn";
import { buildAndSignMultichainGlvWithdrawalTxn } from "domain/synthetics/markets/createMultichainGlvWithdrawalTxn";
import { buildAndSignMultichainWithdrawalTxn } from "domain/synthetics/markets/createMultichainWithdrawalTxn";
import { estimatePureLpActionExecutionFee } from "domain/synthetics/markets/feeEstimation/estimatePureLpActionExecutionFee";
import { estimateSourceChainDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainDepositFees";
import { estimateSourceChainGlvDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvDepositFees";
import { estimateSourceChainGlvWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvWithdrawalFees";
import { estimateSourceChainWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainWithdrawalFees";
import { convertToUsd } from "domain/tokens";
import { useChainId } from "lib/chains";
import { usePrevious } from "lib/usePrevious";
import { useThrottledAsync } from "lib/useThrottledAsync";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { MARKETS } from "sdk/configs/markets";
import { WithdrawalAmounts } from "sdk/types/trade";
import { absDiffBps } from "sdk/utils/numbers";
import { nowInSeconds } from "sdk/utils/time";

import { Operation } from "../types";

export function useTechnicalFees(): TechnicalGmFees {
  const { chainId, srcChainId } = useChainId();

  const operation = useSelector(selectPoolsDetailsOperation);
  const { isPair } = useSelector(selectPoolsDetailsFlags);
  const paySource = useSelector(selectPoolsDetailsPaySource);

  const glvInfo = useSelector(selectPoolsDetailsGlvInfo);
  const selectedMarketForGlv = useSelector(selectPoolsDetailsSelectedMarketAddressForGlv);
  const isGlv = glvInfo !== undefined && selectedMarketForGlv !== undefined;

  const firstTokenAddress = useSelector(selectPoolsDetailsFirstTokenAddress);
  const firstTokenAmount = useSelector(selectPoolsDetailsFirstTokenAmount);
  const secondTokenAddress = useSelector(selectPoolsDetailsSecondTokenAddress);
  const secondTokenAmount = useSelector(selectPoolsDetailsSecondTokenAmount);
  const marketOrGlvTokenAmount = useSelector(selectPoolsDetailsMarketOrGlvTokenAmount);

  const prevPaySource = usePrevious(paySource);
  const prevOperation = usePrevious(operation);
  const prevIsPair = usePrevious(isPair);
  const prevFirstTokenAmount = usePrevious(firstTokenAmount);

  const isAmountChangedSignificantly =
    prevFirstTokenAmount !== undefined &&
    firstTokenAmount !== undefined &&
    absDiffBps(firstTokenAmount, prevFirstTokenAmount) > 100n;

  const forceRecalculate =
    prevPaySource !== paySource || prevOperation !== operation || prevIsPair !== isPair || isAmountChangedSignificantly;

  const gasLimits = useSelector(selectGasLimits);
  const gasPrice = useSelector(selectGasPrice);
  const tokensData = useSelector(selectTokensData);
  const globalExpressParams = useSelector(selectExpressGlobalParams);
  const rawParams = useSelector(selectPoolsDetailsParams);
  const amounts = useSelector(selectDepositWithdrawalAmounts);

  const technicalFeesAsyncResult = useThrottledAsync(
    async (p): Promise<TechnicalGmFees | undefined> => {
      if (p.params.paySource === "settlementChain") {
        if (p.params.operation === Operation.Deposit) {
          if (p.params.isGlv) {
            const castedParams = p.params.rawParams as RawCreateGlvDepositParams;
            const fees = estimatePureLpActionExecutionFee({
              action: {
                operation: Operation.Deposit,
                isGlv: true,
                marketsCount: BigInt(p.params.glvInfo!.markets.length),
                swapsCount: BigInt(
                  castedParams.addresses.longTokenSwapPath.length + castedParams.addresses.shortTokenSwapPath.length
                ),
                isMarketTokenDeposit: castedParams.isMarketTokenDeposit,
              },
              chainId: p.params.chainId,
              gasLimits: p.params.gasLimits,
              tokensData: p.params.tokensData,
              gasPrice: p.params.gasPrice,
            });

            return {
              kind: "settlementChain",
              fees,
            };
          } else {
            const castedParams = p.params.rawParams as RawCreateDepositParams;
            const fees = estimatePureLpActionExecutionFee({
              action: {
                operation: Operation.Deposit,
                isGlv: false,
                swapsCount: BigInt(
                  castedParams.addresses.longTokenSwapPath.length + castedParams.addresses.shortTokenSwapPath.length
                ),
              },
              chainId: p.params.chainId,
              gasLimits: p.params.gasLimits,
              tokensData: p.params.tokensData,
              gasPrice: p.params.gasPrice,
            });

            return {
              kind: "settlementChain",
              fees,
            };
          }
        } else if (p.params.operation === Operation.Withdrawal) {
          if (p.params.isGlv) {
            const castedParams = p.params.rawParams as RawCreateGlvWithdrawalParams;
            const fees = estimatePureLpActionExecutionFee({
              action: {
                operation: Operation.Withdrawal,
                isGlv: true,
                marketsCount: BigInt(p.params.glvInfo!.markets.length),
                swapsCount: BigInt(
                  castedParams.addresses.longTokenSwapPath.length + castedParams.addresses.shortTokenSwapPath.length
                ),
              },
              chainId: p.params.chainId,
              gasLimits: p.params.gasLimits,
              tokensData: p.params.tokensData,
              gasPrice: p.params.gasPrice,
            });

            return {
              kind: "settlementChain",
              fees,
            };
          } else {
            const castedParams = p.params.rawParams as RawCreateWithdrawalParams;
            const fees = estimatePureLpActionExecutionFee({
              action: {
                operation: Operation.Withdrawal,
                isGlv: false,
                swapsCount: BigInt(
                  castedParams.addresses.longTokenSwapPath.length + castedParams.addresses.shortTokenSwapPath.length
                ),
              },
              chainId: p.params.chainId,
              gasLimits: p.params.gasLimits,
              tokensData: p.params.tokensData,
              gasPrice: p.params.gasPrice,
            });

            return {
              kind: "settlementChain",
              fees,
            };
          }
        }
      } else if (p.params.paySource === "gmxAccount") {
        if (!p.params.globalExpressParams) {
          return undefined;
        }

        const { rawBaseRelayParamsPayload, baseRelayFeeSwapParams } = getRawBaseRelayerParams({
          chainId,
          account: p.params.rawParams.addresses.receiver,
          globalExpressParams: p.params.globalExpressParams,
        });

        if (!rawBaseRelayParamsPayload || !baseRelayFeeSwapParams) {
          return undefined;
        }

        if (p.params.operation === Operation.Deposit) {
          if (p.params.isGlv) {
            const castedParams = p.params.rawParams as RawCreateGlvDepositParams;
            const executionFee = estimatePureLpActionExecutionFee({
              action: {
                operation: Operation.Deposit,
                isGlv: true,
                marketsCount: BigInt(p.params.glvInfo!.markets.length),
                swapsCount: BigInt(
                  castedParams.addresses.longTokenSwapPath.length + castedParams.addresses.shortTokenSwapPath.length
                ),
                isMarketTokenDeposit: castedParams.isMarketTokenDeposit,
              },
              chainId: p.params.chainId,
              gasLimits: p.params.gasLimits,
              tokensData: p.params.tokensData,
              gasPrice: p.params.gasPrice,
            });

            const transferRequests = buildDepositTransferRequests({
              isDeposit: true,
              isGlv: true,
              chainId: p.params.chainId,
              paySource: p.params.paySource,
              isMarketTokenDeposit: castedParams.isMarketTokenDeposit,
              marketTokenAddress: p.params.rawParams.addresses.market,
              marketTokenAmount: p.params.firstTokenAmount,
              longTokenAmount: p.params.firstTokenAmount,
              shortTokenAmount: p.params.secondTokenAmount,
              initialLongTokenAddress: castedParams.addresses.initialLongToken,
              initialShortTokenAddress: castedParams.addresses.initialShortToken,
              technicalFees: undefined,
            });

            if (!transferRequests) {
              return undefined;
            }

            const expressTransactionBuilder: ExpressTransactionBuilder = async ({ relayParams, gasPaymentParams }) => {
              return {
                txnData: await buildAndSignMultichainGlvDepositTxn({
                  chainId: p.params.chainId,
                  srcChainId: p.params.srcChainId,
                  emptySignature: true,
                  signer: undefined,
                  account: p.params.rawParams.addresses.receiver,
                  params: { ...castedParams, executionFee: executionFee.feeTokenAmount },
                  relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
                  relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
                  relayParams: {
                    ...relayParams,
                    deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
                  },
                  transferRequests,
                }),
              };
            };

            const relayFee = await estimateArbitraryRelayFee({
              account: p.params.rawParams.addresses.receiver,
              chainId: p.params.chainId,
              client: getPublicClientWithRpc(p.params.chainId),
              rawRelayParamsPayload: rawBaseRelayParamsPayload,
              expressTransactionBuilder: expressTransactionBuilder,
              gasPaymentParams: baseRelayFeeSwapParams.gasPaymentParams,
              subaccount: undefined,
            });

            const relayFeeUsd = convertToUsd(
              relayFee,
              p.params.globalExpressParams.relayerFeeToken.decimals,
              p.params.globalExpressParams.relayerFeeToken.prices.maxPrice
            )!;

            return {
              kind: "gmxAccount",
              fees: {
                executionFee,
                relayFeeUsd,
              },
            };
          } else {
            const castedParams = p.params.rawParams as RawCreateDepositParams;
            const executionFee = estimatePureLpActionExecutionFee({
              action: {
                operation: Operation.Deposit,
                isGlv: false,
                swapsCount: BigInt(
                  castedParams.addresses.longTokenSwapPath.length + castedParams.addresses.shortTokenSwapPath.length
                ),
              },
              chainId: p.params.chainId,
              gasLimits: p.params.gasLimits,
              tokensData: p.params.tokensData,
              gasPrice: p.params.gasPrice,
            });

            const transferRequests = buildDepositTransferRequests({
              isDeposit: true,
              isGlv: false,
              chainId: p.params.chainId,
              paySource: p.params.paySource,
              isMarketTokenDeposit: false,
              marketTokenAddress: undefined,
              marketTokenAmount: 0n,
              longTokenAmount: p.params.firstTokenAmount,
              shortTokenAmount: p.params.secondTokenAmount,
              initialLongTokenAddress: castedParams.addresses.initialLongToken,
              initialShortTokenAddress: castedParams.addresses.initialShortToken,
              technicalFees: undefined,
            });

            if (!transferRequests) {
              return undefined;
            }

            const expressTransactionBuilder: ExpressTransactionBuilder = async ({ relayParams, gasPaymentParams }) => {
              return {
                txnData: await buildAndSignMultichainDepositTxn({
                  chainId: p.params.chainId,
                  srcChainId: p.params.srcChainId,
                  emptySignature: true,
                  signer: undefined,
                  account: p.params.rawParams.addresses.receiver,
                  params: { ...castedParams, executionFee: executionFee.feeTokenAmount },
                  relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
                  relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
                  relayParams: {
                    ...relayParams,
                    deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
                  },
                  transferRequests,
                }),
              };
            };

            const relayFee = await estimateArbitraryRelayFee({
              account: p.params.rawParams.addresses.receiver,
              chainId: p.params.chainId,
              client: getPublicClientWithRpc(p.params.chainId),
              rawRelayParamsPayload: rawBaseRelayParamsPayload,
              expressTransactionBuilder: expressTransactionBuilder,
              gasPaymentParams: baseRelayFeeSwapParams.gasPaymentParams,
              subaccount: undefined,
            });

            const relayFeeUsd = convertToUsd(
              relayFee,
              p.params.globalExpressParams.relayerFeeToken.decimals,
              p.params.globalExpressParams.relayerFeeToken.prices.maxPrice
            )!;

            return {
              kind: "gmxAccount",
              fees: {
                executionFee,
                relayFeeUsd,
              },
            };
          }
        } else if (p.params.operation === Operation.Withdrawal) {
          if (p.params.isGlv) {
            const castedParams = p.params.rawParams as RawCreateGlvWithdrawalParams;
            const fees = estimatePureLpActionExecutionFee({
              action: {
                operation: Operation.Withdrawal,
                isGlv: true,
                marketsCount: BigInt(p.params.glvInfo!.markets.length),
                swapsCount: BigInt(
                  castedParams.addresses.longTokenSwapPath.length + castedParams.addresses.shortTokenSwapPath.length
                ),
              },
              chainId: p.params.chainId,
              gasLimits: p.params.gasLimits,
              tokensData: p.params.tokensData,
              gasPrice: p.params.gasPrice,
            });

            const transferRequests = buildWithdrawalTransferRequests({
              isWithdrawal: true,
              isGlv: true,
              chainId: p.params.chainId,
              glvTokenAddress: castedParams.addresses.glv,
              glvTokenAmount: p.params.marketTokenAmount,
              marketTokenAddress: undefined,
              marketTokenAmount: 0n,
            });

            if (!transferRequests) {
              return undefined;
            }

            const expressTransactionBuilder: ExpressTransactionBuilder = async ({ relayParams, gasPaymentParams }) => {
              return {
                txnData: await buildAndSignMultichainGlvWithdrawalTxn({
                  chainId: p.params.chainId,
                  srcChainId: p.params.srcChainId,
                  emptySignature: true,
                  signer: undefined,
                  account: p.params.rawParams.addresses.receiver,
                  params: { ...castedParams, executionFee: fees.feeTokenAmount },
                  relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
                  relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
                  relayParams: {
                    ...relayParams,
                    deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
                  },
                  transferRequests,
                }),
              };
            };

            const relayFee = await estimateArbitraryRelayFee({
              account: p.params.rawParams.addresses.receiver,
              chainId: p.params.chainId,
              client: getPublicClientWithRpc(p.params.chainId),
              rawRelayParamsPayload: rawBaseRelayParamsPayload,
              expressTransactionBuilder: expressTransactionBuilder,
              gasPaymentParams: baseRelayFeeSwapParams.gasPaymentParams,
              subaccount: undefined,
            });

            const relayFeeUsd = convertToUsd(
              relayFee,
              p.params.globalExpressParams.relayerFeeToken.decimals,
              p.params.globalExpressParams.relayerFeeToken.prices.maxPrice
            )!;

            return {
              kind: "gmxAccount",
              fees: {
                executionFee: fees,
                relayFeeUsd,
              },
            };
          } else {
            const castedParams = p.params.rawParams as RawCreateWithdrawalParams;
            const fees = estimatePureLpActionExecutionFee({
              action: {
                operation: Operation.Withdrawal,
                isGlv: false,
                swapsCount: BigInt(
                  castedParams.addresses.longTokenSwapPath.length + castedParams.addresses.shortTokenSwapPath.length
                ),
              },
              chainId: p.params.chainId,
              gasLimits: p.params.gasLimits,
              tokensData: p.params.tokensData,
              gasPrice: p.params.gasPrice,
            });

            const transferRequests = buildWithdrawalTransferRequests({
              isWithdrawal: true,
              isGlv: false,
              chainId: p.params.chainId,
              glvTokenAddress: undefined,
              glvTokenAmount: 0n,
              marketTokenAddress: castedParams.addresses.market,
              marketTokenAmount: p.params.marketTokenAmount,
            });

            if (!transferRequests) {
              return undefined;
            }

            const expressTransactionBuilder: ExpressTransactionBuilder = async ({ relayParams, gasPaymentParams }) => {
              return {
                txnData: await buildAndSignMultichainWithdrawalTxn({
                  chainId: p.params.chainId,
                  srcChainId: p.params.srcChainId,
                  emptySignature: true,
                  signer: undefined as any,
                  account: p.params.rawParams.addresses.receiver,
                  params: { ...castedParams, executionFee: fees.feeTokenAmount },
                  relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
                  relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
                  relayParams: {
                    ...relayParams,
                    deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
                  },
                  transferRequests,
                }),
              };
            };

            const relayFee = await estimateArbitraryRelayFee({
              account: p.params.rawParams.addresses.receiver,
              chainId: p.params.chainId,
              client: getPublicClientWithRpc(p.params.chainId),
              rawRelayParamsPayload: rawBaseRelayParamsPayload,
              expressTransactionBuilder: expressTransactionBuilder,
              gasPaymentParams: baseRelayFeeSwapParams.gasPaymentParams,
              subaccount: undefined,
            });

            const relayFeeUsd = convertToUsd(
              relayFee,
              p.params.globalExpressParams.relayerFeeToken.decimals,
              p.params.globalExpressParams.relayerFeeToken.prices.maxPrice
            )!;

            return {
              kind: "gmxAccount",
              fees: {
                executionFee: fees,
                relayFeeUsd,
              },
            };
          }
        }
      } else if (p.params.paySource === "sourceChain") {
        if (
          p.params.firstTokenAddress === undefined ||
          p.params.firstTokenAmount === undefined ||
          !p.params.globalExpressParams
        ) {
          return undefined;
        }
        if (p.params.operation === Operation.Deposit) {
          if (p.params.isGlv) {
            const castedParams = p.params.rawParams as RawCreateGlvDepositParams;
            const fees = await estimateSourceChainGlvDepositFees({
              chainId: p.params.chainId as SettlementChainId,
              srcChainId: p.params.srcChainId as SourceChainId,
              params: castedParams,
              tokenAddress: p.params.firstTokenAddress,
              tokenAmount: p.params.firstTokenAmount,
              globalExpressParams: p.params.globalExpressParams,
              glvMarketCount: BigInt(p.params.glvInfo!.markets.length),
            });

            return {
              kind: "sourceChain",
              isGlv: true,
              isDeposit: true,
              fees,
            };
          } else {
            const castedParams = p.params.rawParams as RawCreateDepositParams;
            const fees = await estimateSourceChainDepositFees({
              chainId: p.params.chainId as SettlementChainId,
              srcChainId: p.params.srcChainId as SourceChainId,
              params: castedParams,
              tokenAddress: p.params.firstTokenAddress,
              tokenAmount: p.params.firstTokenAmount,
              globalExpressParams: p.params.globalExpressParams,
            });
            return {
              kind: "sourceChain",
              isGlv: false,
              isDeposit: true,
              fees,
            };
          }
        } else if (p.params.operation === Operation.Withdrawal) {
          if (p.params.isGlv) {
            const castedParams = p.params.rawParams as RawCreateGlvWithdrawalParams;
            const glvWithdrawalAmounts = p.params.amounts as WithdrawalAmounts;
            const outputLongTokenAddress =
              glvWithdrawalAmounts.longTokenSwapPathStats?.tokenOutAddress ?? glvInfo!.longTokenAddress;
            const outputShortTokenAddress =
              glvWithdrawalAmounts.shortTokenSwapPathStats?.tokenOutAddress ?? glvInfo!.shortTokenAddress;

            const fees = await estimateSourceChainGlvWithdrawalFees({
              chainId: p.params.chainId as SettlementChainId,
              srcChainId: p.params.srcChainId as SourceChainId,
              params: castedParams,
              tokenAddress: castedParams.addresses.glv,
              tokenAmount: p.params.marketTokenAmount,
              globalExpressParams: p.params.globalExpressParams,
              marketsCount: BigInt(p.params.glvInfo!.markets.length),
              outputLongTokenAddress,
              outputShortTokenAddress,
            });

            return {
              kind: "sourceChain",
              isGlv: true,
              isDeposit: false,
              fees,
            };
          } else {
            const castedParams = p.params.rawParams as RawCreateWithdrawalParams;
            if (!p.params.amounts) {
              return undefined;
            }

            const gmWithdrawalAmounts = p.params.amounts as WithdrawalAmounts;

            const outputLongTokenAddress =
              gmWithdrawalAmounts.longTokenSwapPathStats?.tokenOutAddress ??
              MARKETS[p.params.chainId][p.params.rawParams.addresses.market].longTokenAddress;
            const outputShortTokenAddress =
              gmWithdrawalAmounts.shortTokenSwapPathStats?.tokenOutAddress ??
              MARKETS[p.params.chainId][p.params.rawParams.addresses.market].shortTokenAddress;

            const fees = await estimateSourceChainWithdrawalFees({
              chainId: p.params.chainId as SettlementChainId,
              srcChainId: p.params.srcChainId as SourceChainId,
              params: castedParams,
              tokenAddress: p.params.rawParams.addresses.market,
              tokenAmount: p.params.marketTokenAmount,
              globalExpressParams: p.params.globalExpressParams,
              outputLongTokenAddress,
              outputShortTokenAddress,
            });

            return {
              kind: "sourceChain",
              isGlv: false,
              isDeposit: false,
              fees,
            };
          }
        }
      }
    },
    {
      params:
        rawParams && gasLimits && tokensData && gasPrice !== undefined
          ? {
              chainId,
              globalExpressParams,
              rawParams,
              isGlv,
              glvInfo,
              paySource,
              srcChainId,
              firstTokenAddress,
              firstTokenAmount,
              secondTokenAddress,
              secondTokenAmount,
              marketTokenAmount: marketOrGlvTokenAmount,
              operation,
              amounts,
              gasLimits,
              tokensData,
              gasPrice,
            }
          : undefined,
      withLoading: false,
      forceRecalculate,
      resetOnForceRecalculate: true,
    }
  );

  return technicalFeesAsyncResult.data;
}
