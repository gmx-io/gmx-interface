import "./RedirectModal.css";
import { useEffect } from "react";
import cx from "classnames";
import Modal from "../Modal/Modal";
import Checkbox from "../Checkbox/Checkbox";

export function RedirectPopupModal({
  redirectModalVisible,
  setRedirectModalVisible,
  appRedirectUrl,
  setRedirectPopupTimestamp,
  setShouldHideRedirectModal,
  shouldHideRedirectModal,
  removeRedirectPopupTimestamp,
}) {
  useEffect(() => {
    if (redirectModalVisible) {
      if (shouldHideRedirectModal) {
        setRedirectPopupTimestamp(Date.now());
      } else {
        removeRedirectPopupTimestamp();
      }
    }
  }, [setRedirectPopupTimestamp, shouldHideRedirectModal, removeRedirectPopupTimestamp, redirectModalVisible]);
  return (
    <Modal
      className="RedirectModal"
      isVisible={redirectModalVisible}
      setIsVisible={setRedirectModalVisible}
      label="Launch App"
    >
      You are leaving GMX.io and will be redirected to a third party, independent website.
      <br />
      <br />
      The website is a community deployed and maintained instance of the open source{" "}
      <a href="https://github.com/gmx-io/gmx-interface" target="_blank" rel="noopener noreferrer">
        GMX front end
      </a>
      , hosted and served on the distributed, peer-to-peer{" "}
      <a href="https://ipfs.io/" target="_blank" rel="noopener noreferrer">
        IPFS network
      </a>
      .
      <br />
      <br />
      Alternative links can be found in the{" "}
      <a href="https://gmxio.gitbook.io/gmx/app-links" target="_blank" rel="noopener noreferrer">
        docs
      </a>
      .
      <br />
      <br />
      <div className="mb-sm">
        <Checkbox isChecked={shouldHideRedirectModal} setIsChecked={setShouldHideRedirectModal}>
          I have read and agree to this message, don't show it again for 30 days.
        </Checkbox>
      </div>
      <div className={cx("Agree-button-container", { disabled: !shouldHideRedirectModal })}>
        <a href={appRedirectUrl} className={cx("App-cta Exchange-swap-button", { disabled: !shouldHideRedirectModal })}>
          Agree
        </a>
      </div>
    </Modal>
  );
}
