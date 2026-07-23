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
import { findGasPaymentTokenWithPositiveBalance } from "domain/synthetics/express/useSwitchGasPaymentTokenIfRequired";
import { TokensData } from "domain/tokens";
import { helperToast } from "lib/helperToast";
import { getByKey } from "lib/objects";

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

// When the external route is the only way to fill the trade and the gas payment token conflicts
// with the swap output, silently switch to the first non-conflicting gas token with a positive
// balance (precedent: useSwitchGasPaymentTokenIfRequired). Amount sufficiency is enforced after
// the switch by useSwitchGasPaymentTokenIfRequired itself once express params become computable;
// when no token has any balance we don't switch — the warning banner offers the Classic-mode escape.
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

  // One attempt per chain and token pair, so a user who switches the gas token back isn't fought.
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
