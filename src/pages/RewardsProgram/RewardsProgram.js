import { Trans } from "@lingui/macro";
import "./RewardsProgram.css";
import tmxImg from "img/ic_tmx.svg";
import tlpImg from "img/ic_tlp.svg";

import { TokenCard } from "./TokenCard";
import { RewardProgram } from "./RewardProgram";

export default function RewardsProgram() {
  return (
    <div className="protocol-tokens-container">
      <h1 className="page-title">
        <Trans>Rewards and Leaderboards</Trans>
      </h1>

      <div className="reward-programs-section">
        <h2 className="section-title">
          <Trans>TLP Reward Programs</Trans>
        </h2>

        <div className="reward-overview">
          <div className="overview-card">
            <h3>Program Highlights</h3>
            <ul>
              <li>90% of t3 fees distributed to LPs for first 6 months</li>
              <li>First LPs receive outsized bonuses</li>
              <li>Larger LP positions earn bigger rewards</li>
              <li>LP referrals grant bonus rewards</li>
              <li>Participating LPs qualify for TMX token discounts</li>
            </ul>
          </div>
          <div className="overview-card">
            <h3>Rules</h3>
            <ul>
              <li>Reward structure guaranteed for 6 months</li>
              <li>Minimum $1,000 TLP purchase required</li>
              <li>Fee accrual begins immediately</li>
              <li>TLP bonuses are distributed 12 months after TLP purchase</li>
              <li>Separate purchases receive separate reward levels</li>
            </ul>
          </div>
        </div>

        <h2 className="section-title">
          <Trans>Leaderboards</Trans>
        </h2>

        <div>Rewards bonuses paid in pre-launch TMX tokens.</div>
        <br />

        <div className="reward-programs-grid">
          <RewardProgram
            title="First-Mover Bonus"
            description="Early liquidity providers receive higher reward bonuses based on the total TLP value provided."
            type="first-mover"
          />

          <RewardProgram
            title="LP Size Bonus"
            description="Top TLP stakers receive additional rewards based on their position on the leaderboard."
            type="size-bonus"
          />

          <RewardProgram
            title="Referral Bonus"
            description="LPs receive extra bonuses for referring other liquidity providers."
            type="referral"
          />
        </div>
      </div>

      <br />
      <br />
      <div className="tokens-grid">
        <TokenCard
          icon={tmxImg}
          title="TMX"
          description="TMX is the utility and governance token. Accrues 30% of all platform fees and provides governance rights."
          stats={[<Trans>Coming Q2 2024</Trans>]}
          buttons={[
            { label: "Buy TMX", disabled: true },
            {
              label: "Read more",
              onClick: () => window.open("https://docs.t3.money/dex/tokenomics/tmx-token", "_blank"),
            },
          ]}
          comingSoon={true}
        />

        <TokenCard
          icon={tlpImg}
          title="TLP"
          description="TLP is the liquidity provider token for T3 markets. Accrues 70% of all platform fees (90% for first 6 months)."
          stats={[<Trans>APR: Uncapped</Trans>, <Trans>90% of fees distributed to LPs for first 6 months</Trans>]}
          buttons={[
            {
              label: "Buy TLP",
              onClick: () => {
                window.location.hash = "/buy_tlp";
              },
            },
            { label: "Read more", onClick: () => window.open("https://docs.t3.money/dex/liquidity", "_blank") },
          ]}
        />
      </div>
    </div>
  );
}
