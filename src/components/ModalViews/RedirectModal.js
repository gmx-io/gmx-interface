import "./RedirectModal.css";
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
  const onClickAgree = () => {
    if (shouldHideRedirectModal) {
      setRedirectPopupTimestamp(Date.now());
    }
  };

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
      By clicking Agree you accept the{" "}
      <a href="https://gmx.io/#/terms-and-conditions" target="_blank" rel="noopener noreferrer">
        T&Cs
      </a>{" "}
      and{" "}
      <a href="https://gmx.io/#/referral-terms" target="_blank" rel="noopener noreferrer">
        Referral T&Cs
      </a>
      .
      <br />
      <br />
      <div className="mb-sm">
        <Checkbox isChecked={shouldHideRedirectModal} setIsChecked={setShouldHideRedirectModal}>
          Don't show this message again for 30 days.
        </Checkbox>
      </div>
      <a href={appRedirectUrl} className="App-cta Exchange-swap-button" onClick={() => onClickAgree()}>
        Agree
      </a>
    </Modal>
  );
}
