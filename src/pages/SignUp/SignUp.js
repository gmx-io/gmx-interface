import React from "react";
import "./Signup.css";
import WalletConnectSection from "components/WalletConnectSection/WalletConnectSection";
import metamaskImg from "img/metamask.png";
import coinbaseImg from "img/coinbaseWallet.png";
import walletConnectImg from "img/walletconnect-circle-blue.svg";

const SignUp = () => {
  const activateMetaMask = () => {};

  return (
    <div className="page-layout">
      <div className="signup-wrapper">
        <div style={{ display: "flex", flexDirection: "column", textAlign: "center" }}>
          <div style={{ padding: "12px" }}>
            <label className="connect-wallet-title">Connect Wallet</label>
          </div>
          <label className="connect-wallet-description">Select your favourite wallet to log in t3 Finance</label>
        </div>
        <div style={{ marginTop: "35px" }}>
          <WalletConnectSection
            walletIco={metamaskImg}
            text={`Connect Metamask`}
            handleClick={activateMetaMask}

            // disabled={false}
            // showArrow={true}
            // isActive={activeStep === 2}
            // showSkip={false}
          />
          <WalletConnectSection walletIco={coinbaseImg} text={`Coinbase wallet`} handleClick={activateMetaMask} />
          <WalletConnectSection walletIco={walletConnectImg} text={`Wallet Connect`} handleClick={activateMetaMask} />
        </div>
      </div>
    </div>
  );
};

export default SignUp;
