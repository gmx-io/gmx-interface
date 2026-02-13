import { Trans } from "@lingui/macro";

import { REFERRALS_DOCS_SECTION_LINKS } from "config/links";

import ExternalLink from "components/ExternalLink/ExternalLink";

const DOCS_ITEMS = [
  { title: <Trans>How it works</Trans>, link: REFERRALS_DOCS_SECTION_LINKS.howItWorks },
  { title: <Trans>Claiming Rewards</Trans>, link: REFERRALS_DOCS_SECTION_LINKS.claimingRewards },
  { title: <Trans>Tiers</Trans>, link: REFERRALS_DOCS_SECTION_LINKS.tiers },
  {
    title: <Trans>Transferring a Referral Code</Trans>,
    link: REFERRALS_DOCS_SECTION_LINKS.transferringReferralCode,
  },
];

export function ReferralsDocsCard() {
  return (
    <div className="flex flex-col gap-8 rounded-8 bg-slate-900 p-20">
      {DOCS_ITEMS.map((item) => (
        <ExternalLink
          key={item.link}
          href={item.link}
          variant="icon"
          className="justify-between text-typography-secondary"
        >
          {item.title}
        </ExternalLink>
      ))}
    </div>
  );
}
