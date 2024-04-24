import React, { useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";

import GlpSwap from "components/Glp/GlpSwap";
import Footer from "components/Footer/Footer";
import "./BuyGlp.css";

import { Trans } from "@lingui/macro";
import { getNativeToken } from "config/tokens";
import {  useDynamicChainId } from "lib/chains";
import ExternalLink from "components/ExternalLink/ExternalLink";

export default function BuyGlp(props) {
  const { chainId } = useDynamicChainId();
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
        <div className="section-title-content">
          <div className="Page-title">
            <Trans>Buy / Sell TLP</Trans>
          </div>
          <div className="Page-description">
            <Trans>
              Purchase <ExternalLink href="https://docs.t3.money/tmx/glp">TLP tokens</ExternalLink> to earn{" "}
              {nativeTokenSymbol} fees from swaps and leverages trading.
            </Trans>
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
