import { Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { ShareReferralCardModal } from "components/Referrals/shared/cards/ShareReferralCardModal";
import { useRecentReferralCodes } from "components/Referrals/shared/hooks/useRecentReferralCodes";
import { StepProgress } from "components/Referrals/shared/wizard/StepProgress";
import { LabelWithIcon } from "components/Referrals/traders/joinCode/LabelWithIcon";

import CheckIcon from "img/ic_check_circle.svg?react";
import ReferralsFilledIcon from "img/ic_referrals_filled.svg?react";
import ShareArrowOutlineIcon from "img/ic_share_arrow_outline.svg?react";
import WalletIcon from "img/ic_wallet.svg?react";
import referralWizardBg from "img/referral_wizard_bg.png";

import { AffiliateCodeFormContainer } from "./AddAffiliateCode";

enum CreateAffiliateWizardStep {
  ConnectWallet = 0,
  CreateReferralCode = 1,
  Success = 2,
}

function AffiliatePromos() {
  return (
    <>
      <h2 className="text-[40px] font-medium max-md:text-[32px]">
        <Trans>
          Earn up to 20% in
          <br className="max-md:hidden" /> rebates as an Affiliate
        </Trans>
      </h2>
      <p className="text-body-medium text-typography-secondary">
        <Trans>
          Share your referral code with friends or your community —<br /> every trade made with your code earns you
          $-rewards.
        </Trans>
      </p>
    </>
  );
}

export function CreateAffiliateWizard({
  onGoToAffiliateDashboard,
  handleCreateReferralCode,
  initialReferralCode,
  traderDiscountPercentage,
}: {
  onGoToAffiliateDashboard: () => void;
  handleCreateReferralCode: (code: string) => Promise<unknown>;
  initialReferralCode: string | undefined;
  traderDiscountPercentage?: string | number;
}) {
  const { openConnectModal } = useConnectModal();
  const { isConnected } = useAccount();

  const [wizardStep, setWizardStep] = useState(CreateAffiliateWizardStep.ConnectWallet);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const { recentCodes, addRecentCode } = useRecentReferralCodes();
  const createdReferralCode = recentCodes.at(-1) ?? "";

  useEffect(
    function advanceStep() {
      if (isConnected && wizardStep === CreateAffiliateWizardStep.ConnectWallet) {
        setWizardStep(CreateAffiliateWizardStep.CreateReferralCode);
      } else if (!isConnected) {
        setWizardStep(CreateAffiliateWizardStep.ConnectWallet);
      }
    },
    [isConnected, wizardStep]
  );

  return (
    <div className="relative min-h-[570px] overflow-hidden rounded-8">
      <img
        src={referralWizardBg}
        className="absolute -left-8 -top-8 min-h-[calc(100%+16px)] min-w-[calc(100%+16px)] select-none object-fill blur-[12px]"
      />

      <div className="relative z-10 mx-auto flex h-full max-w-[452px] flex-col px-16 py-adaptive text-center">
        <StepProgress steps={3} currentStep={wizardStep} />
        <div className="h-[123px]" />
        <div className="flex grow flex-col justify-between gap-12">
          {wizardStep === CreateAffiliateWizardStep.ConnectWallet && (
            <>
              <div className="flex flex-col items-center gap-12">
                <LabelWithIcon icon={WalletIcon} label={<Trans>Connect wallet</Trans>} />
                <AffiliatePromos />
              </div>
              <div className="flex flex-col items-center gap-16">
                <Button variant="primary-action" className="w-full" type="submit" onClick={openConnectModal}>
                  <Trans>Connect wallet</Trans>
                </Button>
                <ExternalLink href="https://docs.gmx.io/docs/referrals" variant="icon" className="text-blue-300">
                  <Trans>Learn more</Trans>
                </ExternalLink>
              </div>
            </>
          )}
          {wizardStep === CreateAffiliateWizardStep.CreateReferralCode && (
            <>
              <div className="flex flex-col items-center gap-12">
                <LabelWithIcon icon={ReferralsFilledIcon} label={<Trans>Create referral code</Trans>} />
                <AffiliatePromos />
              </div>
              <div className="flex flex-col gap-12">
                <AffiliateCodeFormContainer
                  handleCreateReferralCode={handleCreateReferralCode}
                  initialReferralCode={initialReferralCode}
                  callAfterSuccess={(code: string) => {
                    addRecentCode(code);
                    setWizardStep(CreateAffiliateWizardStep.Success);
                  }}
                />
                <ExternalLink
                  variant="icon"
                  href="https://docs.gmx.io/docs/referrals"
                  className="text-body-small self-center text-blue-300"
                >
                  <Trans>Learn more</Trans>
                </ExternalLink>
              </div>
            </>
          )}
          {wizardStep === CreateAffiliateWizardStep.Success && (
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
                  <Trans>Go to Affiliate Dashboard</Trans>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <ShareReferralCardModal
        isVisible={isShareModalVisible}
        setIsVisible={setIsShareModalVisible}
        referralCode={createdReferralCode}
        traderDiscountPercentage={traderDiscountPercentage}
        hasReferredUsers={false}
      />
    </div>
  );
}
