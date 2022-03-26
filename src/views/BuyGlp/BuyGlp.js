import React, { useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";

import GlpSwap from "../../components/Glp/GlpSwap";
import buyGLPIcon from "../../img/ic_buy_glp.svg";
import Footer from "../../Footer";
import "./BuyGlp.css";

import { useChainId } from "../../Helpers";
import { getNativeToken } from "../../data/Tokens";

export default function BuyGlp(props) {
  const { chainId } = useChainId();
  const history = useHistory();
  const [isBuying, setIsBuying] = useState(true);
  const nativeTokenSymbol = getNativeToken(chainId).symbol;

  useEffect(() => {
    const hash = history.location.hash.replace("#", "");
    const buying = hash === "redeem" ? false : true;
    setIsBuying(buying);
  }, [history.location.hash]);

  return (
    <div className="default-container buy-glp-content page-layout">
      <div className="section-title-block">
        <div className="section-title-icon">
          <img src={buyGLPIcon} alt="buyGLPIcon" />
        </div>
        <div className="section-title-content">
          <div className="Page-title">Buy / Sell GLP</div>
          <div className="Page-description">
            Purchase{" "}
            <a href="https://gmxio.gitbook.io/gmx/glp" target="_blank" rel="noopener noreferrer">
              GLP tokens
            </a>{" "}
            to earn {nativeTokenSymbol} fees from swaps and leverages trading.
            <br />
            Note that there is a minimum holding time of 15 minutes after a purchase.
            <br />
            View <Link to="/earn">staking</Link> page.
          </div>
        </div>
      </div>
      <GlpSwap {...props} isBuying={isBuying} setIsBuying={setIsBuying} />
      <Footer />
    </div>
  );
}
