import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";

import { Faq, FaqItem } from "components/Faq/Faq";

const GLP_INCIDENT_ITEMS: FaqItem[] = [
  {
    title: <Trans>Why is the claim in GLV tokens?</Trans>,
    content: (
      <Trans>
        GLV tokens are similar in composition to GLP, and enable seamless integration into GMX V2's liquidity ecosystem.
        Users can either sell or hold the tokens to earn yield. To encourage long-term participation, a $500,000 GLV
        incentive pool will be distributed proportionally to those who hold their allocated GLV for at least 3 months.
      </Trans>
    ),
  },
  {
    title: <Trans>What is GLV exactly?</Trans>,
    content: (
      <>
        <p className="mb-8">
          <Trans>
            GLV (GMX Liquidity Vaults) should be seen as GMX V2's improved version of GLP. It is a yield-optimizing
            crypto-index token that
          </Trans>
        </p>
        <ul className="list-disc pl-12">
          <li>
            <Trans>earns fees from providing liquidity to multiple GMX V2 markets</Trans>
          </li>
          <li>
            <Trans>
              dynamically allocates its liquidity to the highest-utilised markets, maximising capital efficiency and
              annualized performance
            </Trans>
          </li>
          <li>
            <Trans>and automatically compounds its yield (unlike GLP, no manual claiming is needed)</Trans>
          </li>
        </ul>
      </>
    ),
  },
  {
    title: <Trans>Why do I receive two different GLV tokens?</Trans>,
    content: (
      <Trans>
        Distribution happens in two GLV variants to mirror GLP's multi-asset exposure: one variant is optimized for
        ETH-based markets (50% ETH / 50% USDC) and the other for BTC-based markets (50% BTC / 50% USDC). This allocation
        reflects the composition of recovered funds and allows for dynamic shifting of GLV liquidity to all top GMX
        markets to enhance your yield.
      </Trans>
    ),
  },
  {
    title: <Trans>Can I sell my GLV if I want, and where?</Trans>,
    content: (
      <Trans>
        Yes, GLV is fully liquid and permissionless. You can sell via the GMX interface to redeem for underlying assets,
        with low fees.
      </Trans>
    ),
  },
  {
    title: <Trans>How does GLV earn yield, and where do I see my earnings?</Trans>,
    content: (
      <Trans>
        GLV earns from trading fees (open, close, borrow, liquidations, swaps) and trader losses across GM pools, with
        auto-compounding for seamless growth (20-30% historical average annualized performance). View real-time
        earnings, performance, and portfolio value on the <Link to="/pools">Pools page</Link>.
      </Trans>
    ),
  },
  {
    title: <Trans>What is the bonus incentive for holding your GLV?</Trans>,
    content: (
      <Trans>
        A $500,000 GLV pool (funded by DAO funds) rewards long-term holders: If you keep your distributed GLV for at
        least 3 months (without selling or transferring), you'll receive a pro rata share.
      </Trans>
    ),
  },
];

export function AboutGlpIncident() {
  return <Faq items={GLP_INCIDENT_ITEMS} title={<Trans>About GLP Incident</Trans>} />;
}
