import uniq from "lodash/uniq";
import { useCallback, useMemo } from "react";
import { plural, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";

import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { useHasOutdatedUi } from "domain/legacy";
import { ExecutionFee } from "domain/synthetics/fees";
import { GlvInfo, MarketInfo, MarketsInfoData } from "domain/synthetics/markets";
import {
  getNeedTokenApprove,
  getTokenData,
  TokenData,
  TokensData,
  useTokensAllowanceData,
} from "domain/synthetics/tokens";
import { getCommonError, getGmSwapError } from "domain/synthetics/trade/utils/validation";
import { getSellableInfoGlv } from "domain/synthetics/markets/glv";

import useWallet from "lib/wallets/useWallet";

import { Operation } from "../types";
import { useDepositWithdrawalAmounts } from "./useDepositWithdrawalAmounts";
import { useDepositWithdrawalTransactions } from "./useDepositWithdrawalTransactions";
import { useDepositWithdrawalFees } from "./useDepositWithdrawalFees";

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
  fromMarketToken: TokenData | undefined;
  fromMarketTokenAmount: bigint | undefined;

  marketTokenAmount: bigint | undefined;
  marketTokenUsd: bigint | undefined;
  longTokenAmount: bigint | undefined;
  longTokenUsd: bigint | undefined;
  shortTokenAmount: bigint | undefined;
  shortTokenUsd: bigint | undefined;

  longTokenLiquidityUsd?: bigint | undefined;
  shortTokenLiquidityUsd?: bigint | undefined;

  isHighPriceImpact: boolean;
  isHighPriceImpactAccepted: boolean;
  isHighFeeConsentError: boolean | undefined;

  shouldDisableValidation?: boolean;

  tokensData: TokensData | undefined;
  marketTokensData?: TokensData;
  executionFee: ExecutionFee | undefined;
  selectedGlvGmMarket?: string;
  isMarketTokenDeposit?: boolean;
  marketsInfoData?: MarketsInfoData;
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
  operation,
  longToken,
  longTokenAmount,
  shortToken,
  shortTokenAmount,
  fromMarketToken,
  fromMarketTokenAmount,

  marketTokenAmount,
  longTokenLiquidityUsd,
  shortTokenLiquidityUsd,

  isHighPriceImpact,
  isHighPriceImpactAccepted,

  shouldDisableValidation,

  tokensData,
  marketTokensData,
  executionFee,
  selectedGlvGmMarket,
  isHighFeeConsentError,
  glvInfo,
  isMarketTokenDeposit,
  marketsInfoData,
}: Props) => {
  const chainId = useSelector(selectChainId);
  const { data: hasOutdatedUi } = useHasOutdatedUi();
  const { openConnectModal } = useConnectModal();
  const { account } = useWallet();

  const { isSubmitting, onSubmit } = useDepositWithdrawalTransactions({
    marketInfo,
    toMarketToken: marketToken,
    operation,
    longToken,
    longTokenAmount,
    shortToken,
    shortTokenAmount,
    toMarketTokenAmount: marketTokenAmount,
    shouldDisableValidation,
    tokensData,
    executionFee,
    selectedGlvGmMarket,
    glvInfo,
    isMarketTokenDeposit,
    gmToken: fromMarketToken,
    gmTokenAmount: fromMarketTokenAmount,
  });

  const onConnectAccount = useCallback(() => {
    openConnectModal?.();
  }, [openConnectModal]);

  const payTokenAddresses = useMemo(
    function getPayTokenAddresses() {
      if (!marketToken) {
        return [];
      }

      const addresses: string[] = [];

      if (operation === Operation.Deposit) {
        if (longTokenAmount !== undefined && longTokenAmount > 0 && longToken) {
          addresses.push(longToken.address);
        }
        if (shortTokenAmount !== undefined && shortTokenAmount > 0 && shortToken) {
          addresses.push(shortToken.address);
        }
      } else if (operation === Operation.Withdrawal) {
        addresses.push(marketToken.address);
      }

      return uniq(addresses);
    },
    [operation, marketToken, longTokenAmount, longToken, shortTokenAmount, shortToken]
  );

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: routerAddress,
    tokenAddresses: payTokenAddresses,
  });

  const isAllowanceLoaded = Boolean(tokensAllowanceData);

  const commonError = getCommonError({
    chainId,
    isConnected: true,
    hasOutdatedUi,
  })[0];

  const vaultSellableAmount = glvInfo
    ? getSellableInfoGlv(glvInfo, marketsInfoData, marketTokensData, selectedGlvGmMarket)
    : undefined;

  const [swapError, swapErrorDescription] = getGmSwapError({
    isDeposit,
    marketInfo,
    glvInfo,
    marketToken,
    longToken,
    shortToken,
    gmToken: fromMarketToken,
    marketTokenAmount,
    marketTokenUsd: amounts?.marketTokenUsd,
    longTokenAmount: amounts?.longTokenAmount,
    shortTokenAmount: amounts?.shortTokenAmount,
    longTokenUsd: amounts?.longTokenUsd,
    shortTokenUsd: amounts?.shortTokenUsd,
    gmTokenAmount: amounts?.gmTokenAmount,
    longTokenLiquidityUsd: longTokenLiquidityUsd,
    shortTokenLiquidityUsd: shortTokenLiquidityUsd,
    fees,
    isHighPriceImpact: Boolean(isHighPriceImpact),
    isHighPriceImpactAccepted,
    priceImpactUsd: fees?.swapPriceImpact?.deltaUsd,
    vaultSellableAmount: vaultSellableAmount?.totalAmount,
    marketTokensData,
  });

  const error = commonError || swapError;

  const tokensToApprove = useMemo(
    function getTokensToApprove() {
      const addresses: string[] = [];

      if (!tokensAllowanceData) {
        return addresses;
      }

      if (operation === Operation.Deposit) {
        if (
          longTokenAmount !== undefined &&
          longTokenAmount > 0 &&
          longToken &&
          getNeedTokenApprove(tokensAllowanceData, longToken.address, longTokenAmount)
        ) {
          addresses.push(longToken.address);
        }

        if (
          shortTokenAmount !== undefined &&
          shortTokenAmount > 0 &&
          shortToken &&
          getNeedTokenApprove(tokensAllowanceData, shortToken.address, shortTokenAmount)
        ) {
          addresses.push(shortToken.address);
        }
      } else if (operation === Operation.Withdrawal) {
        if (
          marketTokenAmount !== undefined &&
          marketTokenAmount > 0 &&
          marketToken &&
          getNeedTokenApprove(tokensAllowanceData, marketToken.address, marketTokenAmount)
        ) {
          addresses.push(marketToken.address);
        }
      }

      return uniq(addresses);
    },
    [
      longToken,
      longTokenAmount,
      marketToken,
      marketTokenAmount,
      operation,
      shortToken,
      shortTokenAmount,
      tokensAllowanceData,
    ]
  );

  return useMemo(() => {
    if (!account) {
      return {
        text: t`Connect Wallet`,
        onSubmit: onConnectAccount,
        tokensToApprove,
      };
    }

    if (payTokenAddresses.length > 0 && !isAllowanceLoaded) {
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
        return address === marketToken.address ? operationTokenSymbol : token?.assetSymbol ?? token?.symbol;
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
    error,
    isAllowanceLoaded,
    isDeposit,
    marketToken,
    operation,
    isSubmitting,
    tokensToApprove,
    onConnectAccount,
    shouldDisableValidation,
    onSubmit,
    tokensData,
    marketTokensData,
    payTokenAddresses.length,
    isHighFeeConsentError,
    swapErrorDescription,
    glvInfo,
  ]);
};
