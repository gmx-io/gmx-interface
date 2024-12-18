import { Trans } from "@lingui/macro";
import "./RewardsProgram.css";
import tmxImg from "img/ic_tmx.svg";
import tlpImg from "img/ic_tlp.svg";

import { TokenCard } from "./TokenCard";
import { RewardProgram } from "./RewardProgram";
import Banner from "components/Banner/Banner";

export default function RewardsProgram() {
  return (
    <div className="protocol-tokens-container">
      <h1 className="page-title">
        <Trans>Liquidity Incentives</Trans>
      </h1>

      <Banner id="rewards-draft-notice" className="rewards-draft-banner" dismissable={false}>
        <Trans>This is a proposal and is subject to change.</Trans>
      </Banner>

      <div className="reward-programs-section">
        <div className="reward-overview">
          <div className="overview-card">
            <h3>Program Highlights</h3>
            <ul>
              <li>90% of fees distributed to LPs from all whitelisted pools</li>
              <li>No minimum deposit requirement for fee rewards</li>
              <li>First-mover bonus pool of 50,000 TMX tokens</li>
              <li>Linear bonus scale of 0.1 TMX per $1.00 supplied</li>
              <li>10-month lock-up period for TMX bonus rewards</li>
            </ul>
          </div>
          <div className="overview-card">
            <h3>Key Benefits</h3>
            <ul>
              <li>Inclusive rewards for all liquidity providers</li>
              <li>Attractive incentives through esTMX staking</li>
              <li>Flexible reward strategies</li>
              <li>Transparent on-chain distribution</li>
              <li>Regular biweekly fee distributions</li>
            </ul>
          </div>
        </div>

        <h2 className="section-title">
          <Trans>Reward Programs</Trans>
        </h2>

        <div className="reward-programs-grid">
          <RewardProgram
            title="First-Mover Bonus"
            description="50,000 TMX tokens distributed across 5 tiers for early liquidity providers. Minimum $5,000 USD deposit required."
            type="first-mover"
          />

          <RewardProgram
            title="LP Size Linear Bonus"
            description="0.1 TMX granted per $1.00 supplied. Minimum $50,000 USD deposit required. 100,000 TMX total allocation."
            type="size-bonus"
          />

          <RewardProgram
            title="esTMX Staking Boost"
            description="Stake esTMX tokens to enhance fee rewards through the esTMX Distribution Contract."
            type="estmx-boost"
          />
        </div>
      </div>

      <br />
      <br />
      <div className="tokens-grid">
        <TokenCard
          icon={tmxImg}
          title="TMX"
          description="TMX is the utility and governance token with a max circulating supply of 10 million tokens."
          stats={[<Trans>Max Supply: 10M TMX</Trans>, <Trans>10-month lock-up for bonus rewards</Trans>]}
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
          description="TLP is the liquidity provider token. Earn 90% of all platform fees from whitelisted pools, distributed biweekly."
          stats={[<Trans>90% fee distribution</Trans>, <Trans>No minimum deposit for fee rewards</Trans>]}
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
