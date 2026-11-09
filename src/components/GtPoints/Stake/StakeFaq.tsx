import { Trans } from "@lingui/macro";

import { Faq, FaqItem } from "components/Faq/Faq";

const STAKE_FAQ_ITEMS: FaqItem[] = [
  {
    title: <Trans>How are GT rewards calculated?</Trans>,
    content: (
      <Trans>
        Each stake position earns GT on its staked value at its current APR. The GT adds up as unclaimed GT until you
        claim it.
      </Trans>
    ),
  },
  {
    title: <Trans>How does APR change with staking duration?</Trans>,
    content: (
      <Trans>
        The longer a position stays staked, the higher its APR: 0% in the first week, 10% for weeks 1–4, 15% for weeks
        5–12, 25% for weeks 13–24, 35% for weeks 25–48 and 50% after 48 weeks. Avg APR is the position's APR averaged
        over its whole staking time.
      </Trans>
    ),
  },
  {
    title: <Trans>How do I claim GT?</Trans>,
    content: (
      <Trans>
        Use Claim GT on a position, or select several positions and use Claim GT above the table. Claimed GT goes to
        your wallet and shows in your GT history.
      </Trans>
    ),
  },
  {
    title: <Trans>Does claiming early or often reduce my rewards?</Trans>,
    content: (
      <Trans>No. Claiming doesn't change a position's staking time or APR, so you can claim whenever you like.</Trans>
    ),
  },
  {
    title: <Trans>Does staking affect my LP earnings?</Trans>,
    content: (
      <Trans>
        No. GLV and GM add their fees to their own price, so your staked tokens keep earning LP fees while they earn GT.
      </Trans>
    ),
  },
  {
    title: <Trans>Can I stake and unstake at any time?</Trans>,
    content: (
      <Trans>
        You can unstake at any time. You can stake at any time too, except GLV or GM of markets with trading hours:
        those can be staked only while the market is open.
      </Trans>
    ),
  },
];

export function StakeFaq() {
  return <Faq items={STAKE_FAQ_ITEMS} title={<Trans>FAQ</Trans>} />;
}
