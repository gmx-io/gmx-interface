import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useId, useState, type ReactNode } from "react";

import ExternalLink from "components/ExternalLink/ExternalLink";

export function RewardsFaq() {
  const items = [
    {
      question: <Trans>Is 120% of my fees real?</Trans>,
      answer: (
        <Trans>
          Yes, at the 10x cap. Reaching 10x takes Titan staking with Apex volume, or any other combination of tiers and
          boosts that sums to 10. Most traders land between 3x and 7x, which returns 36–84% of what they paid.
        </Trans>
      ),
    },
    {
      question: <Trans>Which chains count for Season 1?</Trans>,
      answer: (
        <Trans>
          Season 1 runs on Arbitrum. Trades placed from Ethereum, Base, or BNB Chain through your GMX Account execute on
          Arbitrum, so they count. Not active on Avalanche, Solana (GMTrade), or MegaETH.
        </Trans>
      ),
    },
    {
      question: <Trans>When do I get paid?</Trans>,
      answer: (
        <Trans>
          Rewards settle every Wednesday, 00:00 UTC, for the trades placed in the epoch that just closed. At settlement,
          esGMX becomes claimable and GT is credited.
        </Trans>
      ),
    },
    {
      question: <Trans>Does my volume tier reset every week?</Trans>,
      answer: (
        <Trans>
          Volume tiers are based on weekly volume. A volume tier earned in one epoch stays active for four epochs during
          Season 1.
        </Trans>
      ),
    },
    {
      question: <Trans>Do my old trades count?</Trans>,
      answer: (
        <Trans>
          Your trading history can raise your multiplier in two ways. With more than $10,000 in lifetime volume on GMX,
          your comeback starts at +2x, capped by your lifetime-volume band. This bonus multiplier does not expire during
          Season 1; it ends only when you reach your cap. Past $200M lifetime volume, you also get +1x permanently.{" "}
          <a href="#comeback" className="link-underline hover:text-blue-300">
            Check your wallet above
          </a>{" "}
          to see your cap.
        </Trans>
      ),
    },
    {
      question: <Trans>What is GT?</Trans>,
      answer: (
        <Trans>
          Rewards are paid as 100% esGMX, plus 20% GT on top. GT are the points from GMTrade, GMX's deployment on
          Solana. GT are credited weekly at the current minting price. GT started at $0.01 and gets 2.1% harder every
          210,000 minted, inspired by the Bitcoin difficulty curve. The minting price shown above is what GT is credited
          at, not what it sells for. GT buybacks are active on Solana, with 50% of GMTrade's protocol fees.
        </Trans>
      ),
    },
    {
      question: <Trans>Should I stake or vest my esGMX?</Trans>,
      answer: (
        <Trans>
          Stake it to raise your multiplier and earn GMX staking rewards. Staked esGMX counts toward your staking tier
          just like staked GMX. Vest it to convert it to GMX over one year. Only unstaked esGMX can be vested, so
          vesting lowers your staking-tier balance by exactly the amount you vest: vest 100 esGMX and your balance drops
          by 100, which can move you down a tier. Vesting also reserves staked GMX or staked esGMX against the amount
          you vest; those reserved tokens stay staked and keep counting toward your tier. Vesting is capped at what you
          earned in the program, and trading and affiliate esGMX count toward the same cap.
        </Trans>
      ),
    },
    {
      question: <Trans>Do my existing referrals earn me the 50%?</Trans>,
      answer: (
        <Trans>
          Every trader who applies your referral code during Season 1 earns you 50% of the rewards they generate, in
          esGMX and GT, settled weekly, for as long as your referral relationship with that trader is active. Codes
          registered before Season 1 opened do not generate the share, though the trader can apply a new one once the
          season is open. They have to do it themselves, so ask them directly. A link won't do it. They can change their
          code at <ExternalLink href="https://app.gmx.io/referrals/traders">app.gmx.io/referrals/traders</ExternalLink>.
          Your pre-season referrals still earn you the fee-side share of 5%, 10% or 15% by tier, separate from Season
          1’s 50%. The 50% is paid on top: your referred traders' own rewards are unchanged. The referral relationship
          is bounded by{" "}
          <ExternalLink href="https://gmxio.substack.com/p/gmx-referral-program-update">
            GMX's referral program terms
          </ExternalLink>
          .
        </Trans>
      ),
    },
    {
      question: <Trans>I already have a referral code set. Does my affiliate earn the 50%?</Trans>,
      answer: (
        <Trans>
          Only codes applied after Season 1 opens earn your affiliate the 50%, so apply theirs again once the season is
          live at <ExternalLink href="https://app.gmx.io/referrals/traders">app.gmx.io/referrals/traders</ExternalLink>.
          You have to change it yourself: clicking a referral link won't replace a code you already have. Your own
          rewards are unchanged either way.
        </Trans>
      ),
    },
    {
      question: <Trans>Does volume through an integrator count?</Trans>,
      answer: (
        <Trans>
          Yes. Volume routed through an integrator counts toward your own Season 1 tiers, unrelated to the integrator's
          referral tier.
        </Trans>
      ),
    },
    {
      question: <Trans>Can the rules change?</Trans>,
      answer: <Trans>These are Season 1 values. Featured markets and coefficients may change mid-season.</Trans>,
    },
  ];

  return (
    <section
      className={cx(
        "px-0 py-[120px]",
        "max-mobile:pb-64 max-mobile:pl-0 max-mobile:pr-0 max-mobile:pt-32",
        "[&>.rewards-container]:grid [&>.rewards-container]:grid-cols-[384px_minmax(0,_1fr)] [&>.rewards-container]:gap-24",
        "max-tablet:[&>.rewards-container]:grid-cols-[32%_minmax(0,_1fr)]",
        "max-mobile:[&>.rewards-container]:grid-cols-[1fr] max-mobile:[&>.rewards-container]:gap-0",
        "[&_h2]:m-0",
        "max-mobile:[&_h2]:mb-24"
      )}
    >
      <div className="rewards-container relative ml-auto mr-auto w-[min(1200px,_calc(100%_-_80px))] max-mobile:w-[calc(100%_-_32px)]">
        <h2>
          <Trans>FAQ</Trans>
        </h2>
        <div className="[&>a]:text-18 [&>a]:inline-block [&>a]:font-medium [&>a]:leading-[1.36] [&>a]:text-blue-300 max-mobile:[&>a]:mt-28 max-mobile:[&>a]:text-14">
          {items.map((item, index) => (
            <RewardsFaqItem key={index} question={item.question} defaultOpen={index < 2}>
              {item.answer}
            </RewardsFaqItem>
          ))}
          <a href="https://docs.gmx.io/" target="_blank" rel="noopener noreferrer">
            <Trans>For more information read docs ↗</Trans>
          </a>
        </div>
      </div>
    </section>
  );
}

function RewardsFaqItem({
  question,
  defaultOpen,
  children,
}: {
  question: ReactNode;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const answerId = useId();

  return (
    <div
      className={cx(
        "px-0 py-24",
        "[&::after]:mt-16 [&::after]:block [&::after]:h-1 [&::after]:[background:#1e2033] [&::after]:[content:'']",
        "[&[data-open='true']_.rewards-faq-answer]:grid-rows-[1fr] [&[data-open='true']_.rewards-faq-answer]:opacity-[1]",
        "[&[data-open='true']_.rewards-faq-question>span]:[transform:rotate(45deg)]"
      )}
      data-open={isOpen}
    >
      <button
        type="button"
        className={cx(
          "rewards-faq-question text-18 flex w-full cursor-pointer items-center justify-between gap-32 text-left font-medium leading-[1.36]",
          "tracking-[-0.032em]",
          "[&>span]:text-18 [&>span]:inline-block [&>span]:shrink-0 [&>span]:font-normal [&>span]:text-slate-500",
          "[&>span]:[transition:transform_0.24s_ease-in-out]",
          "max-mobile:text-18",
          "motion-reduce:[&>span]:scroll-auto motion-reduce:[&>span]:[transition:none]",
          "[@media(hover:hover)]:[&:hover]:text-blue-300"
        )}
        aria-expanded={isOpen}
        aria-controls={answerId}
        onClick={() => setIsOpen((open) => !open)}
      >
        {question}
        <span aria-hidden="true">+</span>
      </button>
      <div
        id={answerId}
        className={cx(
          "rewards-faq-answer grid grid-rows-[0fr] opacity-[0] [transition:grid-template-rows_0.24s_ease-in-out,_opacity_0.24s_ease-in-out]",
          "[&>div]:min-h-0 [&>div]:overflow-hidden",
          "[&_p]:mt-16 [&_p]:text-16 [&_p]:text-slate-400",
          "max-mobile:[&_p]:text-16"
        )}
        aria-hidden={!isOpen}
        {...(!isOpen ? { inert: "" } : {})}
      >
        <div>
          <p>{children}</p>
        </div>
      </div>
    </div>
  );
}
