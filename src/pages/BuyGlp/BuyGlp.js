import React, { useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";

import GlpSwap from "components/Glp/GlpSwap";
import Footer from "components/Footer/Footer";
import "./BuyGlp.css";

import { Trans } from "@lingui/macro";
import { getNativeToken } from "config/tokens";
import { useChainId } from "lib/chains";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { getIcons } from "config/icons";

export default function BuyGlp(props) {
  const { chainId } = useChainId();
  const history = useHistory();
  const [isBuying, setIsBuying] = useState(true);
  const nativeTokenSymbol = getNativeToken(chainId).symbol;
  const currentIcons = getIcons(chainId);

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
            <Trans>Buy / Sell GLP</Trans>
            <img className="ml-xs Page-title-icon" src={currentIcons.network} alt="Network Icon" />
          </div>
          <div className="Page-description">
            <Trans>
              Purchase <ExternalLink href="https://gmxio.gitbook.io/gmx/glp">GLP tokens</ExternalLink> to earn{" "}
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
