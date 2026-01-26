import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useEffect, useState } from "react";

import type { LandingPageAgreementConfirmationEvent } from "lib/userAnalytics/types";
import { userAnalytics } from "lib/userAnalytics/UserAnalytics";

import IcLandingChecked from "img/ic_landing_checked.svg?react";

import { Modal, ModalBody, ModalBottom, ModalHeader } from "../Modal/Modal";

type LeaveHomepageRedirectModalProps = {
  onClose: () => void;
  to: string;
  setRedirectPopupTimestamp: (timestamp: number) => void;
};

export function LeaveHomepageRedirectModal({
  onClose,
  to,
  setRedirectPopupTimestamp,
}: LeaveHomepageRedirectModalProps) {
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

  return (
    <Modal onClose={onClose}>
      <ModalHeader onClose={onClose}>
        <Trans>Launch App</Trans>
      </ModalHeader>

      <ModalBody>
        <div className="flex flex-col gap-12">
          <p>
            <Trans>You are leaving GMX.io and will be redirected to a third party, independent website.</Trans>
          </p>
          <p>
            <Trans>
              The website is a community deployed and maintained instance of the open source{" "}
              <a href="https://github.com/gmx-io/gmx-interface">GMX front end</a>, hosted and served on the distributed,
              peer-to-peer <a href="https://ipfs.io/">IPFS network</a>.
            </Trans>
          </p>
          <p>
            <Trans>
              Alternative links can be found in the <a href="https://docs.gmx.io/docs/frontends">docs</a>. By clicking
              Agree you accept the <a href="https://gmx.io/#/terms-and-conditions">T&Cs</a> and{" "}
              <a href="https://gmx.io/#/referral-terms">Referral T&Cs</a>.
            </Trans>
          </p>
        </div>

        <ModalBottom>
          <label className="flex cursor-pointer items-center gap-4">
            <input
              type="checkbox"
              checked={shouldHideRedirectModal}
              onChange={(e) => setShouldHideRedirectModal(e.target.checked)}
              className="sr-only"
            />
            <IcLandingChecked
              className={cx("m-4 size-12 rounded-4 transition-colors", {
                "bg-blue-400": shouldHideRedirectModal,
                "bg-white": !shouldHideRedirectModal,
              })}
            />
            <Trans>Don't show this message again for 30 days.</Trans>
          </label>
        </ModalBottom>

        <button
          className="btn-landing w-full rounded-8 py-18 text-center text-16 tracking-[-0.192px]"
          onClick={onClickAgree}
        >
          <Trans>Launch App</Trans>
        </button>
      </ModalBody>
    </Modal>
  );
}
