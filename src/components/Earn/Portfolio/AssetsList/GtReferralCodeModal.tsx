import { t, Trans } from "@lingui/macro";
import { useEffect, useRef, useState } from "react";
import { useCopyToClipboard, useLatest } from "react-use";

import {
  GT_BUYBACK_INSUFFICIENT_SOL_ERROR,
  type GtBuybackSummaryResult,
  isGtBuybackUserRejection,
} from "domain/gtBuyback/useGtBuybackSummary";
import { getCodeError } from "domain/referrals/utils/referralsHelper";
import { helperToast } from "lib/helperToast";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import ModalWithPortal from "components/Modal/ModalWithPortal";

import CopyIcon from "img/ic_copy.svg?react";

function HowItWorks() {
  const steps = [
    t`Create your code`,
    t`Share it with other traders`,
    t`As they use GMX on Solana, your GT unlocks to sell in the buyback`,
  ];

  return (
    <ol className="flex flex-col gap-10 rounded-8 bg-slate-800 p-16">
      {steps.map((step, index) => (
        <li key={step} className="text-body-small flex items-start gap-10 text-typography-primary">
          <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-slate-700 text-12 font-medium text-typography-secondary numbers">
            {index + 1}
          </span>
          <span className="pt-2">{step}</span>
        </li>
      ))}
    </ol>
  );
}

type Stage = "idle" | "evmSign" | "solanaConnect" | "solanaApprove" | "done";

const CHECK_DELAY_MS = 400;

export function GtReferralCodeModal({
  isVisible,
  setIsVisible,
  actions,
}: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  actions: Pick<
    GtBuybackSummaryResult,
    | "suggestedReferralCode"
    | "isReferralCodeTaken"
    | "signSetReferralCode"
    | "isSolanaWalletConnected"
    | "connectSolanaWallet"
    | "approveSolanaSetReferralCode"
  >;
}) {
  const [code, setCode] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isTaken, setIsTaken] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | undefined>(undefined);
  const [createdCode, setCreatedCode] = useState("");
  const [, copyToClipboard] = useCopyToClipboard();
  // Bumped on close so a wallet flow still running from a closed modal stops updating it.
  const attemptRef = useRef(0);

  const trimmedCode = code.trim();
  const formatError = getCodeError(trimmedCode);
  const isConnected = Boolean(actions.signSetReferralCode && actions.approveSolanaSetReferralCode);
  const isBusy = stage !== "idle" && stage !== "done";
  const isReferralCodeTaken = useLatest(actions.isReferralCodeTaken);
  const canCheckCode = Boolean(actions.isReferralCodeTaken);

  useEffect(() => {
    if (!isVisible) {
      attemptRef.current += 1;
      setCode("");
      setCreatedCode("");
      setStage("idle");
      setError(undefined);
      setIsTaken(false);
    }
  }, [isVisible]);

  useEffect(() => {
    setError(undefined);
  }, [trimmedCode]);

  useEffect(() => {
    setIsTaken(false);
    if (!trimmedCode || formatError || !canCheckCode) return;
    let isCancelled = false;
    setIsChecking(true);
    const timer = setTimeout(async () => {
      try {
        const taken = await isReferralCodeTaken.current!(trimmedCode);
        if (!isCancelled) setIsTaken(taken);
      } catch {
        if (!isCancelled) setError(t`Couldn't check if this code is available. Try again.`);
      } finally {
        if (!isCancelled) setIsChecking(false);
      }
    }, CHECK_DELAY_MS);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
      setIsChecking(false);
    };
  }, [trimmedCode, formatError, canCheckCode, isReferralCodeTaken]);

  const create = async () => {
    const attempt = ++attemptRef.current;
    const isStale = () => attempt !== attemptRef.current;
    const submittedCode = trimmedCode;
    setError(undefined);
    try {
      setStage("evmSign");
      await actions.signSetReferralCode!(submittedCode);
    } catch (e) {
      if (isStale()) return;
      setStage("idle");
      setError(
        isGtBuybackUserRejection(e)
          ? t`The EVM signature was rejected. Your code wasn't created.`
          : t`Couldn't get the EVM signature. Your code wasn't created. Try again.`
      );
      return;
    }
    if (isStale()) return;
    try {
      if (!actions.isSolanaWalletConnected && actions.connectSolanaWallet) {
        setStage("solanaConnect");
        await actions.connectSolanaWallet();
      }
    } catch {
      if (isStale()) return;
      setStage("idle");
      setError(t`No Solana wallet connected. Connect one to pay the network fee.`);
      return;
    }
    if (isStale()) return;
    try {
      setStage("solanaApprove");
      await actions.approveSolanaSetReferralCode!(submittedCode);
      if (isStale()) return;
      setCreatedCode(submittedCode);
      setStage("done");
    } catch (e) {
      if (isStale()) return;
      setStage("idle");
      setError(
        e instanceof Error && e.message === GT_BUYBACK_INSUFFICIENT_SOL_ERROR
          ? t`Not enough SOL in your Solana wallet for the network fee.`
          : t`We couldn't confirm the Solana transaction. Check your Solana wallet before trying again.`
      );
    }
  };

  const buttonText = (() => {
    if (stage === "evmSign") return t`Sign in your EVM wallet...`;
    if (stage === "solanaConnect") return t`Connect Solana wallet...`;
    if (stage === "solanaApprove") return t`Approve in Solana wallet...`;
    if (!trimmedCode) return t`Enter a code`;
    if (formatError) return formatError;
    if (isChecking) return t`Checking code...`;
    if (isTaken) return t`Code already taken`;
    if (!isConnected) return t`Not connected`;
    return t`Create`;
  })();
  const isDisabled = isBusy || !trimmedCode || Boolean(formatError) || isChecking || isTaken || !isConnected;

  return (
    <ModalWithPortal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={stage === "done" ? t`Referral code created` : t`Create referral code`}
      withMobileBottomPosition
    >
      {stage === "done" ? (
        <div className="flex w-[420px] max-w-full flex-col gap-16 pb-20">
          <span className="text-body-medium text-typography-secondary">
            <Trans>Now share it — your GT unlocks as the people you refer use GMX on Solana.</Trans>
          </span>
          <div className="flex items-center justify-between gap-12 rounded-8 bg-slate-800 px-16 py-12">
            <span className="text-body-large font-medium text-typography-primary">{createdCode}</span>
            <button
              type="button"
              className="text-typography-secondary gmx-hover:text-typography-primary"
              aria-label={t`Copy referral code`}
              onClick={() => {
                copyToClipboard(createdCode);
                helperToast.success(t`Referral code copied to your clipboard`);
              }}
            >
              <CopyIcon className="size-16" />
            </button>
          </div>
          <span className="text-body-small text-typography-secondary">
            <Trans>May take a few minutes to reflect. Check back later</Trans>
          </span>
          <Button variant="primary-action" className="w-full" onClick={() => setIsVisible(false)}>
            <Trans>Done</Trans>
          </Button>
        </div>
      ) : (
        <div className="flex w-[420px] max-w-full flex-col gap-16 pb-20">
          <HowItWorks />

          <input
            className="text-body-medium rounded-8 border-1/2 border-slate-600 bg-slate-800 px-12 py-10 text-typography-primary placeholder:text-typography-inactive"
            placeholder={t`Enter a code`}
            value={code}
            disabled={isBusy}
            onChange={(e) => setCode(e.target.value)}
          />

          {actions.suggestedReferralCode && !code ? (
            <button
              type="button"
              className="text-body-small self-start text-blue-300 gmx-hover:text-blue-100"
              onClick={() => setCode(actions.suggestedReferralCode!)}
            >
              <Trans>Use your GMX code: {actions.suggestedReferralCode}</Trans>
            </button>
          ) : null}

          <span className="text-body-small text-typography-secondary">
            <Trans>
              You'll sign in your EVM wallet, then approve a transaction in a Solana wallet. It needs a little SOL for
              the network fee.
            </Trans>
          </span>

          {error ? (
            <AlertInfoCard type="error" hideClose>
              {error}
            </AlertInfoCard>
          ) : null}

          <Button variant="primary-action" className="w-full" disabled={isDisabled} onClick={create}>
            {buttonText}
          </Button>
        </div>
      )}
    </ModalWithPortal>
  );
}
