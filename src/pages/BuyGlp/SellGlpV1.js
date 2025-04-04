import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";

import GlpSwapV1 from "components/Glp/GlpSwapV1";
import Footer from "components/Footer/Footer";
import Banner from "components/Banner/Banner";
import "./BuyGlp.css";

import { Trans } from "@lingui/macro";
import { getNativeToken } from "config/tokens";
import { useDynamicChainId } from "lib/chains";
export default function SellGlpV1(props) {
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
            <Trans>Sell TLP (v1)</Trans>
          </div>
          <div className="Page-description">
            <Trans>
              Sell TLP (v1) tokens and claim rewards from t3 v1.
            </Trans>
          </div>
        </div>
      </div>
      <Banner id="v1-deprecation-notice" className="v1-deprecation-banner" dismissable={false}>
        <Trans>
          t3 has been upgraded to v2! You're looking at t3 v1. All other t3 operations are now on v2.
        </Trans>
      </Banner>
      <br />
      <div className="Page-description">
        <Trans>
          Questions? Please reach out to us in <a href="https://discord.gg/8ZUHf9sZ6f">Discord</a> or social media.
        </Trans>
      </div>
      <div className="Page-description">

        <Trans>
          Please note the remaining pools. If you are the last supplier to withdraw, you may need to withdaw in another currency than you supplied.
        </Trans>
        </div>
      <br />
      <GlpSwapV1 {...props} isBuying={isBuying} setIsBuying={setIsBuying} />
      <Footer />
    </div>
  );
}
