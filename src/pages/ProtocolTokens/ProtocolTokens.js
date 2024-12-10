import React, { useState } from "react";
import { Trans } from "@lingui/macro";
import { NavLink } from "react-router-dom";
// import Button from "components/Button/Button";
import "./ProtocolTokens.css";
import tmxImg from "img/ic_tmx.svg";
import tlpImg from "img/ic_tlp.svg";

const RewardProgram = ({ title, description, data, type }) => {
  const renderTable = () => {
    if (type === "first-mover") {
      return (
        <div className="reward-table">
          <div className="reward-table-header">
            <div>TLP Value in USD</div>
            <div>Bonus</div>
          </div>
          {[
            ["First 100k", "30%"],
            ["100k-300k", "25%"],
            ["300k-600k", "20%"],
            ["600k-1M", "15%"],
            ["1M-2M", "10%"],
            ["4M-8M", "5%"],
            ["8M-16M", "3%"],
            ["16M-32M", "1%"],
          ].map(([range, bonus], i) => (
            <div key={i} className="reward-table-row">
              <div>{range}</div>
              <div>{bonus}</div>
            </div>
          ))}
        </div>
      );
    }
    if (type === "size-bonus") {
      return (
        <div className="reward-table">
          <div className="reward-table-header">
            <div>Position</div>
            <div>Bonus</div>
          </div>
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="reward-table-row">
              <div>#{i + 1} Staker</div>
              <div>{20 - i}%</div>
            </div>
          ))}
        </div>
      );
    }
    if (type === "referral") {
      return (
        <div className="reward-table">
          <div className="reward-info">
            20% of fees split proportionally among referrers based on referred TLP amount
          </div>
        </div>
      );
    }
  };

  return (
    <div className="reward-program">
      <h3 className="reward-title">{title}</h3>
      <p className="reward-description">{description}</p>
      {renderTable()}
    </div>
  );
};

const TokenCard = ({ icon, title, description, stats, buttons, comingSoon }) => (
  <div className={`token-card ${comingSoon ? "coming-soon" : ""}`}>
    <div>
      <div className="token-header">
        <img src={icon} alt={title} className="token-icon" />
        <span className="token-title">{title}</span>
      </div>
      <p className="token-description">{description}</p>
    </div>
    <div>
      {stats && (
        <div className="token-stats">
          {stats.map((stat, index) => (
            <div key={index} className="stat-item">
              {stat}
            </div>
          ))}
        </div>
      )}
      <div className="token-buttons">
        {buttons.map((button, index) => (
          <button
            key={index}
            className={`token-button ${button.disabled ? "disabled" : ""} ${index === 1 ? "secondary" : ""}`}
            disabled={button.disabled}
            onClick={button.onClick}
          >
            {button.label}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default function ProtocolTokens() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="protocol-tokens-container">
      <h1 className="page-title">
        <Trans>Protocol Tokens</Trans>
      </h1>

      <div className="tokens-grid">
        <TokenCard
          icon={tmxImg}
          title="TMX"
          description="TMX is the utility and governance token. Accrues 30% of all platform fees and provides governance rights."
          stats={[<Trans>Coming Q2 2024</Trans>]}
          buttons={[
            { label: "Buy TMX", disabled: true },
            { label: "Read more", onClick: () => window.open("https://docs.t3.money/tokenomics/tmx", "_blank") },
          ]}
          comingSoon={true}
        />

        <TokenCard
          icon={tlpImg}
          title="TLP"
          description="TLP is the liquidity provider token for T3 markets. Accrues 70% of all platform fees."
          stats={[
            <Trans>APR: 15.5%</Trans>,
            <Trans>TVL: $2.5M</Trans>,
            <Trans>90% of fees distributed to LPs for first 6 months</Trans>,
          ]}
          buttons={[
            {
              label: "Buy TLP",
              onClick: () => {
                window.location.hash = "/buy_tlp";
              },
            },
            { label: "Read more", onClick: () => window.open("https://docs.t3.money/tokenomics/tlp", "_blank") },
          ]}
        />
      </div>

      <div className="reward-programs-section">
        <h2 className="section-title">
          <Trans>TLP Reward Programs</Trans>
        </h2>

        <div className="reward-tabs">
          <button
            className={`reward-tab ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={`reward-tab ${activeTab === "first-mover" ? "active" : ""}`}
            onClick={() => setActiveTab("first-mover")}
          >
            First-Mover Bonus
          </button>
          <button
            className={`reward-tab ${activeTab === "size-bonus" ? "active" : ""}`}
            onClick={() => setActiveTab("size-bonus")}
          >
            LP Size Bonus
          </button>
          <button
            className={`reward-tab ${activeTab === "referral" ? "active" : ""}`}
            onClick={() => setActiveTab("referral")}
          >
            Referral Bonus
          </button>
        </div>

        <div className="reward-content">
          {activeTab === "overview" && (
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
                  <li>Minimum $1,000 TLP purchase to qualify</li>
                  <li>Fee accrual begins immediately</li>
                  <li>TLP fees unlock 2 weeks after purchase</li>
                  <li>Separate purchases receive separate reward levels</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "first-mover" && (
            <RewardProgram
              title="First-Mover Bonus"
              description="Early liquidity providers receive higher reward bonuses based on the total TLP value provided."
              type="first-mover"
            />
          )}

          {activeTab === "size-bonus" && (
            <RewardProgram
              title="LP Size Bonus"
              description="Top TLP stakers receive additional rewards based on their position on the leaderboard."
              type="size-bonus"
            />
          )}

          {activeTab === "referral" && (
            <RewardProgram
              title="Referral Bonus"
              description="LPs receive extra bonuses for referring other liquidity providers."
              type="referral"
            />
          )}
        </div>
      </div>
    </div>
  );
}
