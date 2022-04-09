import React, { useState } from "react";
import { useWeb3React } from "@web3-react/core";

import Button from "../../components/Common/Button";
import Card from "../../components/Common/Card";
import SEO from "../../components/Common/SEO";
import Tab from "../../components/Tab/Tab";
import Footer from "../../Footer";
import {
  useChainId,
  getPageTitle,
  formatAmount,
  USD_DECIMALS,
  helperToast,
  formatDate,
  getTokenInfo,
  getExplorerUrl,
  shortenAddress,
} from "../../Helpers";
import { useReferralsData } from "../../Api/referrals";

import "./Referrals.css";
import { registerReferralCode, useInfoTokens } from "../../Api";
import { utils } from "ethers";
import { BiCopy } from "react-icons/bi";
import Tooltip from "../../components/Tooltip/Tooltip";
import { useCopyToClipboard } from "react-use";
import Loader from "../../components/Common/Loader";

const REBATES = "Rebates";
const REFERRERS = "Referrers";
let TAB_OPTIONS = [REBATES, REFERRERS];

export default function Referrals() {
  const { active, account, library } = useWeb3React();
  const { chainId } = useChainId();
  const { infoTokens } = useInfoTokens(library, chainId, active, undefined, undefined);
  function handleCreateReferralCode(event, code) {
    event.preventDefault();
    let referralCodeHex = utils.formatBytes32String(code);

    return registerReferralCode(chainId, referralCodeHex, {
      library,
      successMsg: `Referral code created!`,
      failMsg: "Referral code creation failed.",
    });
  }

  let [activeTab, setActiveTab] = useState(REBATES);
  // "0xbb00f2e53888e60974110d68f1060e5eaab34790"
  const referralsData = useReferralsData(chainId, account);
  console.log(referralsData);
  function displayBody() {
    if (!account) {
      return (
        <CreateReferrarCode
          isWalletConnected={!!account}
          handleCreateReferralCode={handleCreateReferralCode}
          library={library}
          chainId={chainId}
        />
      );
    }

    if (!referralsData) return <Loader />;

    if (activeTab === REFERRERS) {
      if (referralsData?.codes?.length > 0) {
        return (
          <ReferrersStats
            infoTokens={infoTokens}
            handleCreateReferralCode={handleCreateReferralCode}
            referralsData={referralsData}
            chainId={chainId}
          />
        );
      } else {
        return (
          <CreateReferrarCode
            isWalletConnected={!!account}
            handleCreateReferralCode={handleCreateReferralCode}
            library={library}
            chainId={chainId}
          />
        );
      }
    }
    if (activeTab === REBATES) {
      return <Rebates />;
    }
  }

  return (
    <SEO title={getPageTitle("Referrals")}>
      <div className="default-container page-layout">
        <div className="referral-tab-container">
          <Tab options={TAB_OPTIONS} option={activeTab} setOption={setActiveTab} onChange={setActiveTab} />
        </div>
        {displayBody()}
      </div>
      <Footer />
    </SEO>
  );
}

function CreateReferrarCode({ handleCreateReferralCode, isWalletConnected }) {
  let [referralCode, setReferralCode] = useState("");
  return (
    <div className="card text-center create-referrar-code">
      <h1>Generate Referral Code</h1>
      <p>
        Looks like you don't have a referral code to share. Enter a code below and hit submit to create it on-chain.
      </p>
      {isWalletConnected ? (
        <form onSubmit={(e) => handleCreateReferralCode(e, referralCode)}>
          <input
            type="text"
            value={referralCode}
            placeholder="Enter a code"
            onChange={(e) => {
              setReferralCode(e.target.value);
            }}
          />
          <button className="default-btn" type="submit">
            Create
          </button>
        </form>
      ) : (
        <button className="default-btn" type="submit">
          Connect Wallet
        </button>
      )}
    </div>
  );
}

function ReferrersStats({ referralsData, handleCreateReferralCode, infoTokens, chainId }) {
  let [referralCode, setReferralCode] = useState("");
  const [, copyToClipboard] = useCopyToClipboard();
  let { cumulativeStats, totalStats, rebateDistributions } = referralsData;
  function getDollarValue(value) {
    return `$${formatAmount(value, USD_DECIMALS, 2, true, "0.00")}`;
  }
  return (
    <div className="referral-body-container">
      <div className="referral-stats">
        <InfoCard label="Total Traders Referred" data={cumulativeStats?.referralsCount || "0"} />
        <InfoCard label="Weekly Trading Volume" data={getDollarValue(cumulativeStats?.volume)} />
        <InfoCard label="Weekly Rebates" data={getDollarValue(cumulativeStats?.rebates)} />
        <InfoCard label="Weekly Rebates For Traders" data={getDollarValue(cumulativeStats?.discountUsd)} />
      </div>
      <div className="list">
        <Card title="Referral Codes">
          <form className="create-referral-code" onSubmit={(e) => handleCreateReferralCode(e, referralCode)}>
            <input
              type="text"
              value={referralCode}
              placeholder="Enter a code"
              onChange={(e) => {
                setReferralCode(e.target.value);
              }}
            />
            <Button>Create</Button>
          </form>
          <div className="App-card-divider"></div>
          <table className="referral-table">
            <thead>
              <tr>
                <th scope="col">Referral Code</th>
                <th scope="col">Traders Referred</th>
                <th scope="col">Total Volume</th>
                <th scope="col">Total Rebate</th>
              </tr>
            </thead>
            <tbody>
              {totalStats.map((stat, index) => {
                return (
                  <tr key={index}>
                    <td data-label="Referral Code">
                      <div className="table-referral-code">
                        <Tooltip
                          handle={<p className="referral-code">{stat.referralCode}</p>}
                          position="bottom"
                          renderContent={() => "Copy Referral Link"}
                        />
                        <p
                          onClick={() => {
                            copyToClipboard(`https://gmx.io/trade?refId=${stat.referralCode}`);
                            helperToast.success("Referral link copied to your clipboard");
                          }}
                        >
                          <BiCopy />
                        </p>
                      </div>
                    </td>
                    <td data-label="Traders Referred">{stat.tradedReferralsCount}</td>
                    <td data-label="Total Volume">{getDollarValue(stat.volume)}</td>
                    <td data-label="Total Rebate">{getDollarValue(stat.totalRebateUsd)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
      <div className="reward-history">
        <Card title="Rebates Distribution History">
          <table className="referral-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Amount</th>
                <th scope="col">Tx Hash</th>
              </tr>
            </thead>
            <tbody>
              {rebateDistributions.map((rebate, index) => {
                let tokenInfo = getTokenInfo(infoTokens, rebate.token);
                let explorerURL = getExplorerUrl(chainId);
                return (
                  <tr key={index}>
                    <td data-label="Date">{formatDate(rebate.timestamp)}</td>
                    <td data-label="Amount">
                      {formatAmount(rebate.amount, tokenInfo.decimals, 4, true)} {tokenInfo.symbol}
                    </td>
                    <td data-label="Tx Hash">
                      <a target="_blank" rel="noopener noreferrer" href={explorerURL + `tx/${rebate.transactionHash}`}>
                        {shortenAddress(rebate.transactionHash, 20)}
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function Rebates() {
  return <h2>Rebates Page</h2>;
}

function InfoCard({ label, data }) {
  return (
    <div className="info-card">
      <h3 className="label">{label}</h3>
      <p className="data">{data}</p>
    </div>
  );
}
