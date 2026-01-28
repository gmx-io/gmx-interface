import { t, Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useCallback, useMemo } from "react";
import { zeroAddress } from "viem";

import { AVALANCHE, SettlementChainId } from "config/chains";
import { getMappedTokenId } from "config/multichain";
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
import { useSourceChainNativeFeeError } from "domain/multichain/useSourceChainNetworkFeeError";
import { ExpressEstimationInsufficientGasPaymentTokenBalanceError } from "domain/synthetics/express/expressOrderUtils";
import type { GlvAndGmMarketsInfoData, GmPaySource, MarketsInfoData } from "domain/synthetics/markets";
import { TechnicalGmFees } from "domain/synthetics/markets/technicalFees/technical-fees-types";
import { Operation } from "domain/synthetics/markets/types";
import { convertToTokenAmount, type TokenData } from "domain/synthetics/tokens";
import {
  getCommonError,
  getDefaultInsufficientGasMessage,
  getGmSwapError,
  takeValidationResult,
  ValidationBannerErrorName,
  ValidationResult,
} from "domain/synthetics/trade/utils/validation";
import { adjustForDecimals, formatBalanceAmount } from "lib/numbers";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { GmSwapFees } from "sdk/types/trade";
import { bigMath } from "sdk/utils/bigmath";

import { ValidationBannerErrorContent } from "components/Errors/gasErrors";

import SpinnerIcon from "img/ic_spinner.svg?react";

import { useLpTransactions } from "./lpTxn/useLpTransactions";
import { useTokensToApprove } from "./useTokensToApprove";

interface Props {
  longTokenLiquidityUsd?: bigint | undefined;
  shortTokenLiquidityUsd?: bigint | undefined;
  shouldDisableValidation?: boolean;
  technicalFees: TechnicalGmFees | undefined;
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
  bannerErrorContent?: React.ReactNode;
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
  });

  // TODO Make all errors in validation language agnostic
  const swapError = getGmSwapError({
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
    marketToken,
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

  const paySourceChainNativeTokenAmount = useMemo(() => {
    if (srcChainId === undefined || !isDeposit) {
      return 0n;
    }

    let paySourceChainNativeTokenAmount = 0n;

    if (payLongToken !== undefined) {
      const sourceChainToken = getMappedTokenId(chainId as SettlementChainId, payLongToken.address, srcChainId);

      if (sourceChainToken !== undefined && sourceChainToken.address === zeroAddress) {
        paySourceChainNativeTokenAmount += adjustForDecimals(
          longTokenAmount,
          payLongToken.decimals,
          sourceChainToken.decimals
        );
      }
    }
    if (payShortToken !== undefined) {
      const sourceChainToken = getMappedTokenId(chainId as SettlementChainId, payShortToken.address, srcChainId);

      if (sourceChainToken !== undefined && sourceChainToken.address === zeroAddress) {
        paySourceChainNativeTokenAmount += adjustForDecimals(
          shortTokenAmount,
          payShortToken.decimals,
          sourceChainToken.decimals
        );
      }
    }

    return paySourceChainNativeTokenAmount;
  }, [isDeposit, payLongToken, longTokenAmount, payShortToken, shortTokenAmount, srcChainId, chainId]);

  const sourceChainNativeFeeError = useSourceChainNativeFeeError({
    networkFeeUsd:
      logicalFees?.logicalNetworkFee?.deltaUsd !== undefined
        ? bigMath.abs(logicalFees.logicalNetworkFee.deltaUsd)
        : undefined,
    paySource,
    chainId,
    srcChainId,
    paySourceChainNativeTokenAmount,
  });

  const formattedEstimationError = useMemo((): ValidationResult | undefined => {
    if (estimationError instanceof ExpressEstimationInsufficientGasPaymentTokenBalanceError) {
      if (gasPaymentToken) {
        const { symbol, decimals } = gasPaymentToken;

        const availableFormatted = formatBalanceAmount(gasPaymentToken.gmxAccountBalance ?? 0n, decimals);

        let collateralAmount = 0n;
        if (isDeposit) {
          if (longTokenAddress === gasPaymentToken.address) {
            collateralAmount += longTokenAmount;
          }
          if (shortTokenAddress === gasPaymentToken.address) {
            collateralAmount += shortTokenAmount;
          }
        }

        const totalRequired = collateralAmount + (estimationError.params?.requiredAmount ?? 0n);
        const requiredFormatted = formatBalanceAmount(totalRequired, decimals);

        return {
          buttonErrorMessage: t`Insufficient ${symbol} balance: ${availableFormatted} available, ${requiredFormatted} required`,
        };
      }
    } else if (estimationError) {
      return {
        buttonErrorMessage: estimationError.name,
      };
    }

    return undefined;
  }, [
    estimationError,
    gasPaymentToken,
    longTokenAddress,
    shortTokenAddress,
    longTokenAmount,
    shortTokenAmount,
    isDeposit,
  ]);

  const error = takeValidationResult(
    commonError,
    swapError,
    expressError,
    sourceChainNativeFeeError,
    formattedEstimationError
  );

  const { approve, isAllowanceLoaded, isAllowanceLoading, tokensToApproveSymbols, isApproving } = useTokensToApprove();

  const isAvalancheGmxAccountWarning = paySource === "gmxAccount" && chainId === AVALANCHE && isDeposit;

  return useMemo((): SubmitButtonState => {
    if (!account) {
      return {
        text: t`Connect Wallet`,
        onSubmit: onConnectAccount,
      };
    }

    if (isAvalancheGmxAccountWarning) {
      return {
        text: t`Not supported`,
        disabled: true,
        onSubmit,
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

    if (error.buttonErrorMessage) {
      return {
        text: error.buttonErrorMessage,
        disabled: !shouldDisableValidation,
        onSubmit: onSubmit,
        isAllowanceLoaded,
        isAllowanceLoading,
        errorDescription: error.buttonTooltipMessage,
        bannerErrorContent: error.bannerErrorName ? (
          <ValidationBannerErrorContent
            validationBannerErrorName={error.bannerErrorName}
            chainId={chainId}
            srcChainId={srcChainId}
          />
        ) : null,
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
    isAvalancheGmxAccountWarning,
    isAllowanceLoading,
    error.buttonErrorMessage,
    error.buttonTooltipMessage,
    error.bannerErrorName,
    isApproving,
    tokensToApproveSymbols,
    isAllowanceLoaded,
    glvInfo,
    isSubmitting,
    technicalFees,
    isLoading,
    isDeposit,
    onSubmit,
    onConnectAccount,
    shouldDisableValidation,
    chainId,
    srcChainId,
    approve,
    operation,
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
  technicalFees: TechnicalGmFees | undefined;
  gasPaymentToken: TokenData | undefined;
  gasPaymentTokenAddress: string | undefined;
  longTokenAddress: string | undefined;
  shortTokenAddress: string | undefined;
  longTokenAmount: bigint | undefined;
  shortTokenAmount: bigint | undefined;
  isDeposit: boolean;
}): ValidationResult | undefined {
  return useMemo(() => {
    if (paySource !== "gmxAccount" || !technicalFees || !gasPaymentToken || !gasPaymentTokenAddress) {
      return undefined;
    }

    const fees = technicalFees.kind === "gmxAccount" ? technicalFees.fees : undefined;
    if (!fees) {
      return undefined;
    }

    if (gasPaymentToken.prices.minPrice === undefined) {
      return undefined;
    }

    const gasPaymentTokenAmount = convertToTokenAmount(
      fees.executionFee.feeUsd + fees.relayFeeUsd,
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

    if (totalRequired > gmxAccountBalance) {
      return {
        buttonErrorMessage: getDefaultInsufficientGasMessage(),
        bannerErrorName: ValidationBannerErrorName.insufficientGmxAccountSomeGasTokenBalance,
      };
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
