import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";

import GlpSwap from "components/Glp/GlpSwap";
import Footer from "components/Footer/Footer";
import "./BuyGlp.css";

import { Trans } from "@lingui/macro";
import { getNativeToken } from "config/tokens";
import { MORPH_MAINNET } from "config/chains";
import { useDynamicChainId } from "lib/chains";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Banner from "../../components/Banner/Banner";

export default function BuyGlp(props) {
  const { chainId } = useDynamicChainId();
  const history = useHistory();
  const [isBuying, setIsBuying] = useState(true);
  const nativeTokenSymbol = getNativeToken(chainId).symbol;
  const morph = chainId === MORPH_MAINNET;
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
              Purchase <ExternalLink href="https://docs.t3.money/dex/liquidity">TLP tokens</ExternalLink> to earn{" "}
              {nativeTokenSymbol} fees from swaps and leverages trading.
            </Trans>
          </div>
        </div>
      </div>
      {morph ? <Banner id="bridge-notice">
        <Trans>
          Need to bridge tokens to Morph? <ExternalLink href="https://meson.fi/">Meson Bridge</ExternalLink> for
          transfers from multiple chains, or <ExternalLink href="https://bridge.morphl2.io/">Morph Bridge</ExternalLink>{" "}
          for direct transfers.
        </Trans>
      </Banner> : null}
      <GlpSwap {...props} isBuying={isBuying} setIsBuying={setIsBuying} />
      <Footer />
    </div>
  );
}
