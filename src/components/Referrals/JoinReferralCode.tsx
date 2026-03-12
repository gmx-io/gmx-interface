import { t, Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useEffect, useRef, useState } from "react";
import { encodeFunctionData, zeroAddress } from "viem";

import type { SettlementChainId } from "config/chains";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
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
import { setTraderReferralCodeByUser, validateReferralCodeExists } from "domain/referrals/hooks";
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

import { REFERRAL_CODE_REGEX } from "./referralsHelper";

function JoinReferralCode({ active }: { active: boolean }) {
  const { openConnectModal } = useConnectModal();
  return (
    <div className="referral-card section-center">
      <h2 className="title text-h2">
        <Trans>Enter referral code</Trans>
      </h2>
      <p className="sub-title">
        <Trans>Enter a referral code to get fee discounts</Trans>
      </p>
      <div className="card-action">
        {active ? (
          <ReferralCodeEditFormContainer />
        ) : (
          <Button variant="primary-action" className="w-full" type="submit" onClick={openConnectModal}>
            <Trans>Connect wallet</Trans>
          </Button>
        )}
      </div>
    </div>
  );
}

function ReferralCodeForm({
  callAfterSuccess = undefined,
  userReferralCodeString = "",
  type = "join",
}: {
  callAfterSuccess?: () => void;
  userReferralCodeString?: string;
  type?: string;
}) {
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
        callAfterSuccess();
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

  let buttonState: {
    text: string;
    disabled?: boolean;
    onSubmit?: (event: React.FormEvent) => void;
  } = {
    text: "",
  };
  const isEdit = type === "edit";

  if (isEdit && debouncedReferralCode === userReferralCodeString) {
    buttonState = {
      text: t`Same as current active code`,
      disabled: true,
    };
  } else if (isEdit && isSubmitting) {
    buttonState = {
      text: t`Updating...`,
      disabled: true,
    };
  } else if (isSubmitting) {
    buttonState = {
      text: t`Adding...`,
      disabled: true,
    };
  } else if (debouncedReferralCode === "") {
    buttonState = {
      text: t`Enter referral code`,
      disabled: true,
    };
  } else if (isValidating) {
    buttonState = {
      text: t`Checking code...`,
      disabled: true,
    };
  } else if (!referralCodeExists) {
    buttonState = {
      text: t`Code not found`,
      disabled: true,
    };
  } else if (isEdit) {
    buttonState = {
      text: t`Update`,
      disabled: false,
      onSubmit: handleSubmit,
    };
  } else {
    buttonState = {
      text: t`Submit`,
      disabled: false,
      onSubmit: handleSubmit,
    };
  }

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
    <form onSubmit={buttonState.onSubmit} className="flex flex-col gap-15">
      <input
        ref={inputRef}
        disabled={isSubmitting}
        type="text"
        placeholder={t`Enter referral code`}
        className="text-input"
        value={referralCode}
        onChange={({ target }) => {
          const { value } = target;
          setReferralCode(value);
        }}
      />

      <Button
        variant="primary-action"
        type="submit"
        className="App-cta Exchange-swap-button"
        disabled={buttonState.disabled}
      >
        {buttonState.text}
      </Button>
    </form>
  );
}

function ReferralCodeFormMultichain({
  userReferralCodeString = "",
  type = "join",
  callAfterSuccess,
}: {
  callAfterSuccess?: () => void;
  userReferralCodeString?: string;
  type?: string;
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
        msg: t`Sending referral code transaction`,
      });

      const receipt = await txnResult.wait();

      if (callAfterSuccess) {
        callAfterSuccess();
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

  let buttonState: {
    text: React.ReactNode;
    disabled?: boolean;
    onSubmit?: (event: React.FormEvent) => void;
  } = {
    text: "",
  };
  const isEdit = type === "edit";

  if (hasOutdatedUi) {
    buttonState = {
      text: t`Page outdated. Refresh`,
      disabled: true,
    };
  } else if (isApproving) {
    buttonState = {
      text: t`Approving...`,
      disabled: true,
    };
  } else if (isEdit && debouncedReferralCode === userReferralCodeString) {
    buttonState = {
      text: t`Same as current active code`,
      disabled: true,
    };
  } else if (isEdit && isSubmitting) {
    buttonState = {
      text: t`Updating...`,
      disabled: true,
    };
  } else if (isSubmitting) {
    buttonState = {
      text: t`Adding...`,
      disabled: true,
    };
  } else if (debouncedReferralCode === "") {
    buttonState = {
      text: t`Enter referral code`,
      disabled: true,
    };
  } else if (isValidating) {
    buttonState = {
      text: t`Checking code...`,
      disabled: true,
    };
  } else if (!referralCodeExists) {
    buttonState = {
      text: t`Code not found`,
      disabled: true,
    };
  } else if (quoteResult.isLoading || !quoteResult.data || !isAllowanceLoaded) {
    buttonState = {
      text: t`Loading...`,
      disabled: true,
    };
  } else if (needsApproval) {
    buttonState = {
      text: t`Approve ${sourceChainDepositTokenId?.symbol}`,
      disabled: false,
      onSubmit: (event: React.FormEvent) => {
        event.preventDefault();
        handleApprove();
      },
    };
  } else if (isEdit) {
    buttonState = {
      text: t`Update`,
      disabled: false,
      onSubmit: handleSubmit,
    };
  } else {
    buttonState = {
      text: t`Submit`,
      disabled: false,
      onSubmit: handleSubmit,
    };
  }

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
    <form onSubmit={buttonState.onSubmit} className="flex flex-col gap-15">
      <input
        ref={inputRef}
        disabled={isSubmitting}
        type="text"
        placeholder={t`Enter referral code`}
        className="text-input"
        value={referralCode}
        onChange={({ target }) => {
          const { value } = target;
          setReferralCode(value);
        }}
      />
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

export function ReferralCodeEditFormContainer({
  callAfterSuccess = undefined,
  userReferralCodeString = "",
  type = "join",
}: {
  callAfterSuccess?: () => void;
  userReferralCodeString?: string;
  type?: string;
}) {
  const { srcChainId } = useChainId();

  if (srcChainId === undefined) {
    return (
      <ReferralCodeForm
        callAfterSuccess={callAfterSuccess}
        userReferralCodeString={userReferralCodeString}
        type={type}
      />
    );
  }

  return (
    <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType={"referrals"}>
      <ReferralCodeFormMultichain
        callAfterSuccess={callAfterSuccess}
        userReferralCodeString={userReferralCodeString}
        type={type}
      />
    </SyntheticsStateContextProvider>
  );
}

export default JoinReferralCode;
