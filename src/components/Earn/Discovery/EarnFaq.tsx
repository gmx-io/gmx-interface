import { Trans } from "@lingui/macro";

import { Faq, FaqItem } from "components/Faq/Faq";

const EARN_FAQ_ITEMS: FaqItem[] = [
  {
    title: <Trans>Where do GMX staking rewards come from?</Trans>,
    content: (
      <Trans>
        27% of protocol revenue is used to buy back GMX on the open market. Bought-back GMX accumulates in the Treasury
        and will be distributed to stakers when GMX reaches $90, proportional to staking power. No new GMX tokens are
        minted.
      </Trans>
    ),
  },
  {
    title: <Trans>What's the difference between GLV and GM?</Trans>,
    content: (
      <Trans>
        GM earns fees from one market. GLV holds multiple GM tokens and auto-rebalances across related markets. Both
        auto-compound returns. Choose GM for single-market exposure or GLV to diversify across multiple pools.
      </Trans>
    ),
  },
  {
    title: <Trans>Can I unstake or withdraw anytime?</Trans>,
    content: (
      <Trans>
        Unstaking GMX or esGMX takes 180 days. You request the unstake, and once the wait is over, you withdraw the
        amount as GMX or esGMX. You can cancel a request at any time. If a request takes your staked balance below 80%
        of your peak staked amount, all accumulated staking power resets to zero and you lose your share of the
        GMX-at-$90 Treasury distribution. Canceling the request doesn't restore it. GLV and GM tokens can be sold at any
        time. In rare cases where open positions use your liquidity, you can withdraw as soon as those positions close.
      </Trans>
    ),
  },
  {
    title: <Trans>What networks are supported?</Trans>,
    content: (
      <Trans>
        GMX staking is available on Arbitrum and Avalanche. GLV vaults and GM tokens vary by chain. Visit the pools page
        to see liquidity options for your connected network.
      </Trans>
    ),
  },
];

const SOLANA_EARN_FAQ_ITEMS: FaqItem[] = [
  {
    title: <Trans>How do LPs earn rewards?</Trans>,
    content: (
      <Trans>
        Buying GLV/GM tokens means providing liquidity to GMX markets and becoming a liquidity provider (LP). On Solana,
        1% of fees generated from trading, liquidations, borrowing, and swaps goes to LPs. They can also stake GLV/GM to
        earn GT rewards, which can be converted into USDC through GT buybacks.
      </Trans>
    ),
  },
  {
    title: <Trans>What's the difference between GLV and GM?</Trans>,
    content: (
      <Trans>
        GM earns fees from one market. GLV holds multiple GM tokens and auto-rebalances across related markets. Both
        auto-compound returns. Choose GM for single-market exposure or GLV to diversify across multiple pools.
      </Trans>
    ),
  },
  {
    title: <Trans>Can LPs unstake or sell GLV/GM anytime?</Trans>,
    content: (
      <Trans>
        Yes, GLV/GM can generally be unstaked and sold at any time. However, for markets with trading hours, selling is
        only available while the market is open. In rare cases where your liquidity is being used for active trades, you
        can sell once those positions are closed.
      </Trans>
    ),
  },
  {
    title: <Trans>What networks are supported?</Trans>,
    content: (
      <Trans>
        The full GT Points system and features are currently available only on Solana. GLV vaults and GM tokens vary by
        chain. Visit the Pools page to see the liquidity options available on your connected network.
      </Trans>
    ),
  },
];

export default function EarnFaq() {
  return <Faq items={EARN_FAQ_ITEMS} title={<Trans>FAQ</Trans>} />;
}

export function SolanaEarnFaq() {
  return <Faq items={SOLANA_EARN_FAQ_ITEMS} title={<Trans>FAQ</Trans>} />;
}
