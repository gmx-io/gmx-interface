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
import useIncentiveStats from "domain/synthetics/common/useIncentiveStats";

export default function BuyGlp() {
  const { chainId } = useChainId();
  const history = useHistory();
  const [isBuying, setIsBuying] = useState(true);
  const nativeTokenSymbol = getNativeToken(chainId).symbol;
  const incentiveState = useIncentiveStats();

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
            {incentiveState?.migration?.isActive && (
              <div>
                <Trans>
                  GLP to GM migration has reduced Fees due to STIP incentives.{" "}
                  <ExternalLink href="https://gmxio.notion.site/GMX-S-T-I-P-Incentives-Distribution-1a5ab9ca432b4f1798ff8810ce51fec3#a2d1ea61dd1147b195b7e3bd769348d3">
                    Read more
                  </ExternalLink>
                  .
                </Trans>
              </div>
            )}
            <Trans>
              Purchase <ExternalLink href="https://docs.gmx.io/docs/providing-liquidity/v1">GLP tokens</ExternalLink> to
              earn {nativeTokenSymbol} fees from swaps and leverage trading.
            </Trans>
          </div>
        }
      />
      <GlpSwap isBuying={isBuying} setIsBuying={setIsBuying} />
      <Footer />
    </div>
  );
}
