import React, { useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";

import GlpSwap from "components/Glp/GlpSwap";
import buyGLPIcon from "img/ic_buy_glp.svg";
import Footer from "components/Footer/Footer";
import "./BuyGlp.css";

import { Trans } from "@lingui/macro";
import { getNativeToken } from "config/tokens";
import { useChainId } from "lib/chains";

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
    <div className="default-container page-layout">
      <div className="section-title-block">
        <div className="section-title-icon">
          <img src={buyGLPIcon} alt="buyGLPIcon" />
        </div>
        <div className="section-title-content">
          <div className="Page-title">
            <Trans>Buy / Sell GLP</Trans>
          </div>
          <div className="Page-description">
            <Trans>
              Purchase{" "}
              <a href="https://gmxio.gitbook.io/gmx/glp" target="_blank" rel="noopener noreferrer">
                GLP tokens
              </a>{" "}
              to earn {nativeTokenSymbol} fees from swaps and leverages trading.
            </Trans>
            <br />
            <Trans>Note that there is a minimum holding time of 15 minutes after a purchase.</Trans>
            <br />
            <Trans>
              View <Link to="/earn">staking</Link> page.
            </Trans>
          </div>
        </div>
      </div>
      <GlpSwap {...props} isBuying={isBuying} setIsBuying={setIsBuying} />
      <Footer />
    </div>
  );
}
