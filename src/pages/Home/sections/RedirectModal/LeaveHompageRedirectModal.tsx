import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { userAnalytics } from "lib/userAnalytics";
import { LandingPageAgreementConfirmationEvent } from "lib/userAnalytics/types";
import { useRedirectPopupTimestamp } from "lib/useRedirectPopupTimestamp";

import IcCross from "img/ic_cross.svg?react";
import IcLandingChecked from "img/ic_landing_checked.svg?react";

type LeaveHomepageRedirectModalProps = {
  onClose: () => void;
  to: string;
};

export function LeaveHomepageRedirectModal({ onClose, to }: LeaveHomepageRedirectModalProps) {
  const [, setRedirectPopupTimestamp] = useRedirectPopupTimestamp();
  const [shouldHideRedirectModal, setShouldHideRedirectModal] = useState(false);
  const onClickAgree = () => {
    userAnalytics.pushEvent<LandingPageAgreementConfirmationEvent>({
      event: "LandingPageAction",
      data: {
        action: "AgreementConfirmationAgreeClick",
      },
    });

    if (shouldHideRedirectModal) {
      setRedirectPopupTimestamp(Date.now());
    }
    window.location.href = to;
  };
  useEffect(() => {
    userAnalytics.pushEvent<LandingPageAgreementConfirmationEvent>({
      event: "LandingPageAction",
      data: {
        action: "AgreementConfirmationDialogShown",
      },
    });
  });
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex h-screen w-screen bg-fiord-700/50 text-white" onClick={handleBackdropClick}>
      <div className="m-auto flex w-[351px] flex-col rounded-8 border-[0.5px] border-[#363A59] bg-fiord-800 sm:w-[420px] ">
        <div className="flex justify-between gap-20 border-b-[0.5px] border-[#363A59] p-20 pt-24">
          <h3 className="text-16 font-medium leading-[125%] tracking-[-0.192px]">
            <Trans>Launch App</Trans>
          </h3>
          <button className="mr-4" onClick={onClose}>
            <IcCross className="size-20" />
          </button>
        </div>
        <div className="flex flex-col gap-16 p-20 text-14 font-normal leading-[130%] tracking-body">
          <div className="flex flex-col gap-12">
            <p>
              <Trans>You are leaving GMX.io and will be redirected to a third party, independent website.</Trans>
            </p>
            <p>
              <Trans>
                The website is a community deployed and maintained instance of the open source{" "}
                <a href="https://github.com/gmx-io/gmx-interface">GMX front end</a>, hosted and served on the
                distributed, peer-to-peer <a href="https://ipfs.io/">IPFS network</a>.
              </Trans>
            </p>
            <p>
              <Trans>
                Alternative links can be found in the <a href="https://docs.gmx.io/docs/community/frontends">docs</a>.
                By clicking Agree you accept the <a href="https://gmx.io/#/terms-and-conditions">T&Cs</a> and{" "}
                <a href="https://gmx.io/#/referral-terms">Referral T&Cs</a>.
              </Trans>
            </p>
          </div>
          <div className="flex items-center gap-4 border-t-[0.5px] border-[#363A59] pt-12">
            <label className="flex cursor-pointer items-center gap-4">
              <input
                type="checkbox"
                checked={shouldHideRedirectModal}
                onChange={(e) => setShouldHideRedirectModal(e.target.checked)}
                className="sr-only"
              />
              <IcLandingChecked
                className={cx("m-4 size-12 rounded-4 transition-colors", {
                  "bg-blue-600": shouldHideRedirectModal,
                  "bg-white": !shouldHideRedirectModal,
                })}
              />
              <Trans>Don't show this message again for 30 days.</Trans>
            </label>
          </div>
          <button
            className="btn-landing-bg w-full rounded-8 py-18 text-center text-16 tracking-[-0.192px]"
            onClick={onClickAgree}
          >
            <Trans>Launch App</Trans>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
