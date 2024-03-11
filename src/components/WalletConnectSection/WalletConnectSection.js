import React from "react";
import { useState, useEffect } from "react";
import { Trans } from "@lingui/macro";
import "./WalletConnectSection.css";
import arrowIcn from "img/arrow_icn.svg";

const WalletConnectSection = ({ walletIco, text, handleClick, walletConnected }) => {
  const [setIsCompleted] = useState(false);

  useEffect(() => {
    if (walletConnected) {
      setIsCompleted(true);
    }
  }, [walletConnected]);

  return (
    <button className="Wallet-btn-approve" onClick={handleClick}>
      <div style={{ display: "flex", alignItems: "center", fontFamily: "tektur" }}>
        <img className="wallet-ctn-img" src={walletIco}></img>
        <Trans>{text}</Trans>
      </div>
      <div className="Wallet-btn-end">
        {/* <Button>Skip</Button> */}
        <img className="wallet-ctn-nextico" src={arrowIcn} alt={"Next step"} />
      </div>
    </button>
  );
};

export default WalletConnectSection;
