import { t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ImSpinner2 } from "react-icons/im";

import { getContract } from "config/contracts";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ExecutionFee } from "domain/synthetics/fees";
import { GlvAndGmMarketsInfoData, GlvInfo, MarketInfo, MarketsInfoData } from "domain/synthetics/markets";
import { TokenData, TokensData } from "domain/synthetics/tokens";
import { getCommonError, getGmSwapError } from "domain/synthetics/trade/utils/validation";
import { approveTokens } from "domain/tokens";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { userAnalytics } from "lib/userAnalytics";
import { TokenApproveClickEvent, TokenApproveResultEvent } from "lib/userAnalytics/types";
import useWallet from "lib/wallets/useWallet";

import { useDepositWithdrawalAmounts } from "./useDepositWithdrawalAmounts";
import { useDepositWithdrawalFees } from "./useDepositWithdrawalFees";
import { useDepositWithdrawalTransactions } from "./useDepositWithdrawalTransactions";
import { useTokensToApprove } from "./useTokensToApprove";
import { getGmSwapBoxApproveTokenSymbol } from "../getGmSwapBoxApproveToken";
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

  shouldDisableValidation?: boolean;

  tokensData: TokensData | undefined;
  marketTokensData?: TokensData;
  executionFee: ExecutionFee | undefined;
  selectedMarketForGlv?: string;
  isMarketTokenDeposit?: boolean;
  marketsInfoData?: MarketsInfoData;
  glvAndMarketsInfoData: GlvAndGmMarketsInfoData;
  selectedMarketInfoForGlv?: MarketInfo;
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

  shouldDisableValidation,

  tokensData,
  marketTokensData,
  executionFee,
  selectedMarketForGlv,
  selectedMarketInfoForGlv,
  glvInfo,
  isMarketTokenDeposit,
  glvAndMarketsInfoData,
}: Props): SubmitButtonState => {
  const chainId = useSelector(selectChainId);
  const hasOutdatedUi = useHasOutdatedUi();
  const { openConnectModal } = useConnectModal();
  const { account, signer } = useWallet();

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
    priceImpactUsd: fees?.swapPriceImpact?.deltaUsd,
    marketTokensData,
    isMarketTokenDeposit,
  });

  const error = commonError || swapError;

  const { tokensToApprove, isAllowanceLoading, isAllowanceLoaded } = useTokensToApprove({
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

  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    if (!tokensToApprove.length && isApproving) {
      setIsApproving(false);
    }
  }, [isApproving, tokensToApprove]);

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

    if (error) {
      return {
        text: error,
        disabled: !shouldDisableValidation,
        onSubmit: onSubmit,
        tokensToApprove,
        isAllowanceLoaded,
        isAllowanceLoading,
        errorDescription: swapErrorDescription,
      };
    }

    if (isApproving && tokensToApprove.length) {
      const tokenSymbol = getGmSwapBoxApproveTokenSymbol(tokensToApprove[0], tokensData, glvAndMarketsInfoData);

      return {
        text: (
          <>
            {t`Allow ${tokenSymbol} to be spent`} <ImSpinner2 className="ml-4 animate-spin" />
          </>
        ),
        disabled: true,
      };
    }

    if (isAllowanceLoaded && tokensToApprove.length > 0) {
      const onApprove = () => {
        const tokenAddress = tokensToApprove[0];

        if (!chainId || isApproving || !tokenAddress) return;

        userAnalytics.pushEvent<TokenApproveClickEvent>({
          event: "TokenApproveAction",
          data: {
            action: "ApproveClick",
          },
        });

        approveTokens({
          setIsApproving,
          signer,
          tokenAddress,
          spender: getContract(chainId, "SyntheticsRouter"),
          pendingTxns: [],
          setPendingTxns: () => null,
          infoTokens: {},
          chainId,
          approveAmount: undefined,
          onApproveFail: () => {
            userAnalytics.pushEvent<TokenApproveResultEvent>({
              event: "TokenApproveAction",
              data: {
                action: "ApproveFail",
              },
            });
          },
          permitParams: undefined,
        });
      };

      const tokenSymbol = getGmSwapBoxApproveTokenSymbol(tokensToApprove[0], tokensData, glvAndMarketsInfoData);

      return {
        text: t`Allow ${tokenSymbol} to be spent`,
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
    tokensToApprove,
    isAllowanceLoaded,
    glvInfo,
    isSubmitting,
    isDeposit,
    onSubmit,
    onConnectAccount,
    shouldDisableValidation,
    swapErrorDescription,
    chainId,
    tokensData,
    glvAndMarketsInfoData,
    signer,
    operation,
  ]);
};
