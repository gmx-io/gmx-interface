import { useCallback, useState } from "react";

import { DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ExecutionFee } from "domain/synthetics/fees";
import { createDepositTxn, createWithdrawalTxn, GlvInfo, MarketInfo } from "domain/synthetics/markets";
import { createGlvDepositTxn } from "domain/synthetics/markets/createGlvDepositTxn";
import { createGlvWithdrawalTxn } from "domain/synthetics/markets/createGlvWithdrawalTxn";
import { TokenData, TokensData } from "domain/synthetics/tokens";
import { usePendingTxns } from "lib/usePendingTxns";
import useWallet from "lib/wallets/useWallet";

import { Operation } from "../types";

interface Props {
  marketInfo?: MarketInfo;
  glvInfo?: GlvInfo;
  marketToken: TokenData;
  operation: Operation;
  longToken: TokenData | undefined;
  shortToken: TokenData | undefined;

  marketTokenAmount: bigint | undefined;
  longTokenAmount: bigint | undefined;
  shortTokenAmount: bigint | undefined;

  glvTokenAmount: bigint | undefined;

  shouldDisableValidation?: boolean;

  tokensData: TokensData | undefined;
  executionFee: ExecutionFee | undefined;
  selectedMarketForGlv?: string;
  isMarketTokenDeposit?: boolean;
}

export const useDepositWithdrawalTransactions = ({
  marketInfo,
  marketToken,
  operation,
  longToken,
  longTokenAmount,
  shortToken,
  shortTokenAmount,
  glvTokenAmount,

  marketTokenAmount,
  shouldDisableValidation,
  tokensData,
  executionFee,
  selectedMarketForGlv,
  glvInfo,
  isMarketTokenDeposit,
}: Props) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const chainId = useSelector(selectChainId);
  const { signer, account } = useWallet();
  const { setPendingDeposit, setPendingWithdrawal } = useSyntheticsEvents();
  const [, setPendingTxns] = usePendingTxns();

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

      if (glvInfo && selectedMarketForGlv) {
        return createGlvDepositTxn(chainId, signer, {
          account,
          initialLongTokenAddress,
          initialShortTokenAddress,
          minMarketTokens: glvTokenAmount ?? 0n,
          glvAddress: glvInfo.marketTokenAddress,
          marketTokenAddress: selectedMarketForGlv,
          longTokenSwapPath: [],
          shortTokenSwapPath: [],
          longTokenAmount: longTokenAmount ?? 0n,
          shortTokenAmount: shortTokenAmount ?? 0n,
          marketTokenAmount: marketTokenAmount ?? 0n,
          allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
          executionFee: executionFee.feeTokenAmount,
          skipSimulation: shouldDisableValidation,
          tokensData,
          setPendingTxns,
          setPendingDeposit,
          isMarketTokenDeposit: isMarketTokenDeposit ?? false,
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
      selectedMarketForGlv,
      glvInfo,
      isMarketTokenDeposit,
      glvTokenAmount,
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

      if (glvInfo && selectedMarketForGlv) {
        return createGlvWithdrawalTxn(chainId, signer, {
          account,
          initialLongTokenAddress: longToken?.address || marketInfo.longTokenAddress,
          initialShortTokenAddress: shortToken?.address || marketInfo.shortTokenAddress,
          longTokenSwapPath: [],
          shortTokenSwapPath: [],
          glvTokenAddress: glvInfo.marketTokenAddress,
          glvTokenAmount: glvTokenAmount!,
          minLongTokenAmount: longTokenAmount,
          minShortTokenAmount: shortTokenAmount,
          executionFee: executionFee.feeTokenAmount,
          allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
          skipSimulation: shouldDisableValidation,
          tokensData,
          setPendingTxns,
          setPendingWithdrawal,
          selectedGmMarket: selectedMarketForGlv,
          glv: glvInfo.marketTokenAddress,
        });
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
      selectedMarketForGlv,
      glvInfo,
      glvTokenAmount,
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
      throw new Error("Invalid operation");
    }

    txnPromise
      .catch((error) => {
        throw error;
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [operation, onCreateDeposit, onCreateWithdrawal]);

  return {
    onSubmit,
    isSubmitting,
  };
};
