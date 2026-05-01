import { t, Trans } from "@lingui/macro";
import { useEffect, useRef, useState } from "react";
import { encodeFunctionData, zeroAddress } from "viem";

import type { SettlementChainId } from "config/chains";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { type MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { sendQuoteFromNative } from "domain/multichain/sendQuoteFromNative";
import { toastCustomOrStargateError } from "domain/multichain/toastCustomOrStargateError";
import { SendParam } from "domain/multichain/types";
import { useMultichainReferralDepositToken } from "domain/multichain/useMultichainReferralDepositToken";
import {
  createRelayEmptyParamsPayload,
  useMultichainReferralQuote,
} from "domain/multichain/useMultichainReferralQuote";
import { useMultichainStargateApproval } from "domain/multichain/useMultichainStargateApproval";
import { validateReferralCodeExists } from "domain/referrals/hooks";
import { REFERRAL_CODE_REGEX } from "domain/referrals/utils/referralCode";
import { signSetTraderReferralCode } from "domain/synthetics/express/expressOrderUtils";
import { useChainId } from "lib/chains";
import { useDebounce } from "lib/debounce/useDebounce";
import { helperToast } from "lib/helperToast";
import { formatUsd } from "lib/numbers";
import { sendWalletTransaction } from "lib/transactions";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";
import { encodeReferralCode } from "sdk/utils/referrals";

import Button from "components/Button/Button";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";

import { getReferralCodeButtonState } from "./getReferralCodeButtonState";
import { ReferralCodeInput } from "./ReferralCodeInput";

export function ReferralCodeFormMultichain({
  userReferralCodeString = "",
  type = "join",
  callAfterSuccess,
}: {
  callAfterSuccess?: (code: string) => void;
  userReferralCodeString?: string;
  type?: "join" | "edit";
}) {
  const { chainId, srcChainId } = useChainId();
  const { account, signer } = useWallet();
  const [referralCode, setReferralCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referralCodeExists, setReferralCodeExists] = useState(true);
  const debouncedReferralCode = useDebounce(referralCode, 300);
  const hasOutdatedUi = useHasOutdatedUi();

  const globalExpressParams = useSelector(selectExpressGlobalParams);

  const { depositTokenAddress, sourceChainDepositTokenId } = useMultichainReferralDepositToken();

  const quoteResult = useMultichainReferralQuote({
    depositTokenAddress,
    actionType: MultichainActionType.SetTraderReferralCode,
    referralCode,
  });

  const { needsApproval, isApproving, isAllowanceLoaded, handleApprove } = useMultichainStargateApproval({
    depositTokenAddress,
    amountToApprove: quoteResult.data?.amount,
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!account || srcChainId === undefined) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (
        sourceChainDepositTokenId === undefined ||
        globalExpressParams === undefined ||
        signer === undefined ||
        quoteResult.data === undefined
      ) {
        throw new Error("Missing required parameters");
      }

      const relayParamsPayload = createRelayEmptyParamsPayload(chainId as SettlementChainId, globalExpressParams);

      const referralCodeHex = encodeReferralCode(referralCode);

      const signature = await signSetTraderReferralCode({
        chainId: chainId as SettlementChainId,
        srcChainId,
        signer,
        relayParams: relayParamsPayload,
        referralCode: referralCodeHex,
      });

      const action: MultichainAction = {
        actionType: MultichainActionType.SetTraderReferralCode,
        actionData: {
          relayParams: relayParamsPayload,
          signature,
          referralCode: referralCodeHex,
        },
      };

      const sendParams: SendParam = getMultichainTransferSendParams({
        dstChainId: chainId,
        account,
        srcChainId,
        amountLD: quoteResult.data.amount,
        composeGas: quoteResult.data.composeGas,
        isToGmx: true,
        action,
      });

      const sourceChainStargateAddress = sourceChainDepositTokenId.stargate;

      const value =
        sourceChainDepositTokenId.address === zeroAddress
          ? quoteResult.data.nativeFee + quoteResult.data.amount
          : quoteResult.data.nativeFee;

      const txnResult = await sendWalletTransaction({
        chainId: srcChainId,
        to: sourceChainStargateAddress,
        signer,
        callData: encodeFunctionData({
          abi: abis.IStargate,
          functionName: "sendToken",
          args: [sendParams, sendQuoteFromNative(quoteResult.data.nativeFee), account],
        }),
        value,
      });

      const receipt = await txnResult.wait();

      if (callAfterSuccess) {
        callAfterSuccess(referralCode);
      }

      if (receipt.status === "success") {
        setReferralCode("");
      }

      helperToast.success(
        <>
          <Trans>Referral code added</Trans>
          <br />
          <br />
          <Trans>Changes may take a few minutes to appear</Trans>
        </>
      );
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
    hasOutdatedUi,
    isApproving,
    isSubmitting,
    isValidating,
    referralCodeExists,
    isLoadingQuote: quoteResult.isLoading || !quoteResult.data || !isAllowanceLoaded,
    needsApproval,
    depositTokenSymbol: sourceChainDepositTokenId?.symbol,
    onSubmit: handleSubmit,
    onApprove: (event: React.FormEvent) => {
      event.preventDefault();
      handleApprove();
    },
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
      {srcChainId && (
        <SyntheticsInfoRow
          label={t`Network fee`}
          value={quoteResult.networkFeeUsd !== undefined ? formatUsd(quoteResult.networkFeeUsd) : "..."}
        />
      )}

      <Button variant="primary-action" type="submit" disabled={buttonState.disabled}>
        {buttonState.text}
      </Button>
    </form>
  );
}
