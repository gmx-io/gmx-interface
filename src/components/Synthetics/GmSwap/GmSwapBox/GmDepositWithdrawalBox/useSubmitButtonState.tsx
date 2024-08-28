import { plural, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { getContract } from "config/contracts";
import { DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useHasOutdatedUi } from "domain/legacy";
import { ExecutionFee } from "domain/synthetics/fees";
import { createDepositTxn, createGlvDepositTxn, createWithdrawalTxn, MarketInfo } from "domain/synthetics/markets";
import { createShiftTxn } from "domain/synthetics/markets/createShiftTxn";
import {
  getNeedTokenApprove,
  getTokenData,
  TokenData,
  TokensData,
  useTokensAllowanceData,
} from "domain/synthetics/tokens";
import { getCommonError, getGmSwapError } from "domain/synthetics/trade/utils/validation";
import { usePendingTxns } from "lib/usePendingTxns";
import useWallet from "lib/wallets/useWallet";
import uniq from "lodash/uniq";
import { useCallback, useMemo, useState } from "react";
import { Operation } from "../types";
import { useDepositWithdrawalAmounts } from "./useDepositWithdrawalAmounts";
import { useFees } from "./useFees";
import { GlvMarketInfo } from "@/domain/synthetics/tokens/useGlvMarkets";

interface Props {
  amounts: ReturnType<typeof useDepositWithdrawalAmounts>;
  fees: ReturnType<typeof useFees>["fees"];
  isDeposit: boolean;
  routerAddress: string;
  marketInfo?: MarketInfo;
  vaultInfo?: GlvMarketInfo;
  marketToken: TokenData;
  operation: Operation;
  longToken: TokenData | undefined;
  shortToken: TokenData | undefined;

  marketTokenAmount: bigint | undefined;
  marketTokenUsd: bigint | undefined;
  longTokenAmount: bigint | undefined;
  longTokenUsd: bigint | undefined;
  shortTokenAmount: bigint | undefined;
  shortTokenUsd: bigint | undefined;

  fromMarketTokenAmount?: bigint;
  fromMarketToken?: TokenData;
  fromMarketTokenUsd?: bigint;

  longTokenLiquidityUsd?: bigint | undefined;
  shortTokenLiquidityUsd?: bigint | undefined;

  isHighPriceImpact: boolean;
  isHighPriceImpactAccepted: boolean;
  isHighFeeConsentError: boolean | undefined;

  shouldDisableValidation?: boolean;

  tokensData: TokensData | undefined;
  marketTokensData?: TokensData;
  executionFee: ExecutionFee | undefined;
  isGlv: boolean;
  selectedGlvGmMarket?: string;
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

  marketTokenAmount,
  longTokenLiquidityUsd,
  shortTokenLiquidityUsd,

  isHighPriceImpact,
  isHighPriceImpactAccepted,

  shouldDisableValidation,

  fromMarketTokenAmount,
  fromMarketToken,
  tokensData,
  marketTokensData,
  executionFee,
  isGlv,
  selectedGlvGmMarket,
  isHighFeeConsentError,
  vaultInfo,
}: Props) => {
  const chainId = useSelector(selectChainId);
  const { data: hasOutdatedUi } = useHasOutdatedUi();
  const { openConnectModal } = useConnectModal();
  const { signer, account } = useWallet();
  const { setPendingDeposit, setPendingWithdrawal, setPendingShift } = useSyntheticsEvents();
  const [, setPendingTxns] = usePendingTxns();

  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const swapError = getGmSwapError({
    isDeposit,
    marketInfo,
    marketToken,
    longToken: longToken,
    shortToken: shortToken,
    marketTokenAmount,
    marketTokenUsd: amounts?.marketTokenUsd,
    longTokenAmount: amounts?.longTokenAmount,
    shortTokenAmount: amounts?.shortTokenAmount,
    longTokenUsd: amounts?.longTokenUsd,
    shortTokenUsd: amounts?.shortTokenUsd,
    longTokenLiquidityUsd: longTokenLiquidityUsd,
    shortTokenLiquidityUsd: shortTokenLiquidityUsd,
    fees,
    isHighPriceImpact: Boolean(isHighPriceImpact),
    isHighPriceImpactAccepted,
    priceImpactUsd: fees?.swapPriceImpact?.deltaUsd,
  })[0];

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
      } else if (operation === Operation.Shift) {
        if (
          fromMarketTokenAmount !== undefined &&
          fromMarketTokenAmount > 0 &&
          fromMarketToken &&
          getNeedTokenApprove(tokensAllowanceData, fromMarketToken.address, fromMarketTokenAmount)
        ) {
          addresses.push(fromMarketToken.address);
        }
      }

      return uniq(addresses);
    },
    [
      fromMarketToken,
      fromMarketTokenAmount,
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

  const onCreateDeposit = useCallback(
    function onCreateDeposit() {
      if (
        !account ||
        !executionFee ||
        !marketToken ||
        !marketInfo ||
        marketTokenAmount === undefined ||
        !tokensData ||
        !signer
      ) {
        return Promise.resolve();
      }

      const initialLongTokenAddress = longToken?.address || marketInfo.longTokenAddress;
      const initialShortTokenAddress = marketInfo.isSameCollaterals
        ? initialLongTokenAddress
        : shortToken?.address || marketInfo.shortTokenAddress;

      if (isGlv && selectedGlvGmMarket && vaultInfo) {
        return createGlvDepositTxn(chainId, signer, {
          account,
          initialLongTokenAddress,
          initialShortTokenAddress,
          minGlvTokens: marketTokenAmount,
          glv: vaultInfo.indexTokenAddress,
          longTokenSwapPath: [],
          shortTokenSwapPath: [],
          longTokenAmount: longTokenAmount ?? 0n,
          shortTokenAmount: shortTokenAmount ?? 0n,
          market: selectedGlvGmMarket,
          allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
          executionFee: executionFee.feeTokenAmount,
          skipSimulation: shouldDisableValidation,
          tokensData,
          setPendingTxns,
          setPendingDeposit,
          isMarketTokenDeposit: longToken?.symbol === "GM",
        });
      }

      return createDepositTxn(chainId, signer, {
        account,
        initialLongTokenAddress,
        initialShortTokenAddress,
        longTokenSwapPath: [],
        shortTokenSwapPath: [],
        longTokenAmount: longTokenAmount ?? 0n,
        shortTokenAmount: shortTokenAmount ?? 0n,
        marketTokenAddress: marketToken.address,
        minMarketTokens: marketTokenAmount,
        executionFee: executionFee.feeTokenAmount,
        allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
        skipSimulation: shouldDisableValidation,
        tokensData,
        setPendingTxns,
        setPendingDeposit,
      });
    },
    [
      account,
      executionFee,
      longToken,
      longTokenAmount,
      marketInfo,
      marketToken,
      marketTokenAmount,
      shortToken,
      shortTokenAmount,
      signer,
      tokensData,
      shouldDisableValidation,
      chainId,
      setPendingDeposit,
      setPendingTxns,
      selectedGlvGmMarket,
      isGlv,
      vaultInfo,
    ]
  );

  const onCreateWithdrawal = useCallback(
    function onCreateWithdrawal() {
      if (
        !account ||
        !marketInfo ||
        !marketToken ||
        !executionFee ||
        longTokenAmount === undefined ||
        shortTokenAmount === undefined ||
        !tokensData ||
        !signer
      ) {
        return Promise.resolve();
      }

      return createWithdrawalTxn(chainId, signer, {
        account,
        initialLongTokenAddress: longToken?.address || marketInfo.longTokenAddress,
        initialShortTokenAddress: shortToken?.address || marketInfo.shortTokenAddress,
        longTokenSwapPath: [],
        shortTokenSwapPath: [],
        marketTokenAmount: marketTokenAmount!,
        minLongTokenAmount: longTokenAmount,
        minShortTokenAmount: shortTokenAmount,
        marketTokenAddress: marketToken.address,
        executionFee: executionFee.feeTokenAmount,
        allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
        tokensData,
        skipSimulation: shouldDisableValidation,
        setPendingTxns,
        setPendingWithdrawal,
      });
    },
    [
      account,
      executionFee,
      longToken,
      longTokenAmount,
      marketInfo,
      marketToken,
      marketTokenAmount,
      shortToken,
      shortTokenAmount,
      signer,
      tokensData,
      shouldDisableValidation,
      chainId,
      setPendingWithdrawal,
      setPendingTxns,
    ]
  );

  const onCreateShift = useCallback(
    function onCreateShift() {
      if (
        !signer ||
        !account ||
        !fromMarketToken ||
        !executionFee ||
        !marketToken ||
        fromMarketTokenAmount === undefined ||
        marketTokenAmount === undefined ||
        !tokensData
      ) {
        return Promise.resolve();
      }

      return createShiftTxn(chainId, signer, {
        account,
        fromMarketTokenAddress: fromMarketToken.address,
        fromMarketTokenAmount: fromMarketTokenAmount,
        toMarketTokenAddress: marketToken.address,
        minToMarketTokenAmount: marketTokenAmount,
        executionFee: executionFee.feeTokenAmount,
        allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
        skipSimulation: shouldDisableValidation,
        tokensData,
        setPendingTxns,
        setPendingShift,
      });
    },
    [
      account,
      executionFee,
      fromMarketToken,
      fromMarketTokenAmount,
      marketToken,
      marketTokenAmount,
      signer,
      tokensData,
      shouldDisableValidation,
      chainId,
      setPendingShift,
      setPendingTxns,
    ]
  );

  const onSubmit = useCallback(() => {
    setIsSubmitting(true);

    let txnPromise: Promise<any>;

    if (operation === Operation.Deposit) {
      txnPromise = onCreateDeposit();
    } else if (operation === Operation.Withdrawal) {
      txnPromise = onCreateWithdrawal();
    } else {
      txnPromise = onCreateShift();
    }

    txnPromise
      .catch((error) => {
        throw error;
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [operation, onCreateDeposit, onCreateShift, onCreateWithdrawal]);

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
      };
    }

    const operationTokenSymbol = isGlv ? "GLV" : "GM";

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
        return address === marketToken.address ? "GM" : token?.assetSymbol ?? token?.symbol;
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
    isGlv,
    isHighFeeConsentError,
  ]);
};
