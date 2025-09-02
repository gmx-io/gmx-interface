import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useEffect, useState } from "react";

import type { LandingPageAgreementConfirmationEvent } from "lib/userAnalytics/types";
import { userAnalytics } from "lib/userAnalytics/UserAnalytics";

import IcLandingChecked from "img/ic_landing_checked.svg?react";

import { Modal } from "../../components/Modal/Modal";

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || (e.keyCode === 27 && onClose)) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <Modal isOpen={true} onClose={onClose}>
      <Modal.Header onClose={onClose}>
        <Trans>Launch App</Trans>
      </Modal.Header>

      <Modal.Body>
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
              Alternative links can be found in the <a href="https://docs.gmx.io/docs/community/frontends">docs</a>. By
              clicking Agree you accept the <a href="https://gmx.io/#/terms-and-conditions">T&Cs</a> and{" "}
              <a href="https://gmx.io/#/referral-terms">Referral T&Cs</a>.
            </Trans>
          </p>
        </div>

        <Modal.Bottom>
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
        </Modal.Bottom>

        <button
          className="btn-landing w-full rounded-8 py-18 text-center text-16 tracking-[-0.192px]"
          onClick={onClickAgree}
        >
          <Trans>Launch App</Trans>
        </button>
      </Modal.Body>
    </Modal>
  );
}
