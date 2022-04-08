import React, { useState } from "react";
import Card from "../../components/Common/Card";
import SEO from "../../components/Common/SEO";
import Tab from "../../components/Tab/Tab";
import Footer from "../../Footer";
import { getPageTitle } from "../../Helpers";

import "./Referrals.css";

const REBATES = "Rebates";
const REFERRERS = "Referrers";
let TAB_OPTIONS = [REFERRERS, REBATES];

export default function Referrals() {
  let [activeTab, setActiveTab] = useState(REFERRERS);

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
