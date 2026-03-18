import { t } from "@lingui/macro";
import { useEffect, useRef, useState } from "react";

import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { toastCustomOrStargateError } from "domain/multichain/toastCustomOrStargateError";
import { setTraderReferralCodeByUser, validateReferralCodeExists } from "domain/referrals/hooks";
import { REFERRAL_CODE_REGEX } from "domain/referrals/utils/referralCode";
import { useChainId } from "lib/chains";
import { useDebounce } from "lib/debounce/useDebounce";
import useWallet from "lib/wallets/useWallet";

import Button from "components/Button/Button";

import { getReferralCodeButtonState } from "./getReferralCodeButtonState";
import { ReferralCodeInput } from "./ReferralCodeInput";

type ReferralCodeFormSettlementChainProps = {
  callAfterSuccess?: (code: string) => void;
  userReferralCodeString?: string;
  type?: "join" | "edit";
};

export function ReferralCodeFormSettlementChain({
  callAfterSuccess,
  userReferralCodeString = "",
  type = "join",
}: ReferralCodeFormSettlementChainProps) {
  const { chainId } = useChainId();
  const { account, signer } = useWallet();
  const [referralCode, setReferralCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referralCodeExists, setReferralCodeExists] = useState(true);
  const { pendingTxns, setPendingTxns } = usePendingTxns();
  const debouncedReferralCode = useDebounce(referralCode, 300);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!account) {
      return;
    }

    const isEdit = type === "edit";
    setIsSubmitting(true);

    try {
      const tx = await setTraderReferralCodeByUser(chainId, referralCode, signer, {
        account,
        successMsg: isEdit ? t`Referral code updated` : t`Referral code added`,
        failMsg: isEdit ? t`Referral code update failed` : t`Failed to add referral code`,
        setPendingTxns,
        pendingTxns,
      });
      if (callAfterSuccess) {
        callAfterSuccess(referralCode);
      }
      const receipt = await tx.wait();
      if (receipt.status === 1) {
        setReferralCode("");
      }
    } catch (error) {
      toastCustomOrStargateError(chainId, error);
    } finally {
      setIsSubmitting(false);
      setIsValidating(false);
    }
  }

  const buttonState = getReferralCodeButtonState({
    type,
    referralCode,
    userReferralCodeString,
    isSubmitting,
    isValidating,
    referralCodeExists,
    onSubmit: handleSubmit,
  });

  useEffect(() => {
    let cancelled = false;
    async function checkReferralCode() {
      if (debouncedReferralCode === "" || !REFERRAL_CODE_REGEX.test(debouncedReferralCode)) {
        setIsValidating(false);
        setReferralCodeExists(false);
        return;
      }

      setIsValidating(true);
      const codeExists = await validateReferralCodeExists(debouncedReferralCode, chainId);
      if (!cancelled) {
        setReferralCodeExists(codeExists);
        setIsValidating(false);
      }
    }
    checkReferralCode();
    return () => {
      cancelled = true;
    };
  }, [debouncedReferralCode, chainId]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form onSubmit={buttonState.onSubmit} className="flex flex-col gap-12">
      <ReferralCodeInput ref={inputRef} disabled={isSubmitting} value={referralCode} onChange={setReferralCode} />

      <Button variant="primary-action" type="submit" disabled={buttonState.disabled}>
        {buttonState.text}
      </Button>
    </form>
  );
}
