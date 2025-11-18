import { SettlementChainId, SourceChainId } from "config/chains";
import {
  selectPoolsDetailsFirstTokenAddress,
  selectPoolsDetailsFirstTokenAmount,
  selectPoolsDetailsFlags,
  selectPoolsDetailsGlvInfo,
  selectPoolsDetailsMarketOrGlvTokenAmount,
  selectPoolsDetailsOperation,
  selectPoolsDetailsPaySource,
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
import {
  RawCreateDepositParams,
  RawCreateGlvDepositParams,
  RawCreateGlvWithdrawalParams,
  RawCreateWithdrawalParams,
} from "domain/synthetics/markets";
import { estimatePureLpActionExecutionFee } from "domain/synthetics/markets/feeEstimation/estimatePureLpActionExecutionFee";
import { estimateSourceChainDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainDepositFees";
import { estimateSourceChainGlvDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvDepositFees";
import { estimateSourceChainGlvWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvWithdrawalFees";
import { estimateSourceChainWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainWithdrawalFees";
import { useChainId } from "lib/chains";
import { usePrevious } from "lib/usePrevious";
import { useThrottledAsync } from "lib/useThrottledAsync";
import { MARKETS } from "sdk/configs/markets";
import { WithdrawalAmounts } from "sdk/types/trade";

import { Operation } from "../types";

export function useTechnicalFeesAsyncResult() {
  const { chainId, srcChainId } = useChainId();

  const operation = useSelector(selectPoolsDetailsOperation);
  const { isPair } = useSelector(selectPoolsDetailsFlags);
  const paySource = useSelector(selectPoolsDetailsPaySource);

  const glvInfo = useSelector(selectPoolsDetailsGlvInfo);
  const selectedMarketForGlv = useSelector(selectPoolsDetailsSelectedMarketAddressForGlv);
  const isGlv = glvInfo !== undefined && selectedMarketForGlv !== undefined;

  const firstTokenAddress = useSelector(selectPoolsDetailsFirstTokenAddress);
  const firstTokenAmount = useSelector(selectPoolsDetailsFirstTokenAmount);
  const marketOrGlvTokenAmount = useSelector(selectPoolsDetailsMarketOrGlvTokenAmount);

  const prevPaySource = usePrevious(paySource);
  const prevOperation = usePrevious(operation);
  const prevIsPair = usePrevious(isPair);
  const forceRecalculate = prevPaySource !== paySource || prevOperation !== operation || prevIsPair !== isPair;

  const gasLimits = useSelector(selectGasLimits);
  const gasPrice = useSelector(selectGasPrice);
  const tokensData = useSelector(selectTokensData);
  const globalExpressParams = useSelector(selectExpressGlobalParams);
  const rawParams = useSelector(selectPoolsDetailsParams);
  const amounts = useSelector(selectDepositWithdrawalAmounts);

  return useThrottledAsync(
    async (p) => {
      if (p.params.paySource === "gmxAccount" || p.params.paySource === "settlementChain") {
        if (p.params.operation === Operation.Deposit) {
          if (p.params.isGlv) {
            const castedParams = p.params.rawParams as RawCreateGlvDepositParams;
            return estimatePureLpActionExecutionFee({
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
          } else {
            const castedParams = p.params.rawParams as RawCreateDepositParams;
            return estimatePureLpActionExecutionFee({
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
          }
        } else if (p.params.operation === Operation.Withdrawal) {
          if (p.params.isGlv) {
            const castedParams = p.params.rawParams as RawCreateGlvWithdrawalParams;
            return estimatePureLpActionExecutionFee({
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
          }

          const castedParams = p.params.rawParams as RawCreateWithdrawalParams;
          return estimatePureLpActionExecutionFee({
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
        }
      } else if (p.params.paySource === "sourceChain") {
        if (
          p.params.tokenAddress === undefined ||
          p.params.tokenAmount === undefined ||
          !p.params.globalExpressParams
        ) {
          return undefined;
        }
        if (p.params.operation === Operation.Deposit) {
          if (p.params.isGlv) {
            const castedParams = p.params.rawParams as RawCreateGlvDepositParams;
            return await estimateSourceChainGlvDepositFees({
              chainId: p.params.chainId as SettlementChainId,
              srcChainId: p.params.srcChainId as SourceChainId,
              params: castedParams,
              tokenAddress: p.params.tokenAddress,
              tokenAmount: p.params.tokenAmount,
              globalExpressParams: p.params.globalExpressParams,
              glvMarketCount: BigInt(p.params.glvInfo!.markets.length),
            });
          } else {
            const castedParams = p.params.rawParams as RawCreateDepositParams;
            return await estimateSourceChainDepositFees({
              chainId: p.params.chainId as SettlementChainId,
              srcChainId: p.params.srcChainId as SourceChainId,
              params: castedParams,
              tokenAddress: p.params.tokenAddress,
              tokenAmount: p.params.tokenAmount,
              globalExpressParams: p.params.globalExpressParams,
            });
          }
        } else if (p.params.operation === Operation.Withdrawal) {
          if (p.params.isGlv) {
            const castedParams = p.params.rawParams as RawCreateGlvWithdrawalParams;
            const glvWithdrawalAmounts = p.params.amounts as WithdrawalAmounts;
            const outputLongTokenAddress =
              glvWithdrawalAmounts.longTokenSwapPathStats?.tokenOutAddress ?? glvInfo!.longTokenAddress;
            const outputShortTokenAddress =
              glvWithdrawalAmounts.shortTokenSwapPathStats?.tokenOutAddress ?? glvInfo!.shortTokenAddress;

            return await estimateSourceChainGlvWithdrawalFees({
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

            return await estimateSourceChainWithdrawalFees({
              chainId: p.params.chainId as SettlementChainId,
              srcChainId: p.params.srcChainId as SourceChainId,
              params: castedParams,
              tokenAddress: p.params.rawParams.addresses.market,
              tokenAmount: p.params.marketTokenAmount,
              globalExpressParams: p.params.globalExpressParams,
              outputLongTokenAddress,
              outputShortTokenAddress,
            });
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
              tokenAddress: firstTokenAddress,
              marketTokenAmount: marketOrGlvTokenAmount,
              tokenAmount: firstTokenAmount,
              operation,
              amounts,
              gasLimits,
              tokensData,
              gasPrice,
            }
          : undefined,
      withLoading: false,
      forceRecalculate,
    }
  );
}
