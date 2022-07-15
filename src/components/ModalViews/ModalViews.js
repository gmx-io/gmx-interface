import "./ModalViews.css";
import { useEffect } from "react";
import Modal from "../Modal/Modal";

export function RedirectPopupModal({
  redirectModalVisible,
  setRedirectModalVisible,
  appRedirectUrl,
  setRedirectPopupTimestamp,
}) {
  useEffect(() => {
    if (redirectModalVisible) {
      setRedirectPopupTimestamp(Date.now());
    }
  }, [setRedirectPopupTimestamp, redirectModalVisible]);
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
      <a href={appRedirectUrl} className="App-cta Exchange-swap-button">
        Agree
      </a>
    </Modal>
  );
}
