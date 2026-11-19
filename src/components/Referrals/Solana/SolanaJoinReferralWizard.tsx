import { Trans, t } from "@lingui/macro";
import { useEffect, useRef, useState } from "react";
import { useHistory } from "react-router-dom";

import { REFERRALS_DOCS_URL } from "config/links";
import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { helperToast } from "lib/helperToast";

import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { StepProgress } from "components/Referrals/shared/wizard/StepProgress";
import { ApplyReferralCodeButtonContent } from "components/Referrals/traders/joinCode/ApplyReferralCodeButtonContent";
import { LabelWithIcon } from "components/Referrals/traders/joinCode/LabelWithIcon";
import { ReferralCodeInput } from "components/Referrals/traders/joinCode/ReferralCodeInput";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";
import ReferralsFilledIcon from "img/ic_referrals_filled.svg?react";
import WalletIcon from "img/ic_wallet.svg?react";
import referralWizardBg from "img/referral_wizard_bg.png";

import { getSolanaCodeError, SOLANA_TRADER_DISCOUNT_PERCENT, type SolanaGtHolder } from "./solanaReferralsTypes";
import { TopGtHoldersModal } from "./TopGtHoldersModal";

enum JoinStep {
  ConnectWallet = 0,
  EnterReferralCode = 1,
  Success = 2,
}

function DiscountPromos() {
  return (
    <>
      <h2 className="text-[40px] font-medium [text-wrap:balance] max-md:text-[32px] md:-mx-12">
        <Trans>Trade smarter with 10% trading fee savings</Trans>
      </h2>
      <p className="text-body-medium text-typography-secondary [text-wrap:balance]">
        <Trans>Enter a referral code to receive a permanent 10% fee discount on opening and closing fees.</Trans>
      </p>
    </>
  );
}

export function SolanaJoinReferralWizard({
  account,
  ownCode,
  topHolders,
  applyCode,
  onApplied,
  onGoToTraderDashboard,
}: {
  account: string | undefined;
  /** The user's own affiliate code: it can't be applied as a referral code */
  ownCode: string | undefined;
  topHolders: SolanaGtHolder[];
  applyCode: (code: string) => Promise<void>;
  onApplied: (code: string) => void;
  onGoToTraderDashboard: () => void;
}) {
  const { openConnectModal } = useConnectModal();
  const history = useHistory();
  const isConnected = Boolean(account);
  const [step, setStep] = useState(JoinStep.ConnectWallet);
  const [referralCode, setReferralCode] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHoldersModalVisible, setIsHoldersModalVisible] = useState(false);

  useEffect(
    function advanceStep() {
      if (isConnected && step === JoinStep.ConnectWallet) {
        setStep(JoinStep.EnterReferralCode);
      } else if (!isConnected) {
        setStep(JoinStep.ConnectWallet);
      }
    },
    [isConnected, step]
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    if (step === JoinStep.EnterReferralCode) inputRef.current?.focus();
  }, [step]);

  const trimmedCode = referralCode.trim();
  const codeError = trimmedCode ? getSolanaCodeError(trimmedCode) : "";
  const isOwnCode = Boolean(ownCode) && trimmedCode === ownCode;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmedCode || codeError || isOwnCode || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await applyCode(trimmedCode);
      if (!isMountedRef.current) return; // another wallet by now: its wizard is a new one
      setAppliedCode(trimmedCode);
      onApplied(trimmedCode);
      setStep(JoinStep.Success);
    } catch (e) {
      helperToast.error(e instanceof Error ? e.message : t`Something went wrong`);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Named like the EVM wizard's placeholders, so the existing translations of these messages apply
  const currentTierDiscount = SOLANA_TRADER_DISCOUNT_PERCENT;
  const activatedReferralCodeLabel = appliedCode;

  const buttonText = isSubmitting ? (
    t`Adding...`
  ) : isOwnCode ? (
    t`Own referral code not allowed`
  ) : trimmedCode === "" ? (
    t`Enter referral code`
  ) : (
    <ApplyReferralCodeButtonContent />
  );

  return (
    <div className="relative min-h-[570px] overflow-hidden rounded-8">
      <img
        src={referralWizardBg}
        alt=""
        className="absolute -left-8 -top-8 min-h-[calc(100%+16px)] min-w-[calc(100%+16px)] select-none object-fill blur-[12px] hue-rotate-180 invert dark:hue-rotate-0 dark:invert-0"
      />

      <div className="relative z-10 mx-auto flex h-full max-w-[452px] flex-col px-16 py-adaptive text-center">
        <StepProgress steps={3} currentStep={step} />
        <div className="h-[123px]" />
        <div className="flex grow flex-col justify-between gap-12">
          {step === JoinStep.ConnectWallet && (
            <>
              <div className="flex flex-col items-center gap-12">
                <LabelWithIcon icon={WalletIcon} label={<Trans>Connect wallet</Trans>} />
                <DiscountPromos />
              </div>
              <div className="flex flex-col items-center gap-16">
                <Button variant="primary-action" className="w-full" type="submit" onClick={openConnectModal}>
                  <Trans>Connect wallet</Trans>
                </Button>
                <ExternalLink href={REFERRALS_DOCS_URL} variant="icon" className="text-blue-300">
                  <Trans>Read more</Trans>
                </ExternalLink>
              </div>
            </>
          )}
          {step === JoinStep.EnterReferralCode && (
            <>
              <div className="flex flex-col items-center gap-12">
                <LabelWithIcon icon={ReferralsFilledIcon} label={<Trans>Enter referral code</Trans>} />
                <DiscountPromos />
              </div>
              <div className="flex flex-col gap-12">
                <form onSubmit={handleSubmit} className="flex flex-col gap-12">
                  <ReferralCodeInput
                    ref={inputRef}
                    disabled={isSubmitting}
                    value={referralCode}
                    onChange={(value) => {
                      setReferralCode(value);
                    }}
                  />
                  {/* Same place and style as the create form's code rules message */}
                  {codeError && (
                    <p role="alert" className="text-body-small -mt-4 text-red-500">
                      {codeError}
                    </p>
                  )}
                  <Button
                    variant="primary-action"
                    type="submit"
                    disabled={isSubmitting || Boolean(codeError) || isOwnCode || trimmedCode === ""}
                  >
                    {buttonText}
                  </Button>
                </form>
                <p className="text-body-small text-typography-secondary [text-wrap:balance] md:-mx-12">
                  <Trans>
                    You can find a referral code from{" "}
                    <button
                      type="button"
                      className="link-underline text-blue-300"
                      onClick={() => setIsHoldersModalVisible(true)}
                    >
                      top GT holders
                    </button>{" "}
                    or on other social media platforms
                  </Trans>
                </p>
              </div>
            </>
          )}
          {step === JoinStep.Success && (
            <>
              <div className="flex flex-col items-center gap-12">
                <LabelWithIcon icon={ReferralsFilledIcon} label={<Trans>Success</Trans>} />
                <h2 className="text-[40px] font-medium">
                  <Trans>Your {currentTierDiscount}% discount is now active!</Trans>
                </h2>
                <p className="text-body-medium text-typography-secondary">
                  <Trans>
                    You have activated the referral code {activatedReferralCodeLabel}. Your reduced rate applies
                    automatically to every position you open or close — no extra steps needed.
                  </Trans>
                </p>
              </div>
              <div className="flex flex-col gap-12">
                <Button
                  variant="primary-action"
                  className="w-full"
                  type="button"
                  onClick={() => history.push("/trade")}
                >
                  <div className="flex items-center gap-8">
                    <Trans>Start trading</Trans>
                    <ArrowRightIcon className="size-24" />
                  </div>
                </Button>
                <button
                  type="button"
                  className="text-body-small font-medium text-blue-300"
                  onClick={onGoToTraderDashboard}
                >
                  <Trans>Go to trader dashboard</Trans>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <TopGtHoldersModal
        isVisible={isHoldersModalVisible}
        setIsVisible={setIsHoldersModalVisible}
        holders={topHolders}
        onUseCode={(code) => {
          setReferralCode(code);
          setIsHoldersModalVisible(false);
          // Back to the code field, so keyboard users can apply it right away
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      />
    </div>
  );
}
