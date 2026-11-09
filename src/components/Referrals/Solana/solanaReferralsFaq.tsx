import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";

import type { FaqItem } from "components/Faq/Faq";

import { GT_POINTS_MY_PATH } from "./solanaReferralsTypes";

// The issue lists the questions only. The answers follow the issue and the Solana reference app and docs;
// "Can I change my referral code?" still needs the PM to confirm that codes can't be changed or transferred.

const REFERRER_BENEFITS: FaqItem = {
  title: <Trans>What benefits does my referrer receive?</Trans>,
  content: (
    <Trans>
      Your referrer earns GT and GT sellable quota from your trades. This doesn't reduce your discount or add anything
      to your fees.
    </Trans>
  ),
};

const CHANGE_REFERRER: FaqItem = {
  title: <Trans>Can I change my referrer?</Trans>,
  content: (
    <Trans>
      No. Once you apply a referral code, it stays linked to your account, so make sure you pick the code you want to
      use.
    </Trans>
  ),
};

export const SOLANA_TRADER_WIZARD_FAQS: FaqItem[] = [
  {
    title: <Trans>Why should I enter a referral code?</Trans>,
    content: (
      <Trans>
        A referral code gives you a permanent 10% discount on opening and closing fees for every trade you make. It
        costs you nothing, and the savings add up quickly.
      </Trans>
    ),
  },
  {
    title: <Trans>Where do I find a referral code?</Trans>,
    content: (
      <Trans>
        You can use a code from the top GT holders list on GT Points, or find one that community members share on social
        media.
      </Trans>
    ),
  },
  {
    title: <Trans>How do I know if a code is good?</Trans>,
    content: (
      <Trans>
        Every valid code gives you the same permanent 10% discount. The code only decides which affiliate earns GT and
        GT sellable quota from your trades.
      </Trans>
    ),
  },
  REFERRER_BENEFITS,
  CHANGE_REFERRER,
];

export const SOLANA_TRADER_POST_WIZARD_FAQS: FaqItem[] = [
  {
    title: <Trans>How is my fee discount applied?</Trans>,
    content: (
      <Trans>
        Your discount is applied automatically when you open or close a position. You'll see the referral discount in
        your fee tooltip before you confirm a trade.
      </Trans>
    ),
  },
  {
    title: <Trans>Which fees get discounted?</Trans>,
    content: <Trans>The 10% discount applies to the opening and closing fees of your positions.</Trans>,
  },
  REFERRER_BENEFITS,
  CHANGE_REFERRER,
];

const WHAT_CAN_I_EARN: FaqItem = {
  title: <Trans>What can I earn as an affiliate?</Trans>,
  content: (
    <Trans>
      You earn GT and GT sellable quota from every trade your referees make. GT counts toward your VIP tier, and
      sellable quota lets you sell GT in buybacks.
    </Trans>
  ),
};

const HOW_CALCULATED: FaqItem = {
  title: <Trans>How are my GT rewards and sellable quota calculated?</Trans>,
  content: (
    <Trans>
      Your referees earn GT from the order and borrowing fees they pay. You get a share of that GT based on your
      referral reward rate, and your sellable quota grows by the full amount.
    </Trans>
  ),
};

const HOW_TO_SHARE: FaqItem = {
  title: <Trans>How do I share my code?</Trans>,
  content: (
    <Trans>
      You'll get a referral link that opens GMX on Solana with your code. Share it on social media, in your content, or
      directly with friends.
    </Trans>
  ),
};

const REFEREE_BENEFITS: FaqItem = {
  title: <Trans>What benefits does my referee receive?</Trans>,
  content: (
    <Trans>
      Traders who use your code get a permanent 10% discount on their opening and closing fees, regardless of your VIP
      tier.
    </Trans>
  ),
};

const CHANGE_CODE: FaqItem = {
  title: <Trans>Can I change my referral code?</Trans>,
  content: (
    <Trans>
      No. Each wallet can create one referral code, and it can't be changed later, so pick one you're happy to share.
    </Trans>
  ),
};

export const SOLANA_AFFILIATE_WIZARD_FAQS: FaqItem[] = [
  WHAT_CAN_I_EARN,
  HOW_CALCULATED,
  HOW_TO_SHARE,
  {
    title: <Trans>When will I start earning?</Trans>,
    content: (
      <Trans>
        You start earning as soon as a referred trader makes their first trade with your code. GT rewards go straight to
        your GT balance, with nothing to claim, and show in Recent activity on the Affiliate dashboard.
      </Trans>
    ),
  },
  REFEREE_BENEFITS,
  CHANGE_CODE,
];

export const SOLANA_AFFILIATE_POST_WIZARD_FAQS: FaqItem[] = [
  WHAT_CAN_I_EARN,
  HOW_CALCULATED,
  {
    title: <Trans>How can I increase my referral reward rate?</Trans>,
    content: (
      <Trans>
        Your referral reward rate depends on your VIP tier. Hold more GT to reach a higher tier. See all tiers in{" "}
        <Link to={GT_POINTS_MY_PATH} className="text-blue-300">
          GT Points
        </Link>
        .
      </Trans>
    ),
  },
  HOW_TO_SHARE,
  REFEREE_BENEFITS,
  CHANGE_CODE,
];
