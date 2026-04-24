import { Trans } from "@lingui/macro";

import { GMX_PARTNER_TELEGRAM_URL, REFERRALS_DOCS_URL } from "config/links";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { Faq, FaqItem } from "components/Faq/Faq";

export const WIZARD_FAQS: FaqItem[] = [
  {
    title: <Trans>Why should I enter a referral code?</Trans>,
    content: (
      <Trans>
        Using a referral code gives you a 5-10% discount on trading fees for every trade you make. It costs you nothing
        and the savings add up quickly.
      </Trans>
    ),
  },
  {
    title: <Trans>Where do I find a referral code?</Trans>,
    content: (
      <Trans>
        Referral codes are shared by content creators and community members. You can find codes on Twitter, or from any
        GMX-related content on social media.
      </Trans>
    ),
  },
  {
    title: <Trans>How do I know if a code is good?</Trans>,
    content: (
      <Trans>
        All valid codes give you at least a 5% discount. Premium affiliates (Tier 2/3) offer 10% discount. You'll see
        the exact discount percentage after the code has been applied.
      </Trans>
    ),
  },
  {
    title: <Trans>What if I don't have a code right now?</Trans>,
    content: (
      <Trans>
        You can skip this step and trade without a code, but you'll pay full fees. You can always add a code later from
        the Traders tab if you've found a code.
      </Trans>
    ),
  },
  {
    title: <Trans>Do I need to enter a code on each network?</Trans>,
    content: (
      <Trans>Yes. If you trade on both Arbitrum and Avalanche, apply a referral code on each network separately.</Trans>
    ),
  },
];

export const POST_WIZARD_FAQS: FaqItem[] = [
  {
    title: <Trans>How is my fee discount applied?</Trans>,
    content: (
      <Trans>
        Your discount is applied automatically when you execute a trade. You'll see the referral discount in your fee
        tooltip before opening a trade.
      </Trans>
    ),
  },
  {
    title: <Trans>Can I change my referral code?</Trans>,
    content: (
      <Trans>
        Yes! You can switch to a different code at any time from the Traders tab. Your new discount will apply to all
        future trades.
      </Trans>
    ),
  },
  {
    title: <Trans>Which fees get discounted?</Trans>,
    content: (
      <Trans>
        Referral discounts apply to opening and closing fees for leverage trading. Swap fees are not included.
      </Trans>
    ),
  },
  {
    title: <Trans>Where can I learn more?</Trans>,
    content: (
      <Trans>
        Visit the <ExternalLink href={REFERRALS_DOCS_URL}>Referrals Documentation</ExternalLink> or ask in the{" "}
        <ExternalLink href={GMX_PARTNER_TELEGRAM_URL}>GMX Telegram</ExternalLink>.
      </Trans>
    ),
  },
];

export function ReferralsTradersFaq({ isWizard }: { isWizard: boolean }) {
  const faqs = isWizard ? WIZARD_FAQS : POST_WIZARD_FAQS;

  return <Faq items={faqs} title={<Trans>FAQ</Trans>} />;
}
