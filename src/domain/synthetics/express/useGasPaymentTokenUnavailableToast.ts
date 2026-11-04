import { t } from "@lingui/macro";
import { useEffect, useRef } from "react";

import { selectUnavailableGasPaymentTokens } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectGasPaymentTokenAddress,
  selectGmxAccountGasPaymentTokenAddress,
} from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { helperToast } from "lib/helperToast";
import { getByKey } from "lib/objects";

const GAS_PAYMENT_TOKEN_UNAVAILABLE_TOAST_ID = "gas-payment-token-unavailable";

function getContent({
  fromSymbol,
  toSymbol,
  isGmxAccount,
}: {
  fromSymbol: string;
  toSymbol: string | undefined;
  isGmxAccount: boolean;
}) {
  if (toSymbol !== undefined) {
    return t`${fromSymbol} can't pay network fees right now. They are paid in ${toSymbol} instead.`;
  }

  return isGmxAccount
    ? t`${fromSymbol} can't pay network fees right now, so GMX Account actions can't be sent until it can.`
    : t`${fromSymbol} can't pay network fees right now, so transactions are sent without Express until it can.`;
}

export function useGasPaymentTokenUnavailableToast({
  isGmxAccount,
  feeTokenAddress,
  enabled,
}: {
  isGmxAccount: boolean;
  // the token that pays after every fallback
  feeTokenAddress: string | undefined;
  enabled: boolean;
}) {
  const savedTokenAddress = useSelector(
    isGmxAccount ? selectGmxAccountGasPaymentTokenAddress : selectGasPaymentTokenAddress
  );
  const unavailableTokens = useSelector(selectUnavailableGasPaymentTokens);
  const tokensData = useSelector(selectTokensData);
  const notifiedKeyRef = useRef<string | undefined>(undefined);

  const savedToken = getByKey(tokensData, savedTokenAddress);
  const isSavedTokenUnavailable = unavailableTokens[savedTokenAddress] !== undefined;
  // the fallback token is only known once the fee params and balances load
  const isLoaded =
    feeTokenAddress !== undefined &&
    (isGmxAccount ? savedToken?.gmxAccountBalance : savedToken?.walletBalance) !== undefined;
  const fromSymbol = savedToken?.symbol;
  const isFeeTokenAvailable = feeTokenAddress !== undefined && unavailableTokens[feeTokenAddress] === undefined;
  const toSymbol = isFeeTokenAvailable ? getByKey(tokensData, feeTokenAddress)?.symbol : undefined;

  useEffect(
    function notifyGasPaymentTokenUnavailableEff() {
      if (!isSavedTokenUnavailable) {
        notifiedKeyRef.current = undefined;
        return;
      }

      const notifiedKey = `${isGmxAccount}:${fromSymbol}:${toSymbol}`;
      if (
        !enabled ||
        !isLoaded ||
        fromSymbol === undefined ||
        (isFeeTokenAvailable && toSymbol === undefined) ||
        notifiedKeyRef.current === notifiedKey
      ) {
        return;
      }

      notifiedKeyRef.current = notifiedKey;
      const content = getContent({ fromSymbol, toSymbol, isGmxAccount });

      helperToast.infoOrUpdate(content, GAS_PAYMENT_TOKEN_UNAVAILABLE_TOAST_ID);
    },
    [enabled, fromSymbol, isFeeTokenAvailable, isGmxAccount, isLoaded, isSavedTokenUnavailable, toSymbol]
  );
}
