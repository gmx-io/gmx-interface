import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";

import { Faq, FaqItem } from "components/Faq/Faq";

const GLP_INCIDENT_ITEMS: FaqItem[] = [
  {
    title: <Trans>Why is the claim in GLV tokens?</Trans>,
    content: (
      <Trans>
        GLV tokens mirror GLP's composition and integrate seamlessly into GMX V2's liquidity ecosystem. You can sell or
        hold to earn yield. A $500,000 GLV incentive pool rewards holders who keep their allocation for at least 3
        months.
      </Trans>
    ),
  },
  {
    title: <Trans>What is GLV exactly?</Trans>,
    content: (
      <Trans>
        <p className="mb-8">
          GLV (GMX Liquidity Vaults) is GMX V2's improved version of GLP. It's a yield-optimizing crypto-index token
          that:
        </p>
        <ul className="list-disc pl-12">
          <li>Earns fees from liquidity provision across GMX V2 markets</li>
          <li>Dynamically allocates liquidity to highest-utilized markets, maximizing capital efficiency and yield</li>
          <li>Auto-compounds yield (no manual claiming needed, unlike GLP)</li>
        </ul>
      </Trans>
    ),
  },
  {
    title: <Trans>Why do I receive two different GLV tokens?</Trans>,
    content: (
      <Trans>
        Two GLV variants mirror GLP's multi-asset exposure: one optimized for ETH markets (50% ETH / 50% USDC), the
        other for BTC markets (50% BTC / 50% USDC). This reflects the recovered funds composition and enables dynamic
        liquidity allocation across top GMX markets for enhanced yield.
      </Trans>
    ),
  },
  {
    title: <Trans>Can I sell my GLV, and where?</Trans>,
    content: (
      <Trans>
        Yes, GLV is fully liquid and permissionless. Sell via the GMX interface to redeem for underlying assets with low
        fees.
      </Trans>
    ),
  },
  {
    title: <Trans>How does GLV earn yield, and where do I see my earnings?</Trans>,
    content: (
      <Trans>
        GLV earns from trading fees (open, close, borrow, liquidations, swaps) and trader losses across GM pools. Yields
        auto-compound for seamless growth (20-30% historical APY). View earnings and portfolio value on the{" "}
        <Link to="/pools">Pools page</Link>.
      </Trans>
    ),
  },
  {
    title: <Trans>What is the bonus incentive for holding your GLV?</Trans>,
    content: (
      <Trans>
        A $500,000 GLV pool (DAO-funded) rewards long-term holders. Keep your GLV for at least 3 months without selling
        or transferring to receive a pro rata share.
      </Trans>
    ),
  },
];

export function AboutGlpIncident() {
  return <Faq items={GLP_INCIDENT_ITEMS} title={<Trans>About the GLP incident</Trans>} />;
}
