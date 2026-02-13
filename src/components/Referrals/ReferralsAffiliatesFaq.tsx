import { Trans } from "@lingui/macro";

import { GMX_PARTNER_TELEGRAM_URL, PRODUCTION_HOST, REFERRALS_DOCS_URL } from "config/links";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { FaqItem } from "components/Faq/Faq";

export const AFFILIATE_WIZARD_FAQS: FaqItem[] = [
  {
    title: <Trans>How much can I earn as an affiliate?</Trans>,
    content: (
      <Trans>
        Your rebates depend on your tier level, which you can view{" "}
        <ExternalLink href={REFERRALS_DOCS_URL}>here</ExternalLink>. Getting a higher tier results in more rewards to
        you and a bigger discount for your traders.
      </Trans>
    ),
  },
  {
    title: <Trans>How do I upgrade to a higher tier?</Trans>,
    content: (
      <Trans>
        Tier upgrades are reviewed manually by the GMX team based on your weekly performance. If you meet the
        requirements consistently, you can apply for an upgrade via the{" "}
        <ExternalLink href={GMX_PARTNER_TELEGRAM_URL}>GMX Partner Account: Telegram</ExternalLink>.
      </Trans>
    ),
  },
  {
    title: <Trans>In which tokens will I receive my rebates?</Trans>,
    content: (
      <Trans>
        Rebates are paid in the collateral tokens used by your referrals. For example, if a referral trades with USDC
        collateral, your rebate portion will be in USDC.
      </Trans>
    ),
  },
  {
    title: <Trans>Can I create multiple referral codes?</Trans>,
    content: (
      <Trans>
        Yes! You can create as many codes as you want. This is useful for tracking different campaigns, communities, or
        platforms separately.
      </Trans>
    ),
  },
];

export const AFFILIATE_POST_WIZARD_FAQS: FaqItem[] = [
  {
    title: <Trans>Do I need to create codes on each network?</Trans>,
    content: (
      <Trans>
        Yes. To earn rebates on both Arbitrum and Avalanche, create your code on both networks. You can use the same
        code name on each.
      </Trans>
    ),
  },
  {
    title: <Trans>What happens after I create my code?</Trans>,
    content: (
      <Trans>
        Your code is immediately active! Share it with traders and you'll earn rebates when they execute trades.
      </Trans>
    ),
  },
  {
    title: <Trans>How do I share my code?</Trans>,
    content: (
      <Trans>
        You'll get a shareable link like: {PRODUCTION_HOST}/#/trade/?ref=YOURCODE. Share on social media, in your
        content, or directly with friends.
      </Trans>
    ),
  },
  {
    title: <Trans>When will I start earning?</Trans>,
    content: (
      <Trans>
        You earn rebates the moment a referred trader executes their first trade. Rebates appear in your "Claimable
        Rebates" balance immediately.
      </Trans>
    ),
  },
];
