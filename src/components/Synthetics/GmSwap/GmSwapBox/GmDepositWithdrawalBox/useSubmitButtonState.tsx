import { plural, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useCallback, useMemo } from "react";

import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { useHasOutdatedUi } from "domain/legacy";
import { ExecutionFee } from "domain/synthetics/fees";
import { GlvInfo, MarketInfo, MarketsInfoData } from "domain/synthetics/markets";
import { getTokenData, TokenData, TokensData } from "domain/synthetics/tokens";
import { getCommonError, getGmSwapError } from "domain/synthetics/trade/utils/validation";

import useWallet from "lib/wallets/useWallet";

import { useDepositWithdrawalAmounts } from "./useDepositWithdrawalAmounts";
import { useDepositWithdrawalFees } from "./useDepositWithdrawalFees";
import { useDepositWithdrawalTransactions } from "./useDepositWithdrawalTransactions";
import { useTokensToApprove } from "./useTokensToApprove";

import { Operation } from "../types";

interface Props {
  amounts: ReturnType<typeof useDepositWithdrawalAmounts>;
  fees: ReturnType<typeof useDepositWithdrawalFees>["fees"];
  isDeposit: boolean;
  routerAddress: string;
  marketInfo?: MarketInfo;
  glvInfo?: GlvInfo;
  marketToken: TokenData;
  operation: Operation;
  longToken: TokenData | undefined;
  shortToken: TokenData | undefined;
  glvToken: TokenData | undefined;
  longTokenLiquidityUsd?: bigint | undefined;
  shortTokenLiquidityUsd?: bigint | undefined;

  isHighPriceImpact: boolean;
  isHighPriceImpactAccepted: boolean;
  isHighFeeConsentError: boolean | undefined;

  shouldDisableValidation?: boolean;

  tokensData: TokensData | undefined;
  marketTokensData?: TokensData;
  executionFee: ExecutionFee | undefined;
  selectedMarketForGlv?: string;
  isMarketTokenDeposit?: boolean;
  marketsInfoData?: MarketsInfoData;
  selectedMarketInfoForGlv?: MarketInfo;
}

const processingTextMap = {
  [Operation.Deposit]: (symbol: string) => t`Buying ${symbol}...`,
  [Operation.Withdrawal]: (symbol: string) => t`Selling ${symbol}...`,
  [Operation.Shift]: (symbol: string) => t`Shifting ${symbol}...`,
};

export const useSubmitButtonState = ({
  isDeposit,
  routerAddress,
  amounts,
  fees,
  marketInfo,
  marketToken,
  longToken,
  operation,
  shortToken,
  glvToken,
  longTokenLiquidityUsd,
  shortTokenLiquidityUsd,

  isHighPriceImpact,
  isHighPriceImpactAccepted,

  shouldDisableValidation,

  tokensData,
  marketTokensData,
  executionFee,
  selectedMarketForGlv,
  selectedMarketInfoForGlv,
  isHighFeeConsentError,
  glvInfo,
  isMarketTokenDeposit,
}: Props) => {
  const chainId = useSelector(selectChainId);
  const { data: hasOutdatedUi } = useHasOutdatedUi();
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

  const { isSubmitting, onSubmit } = useDepositWithdrawalTransactions({
    marketInfo,
    marketToken,
    operation,
    longToken,
    longTokenAmount,
    shortToken,
    shortTokenAmount,
    marketTokenAmount,
    glvTokenAmount,
    glvTokenUsd,
    shouldDisableValidation,
    tokensData,
    executionFee,
    selectedMarketForGlv,
    glvInfo,
    isMarketTokenDeposit,
    selectedMarketInfoForGlv,
    marketTokenUsd,
    isFirstBuy,
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
    marketToken,
    longToken,
    shortToken,
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
    fees,
    isHighPriceImpact: Boolean(isHighPriceImpact),
    isHighPriceImpactAccepted,
    priceImpactUsd: fees?.swapPriceImpact?.deltaUsd,
    marketTokensData,
    isMarketTokenDeposit,
  });

  const error = commonError || swapError;

  const { tokensToApprove, isAllowanceLoading } = useTokensToApprove({
    routerAddress,
    glvInfo,
    operation,
    marketToken,
    marketTokenAmount,
    longToken,
    longTokenAmount,
    shortToken,
    shortTokenAmount,
    glvToken,
    glvTokenAmount,
    isMarketTokenDeposit,
  });

  return useMemo(() => {
    if (!account) {
      return {
        text: t`Connect Wallet`,
        onSubmit: onConnectAccount,
        tokensToApprove,
      };
    }

    if (isAllowanceLoading) {
      return {
        text: t`Loading...`,
        disabled: true,
        tokensToApprove,
      };
    }

    if (error) {
      return {
        text: error,
        disabled: !shouldDisableValidation,
        onClick: onSubmit,
        tokensToApprove,
        errorDescription: swapErrorDescription,
      };
    }

    const operationTokenSymbol = glvInfo ? "GLV" : "GM";

    if (isSubmitting) {
      return {
        text: processingTextMap[operation](operationTokenSymbol),
        disabled: true,
      };
    }

    if (isHighFeeConsentError) {
      return {
        text: t`High Network Fee not yet acknowledged`,
        disabled: true,
      };
    }

    if (tokensToApprove.length > 0 && marketToken) {
      const symbols = tokensToApprove.map((address) => {
        const token = getTokenData(tokensData, address) || getTokenData(marketTokensData, address);
        return token?.symbol;
      });

      const symbolsText = symbols.join(", ");

      return {
        text: plural(symbols.length, {
          one: `Pending ${symbolsText} approval`,
          other: `Pending ${symbolsText} approvals`,
        }),
        disabled: true,
        tokensToApprove,
      };
    }

    return {
      text: isDeposit ? t`Buy ${operationTokenSymbol}` : t`Sell ${operationTokenSymbol}`,
      onSubmit,
      tokensToApprove,
    };
  }, [
    account,
    isAllowanceLoading,
    error,
    glvInfo,
    isSubmitting,
    isHighFeeConsentError,
    tokensToApprove,
    marketToken,
    isDeposit,
    onSubmit,
    onConnectAccount,
    shouldDisableValidation,
    swapErrorDescription,
    operation,
    tokensData,
    marketTokensData,
  ]);
};
