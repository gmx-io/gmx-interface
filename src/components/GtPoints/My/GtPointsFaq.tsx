import { Trans } from "@lingui/macro";

import { Faq, FaqItem } from "components/Faq/Faq";

const GT_FAQ_ITEMS: FaqItem[] = [
  {
    title: <Trans>What is GT?</Trans>,
    content: (
      <Trans>
        GT Points are the incentive points of GMX Solana. You earn them by trading, providing liquidity and referring
        others. 99% of GMX Solana's fees fund daily GT buybacks, where eligible GT can be sold for USDC.
      </Trans>
    ),
  },
  {
    title: <Trans>How do I earn GT?</Trans>,
    content: (
      <Trans>
        Trade: the order and borrowing fees you pay earn you the same value in GT, at the current minting price. Stake
        GLV or GM: the longer you stake, the higher your GT reward APR. Refer: you earn GT when the people you refer
        earn GT from trading, and your rate grows with your VIP tier.
      </Trans>
    ),
  },
  {
    title: <Trans>What are the benefits of GT?</Trans>,
    content: (
      <Trans>
        Your GT balance sets your VIP tier. Higher tiers give a bigger trading fee discount and a larger share of
        referral rewards. Eligible GT can also be sold for USDC in the daily buyback.
      </Trans>
    ),
  },
  {
    title: <Trans>Will my VIP tier decrease if my GT balance drops?</Trans>,
    content: (
      <Trans>
        Yes. Your tier follows the GT you hold now. If your balance falls below a tier's minimum, for example after you
        sell GT in a buyback, you move to the lower tier.
      </Trans>
    ),
  },
];

export function GtPointsFaq() {
  return <Faq items={GT_FAQ_ITEMS} title={<Trans>FAQ</Trans>} />;
}
