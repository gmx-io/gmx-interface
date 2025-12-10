import { t, Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useCallback, useMemo } from "react";

import {
  selectPoolsDetailsFlags,
  selectPoolsDetailsGlvInfo,
  selectPoolsDetailsIsMarketTokenDeposit,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsMarketInfo,
  selectPoolsDetailsMarketTokenData,
  selectPoolsDetailsMarketTokensData,
  selectPoolsDetailsOperation,
  selectPoolsDetailsPayLongToken,
  selectPoolsDetailsPayShortToken,
  selectPoolsDetailsPaySource,
  selectPoolsDetailsShortTokenAddress,
} from "context/PoolsDetailsContext/selectors";
import { selectDepositWithdrawalAmounts } from "context/PoolsDetailsContext/selectors/selectDepositWithdrawalAmounts";
import { selectGasPaymentToken } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { selectChainId, selectSrcChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectGasPaymentTokenAddress } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useSourceChainError } from "domain/multichain/useSourceChainError";
import { ExpressEstimationInsufficientGasPaymentTokenBalanceError } from "domain/synthetics/express/expressOrderUtils";
import type { ExecutionFee } from "domain/synthetics/fees";
import type { GlvAndGmMarketsInfoData, GmPaySource, MarketsInfoData } from "domain/synthetics/markets";
import type { SourceChainDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainDepositFees";
import type { SourceChainGlvDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvDepositFees";
import { SourceChainGlvWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvWithdrawalFees";
import { SourceChainWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainWithdrawalFees";
import { convertToTokenAmount, type TokenData } from "domain/synthetics/tokens";
import { getCommonError, getGmSwapError } from "domain/synthetics/trade/utils/validation";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { GmSwapFees } from "sdk/types/trade";
import { bigMath } from "sdk/utils/bigmath";

import SpinnerIcon from "img/ic_spinner.svg?react";

import { Operation } from "../types";
import { useLpTransactions } from "./lpTxn/useLpTransactions";
import { TechnicalFees } from "./useTechnicalFeesAsyncResult";
import { useTokensToApprove } from "./useTokensToApprove";

interface Props {
  longTokenLiquidityUsd?: bigint | undefined;
  shortTokenLiquidityUsd?: bigint | undefined;
  shouldDisableValidation?: boolean;
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
  logicalFees,
  technicalFees,
  longTokenLiquidityUsd,
  shortTokenLiquidityUsd,
  shouldDisableValidation,
}: Props): SubmitButtonState => {
  const { isDeposit, isPair } = useSelector(selectPoolsDetailsFlags);
  const operation = useSelector(selectPoolsDetailsOperation);
  const paySource = useSelector(selectPoolsDetailsPaySource);
  const isMarketTokenDeposit = useSelector(selectPoolsDetailsIsMarketTokenDeposit);
  const glvInfo = useSelector(selectPoolsDetailsGlvInfo);
  const glvToken = glvInfo?.glvToken;
  const marketTokensData = useSelector(selectPoolsDetailsMarketTokensData);
  const marketToken = useSelector(selectPoolsDetailsMarketTokenData);

  const longTokenAddress = useSelector(selectPoolsDetailsLongTokenAddress);
  const shortTokenAddress = useSelector(selectPoolsDetailsShortTokenAddress);
  const payLongToken = useSelector(selectPoolsDetailsPayLongToken);
  const payShortToken = useSelector(selectPoolsDetailsPayShortToken);

  const marketInfo = useSelector(selectPoolsDetailsMarketInfo);
  const amounts = useSelector(selectDepositWithdrawalAmounts);
  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const gasPaymentTokenAddress = useSelector(selectGasPaymentTokenAddress);
  const gasPaymentToken = useSelector(selectGasPaymentToken);
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

  const {
    isSubmitting,
    onSubmit,
    isLoading,
    error: estimationError,
  } = useLpTransactions({
    shouldDisableValidation,
    technicalFees,
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
    longToken: payLongToken,
    shortToken: payShortToken,
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

  const expressError = useExpressError({
    paySource,
    technicalFees,
    gasPaymentToken,
    gasPaymentTokenAddress,
    longTokenAddress,
    shortTokenAddress,
    longTokenAmount,
    shortTokenAmount,
    isDeposit,
  });

  const sourceChainError = useSourceChainError({
    networkFeeUsd:
      logicalFees?.logicalNetworkFee?.deltaUsd !== undefined
        ? bigMath.abs(logicalFees.logicalNetworkFee.deltaUsd)
        : undefined,
    paySource,
    chainId,
    srcChainId,
  });

  const formattedEstimationError = useMemo(() => {
    if (estimationError instanceof ExpressEstimationInsufficientGasPaymentTokenBalanceError) {
      if (gasPaymentToken) {
        return t`${gasPaymentToken.symbol} balance in GMX account is insufficient to cover gas fees and input amount`;
      }
    } else if (estimationError) {
      return estimationError.name;
    }

    return undefined;
  }, [estimationError, gasPaymentToken]);

  const error = commonError || swapError || expressError || sourceChainError || formattedEstimationError;

  const { approve, isAllowanceLoaded, isAllowanceLoading, tokensToApproveSymbols, isApproving } = useTokensToApprove();

  return useMemo((): SubmitButtonState => {
    if (!account) {
      return {
        text: t`Connect Wallet`,
        onSubmit: onConnectAccount,
      };
    }

    if (isAllowanceLoading) {
      return {
        text: (
          <>
            <Trans>Loading</Trans>
            <SpinnerIcon className="ml-4 animate-spin" />
          </>
        ),
        disabled: true,
      };
    }

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

    if (!technicalFees || isLoading) {
      return {
        text: (
          <>
            <Trans>Loading</Trans>
            <SpinnerIcon className="ml-4 animate-spin" />
          </>
        ),
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
    technicalFees,
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
    isLoading,
  ]);
};

function useExpressError({
  paySource,
  technicalFees,
  gasPaymentToken,
  gasPaymentTokenAddress,
  longTokenAddress,
  shortTokenAddress,
  longTokenAmount,
  shortTokenAmount,
  isDeposit,
}: {
  paySource: GmPaySource | undefined;
  technicalFees: TechnicalFees | undefined;
  gasPaymentToken: TokenData | undefined;
  gasPaymentTokenAddress: string | undefined;
  longTokenAddress: string | undefined;
  shortTokenAddress: string | undefined;
  longTokenAmount: bigint | undefined;
  shortTokenAmount: bigint | undefined;
  isDeposit: boolean;
}): string | undefined {
  return useMemo(() => {
    if (paySource !== "gmxAccount" || !technicalFees || !gasPaymentToken || !gasPaymentTokenAddress) {
      return undefined;
    }

    if (!("feeUsd" in technicalFees)) {
      return undefined;
    }

    const executionFee = technicalFees as ExecutionFee;

    if (gasPaymentToken.prices.minPrice === undefined) {
      return undefined;
    }

    const gasPaymentTokenAmount = convertToTokenAmount(
      executionFee.feeUsd,
      gasPaymentToken.decimals,
      gasPaymentToken.prices.minPrice
    );

    if (gasPaymentTokenAmount === undefined || gasPaymentTokenAmount === 0n) {
      return undefined;
    }

    let collateralAmount = 0n;
    if (isDeposit) {
      if (longTokenAddress === gasPaymentTokenAddress) {
        collateralAmount = longTokenAmount ?? 0n;
      } else if (shortTokenAddress === gasPaymentTokenAddress) {
        collateralAmount = shortTokenAmount ?? 0n;
      }
    }

    const gmxAccountBalance = gasPaymentToken.gmxAccountBalance ?? 0n;
    const totalRequired = collateralAmount + gasPaymentTokenAmount;

    if (gasPaymentTokenAmount > gmxAccountBalance) {
      return t`${gasPaymentToken.symbol} balance in GMX account is insufficient to cover gas fees`;
    }

    if (totalRequired > gmxAccountBalance) {
      return t`${gasPaymentToken.symbol} balance in GMX account is insufficient to cover gas fees and input amount`;
    }

    return undefined;
  }, [
    paySource,
    technicalFees,
    gasPaymentToken,
    gasPaymentTokenAddress,
    longTokenAddress,
    shortTokenAddress,
    isDeposit,
    longTokenAmount,
    shortTokenAmount,
  ]);
}
