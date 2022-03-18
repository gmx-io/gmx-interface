import React, { useEffect, useState } from "react";
import { useWeb3React } from "@web3-react/core";
import useSWR from "swr";
import { ethers } from "ethers";
import cx from "classnames";

import Treasury from "../../abis/Treasury.json";
import Token from "../../abis/Token.json";
import GMT from "../../abis/GMT.json";

import { ImCheckboxUnchecked, ImCheckboxChecked } from "react-icons/im";

import {
  getInjectedConnector,
  useEagerConnect,
  useInactiveListener,
  fetcher,
  formatAmount,
  numberWithCommas,
  getExplorerUrl,
  helperToast,
  CHAIN_ID,
} from "../../Helpers";
import { getContract } from "../../Addresses";

import "./Presale.css";

const PRECISION = 1000000;

export default function Presale() {
  const hardCap = ethers.BigNumber.from("900000000000000000000000");

  const [busdQty, setBusdQty] = useState("0");
  const [isApproving, setIsApproving] = useState(false);
  const [busdQtyInput, setBusdQtyInput] = useState("");

  const { connector, activate, active, account, library } = useWeb3React();
  const [activatingConnector, setActivatingConnector] = useState();
  useEffect(() => {
    if (activatingConnector && activatingConnector === connector) {
      setActivatingConnector(undefined);
    }
  }, [activatingConnector, connector]);
  const triedEager = useEagerConnect();
  useInactiveListener(!triedEager || !!activatingConnector);
  const activateMetamask = async () => {
    activate(getInjectedConnector(), (e) => {
      helperToast.error(e.toString());
    });
  };

  const treasury = getContract(CHAIN_ID, "Treasury");
  const busd = getContract(CHAIN_ID, "BUSD");
  const gmt = getContract(CHAIN_ID, "GMT");

  const { data: busdReceived, mutate: updateBusdReceived } = useSWR([active, treasury, "busdReceived"], {
    fetcher: fetcher(library, Treasury),
  });
  const { data: busdBalance, mutate: updateBusdBalance } = useSWR([active, busd, "balanceOf", account], {
    fetcher: fetcher(library, Token),
  });
  const { data: busdAllowance, mutate: updateBusdAllowance } = useSWR([active, busd, "allowance", account, treasury], {
    fetcher: fetcher(library, Token),
  });
  const { data: gmtBalance, mutate: updateGmtBalance } = useSWR([active, gmt, "balanceOf", account], {
    fetcher: fetcher(library, GMT),
  });
  const { data: busdSent, mutate: updateBusdSent } = useSWR([active, treasury, "swapAmounts", account], {
    fetcher: fetcher(library, Treasury),
  });
  const { data: inWhitelist, mutate: updateInWhitelist } = useSWR([active, treasury, "swapWhitelist", account], {
    fetcher: fetcher(library, Treasury),
  });

  let busdRemaining;
  if (inWhitelist && busdSent) {
    busdRemaining = ethers.BigNumber.from("2000000000000000000000").sub(busdSent);
  }

  let hardCapRemaining;
  if (busdReceived) {
    hardCapRemaining = hardCap.sub(busdReceived);
  }

  let maxBusd;
  if (busdRemaining && busdBalance) {
    maxBusd = busdRemaining.lt(busdBalance) ? busdRemaining : busdBalance;
  }

  if (hardCapRemaining && maxBusd) {
    maxBusd = hardCapRemaining.lt(maxBusd) ? hardCapRemaining : maxBusd;
  }

  let gmtAmount = ethers.BigNumber.from("0");
  if (busdQty !== "0") {
    gmtAmount = ethers.BigNumber.from(busdQty)
      .mul(PRECISION)
      .div(4.5 * PRECISION)
      .toString();
  }

  useEffect(() => {
    if (active) {
      library.on("block", () => {
        updateBusdReceived(undefined, true);
        updateBusdBalance(undefined, true);
        updateGmtBalance(undefined, true);
        updateBusdSent(undefined, true);
        updateInWhitelist(undefined, true);
        updateBusdAllowance(undefined, true);
      });
      return () => {
        library.removeAllListeners("block");
      };
    }
  }, [
    active,
    library,
    updateBusdReceived,
    updateBusdBalance,
    updateGmtBalance,
    updateBusdSent,
    updateInWhitelist,
    updateBusdAllowance,
  ]);

  const approveTokens = async () => {
    setIsApproving(true);
    const contract = new ethers.Contract(busd, Token.abi, library.getSigner());
    contract
      .approve(treasury, ethers.constants.MaxUint256)
      .then(async (res) => {
        const txUrl = getExplorerUrl(CHAIN_ID) + "tx/" + res.hash;
        helperToast.success(
          <div>
            Approval submitted!{" "}
            <a href={txUrl} target="_blank" rel="noopener noreferrer">
              View status.
            </a>
            <br />
          </div>
        );
      })
      .catch((e) => {
        console.error(e);
        helperToast.error("Approval failed.");
      })
      .finally(() => {
        setIsApproving(false);
      });
  };

  const buy = async () => {
    const contract = new ethers.Contract(treasury, Treasury.abi, library.getSigner());
    contract
      .swap(busdQty)
      .then(async (res) => {
        const txUrl = getExplorerUrl(CHAIN_ID) + "tx/" + res.hash;
        helperToast.success(
          <div>
            Buy submitted!{" "}
            <a href={txUrl} target="_blank" rel="noopener noreferrer">
              View status.
            </a>
            <br />
          </div>
        );
      })
      .catch((e) => {
        console.error(e);
        helperToast.error("Buy failed.");
      })
      .finally(() => {});
  };

  const onClickPrimary = async () => {
    if (!active) {
      activateMetamask();
      return;
    }
    buy();
  };

  const updateBusdQty = (value) => {
    setBusdQty(value.toString());
    setBusdQtyInput(formatAmount(value));
  };

  const updateBusdQtyInput = (inputValue) => {
    setBusdQtyInput(inputValue);

    const parsedValue = parseFloat(inputValue);
    if (isNaN(parsedValue)) {
      setBusdQty("0");
      return;
    }

    const wei = ethers.utils.parseEther(parsedValue.toString());
    setBusdQty(wei.toString());
  };

  let hasApproval = false;
  if (busdAllowance && busdQty && ethers.BigNumber.from(busdQty).lt(busdAllowance)) {
    hasApproval = true;
  }

  return (
    <div className="Presale">
      <div className="Presale-title">
        {!busdReceived && "*"}
        {busdReceived && numberWithCommas(parseInt(formatAmount(busdReceived)))}
        &nbsp;BUSD
      </div>
      <div className="Presale-subtitle">
        Worth of <strong>$GMT</strong> purchased
      </div>
      <div className="Presale-cards">
        <div className="Presale-card">
          <div className="Presale-card-content">
            <div className="Card-title Presale-wallet-title">Wallet</div>
            <div className="Card-content">
              <div className="Presale-account-label">Account</div>
              <div className="Presale-account">{account}</div>
              <div className="Presale-balance">
                {formatAmount(busdBalance, 1, 2)} BUSD &nbsp;|&nbsp; {formatAmount(gmtBalance, 1, 2)} GMT
              </div>
              <div className="Presale-balance">
                The GMT presale has ended, $GMT will be listed on PancakeSwap on 8 March 2021 at 12PM (GMT+0)
              </div>
              <table className="Presale-price">
                <tbody>
                  <tr>
                    <td>Presale price:</td>
                    <td>4.5 BUSD per GMT</td>
                  </tr>
                  <tr>
                    <td>Listing price:</td>
                    <td>5.0 BUSD per GMT</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="Presale-card">
          <div className="Presale-card-background"></div>
          <div className="Presale-card-content">
            <div className="Card-title">Buy GMT</div>
            <div className="App-input Presale-send-input">
              <div className="App-input-top">
                <div className="App-input-label">Enter BUSD to send</div>
                {maxBusd && (
                  <div className="App-input-max" onClick={() => updateBusdQty(maxBusd)}>
                    Max: {formatAmount(maxBusd)}
                  </div>
                )}
              </div>
              <div className="App-input-container">
                <div className="App-input-holder">
                  <input
                    type="text"
                    placeholder="0"
                    value={busdQtyInput}
                    onChange={(e) => updateBusdQtyInput(e.target.value)}
                    disabled={true}
                  />
                </div>
                <div className="App-input-unit">BUSD</div>
              </div>
            </div>
            <div className="Presale-receive">You will receive {formatAmount(gmtAmount)} GMT</div>
            <br />
            <div className={cx("Presale-approve", "disabled")} onClick={() => approveTokens()}>
              {hasApproval && <ImCheckboxChecked className="App-icon" />}
              {!hasApproval && <ImCheckboxUnchecked className="App-icon" />}
              {isApproving && "Approving sending of BUSD..."}
              {!isApproving && !hasApproval && "Approve sending of BUSD"}
              {!isApproving && hasApproval && "Sending of BUSD approved"}
            </div>
            <div>
              <button className="App-cta App-button Presale-buy-button" disabled={active} onClick={onClickPrimary}>
                {!active && "Connect Wallet"}
                {active && "Hardcap Reached - Presale Closed"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
