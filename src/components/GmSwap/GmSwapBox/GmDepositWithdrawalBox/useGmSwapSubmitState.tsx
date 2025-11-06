import { t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useCallback, useMemo } from "react";

import {
  selectPoolsDetailsFirstTokenAddress,
  selectPoolsDetailsFlags,
  selectPoolsDetailsGlvInfo,
  selectPoolsDetailsIsMarketTokenDeposit,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsMarketInfo,
  selectPoolsDetailsMarketTokenData,
  selectPoolsDetailsMarketTokensData,
  selectPoolsDetailsOperation,
  selectPoolsDetailsPaySource,
  selectPoolsDetailsSecondTokenAddress,
  selectPoolsDetailsSelectedMarketForGlv,
  selectPoolsDetailsShortTokenAddress,
} from "context/PoolsDetailsContext/selectors";
import { selectChainId, selectSrcChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import type { ExecutionFee } from "domain/synthetics/fees";
import type { GlvAndGmMarketsInfoData, MarketsInfoData } from "domain/synthetics/markets";
import type { SourceChainDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainDepositFees";
import type { SourceChainGlvDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvDepositFees";
import { SourceChainGlvWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvWithdrawalFees";
import { SourceChainWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainWithdrawalFees";
import { getTokenData, TokensData } from "domain/synthetics/tokens";
import { getCommonError, getGmSwapError } from "domain/synthetics/trade/utils/validation";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { GmSwapFees, WithdrawalAmounts } from "sdk/types/trade";

import SpinnerIcon from "img/ic_spinner.svg?react";

import { Operation } from "../types";
import { useLpTransactions } from "./lpTxn/useLpTransactions";
import { selectDepositWithdrawalAmounts } from "./selectDepositWithdrawalAmounts";
import { useTokensToApprove } from "./useTokensToApprove";

interface Props {
  routerAddress: string;
  longTokenLiquidityUsd?: bigint | undefined;
  shortTokenLiquidityUsd?: bigint | undefined;
  shouldDisableValidation?: boolean;
  tokensData: TokensData | undefined;
  technicalFees:
    | ExecutionFee
    | SourceChainGlvDepositFees
    | SourceChainDepositFees
    | SourceChainWithdrawalFees
    | SourceChainGlvWithdrawalFees
    | undefined;
  logicalFees: GmSwapFees | undefined;
  marketsInfoData?: MarketsInfoData;
  glvAndMarketsInfoData: GlvAndGmMarketsInfoData;
}

const processingTextMap = {
  [Operation.Deposit]: (symbol: string) => t`Buying ${symbol}...`,
  [Operation.Withdrawal]: (symbol: string) => t`Selling ${symbol}...`,
  [Operation.Shift]: (symbol: string) => t`Shifting ${symbol}...`,
};

type SubmitButtonState = {
  text: React.ReactNode;
  disabled?: boolean;
  onSubmit?: () => void;
  tokensToApprove?: string[];
  isAllowanceLoaded?: boolean;
  isAllowanceLoading?: boolean;
  errorDescription?: string;
};

export const useGmSwapSubmitState = ({
  routerAddress,
  logicalFees,
  technicalFees,
  longTokenLiquidityUsd,
  shortTokenLiquidityUsd,
  shouldDisableValidation,
  tokensData,
}: Props): SubmitButtonState => {
  const { isDeposit, isPair } = useSelector(selectPoolsDetailsFlags);
  const operation = useSelector(selectPoolsDetailsOperation);
  const paySource = useSelector(selectPoolsDetailsPaySource);
  const isMarketTokenDeposit = useSelector(selectPoolsDetailsIsMarketTokenDeposit);
  const glvInfo = useSelector(selectPoolsDetailsGlvInfo);
  const glvToken = glvInfo?.glvToken;
  const marketTokensData = useSelector(selectPoolsDetailsMarketTokensData);
  const marketToken = useSelector(selectPoolsDetailsMarketTokenData);
  const selectedMarketForGlv = useSelector(selectPoolsDetailsSelectedMarketForGlv);
  const longTokenAddress = useSelector(selectPoolsDetailsLongTokenAddress);

  const shortTokenAddress = useSelector(selectPoolsDetailsShortTokenAddress);
  const marketInfo = useSelector(selectPoolsDetailsMarketInfo);
  const amounts = useSelector(selectDepositWithdrawalAmounts);
  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const hasOutdatedUi = useHasOutdatedUi();
  const { openConnectModal } = useConnectModal();
  const { account } = useWallet();

  const {
    glvTokenAmount = 0n,
    glvTokenUsd = 0n,
    longTokenAmount = 0n,
    longTokenUsd = 0n,
    marketTokenAmount = 0n,
    marketTokenUsd = 0n,
    shortTokenAmount = 0n,
    shortTokenUsd = 0n,
  } = amounts ?? {};

  const isFirstBuy = Object.values(marketTokensData ?? {}).every((marketToken) => marketToken.balance === 0n);

  const { isSubmitting, onSubmit } = useLpTransactions({
    // marketInfo,
    // marketToken,
    operation,
    // longTokenAddress,
    longTokenAmount,
    // shortTokenAddress,
    shortTokenAmount,
    marketTokenAmount,
    glvTokenAmount,
    glvTokenUsd,
    shouldDisableValidation,
    tokensData,
    technicalFees,
    selectedMarketForGlv,
    // glvInfo,
    isMarketTokenDeposit,
    // selectedMarketInfoForGlv,
    marketTokenUsd,
    isFirstBuy,
    paySource,
    longTokenSwapPath: (amounts as WithdrawalAmounts)?.longTokenSwapPathStats?.swapPath,
    shortTokenSwapPath: (amounts as WithdrawalAmounts)?.shortTokenSwapPathStats?.swapPath,
  });

  const onConnectAccount = useCallback(() => {
    openConnectModal?.();
  }, [openConnectModal]);

  const commonError = getCommonError({
    chainId,
    isConnected: true,
    hasOutdatedUi,
  })[0];

  const [swapError, swapErrorDescription] = getGmSwapError({
    isDeposit,
    marketInfo,
    glvInfo,
    // longToken: getTokenData(tokensData, firstTokenAddress),
    // shortToken: getTokenData(tokensData, secondTokenAddress),
    // TODO MLTCH make native token work
    longToken: getTokenData(tokensData, longTokenAddress),
    shortToken: getTokenData(tokensData, shortTokenAddress),
    glvToken,
    glvTokenAmount,
    glvTokenUsd,
    marketTokenAmount,
    marketTokenUsd,
    longTokenAmount,
    shortTokenAmount,
    longTokenUsd,
    shortTokenUsd,
    longTokenLiquidityUsd: longTokenLiquidityUsd,
    shortTokenLiquidityUsd: shortTokenLiquidityUsd,
    fees: logicalFees,
    priceImpactUsd: logicalFees?.swapPriceImpact?.deltaUsd,
    marketTokensData,
    isMarketTokenDeposit,
    paySource,
    isPair,
    chainId,
    srcChainId,
    marketToken: marketToken,
  });

  const error = commonError || swapError;

  const { approve, isAllowanceLoaded, isAllowanceLoading, tokensToApproveSymbols, isApproving } = useTokensToApprove({
    routerAddress,
    glvInfo,
    operation,
    marketToken,
    marketTokenAmount,
    longTokenAddress,
    longTokenAmount,
    shortTokenAddress,
    shortTokenAmount,
    glvTokenAddress: glvToken?.address,
    glvTokenAmount,
    isMarketTokenDeposit,
  });

  return useMemo((): SubmitButtonState => {
    if (!account) {
      return {
        text: t`Connect Wallet`,
        onSubmit: onConnectAccount,
      };
    }

    if (isAllowanceLoading) {
      return {
        text: t`Loading...`,
        disabled: true,
      };
    }

    // console.log("error", error);
    if (error) {
      return {
        text: error,
        disabled: !shouldDisableValidation,
        onSubmit: onSubmit,
        isAllowanceLoaded,
        isAllowanceLoading,
        errorDescription: swapErrorDescription,
      };
    }

    if (isApproving && tokensToApproveSymbols.length) {
      // const tokenSymbol = getGmSwapBoxApproveTokenSymbol(tokensToApprove[0], tokensData, glvAndMarketsInfoData);

      return {
        text: (
          <>
            {t`Allow ${tokensToApproveSymbols[0]} to be spent`} <SpinnerIcon className="ml-4 animate-spin" />
          </>
        ),
        disabled: true,
      };
    }

    if (isAllowanceLoaded && tokensToApproveSymbols.length > 0) {
      const onApprove = approve;

      return {
        text: t`Allow ${tokensToApproveSymbols[0]} to be spent`,
        onSubmit: onApprove,
      };
    }

    const operationTokenSymbol = glvInfo ? "GLV" : "GM";

    if (isSubmitting) {
      return {
        text: processingTextMap[operation](operationTokenSymbol),
        disabled: true,
      };
    }

    return {
      text: isDeposit ? t`Buy ${operationTokenSymbol}` : t`Sell ${operationTokenSymbol}`,
      onSubmit,
    };
  }, [
    account,
    isAllowanceLoading,
    error,
    isApproving,
    tokensToApproveSymbols,
    isAllowanceLoaded,
    glvInfo,
    isSubmitting,
    isDeposit,
    onSubmit,
    onConnectAccount,
    shouldDisableValidation,
    swapErrorDescription,
    approve,
    operation,
  ]);
};
