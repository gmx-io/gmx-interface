import { t } from "@lingui/macro";
import { useEffect } from "react";

import { selectUnavailableGasPaymentTokenAddresses } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectGasPaymentTokenAllowance,
  selectSetGasPaymentTokenReplacement,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectGasPaymentTokenAddress,
  selectGmxAccountGasPaymentTokenAddress,
  selectSetGasPaymentTokenAddress,
  selectSetGmxAccountGasPaymentTokenAddress,
} from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getNeedTokenApprove, type TokensAllowanceData } from "domain/synthetics/tokens";
import { convertToTokenAmount, convertToUsd, TokenData, TokensData } from "domain/tokens";
import { applyMinimalBuffer } from "domain/tokens/useMaxAvailableAmount";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { EMPTY_ARRAY, EMPTY_OBJECT, getByKey } from "lib/objects";
import { getGasPaymentTokens } from "sdk/configs/express";
import { getIsConfirmedOutOfGasPaymentTokenBalance } from "sdk/utils/express";

import { ExpressTxnParams, GasPaymentValidations } from "./types";

const GAS_PAYMENT_TOKEN_SWITCHED_TOAST_ID = "gas-payment-token-switched";

const notifyGasPaymentTokenSwitched = ({
  fromSymbol,
  toSymbol,
  isGmxAccount,
}: {
  fromSymbol: string;
  toSymbol: string;
  isGmxAccount: boolean;
}) => {
  const content = isGmxAccount
    ? t`Not enough ${fromSymbol} in your GMX Account for fees. Gas payment token switched to ${toSymbol}`
    : t`Not enough ${fromSymbol} in your wallet for fees. Gas payment token switched to ${toSymbol}`;

  helperToast.infoOrUpdate(content, GAS_PAYMENT_TOKEN_SWITCHED_TOAST_ID);
};

export function findNextGasPaymentToken({
  chainId,
  tokensData,
  gasPaymentToken,
  gasPaymentTokenAmount,
  payAmounts,
  isGmxAccount,
  excludeTokenAddresses,
  tokensAllowanceData,
}: {
  chainId: number;
  tokensData: TokensData | undefined;
  gasPaymentToken: TokenData;
  gasPaymentTokenAmount: bigint;
  payAmounts: Record<string, bigint>;
  isGmxAccount: boolean;
  excludeTokenAddresses?: string[];
  tokensAllowanceData?: TokensAllowanceData;
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
    const requiredAmount = candidatePayOverlap + applyMinimalBuffer(requiredGasAmount);
    if (balance <= requiredAmount) return false;

    return !tokensAllowanceData || !getNeedTokenApprove(tokensAllowanceData, tokenAddress, requiredAmount, EMPTY_ARRAY);
  });
}

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

// Prefers an already approved token; an unapproved one only when the fee is paid with the saved token,
// otherwise the fallback to a non-saved token would override it again
export function getGasPaymentTokenToSwitchTo({
  savedGasPaymentTokenAddress,
  tokensAllowanceData,
  ...params
}: Parameters<typeof findNextGasPaymentToken>[0] & {
  savedGasPaymentTokenAddress: string | undefined;
}): string | undefined {
  if (params.isGmxAccount) {
    return findNextGasPaymentToken(params);
  }

  const isSavedGasPaymentToken = params.gasPaymentToken.address === savedGasPaymentTokenAddress;
  const excludeTokenAddresses =
    savedGasPaymentTokenAddress !== undefined
      ? [...(params.excludeTokenAddresses ?? []), savedGasPaymentTokenAddress]
      : params.excludeTokenAddresses;

  return (
    findNextGasPaymentToken({
      ...params,
      excludeTokenAddresses,
      tokensAllowanceData: tokensAllowanceData ?? EMPTY_OBJECT,
    }) ?? (isSavedGasPaymentToken ? findNextGasPaymentToken({ ...params, excludeTokenAddresses }) : undefined)
  );
}

export function useSwitchGasPaymentTokenIfRequiredFromExpressParams({
  expressParams,
  payAmounts,
  isGmxAccount,
  canSwitchGasPaymentToken,
}: {
  expressParams: Pick<ExpressTxnParams, "gasPaymentValidations" | "gasPaymentParams"> | undefined;
  payAmounts: Record<string, bigint>;
  isGmxAccount: boolean;
  canSwitchGasPaymentToken: boolean;
}) {
  useSwitchGasPaymentTokenIfRequired({
    gasPaymentValidations: expressParams?.gasPaymentValidations,
    gasPaymentToken: expressParams?.gasPaymentParams.gasPaymentToken,
    gasPaymentTokenAmount: expressParams?.gasPaymentParams.gasPaymentTokenAmount,
    payAmounts,
    isGmxAccount,
    canSwitchGasPaymentToken,
  });
}

export function useSwitchGasPaymentTokenIfRequired({
  gasPaymentValidations,
  gasPaymentToken,
  gasPaymentTokenAmount,
  payAmounts,
  isGmxAccount,
  canSwitchGasPaymentToken,
}: {
  gasPaymentValidations: GasPaymentValidations | undefined;
  gasPaymentToken: TokenData | undefined;
  gasPaymentTokenAmount: bigint | undefined;
  payAmounts: Record<string, bigint>;
  isGmxAccount: boolean;
  canSwitchGasPaymentToken: boolean;
}) {
  const { chainId } = useChainId();
  const setGasPaymentTokenAddress = useSelector(selectSetGasPaymentTokenAddress);
  const setGmxAccountGasPaymentTokenAddress = useSelector(selectSetGmxAccountGasPaymentTokenAddress);
  const tokensData = useSelector(selectTokensData);
  const savedGasPaymentTokenAddress = useSelector(selectGasPaymentTokenAddress);
  const savedGmxAccountGasPaymentTokenAddress = useSelector(selectGmxAccountGasPaymentTokenAddress);
  const setGasPaymentTokenReplacement = useSelector(selectSetGasPaymentTokenReplacement);
  const gasPaymentTokenAllowance = useSelector(selectGasPaymentTokenAllowance);
  const tokensAllowanceData = gasPaymentTokenAllowance?.tokensAllowanceData;
  const unavailableTokenAddresses = useSelector(selectUnavailableGasPaymentTokenAddresses);
  const isSavedTokenUnavailable = unavailableTokenAddresses.includes(
    isGmxAccount ? savedGmxAccountGasPaymentTokenAddress : savedGasPaymentTokenAddress
  );

  useEffect(
    function clearGasPaymentTokenReplacement() {
      if (!isSavedTokenUnavailable) {
        setGasPaymentTokenReplacement(isGmxAccount, undefined);
      }
    },
    [isGmxAccount, isSavedTokenUnavailable, setGasPaymentTokenReplacement]
  );

  useEffect(
    function switchGasPaymentToken() {
      if (
        !canSwitchGasPaymentToken ||
        !getIsConfirmedOutOfGasPaymentTokenBalance(gasPaymentValidations) ||
        !gasPaymentToken ||
        gasPaymentTokenAmount === undefined
      )
        return;

      const anotherGasToken = getGasPaymentTokenToSwitchTo({
        chainId,
        tokensData,
        gasPaymentToken,
        gasPaymentTokenAmount,
        payAmounts,
        isGmxAccount,
        savedGasPaymentTokenAddress,
        tokensAllowanceData,
        excludeTokenAddresses: unavailableTokenAddresses,
      });

      if (!anotherGasToken || anotherGasToken === gasPaymentToken.address) return;

      // saving it would replace a saved token that can't pay only for now
      if (isSavedTokenUnavailable) {
        setGasPaymentTokenReplacement(isGmxAccount, anotherGasToken);
        return;
      }

      const newTokenData = getByKey(tokensData, anotherGasToken);
      if (isGmxAccount) {
        setGmxAccountGasPaymentTokenAddress(anotherGasToken);
      } else {
        setGasPaymentTokenAddress(anotherGasToken);
      }
      if (newTokenData) {
        notifyGasPaymentTokenSwitched({
          fromSymbol: gasPaymentToken.symbol,
          toSymbol: newTokenData.symbol,
          isGmxAccount,
        });
      }
    },
    [
      canSwitchGasPaymentToken,
      chainId,
      gasPaymentToken,
      gasPaymentTokenAmount,
      isGmxAccount,
      gasPaymentValidations,
      setGmxAccountGasPaymentTokenAddress,
      payAmounts,
      setGasPaymentTokenAddress,
      tokensData,
      savedGasPaymentTokenAddress,
      tokensAllowanceData,
      unavailableTokenAddresses,
      isSavedTokenUnavailable,
      setGasPaymentTokenReplacement,
    ]
  );
}
