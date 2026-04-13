import { Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { useAccount } from "wagmi";

import { REFERRALS_DOCS_URL } from "config/links";
import {
  useAffiliateTier,
  useCodeOwner,
  useReferrerDiscountShare,
  useTiers,
  useUserReferralCode,
} from "domain/referrals";
import { getSharePercentage } from "domain/referrals/utils/referralsHelper";
import { useChainId } from "lib/chains";

import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { StepProgress } from "components/Referrals/shared/wizard/StepProgress";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";
import ReferralsFilledIcon from "img/ic_referrals_filled.svg?react";
import WalletIcon from "img/ic_wallet.svg?react";
import referralWizardBg from "img/referral_wizard_bg.png";

import { LabelWithIcon } from "./LabelWithIcon";
import { ReferralCodeEditFormContainer } from "./ReferralCodeEditFormContainer";

enum JoinReferralWizardStep {
  ConnectWallet = 0,
  EnterReferralCode = 1,
  Success = 2,
}

function DiscountPromos() {
  return (
    <>
      <h2 className="text-[40px] font-medium max-md:text-[32px]">
        <Trans>
          Trade smarter with up
          <br className="max-md:hidden" /> to 10% fee savings
        </Trans>
      </h2>
      <p className="text-body-medium text-typography-secondary">
        <Trans>
          Enter a referral code to receive a trading fee discount.
          <br /> Depending on the referral tier, you can save up to 10% on all
          <br /> opening and closing fees.
        </Trans>
      </p>
    </>
  );
}

export function JoinReferralWizard({ onGoToTraderDashboard }: { onGoToTraderDashboard: () => void }) {
  const { openConnectModal } = useConnectModal();
  const { isConnected, address } = useAccount();
  const { chainId } = useChainId();
  const history = useHistory();
  const { userReferralCode } = useUserReferralCode(chainId, address);
  const { codeOwner } = useCodeOwner(chainId, address, userReferralCode);
  const { affiliateTier: traderTier } = useAffiliateTier(chainId, codeOwner);
  const { discountShare } = useReferrerDiscountShare(chainId, codeOwner);
  const { totalRebate } = useTiers(chainId, traderTier);
  const currentTierDiscount = getSharePercentage(traderTier, discountShare, totalRebate);

  const [joinReferralWizardStep, setJoinReferralWizardStep] = useState(JoinReferralWizardStep.ConnectWallet);
  const [userReferralCodeString, setUserReferralCodeString] = useState("");

  useEffect(
    function advanceStep() {
      if (isConnected && joinReferralWizardStep === JoinReferralWizardStep.ConnectWallet) {
        setJoinReferralWizardStep(JoinReferralWizardStep.EnterReferralCode);
      } else if (!isConnected) {
        setJoinReferralWizardStep(JoinReferralWizardStep.ConnectWallet);
      }
    },
    [isConnected, joinReferralWizardStep]
  );

  return (
    <div className="relative min-h-[570px] overflow-hidden rounded-8">
      <img
        src={referralWizardBg}
        className="absolute -left-8 -top-8 min-h-[calc(100%+16px)] min-w-[calc(100%+16px)] select-none object-fill blur-[12px]"
      />

      <div className="relative z-10 mx-auto flex h-full max-w-[452px] flex-col px-16 py-adaptive text-center">
        <StepProgress steps={3} currentStep={joinReferralWizardStep} />
        <div className="h-[123px]" />
        <div className="flex grow flex-col justify-between gap-12">
          {joinReferralWizardStep === JoinReferralWizardStep.ConnectWallet && (
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
                  <Trans>Learn more</Trans>
                </ExternalLink>
              </div>
            </>
          )}
          {joinReferralWizardStep === JoinReferralWizardStep.EnterReferralCode && (
            <>
              <div className="flex flex-col items-center gap-12">
                <LabelWithIcon icon={ReferralsFilledIcon} label={<Trans>Enter referral code</Trans>} />
                <DiscountPromos />
              </div>
              <div className="flex flex-col gap-12">
                <ReferralCodeEditFormContainer
                  callAfterSuccess={(code: string) => {
                    setUserReferralCodeString(code);
                    setJoinReferralWizardStep(JoinReferralWizardStep.Success);
                  }}
                />
                <p className="text-body-small text-typography-secondary">
                  <Trans>
                    You can find referral code in{" "}
                    <ExternalLink href="https://x.com/search?q=$GMX" className="text-blue-300">
                      X
                    </ExternalLink>{" "}
                    or on other social media platforms.
                  </Trans>
                </p>
              </div>
            </>
          )}
          {joinReferralWizardStep === JoinReferralWizardStep.Success && (
            <>
              <div className="flex flex-col items-center gap-12">
                <LabelWithIcon icon={ReferralsFilledIcon} label={<Trans>Success</Trans>} />
                <h2 className="text-[40px] font-medium">
                  {currentTierDiscount !== undefined ? (
                    <Trans>Your {currentTierDiscount}% discount is now active!</Trans>
                  ) : (
                    <Trans>Your discount is now active!</Trans>
                  )}
                </h2>
                <p className="text-body-medium text-typography-secondary">
                  <Trans>
                    You have activated the referral code {userReferralCodeString}. Every position you open or close will
                    automatically apply your reduced rate — no extra steps needed.
                  </Trans>
                </p>
              </div>
              <div className="flex flex-col gap-12">
                <Button
                  variant="primary-action"
                  className="w-full"
                  type="button"
                  onClick={() => {
                    history.push("/trade");
                  }}
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
                  <Trans>Go to Trader Dashboard</Trans>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
