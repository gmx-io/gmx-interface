import { Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { useAccount } from "wagmi";

import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";
import ReferralsFilledIcon from "img/ic_referrals_filled.svg?react";
import WalletIcon from "img/ic_wallet.svg?react";
import referralWizardBg from "img/referral_wizard_bg.png";

import { StepProgress } from "../StepProgress";
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
      <h2 className="text-[40px] font-medium">
        <Trans>
          Trade smarter with up
          <br /> to 10% fee savings
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
  const { isConnected } = useAccount();
  const history = useHistory();

  const [joinReferralWizardStep, setJoinReferralWizardStep] = useState(JoinReferralWizardStep.ConnectWallet);
  // TODO: maybe instead of creating a string we use real hook
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
    <div className="relative h-[570px] overflow-hidden rounded-8">
      <img
        src={referralWizardBg}
        className="absolute -left-8 -top-8 min-h-[calc(100%+16px)] min-w-[calc(100%+16px)] select-none object-cover blur-[12px]"
      />

      <div className="relative z-10 mx-auto flex h-full w-[420px] flex-col py-20 text-center">
        <StepProgress steps={3} currentStep={joinReferralWizardStep} />
        <div className="h-[123px]" />
        <div className="flex grow flex-col justify-between">
          {joinReferralWizardStep === JoinReferralWizardStep.ConnectWallet && (
            <>
              <div className="flex flex-col items-center gap-12">
                <LabelWithIcon icon={WalletIcon} label={<Trans>Connect wallet</Trans>} />
                <DiscountPromos />
              </div>
              <div className="flex flex-col items-center gap-16">
                <Button variant="primary-action" className="w-full" type="submit" onClick={openConnectModal}>
                  <Trans>Connect Wallet</Trans>
                </Button>
                <ExternalLink href="https://www.google.com" variant="icon" className="text-blue-300">
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
                <div
                  onClick={() => {
                    setUserReferralCodeString("MIDAS");
                    setJoinReferralWizardStep(JoinReferralWizardStep.Success);
                  }}
                >
                  test
                </div>
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
                  <Trans>Your 15% discount is now active!</Trans>
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
                  <Trans>Start trading</Trans>
                  <ArrowRightIcon className="size-24" />
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
