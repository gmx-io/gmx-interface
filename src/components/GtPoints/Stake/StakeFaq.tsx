import { Trans } from "@lingui/macro";

import { Faq, FaqItem } from "components/Faq/Faq";

const STAKE_FAQ_ITEMS: FaqItem[] = [
  {
    title: <Trans>How are GT rewards calculated?</Trans>,
    content: (
      <Trans>
        GT rewards are based on your staked value, the time covered by each claim, and your position's average APR when
        you claim.
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
        Unstaking automatically claims the position's GT rewards. You can also claim GT without unstaking. Both actions
        support selecting multiple positions at once.
      </Trans>
    ),
  },
  {
    title: <Trans>Does claiming early or often reduce my rewards?</Trans>,
    content: (
      <Trans>
        Yes. Each claim uses your position's Avg APR at that time. Rewards claimed earlier are not recalculated as Avg
        APR increases. To maximize your total GT rewards, claim once when you unstake.
      </Trans>
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
