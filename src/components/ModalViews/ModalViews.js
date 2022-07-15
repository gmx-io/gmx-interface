import "./ModalViews.css";
import { useEffect } from "react";
import Modal from "../Modal/Modal";
import Checkbox from "../Checkbox/Checkbox";

export function RedirectPopupModal({
  redirectModalVisible,
  setRedirectModalVisible,
  appRedirectUrl,
  setRedirectPopupTimestamp,
  setShouldHideRedirectModal,
  shouldHideRedirectModal,
}) {
  useEffect(() => {
    if (shouldHideRedirectModal) {
      setRedirectPopupTimestamp(Date.now());
    }
  }, [setRedirectPopupTimestamp, shouldHideRedirectModal]);
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
      <div className="mb-sm">
        <Checkbox isChecked={shouldHideRedirectModal} setIsChecked={setShouldHideRedirectModal}>
          I agree, don't show for 30 days.
        </Checkbox>
      </div>
      <a href={appRedirectUrl} className="App-cta Exchange-swap-button">
        Agree
      </a>
    </Modal>
  );
}
