import { t } from "@lingui/macro";
import { useEffect, useRef } from "react";
import { toast } from "react-toastify";

import {
  selectGmxAccountGasPaymentToken,
  selectSettlementChainGasPaymentToken,
} from "context/SyntheticsStateContext/selectors/expressSelectors";
import { selectChainId, selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectSetGasPaymentTokenAddress,
  selectSetGmxAccountGasPaymentTokenAddress,
} from "context/SyntheticsStateContext/selectors/settingsSelectors";
import {
  selectExternalSwapDesirability,
  selectIsExternalSwapDisabledByExpressSchema,
  selectIsOneClickActiveByUser,
  selectTradeboxCollateralToken,
  selectTradeboxFromToken,
  selectTradeboxIsFromTokenGmxAccount,
  selectTradeboxSelectSwapToToken,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import type { GasPaymentParams } from "domain/synthetics/express/types";
import {
  findGasPaymentTokenWithPositiveBalance,
  findNextGasPaymentToken,
} from "domain/synthetics/express/useSwitchGasPaymentTokenIfRequired";
import { TokensData } from "domain/tokens";
import { helperToast } from "lib/helperToast";
import { getByKey } from "lib/objects";
import { getGasPaymentTokens } from "sdk/configs/express";
import { getWrappedToken } from "sdk/configs/tokens";

const EXTERNAL_SWAP_GAS_TOKEN_SWITCHED_TOAST_ID = "external-swap-gas-token-switched";

const notifyExternalSwapGasTokenSwitched = (toSymbol: string) => {
  const content = t`Gas token switched to ${toSymbol} to enable external swap routing`;

  if (toast.isActive(EXTERNAL_SWAP_GAS_TOKEN_SWITCHED_TOAST_ID)) {
    toast.update(EXTERNAL_SWAP_GAS_TOKEN_SWITCHED_TOAST_ID, { render: content });
  } else {
    helperToast.info(content, { toastId: EXTERNAL_SWAP_GAS_TOKEN_SWITCHED_TOAST_ID });
  }
};

export function getExternalSwapGasTokenToSwitchTo({
  chainId,
  tokensData,
  desirability,
  isOneClickActiveByUser,
  isBlockedByGasConflict,
  conflictTokenAddress,
  currentGasTokenAddress,
  isGmxAccount,
}: {
  chainId: number;
  tokensData: TokensData | undefined;
  desirability: "not_wanted" | "required" | "optional";
  isOneClickActiveByUser: boolean;
  isBlockedByGasConflict: boolean;
  conflictTokenAddress: string | undefined;
  currentGasTokenAddress: string | undefined;
  isGmxAccount: boolean;
}): string | undefined {
  if (desirability !== "required" || isOneClickActiveByUser || !isBlockedByGasConflict) return undefined;
  if (!conflictTokenAddress) return undefined;

  return findGasPaymentTokenWithPositiveBalance({
    chainId,
    tokensData,
    isGmxAccount,
    excludeTokenAddresses: currentGasTokenAddress
      ? [conflictTokenAddress, currentGasTokenAddress]
      : [conflictTokenAddress],
  });
}

// Gas token offered by the gas conflict warning; never the saved token or the token that already pays the fee
export function getExternalSwapGasTokenCandidate({
  chainId,
  tokensData,
  desirability,
  conflictTokenAddress,
  savedGasTokenAddress,
  gasPaymentParams,
  payAmounts,
  isGmxAccount,
}: {
  chainId: number;
  tokensData: TokensData | undefined;
  desirability: "required" | "optional";
  conflictTokenAddress: string | undefined;
  savedGasTokenAddress: string | undefined;
  // from the estimate, so the amount is in the token that pays, which can differ from the saved one
  gasPaymentParams: Pick<GasPaymentParams, "gasPaymentToken" | "gasPaymentTokenAmount"> | undefined;
  payAmounts: Record<string, bigint>;
  isGmxAccount: boolean;
}): string | undefined {
  const wrappedTokenAddress = getWrappedToken(chainId).address;
  const excludeTokenAddresses = [
    conflictTokenAddress,
    savedGasTokenAddress,
    gasPaymentParams?.gasPaymentToken.address,
  ].filter((address): address is string => address !== undefined);

  if (gasPaymentParams) {
    const findSufficientGasToken = (excluded: string[]) =>
      findNextGasPaymentToken({
        chainId,
        tokensData,
        gasPaymentToken: gasPaymentParams.gasPaymentToken,
        gasPaymentTokenAmount: gasPaymentParams.gasPaymentTokenAmount,
        payAmounts,
        isGmxAccount,
        excludeTokenAddresses: excluded,
      });

    if (desirability === "optional") {
      const notWrappedTokenAddresses = getGasPaymentTokens(chainId).filter(
        (address) => address !== wrappedTokenAddress
      );

      return (
        findSufficientGasToken([...excludeTokenAddresses, ...notWrappedTokenAddresses]) ??
        findSufficientGasToken(excludeTokenAddresses)
      );
    }

    return findSufficientGasToken(excludeTokenAddresses);
  }

  if (desirability === "optional" && !excludeTokenAddresses.includes(wrappedTokenAddress)) {
    const wrappedToken = getByKey(tokensData, wrappedTokenAddress);
    const wrappedTokenBalance = isGmxAccount ? wrappedToken?.gmxAccountBalance : wrappedToken?.walletBalance;
    if ((wrappedTokenBalance ?? 0n) > 0n) return wrappedTokenAddress;
  }

  return findGasPaymentTokenWithPositiveBalance({ chainId, tokensData, isGmxAccount, excludeTokenAddresses });
}

export function useAutoSwitchGasTokenForRequiredExternalSwap() {
  const chainId = useSelector(selectChainId);
  const tokensData = useSelector(selectTokensData);
  const desirability = useSelector(selectExternalSwapDesirability);
  const isOneClickActiveByUser = useSelector(selectIsOneClickActiveByUser);
  const isBlockedByGasConflict = useSelector(selectIsExternalSwapDisabledByExpressSchema);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const fromToken = useSelector(selectTradeboxFromToken);
  const swapToToken = useSelector(selectTradeboxSelectSwapToToken);
  const collateralToken = useSelector(selectTradeboxCollateralToken);
  const isFromTokenGmxAccount = useSelector(selectTradeboxIsFromTokenGmxAccount);
  const gmxAccountGasPaymentToken = useSelector(selectGmxAccountGasPaymentToken);
  const settlementChainGasPaymentToken = useSelector(selectSettlementChainGasPaymentToken);
  const setGasPaymentTokenAddress = useSelector(selectSetGasPaymentTokenAddress);
  const setGmxAccountGasPaymentTokenAddress = useSelector(selectSetGmxAccountGasPaymentTokenAddress);

  const attemptedKeysRef = useRef(new Set<string>());

  const conflictToken = tradeFlags?.isSwap ? swapToToken : collateralToken;
  const currentGasPaymentToken = isFromTokenGmxAccount ? gmxAccountGasPaymentToken : settlementChainGasPaymentToken;

  const conflictTokenAddress = conflictToken?.address;
  const currentGasTokenAddress = currentGasPaymentToken?.address;
  const fromTokenAddress = fromToken?.address;

  useEffect(
    function autoSwitchGasTokenForRequiredExternalSwapEff() {
      const targetAddress = getExternalSwapGasTokenToSwitchTo({
        chainId,
        tokensData,
        desirability,
        isOneClickActiveByUser,
        isBlockedByGasConflict,
        conflictTokenAddress,
        currentGasTokenAddress,
        isGmxAccount: isFromTokenGmxAccount,
      });

      if (!targetAddress) return;

      const attemptKey = `${chainId}:${fromTokenAddress}:${conflictTokenAddress}`;
      if (attemptedKeysRef.current.has(attemptKey)) return;
      attemptedKeysRef.current.add(attemptKey);

      // No "gasPaymentTokenChanged" dispatch — its listener clears the pay input the auto-switch is meant to unblock.
      if (isFromTokenGmxAccount) {
        setGmxAccountGasPaymentTokenAddress(targetAddress);
      } else {
        setGasPaymentTokenAddress(targetAddress);
      }

      const targetToken = getByKey(tokensData, targetAddress);
      if (targetToken) {
        notifyExternalSwapGasTokenSwitched(targetToken.symbol);
      }
    },
    [
      chainId,
      tokensData,
      desirability,
      isOneClickActiveByUser,
      isBlockedByGasConflict,
      conflictTokenAddress,
      currentGasTokenAddress,
      isFromTokenGmxAccount,
      fromTokenAddress,
      setGasPaymentTokenAddress,
      setGmxAccountGasPaymentTokenAddress,
    ]
  );
}
