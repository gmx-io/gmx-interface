import { t } from "@lingui/macro";
import { useEffect, useMemo } from "react";
import { toast } from "react-toastify";

import { selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectSetGasPaymentTokenAddress,
  selectSetGmxAccountGasPaymentTokenAddress,
} from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { convertToTokenAmount, convertToUsd, TokenData, TokensData } from "domain/tokens";
import { applyMinimalBuffer } from "domain/tokens/useMaxAvailableAmount";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { getByKey } from "lib/objects";
import { getGasPaymentTokens } from "sdk/configs/express";
import { getIsConfirmedOutOfGasPaymentTokenBalance } from "sdk/utils/express";
import { BatchOrderTxnParams, getBatchTotalPayCollateralAmount } from "sdk/utils/orderTransactions";

import { ExpressTxnParams, GasPaymentValidations } from "./types";

const GAS_PAYMENT_TOKEN_SWITCHED_TOAST_ID = "gas-payment-token-switched";

const notifyGasPaymentTokenSwitched = ({ fromSymbol, toSymbol }: { fromSymbol: string; toSymbol: string }) => {
  const content = t`Insufficient ${fromSymbol} balance. Gas token switched to ${toSymbol}`;

  if (toast.isActive(GAS_PAYMENT_TOKEN_SWITCHED_TOAST_ID)) {
    toast.update(GAS_PAYMENT_TOKEN_SWITCHED_TOAST_ID, { render: content });
  } else {
    helperToast.info(content, { toastId: GAS_PAYMENT_TOKEN_SWITCHED_TOAST_ID });
  }
};

export function findNextGasPaymentToken({
  chainId,
  tokensData,
  gasPaymentToken,
  gasPaymentTokenAmount,
  payAmounts,
  isGmxAccount,
  excludeTokenAddresses,
}: {
  chainId: number;
  tokensData: TokensData | undefined;
  gasPaymentToken: TokenData;
  gasPaymentTokenAmount: bigint;
  payAmounts: Record<string, bigint>;
  isGmxAccount: boolean;
  excludeTokenAddresses?: string[];
}): string | undefined {
  const usdValue = convertToUsd(gasPaymentTokenAmount, gasPaymentToken.decimals, gasPaymentToken.prices.minPrice);
  if (usdValue === undefined) return undefined;

  return getGasPaymentTokens(chainId).find((tokenAddress) => {
    if (excludeTokenAddresses?.includes(tokenAddress)) return false;

    const tokenData = getByKey(tokensData, tokenAddress);
    if (!tokenData || tokenData.address === gasPaymentToken.address) return false;

    const requiredGasAmount = convertToTokenAmount(usdValue, tokenData.decimals, tokenData.prices.minPrice);
    if (requiredGasAmount === undefined) return false;

    const balance = isGmxAccount ? tokenData.gmxAccountBalance : tokenData.walletBalance;
    if (balance === undefined) return false;

    const candidatePayOverlap = payAmounts[tokenAddress] ?? 0n;
    return balance > candidatePayOverlap + applyMinimalBuffer(requiredGasAmount);
  });
}

// Fallback for when the required gas amount is unknown (no express params yet):
// the first gas payment token with any positive balance, minus the excluded ones.
export function findGasPaymentTokenWithPositiveBalance({
  chainId,
  tokensData,
  isGmxAccount,
  excludeTokenAddresses,
}: {
  chainId: number;
  tokensData: TokensData | undefined;
  isGmxAccount: boolean;
  excludeTokenAddresses?: string[];
}): string | undefined {
  return getGasPaymentTokens(chainId).find((tokenAddress) => {
    if (excludeTokenAddresses?.includes(tokenAddress)) return false;

    const tokenData = getByKey(tokensData, tokenAddress);
    if (!tokenData) return false;

    const balance = isGmxAccount ? tokenData.gmxAccountBalance : tokenData.walletBalance;
    return (balance ?? 0n) > 0n;
  });
}

export function useSwitchGasPaymentTokenIfRequiredFromExpressParams({
  expressParams,
  orderParams,
  isGmxAccount,
}: {
  expressParams: Pick<ExpressTxnParams, "gasPaymentValidations" | "gasPaymentParams"> | undefined;
  orderParams: BatchOrderTxnParams | undefined;
  isGmxAccount: boolean;
}) {
  const payAmounts = useMemo(() => (orderParams ? getBatchTotalPayCollateralAmount(orderParams) : {}), [orderParams]);

  useSwitchGasPaymentTokenIfRequired({
    gasPaymentValidations: expressParams?.gasPaymentValidations,
    gasPaymentToken: expressParams?.gasPaymentParams.gasPaymentToken,
    gasPaymentTokenAmount: expressParams?.gasPaymentParams.gasPaymentTokenAmount,
    payAmounts,
    isGmxAccount,
  });
}

function useSwitchGasPaymentTokenIfRequired({
  gasPaymentValidations,
  gasPaymentToken,
  gasPaymentTokenAmount,
  payAmounts,
  isGmxAccount,
}: {
  gasPaymentValidations: GasPaymentValidations | undefined;
  gasPaymentToken: TokenData | undefined;
  gasPaymentTokenAmount: bigint | undefined;
  payAmounts: Record<string, bigint>;
  isGmxAccount: boolean;
}) {
  const { chainId } = useChainId();
  const setGasPaymentTokenAddress = useSelector(selectSetGasPaymentTokenAddress);
  const setGmxAccountGasPaymentTokenAddress = useSelector(selectSetGmxAccountGasPaymentTokenAddress);
  const tokensData = useSelector(selectTokensData);

  useEffect(
    function switchGasPaymentToken() {
      if (
        !getIsConfirmedOutOfGasPaymentTokenBalance(gasPaymentValidations) ||
        !gasPaymentToken ||
        gasPaymentTokenAmount === undefined
      )
        return;

      const anotherGasToken = findNextGasPaymentToken({
        chainId,
        tokensData,
        gasPaymentToken,
        gasPaymentTokenAmount,
        payAmounts,
        isGmxAccount,
      });

      if (anotherGasToken && anotherGasToken !== gasPaymentToken.address) {
        const newTokenData = getByKey(tokensData, anotherGasToken);
        if (isGmxAccount) {
          setGmxAccountGasPaymentTokenAddress(anotherGasToken);
        } else {
          setGasPaymentTokenAddress(anotherGasToken);
        }
        if (newTokenData) {
          notifyGasPaymentTokenSwitched({ fromSymbol: gasPaymentToken.symbol, toSymbol: newTokenData.symbol });
        }
      }
    },
    [
      chainId,
      gasPaymentToken,
      gasPaymentTokenAmount,
      isGmxAccount,
      gasPaymentValidations,
      setGmxAccountGasPaymentTokenAddress,
      payAmounts,
      setGasPaymentTokenAddress,
      tokensData,
    ]
  );
}
