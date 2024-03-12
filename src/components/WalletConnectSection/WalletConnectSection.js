import { Trans } from "@lingui/macro";
import "./WalletConnectSection.css";
import arrowIcn from "img/arrow_icn.svg";

const WalletConnectSection = ({ walletIco, text, handleClick }) => {
  return (
    <button className="Wallet-btn-approve" onClick={handleClick}>
      <div style={{ display: "flex", alignItems: "center", fontFamily: "tektur" }}>
        <img className="wallet-ctn-img" src={walletIco} alt="wallet connect"></img>
        <Trans>{text}</Trans>
      </div>
      <div className="Wallet-btn-end">
        <img className="wallet-ctn-nextico" src={arrowIcn} alt={"Next step"} />
      </div>
    </button>
  );
};

export default WalletConnectSection;
