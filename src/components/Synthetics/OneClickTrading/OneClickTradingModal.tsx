import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import {
  useOneClickTradingGenerateSubAccount,
  useOneClickTradingModalOpen,
} from "context/OneClickTradingContext/OneClickTradingContext";
import infoIcon from "img/ic_info.svg";
import { useCallback } from "react";

export function OneClickTradingModal() {
  const [isVisible, setIsVisible] = useOneClickTradingModalOpen();
  const generateSubAccount = useOneClickTradingGenerateSubAccount();

  const onGenerateSubAccountClick = useCallback(() => {
    generateSubAccount();
  }, [generateSubAccount]);

  return (
    <Modal label="One-Click Trading" isVisible={isVisible} setIsVisible={setIsVisible}>
      <div className="OneClickTrading-alert">
        <img src={infoIcon} alt="Info Icon" />
        <span>Enable One-Click Trading to reduce signing popups.</span>
      </div>
      <Button variant="primary-action" onClick={onGenerateSubAccountClick}>
        Generate Subaccount
      </Button>
    </Modal>
  );
}
