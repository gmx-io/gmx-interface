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
    title: <Trans>Can I unstake anytime?</Trans>,
    content: (
      <Trans>
        Yes, staking and liquidity provision are fully permissionless. GMX, GLV, and GM tokens can be unstaked and
        withdrawn anytime. In rare cases where your liquidity is being used for active trades, you can withdraw as soon
        as those positions close.
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

export default function EarnFaq() {
  return <Faq items={EARN_FAQ_ITEMS} title={<Trans>FAQ</Trans>} />;
}
