import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";

import GlpSwap from "components/Glp/GlpSwap";
import Footer from "components/Footer/Footer";
import "./BuyGlp.css";

import { Trans, t } from "@lingui/macro";
import { getNativeToken } from "config/tokens";
import { useChainId } from "lib/chains";
import ExternalLink from "components/ExternalLink/ExternalLink";
import PageTitle from "components/PageTitle/PageTitle";

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
      <PageTitle
        title={t`Buy / Sell GLP`}
        isTop
        subtitle={
          <div>
            <div className="text-warning">
              <Trans>
                GLP to GM migration has reduced Fees due to STIP incentives.{" "}
                <ExternalLink
                  className="text-warning"
                  href="https://www.notion.so/gmxio/GMX-Grants-Distribution-Arbitrum-S-T-I-P-Incentives-1a5ab9ca432b4f1798ff8810ce51fec3#32ca3a0d2fd340e5946731fd5fb8b0cf"
                >
                  Read more
                </ExternalLink>
                .
              </Trans>
            </div>
            <Trans>
              Purchase <ExternalLink href="https://docs.gmx.io/docs/providing-liquidity/v1">GLP tokens</ExternalLink> to
              earn {nativeTokenSymbol} fees from swaps and leverage trading.
            </Trans>
          </div>
        }
      />
      <GlpSwap {...props} isBuying={isBuying} setIsBuying={setIsBuying} />
      <Footer />
    </div>
  );
}
