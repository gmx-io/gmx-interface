import React, { useState } from "react";
import { useWeb3React } from "@web3-react/core";

import Card from "../../components/Common/Card";
import SEO from "../../components/Common/SEO";
import Tab from "../../components/Tab/Tab";
import Footer from "../../Footer";
import {
  useChainId,
  getPageTitle
} from "../../Helpers";
import { useReferralsData } from "../../Api/referrals"

import "./Referrals.css";

const REBATES = "Rebates";
const REFERRERS = "Referrers";
let TAB_OPTIONS = [REFERRERS, REBATES];

export default function Referrals() {
  const { active, account, library } = useWeb3React();
  const { chainId } = useChainId();

  let [activeTab, setActiveTab] = useState(REFERRERS);

  const referralsData = useReferralsData(chainId, account)
  console.log('referralsData', referralsData)

  console.log(activeTab);
  return (
    <SEO title={getPageTitle("Referrals")}>
      <div className="default-container page-layout">
        <div className="referral-tab-container">
          <Tab options={TAB_OPTIONS} option={activeTab} setOption={setActiveTab} onChange={setActiveTab} />
        </div>
        <div className="referral-body-container">
          <div className="referral-stats">
            <div className="info-card">
              <h3>Total Volume</h3>
              <p>54</p>
            </div>
            <div className="info-card">
              <h3>Total Volume</h3>
              <p>54</p>
            </div>
            <div className="info-card">
              <h3>Total Volume</h3>
              <p>54</p>
            </div>
            <div className="info-card">
              <h3>Total Volume</h3>
              <p>54</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </SEO>
  );
}
