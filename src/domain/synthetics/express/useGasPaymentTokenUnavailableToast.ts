import { t } from "@lingui/macro";
import { useEffect, useRef } from "react";
import { toast } from "react-toastify";

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

  const isSavedTokenUnavailable = unavailableTokens[savedTokenAddress] !== undefined;
  const fromSymbol = getByKey(tokensData, savedTokenAddress)?.symbol;
  const isFeeTokenAvailable = feeTokenAddress !== undefined && unavailableTokens[feeTokenAddress] === undefined;
  const toSymbol = isFeeTokenAvailable ? getByKey(tokensData, feeTokenAddress)?.symbol : undefined;

  useEffect(
    function notifyGasPaymentTokenUnavailableEff() {
      if (!isSavedTokenUnavailable) {
        notifiedKeyRef.current = undefined;
        return;
      }

      const notifiedKey = `${fromSymbol}:${toSymbol}`;
      if (
        !enabled ||
        fromSymbol === undefined ||
        (isFeeTokenAvailable && toSymbol === undefined) ||
        notifiedKeyRef.current === notifiedKey
      ) {
        return;
      }

      notifiedKeyRef.current = notifiedKey;
      const content = getContent({ fromSymbol, toSymbol, isGmxAccount });

      if (toast.isActive(GAS_PAYMENT_TOKEN_UNAVAILABLE_TOAST_ID)) {
        toast.update(GAS_PAYMENT_TOKEN_UNAVAILABLE_TOAST_ID, { render: content });
      } else {
        helperToast.info(content, { toastId: GAS_PAYMENT_TOKEN_UNAVAILABLE_TOAST_ID });
      }
    },
    [enabled, fromSymbol, isFeeTokenAvailable, isGmxAccount, isSavedTokenUnavailable, toSymbol]
  );
}
