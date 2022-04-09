import React, { useState } from "react";
import { useWeb3React } from "@web3-react/core";

import Button from "../../components/Common/Button";
import Card from "../../components/Common/Card";
import SEO from "../../components/Common/SEO";
import Tab from "../../components/Tab/Tab";
import Footer from "../../Footer";
import { useChainId, getPageTitle, formatAmount, USD_DECIMALS } from "../../Helpers";
import { useReferralsData } from "../../Api/referrals";

import "./Referrals.css";
import { utils } from "ethers";
import { registerReferralCode } from "../../Api";

const REBATES = "Rebates";
const REFERRERS = "Referrers";
let TAB_OPTIONS = [REFERRERS, REBATES];

export default function Referrals() {
  const { active, account, library } = useWeb3React();
  const { chainId } = useChainId();

  let [activeTab, setActiveTab] = useState(REFERRERS);
  // "0xbb00f2e53888e60974110d68f1060e5eaab34790"

  const referralsData = useReferralsData(chainId, "0xbb00f2e53888e60974110d68f1060e5eaab34790");
  console.log("referralsData", referralsData);

  return (
    <SEO title={getPageTitle("Referrals")}>
      <div className="default-container page-layout">
        <div className="referral-tab-container">
          <Tab options={TAB_OPTIONS} option={activeTab} setOption={setActiveTab} onChange={setActiveTab} />
        </div>
        {referralsData?.codes?.length > 0 ? (
          <ReferrersStats totalStats={referralsData.totalStats} />
        ) : (
          <CreateReferrarCode library={library} chainId={chainId} />
        )}
      </div>
      <Footer />
    </SEO>
  );
}

function CreateReferrarCode({ chainId, library }) {
  let [referralCode, setReferralCode] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    let referralCodeHex = utils.formatBytes32String(referralCode);
    registerReferralCode(chainId, referralCodeHex, {
      library,
      successMsg: `Referral code created!`,
      failMsg: "Referral code creation failed.",
    });
  }
  return (
    <div className="card text-center create-referrar-code">
      <h1>Generate Referral Code</h1>
      <p>
        Looks like you don't have a referral code to share. Enter a code below and hit submit to create it on-chain.
      </p>
      <form onSubmit={handleSubmit}>
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
    </div>
  );
}

function ReferrersStats({ totalStats }) {
  let { tradedReferralsCount, discountUsd, totalRebateUsd, volume } = totalStats[0];
  function getDollarValue(value) {
    return `$${formatAmount(value, USD_DECIMALS, 2, true, "0.00")}`;
  }
  return (
    <div className="referral-body-container">
      <div className="referral-stats">
        <InfoCard label="Total Traders Referred" data={tradedReferralsCount} />
        <InfoCard label="Weekly Trading Volume" data={getDollarValue(volume)} />
        <InfoCard label="Weekly Rebates" data={getDollarValue(totalRebateUsd)} />
        <InfoCard label="Weekly Rebates For Traders" data={getDollarValue(discountUsd)} />
      </div>
      <div className="list">
        <Card title="Referral Codes">
          <form>
            <input type="text" placeholder="Enter the code" />
            <Button>Create</Button>
          </form>
        </Card>
      </div>
      <div className="reward-history">
        <Card title="Rebates Distribution History"></Card>
      </div>
    </div>
  );
}

function InfoCard({ label, data }) {
  return (
    <div className="info-card">
      <h3 className="label">{label}</h3>
      <p className="data">{data}</p>
    </div>
  );
}
