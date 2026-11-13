import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useEffect, useRef, useState } from "react";

import { REFERRALS_DOCS_URL } from "config/links";
import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { helperToast } from "lib/helperToast";

import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { ShareReferralCardModal } from "components/Referrals/shared/cards/ShareReferralCardModal";
import { StepProgress } from "components/Referrals/shared/wizard/StepProgress";
import { LabelWithIcon } from "components/Referrals/traders/joinCode/LabelWithIcon";

import CheckIcon from "img/ic_check_circle.svg?react";
import ReferralsFilledIcon from "img/ic_referrals_filled.svg?react";
import ShareArrowOutlineIcon from "img/ic_share_arrow_outline.svg?react";
import WalletIcon from "img/ic_wallet.svg?react";
import referralWizardBg from "img/referral_wizard_bg.png";

import { getSolanaCodeError, getSolanaReferralLink, SOLANA_TRADER_DISCOUNT_PERCENT } from "./solanaReferralsTypes";

enum CreateStep {
  ConnectWallet = 0,
  CreateReferralCode = 1,
  Success = 2,
}

function AffiliatePromos() {
  return (
    <>
      <h2 className="text-[40px] font-medium [text-wrap:balance] max-md:text-[32px] md:-mx-12">
        <Trans>Earn GT and GT sellable quota as an affiliate</Trans>
      </h2>
      <p className="text-body-medium text-typography-secondary [text-wrap:balance]">
        <Trans>
          Share your referral code with friends or your community. Every trade made with your code earns you GT and GT
          sellable quota.
        </Trans>
      </p>
    </>
  );
}

export function SolanaCreateAffiliateWizard({
  account,
  createCode,
  onCreated,
  onGoToAffiliateDashboard,
}: {
  account: string | undefined;
  createCode: (code: string) => Promise<void>;
  onCreated: (code: string) => void;
  onGoToAffiliateDashboard: () => void;
}) {
  const { openConnectModal } = useConnectModal();
  const isConnected = Boolean(account);
  const [step, setStep] = useState(CreateStep.ConnectWallet);
  const [referralCode, setReferralCode] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);

  useEffect(
    function advanceStep() {
      if (isConnected && step === CreateStep.ConnectWallet) {
        setStep(CreateStep.CreateReferralCode);
      } else if (!isConnected) {
        setStep(CreateStep.ConnectWallet);
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
    if (step === CreateStep.CreateReferralCode) inputRef.current?.focus();
  }, [step]);

  const trimmedCode = referralCode.trim();
  const codeError = trimmedCode ? getSolanaCodeError(trimmedCode) : "";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmedCode || codeError || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createCode(trimmedCode);
      if (!isMountedRef.current) return; // another wallet by now: its wizard is a new one
      setCreatedCode(trimmedCode);
      onCreated(trimmedCode);
      setStep(CreateStep.Success);
    } catch (e) {
      helperToast.error(e instanceof Error ? e.message : t`Something went wrong`);
    } finally {
      setIsSubmitting(false);
    }
  }

  const buttonText = isSubmitting ? t`Creating...` : trimmedCode === "" ? t`Enter a code` : t`Create`;
  // Named like the EVM wizard's placeholder, so the existing translations of this message apply
  const createdReferralCode = createdCode;

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
          {step === CreateStep.ConnectWallet && (
            <>
              <div className="flex flex-col items-center gap-12">
                <LabelWithIcon icon={WalletIcon} label={<Trans>Connect wallet</Trans>} />
                <AffiliatePromos />
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
          {step === CreateStep.CreateReferralCode && (
            <>
              <div className="flex flex-col items-center gap-12">
                <LabelWithIcon icon={ReferralsFilledIcon} label={<Trans>Create referral code</Trans>} />
                <AffiliatePromos />
              </div>
              <div className="flex flex-col gap-12">
                <form onSubmit={handleSubmit}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={referralCode}
                    disabled={isSubmitting}
                    className={cx("text-input", { "mb-15": !codeError })}
                    placeholder={t`Enter a code`}
                    onChange={({ target }) => {
                      setReferralCode(target.value);
                    }}
                  />
                  {codeError && (
                    <p role="alert" className="text-body-small m-0 pb-24 pt-8 text-red-500">
                      {codeError}
                    </p>
                  )}
                  <Button
                    variant="primary-action"
                    className="w-full"
                    type="submit"
                    disabled={isSubmitting || Boolean(codeError) || trimmedCode === ""}
                  >
                    {buttonText}
                  </Button>
                </form>
                <ExternalLink
                  variant="icon"
                  href={REFERRALS_DOCS_URL}
                  className="text-body-small self-center text-blue-300"
                >
                  <Trans>Read more</Trans>
                </ExternalLink>
              </div>
            </>
          )}
          {step === CreateStep.Success && (
            <>
              <div className="flex flex-col items-center gap-12">
                <LabelWithIcon icon={CheckIcon} label={<Trans>Done!</Trans>} />
                <h2 className="text-[40px] font-medium">
                  <Trans>Your code is ready. Share it!</Trans>
                </h2>
                <p className="text-body-medium text-typography-secondary">
                  <Trans>
                    Your referral code {createdReferralCode} is now active. Share it with friends or your community.
                  </Trans>
                </p>
              </div>
              <div className="flex flex-col gap-12">
                <Button
                  variant="primary-action"
                  className="w-full"
                  type="button"
                  onClick={() => setIsShareModalVisible(true)}
                >
                  <div className="flex items-center gap-8">
                    <Trans>Share your code</Trans>
                    <ShareArrowOutlineIcon className="size-24" />
                  </div>
                </Button>
                <button
                  type="button"
                  className="text-body-small font-medium text-blue-300 transition-colors hover:text-typography-primary"
                  onClick={onGoToAffiliateDashboard}
                >
                  <Trans>Go to affiliate dashboard</Trans>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <ShareReferralCardModal
        isVisible={isShareModalVisible}
        setIsVisible={setIsShareModalVisible}
        referralCode={createdCode}
        referralLink={createdCode ? getSolanaReferralLink(createdCode) : undefined}
        traderDiscountPercentage={SOLANA_TRADER_DISCOUNT_PERCENT}
        isSolana
      />
    </div>
  );
}
