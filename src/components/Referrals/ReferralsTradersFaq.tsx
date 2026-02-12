import { Trans } from "@lingui/macro";

import { GMX_DISCORD_URL, FEE_STRUCTURE_URL, REFERRALS_DOCS_URL } from "config/links";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { Faq, FaqItem } from "components/Faq/Faq";

export const WIZARD_FAQS: FaqItem[] = [
  {
    title: <Trans>Where do I get a referral code?</Trans>,
    content: (
      <Trans>
        Referral codes are shared by affiliates (content creators, community members, and traders). You can:
        <ul className="mt-8 list-disc pl-20">
          <li>
            Ask in the <ExternalLink href={GMX_DISCORD_URL}>GMX Discord</ExternalLink> community
          </li>
          <li>Check social media for GMX creators and traders</li>
        </ul>
      </Trans>
    ),
  },
  {
    title: <Trans>What if I don't have a code?</Trans>,
    content: (
      <Trans>
        You can still trade without a code, but you'll get no discounts when trading. So we recommend finding a code to
        save up to 10% on every trade!
      </Trans>
    ),
  },
  {
    title: <Trans>Can I change my code later?</Trans>,
    content: (
      <Trans>
        Yes! You can change your referral code at any time. If you want to switch to a different code, just enter the
        new one in the Traders tab.
      </Trans>
    ),
  },
  {
    title: <Trans>What if I entered the wrong code?</Trans>,
    content: (
      <Trans>
        No problem! You can change your referral code at any time by entering a new one. Your new code will apply to all
        future trades.
      </Trans>
    ),
  },
  {
    title: <Trans>Do I need to do this on each network?</Trans>,
    content: (
      <Trans>
        Yes. If you trade on both Arbitrum and Avalanche, you'll need to apply a referral code on each network
        separately.
      </Trans>
    ),
  },
  {
    title: <Trans>How do I know it's working?</Trans>,
    content: (
      <Trans>
        After applying a code, you'll see: your active referral code displayed on the Traders tab, the discount
        percentage you're receiving, and fee discounts reflected in your trade confirmations.
      </Trans>
    ),
  },
  {
    title: <Trans>When does the discount start?</Trans>,
    content: <Trans>Immediately! Your very next trade will have the discount applied automatically.</Trans>,
  },
];

export const POST_WIZARD_FAQS: FaqItem[] = [
  {
    title: <Trans>Which fees does my discount apply to?</Trans>,
    content: (
      <Trans>
        Referral discounts apply to opening and closing fees for leverage trading (perpetuals). Swap fees are not
        included. <ExternalLink href={FEE_STRUCTURE_URL}>View fee structure →</ExternalLink>
      </Trans>
    ),
  },
  {
    title: <Trans>How is the discount applied to my trades?</Trans>,
    content: (
      <Trans>
        Discounts are applied automatically at the time of trade execution. You'll see the reduced fee amount in your
        trade confirmation before submitting.
      </Trans>
    ),
  },
  {
    title: <Trans>Can I change my referral code to a different one?</Trans>,
    content: (
      <Trans>
        Yes! You can change your active referral code at any time. Simply enter a new code in the Traders tab and it
        will replace your current one. Your new discount will apply to all future trades.{" "}
        <ExternalLink href={REFERRALS_DOCS_URL}>Read more →</ExternalLink>
      </Trans>
    ),
  },
  {
    title: <Trans>What does "Trading Volume" mean?</Trans>,
    content: (
      <Trans>
        Trading Volume is the total USD value of all your leveraged trades (opens + closes) since you applied your
        referral code.
      </Trans>
    ),
  },
  {
    title: <Trans>What does "Total Discounts" mean?</Trans>,
    content: <Trans>Total Discounts shows how much you've saved in fees since applying your referral code.</Trans>,
  },
];

export function ReferralsTradersFaq({ isWizard }: { isWizard: boolean }) {
  const faqs = isWizard ? WIZARD_FAQS : POST_WIZARD_FAQS;

  return <Faq items={faqs} title={<Trans>FAQ</Trans>} />;
}
