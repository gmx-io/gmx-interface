import { useCallback, useState } from "react";

import { DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ExecutionFee } from "domain/synthetics/fees";
import {
  createDepositTxn,
  createGlvDepositTxn,
  createGlvWithdrawalTxn,
  createWithdrawalTxn,
  GlvInfo,
  MarketInfo,
} from "domain/synthetics/markets";
import { TokenData, TokensData } from "domain/synthetics/tokens";
import { usePendingTxns } from "lib/usePendingTxns";
import useWallet from "lib/wallets/useWallet";

import { Operation } from "../types";

interface Props {
  marketInfo?: MarketInfo;
  vaultInfo?: GlvInfo;
  toMarketToken: TokenData;
  operation: Operation;
  longToken: TokenData | undefined;
  shortToken: TokenData | undefined;
  gmToken: TokenData | undefined;

  toMarketTokenAmount: bigint | undefined;
  longTokenAmount: bigint | undefined;
  shortTokenAmount: bigint | undefined;
  gmTokenAmount: bigint | undefined;

  shouldDisableValidation?: boolean;

  tokensData: TokensData | undefined;
  executionFee: ExecutionFee | undefined;
  selectedGlvGmMarket?: string;
  isMarketTokenDeposit?: boolean;
}

export const useDepositWithdrawalTransactions = ({
  marketInfo,
  toMarketToken,
  operation,
  longToken,
  longTokenAmount,
  shortToken,
  shortTokenAmount,
  gmToken,
  gmTokenAmount,

  toMarketTokenAmount,
  shouldDisableValidation,
  tokensData,
  executionFee,
  selectedGlvGmMarket,
  vaultInfo,
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
        !toMarketToken ||
        !marketInfo ||
        toMarketTokenAmount === undefined ||
        !tokensData ||
        !signer
      ) {
        return Promise.resolve();
      }
      const initialLongTokenAddress = longToken?.address || marketInfo.longTokenAddress;
      const initialShortTokenAddress = marketInfo.isSameCollaterals
        ? initialLongTokenAddress
        : shortToken?.address || marketInfo.shortTokenAddress;

      const initialGmTokenAddress = gmToken?.address;

      if (vaultInfo && selectedGlvGmMarket) {
        return createGlvDepositTxn(chainId, signer, {
          account,
          initialLongTokenAddress,
          initialShortTokenAddress,
          initialGmTokenAddress,
          minMarketTokens: toMarketTokenAmount,
          marketTokenAddress: vaultInfo.indexTokenAddress,
          longTokenSwapPath: [],
          shortTokenSwapPath: [],
          longTokenAmount: longTokenAmount ?? 0n,
          shortTokenAmount: shortTokenAmount ?? 0n,
          gmTokenAmount: gmTokenAmount ?? 0n,
          glvMarket: selectedGlvGmMarket,
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
        marketTokenAddress: toMarketToken.address,
        minMarketTokens: toMarketTokenAmount,
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
      toMarketToken,
      toMarketTokenAmount,
      shortToken,
      shortTokenAmount,
      signer,
      tokensData,
      shouldDisableValidation,
      chainId,
      setPendingDeposit,
      setPendingTxns,
      selectedGlvGmMarket,
      vaultInfo,
      isMarketTokenDeposit,
      gmToken,
      gmTokenAmount,
    ]
  );

  const onCreateWithdrawal = useCallback(
    function onCreateWithdrawal() {
      if (
        !account ||
        !marketInfo ||
        !toMarketToken ||
        !executionFee ||
        longTokenAmount === undefined ||
        shortTokenAmount === undefined ||
        !tokensData ||
        !signer
      ) {
        return Promise.resolve();
      }

      if (vaultInfo && selectedGlvGmMarket) {
        return createGlvWithdrawalTxn(chainId, signer, {
          account,
          initialLongTokenAddress: longToken?.address || marketInfo.longTokenAddress,
          initialShortTokenAddress: shortToken?.address || marketInfo.shortTokenAddress,
          longTokenSwapPath: [],
          shortTokenSwapPath: [],
          marketTokenAddress: vaultInfo.indexToken.address,
          marketTokenAmount: toMarketTokenAmount!,
          minLongTokenAmount: longTokenAmount,
          minShortTokenAmount: shortTokenAmount,
          executionFee: executionFee.feeTokenAmount,
          allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
          skipSimulation: shouldDisableValidation,
          tokensData,
          setPendingTxns,
          setPendingWithdrawal,
          selectedGmMarket: selectedGlvGmMarket,
          glv: vaultInfo.marketTokenAddress,
        });
      }

      return createWithdrawalTxn(chainId, signer, {
        account,
        initialLongTokenAddress: longToken?.address || marketInfo.longTokenAddress,
        initialShortTokenAddress: shortToken?.address || marketInfo.shortTokenAddress,
        longTokenSwapPath: [],
        shortTokenSwapPath: [],
        marketTokenAmount: toMarketTokenAmount!,
        minLongTokenAmount: longTokenAmount,
        minShortTokenAmount: shortTokenAmount,
        marketTokenAddress: toMarketToken.address,
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
      toMarketToken,
      toMarketTokenAmount,
      shortToken,
      shortTokenAmount,
      signer,
      tokensData,
      shouldDisableValidation,
      chainId,
      setPendingWithdrawal,
      setPendingTxns,
      selectedGlvGmMarket,
      vaultInfo,
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
