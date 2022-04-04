import React, { useEffect } from "react";
import Footer from "../../Footer";
import "./Buy.css";
import TokenCard from "../../components/TokenCard/TokenCard";
import buyGMXIcon from "../../img/buy_gmx.svg";
import SEO from "../../components/Common/SEO";
import { getPageTitle } from "../../Helpers";

export default function BuyGMXGLP(props) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <SEO title={getPageTitle("Buy GLP or GMX")}>
      <div className="BuyGMXGLP page-layout">
        <div className="BuyGMXGLP-container default-container">
          <div className="section-title-block">
            <div className="section-title-icon">
              <img src={buyGMXIcon} alt="buyGMXIcon" />
            </div>
            <div className="section-title-content">
              <div className="Page-title">Buy GMX or GLP</div>
            </div>
          </div>
          <TokenCard />
        </div>
        <Footer />
      </div>
    </SEO>
  );
}
