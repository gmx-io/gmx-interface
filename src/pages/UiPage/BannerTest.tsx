import { Trans } from "@lingui/macro";
import noop from "lodash/noop";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { ColorfulBanner, ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";
import ExternalLink from "components/ExternalLink/ExternalLink";

import AlertIcon from "img/ic_alert.svg?react";
import ExpressIcon from "img/ic_express.svg?react";
import InfoIcon from "img/ic_info.svg?react";
import OneClickIcon from "img/ic_one_click.svg?react";
import WarnIcon from "img/ic_warn.svg?react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 mt-16 border-b border-slate-600 pb-4 text-14 text-slate-100">{title}</div>
      <div className="flex flex-col gap-8">{children}</div>
    </div>
  );
}

export function BannerTest() {
  return (
    <div className="mx-auto w-[380px] px-12">
      <div className="text-body-medium flex flex-col">
        <div className="mb-8 text-16 font-medium">
          <Trans>Banners</Trans>
        </div>

        <Section title="Inline span + text">
          <AlertInfoCard>
            <Trans>
              <span className="cursor-pointer font-medium text-blue-300 underline">Switch to TBTC-TBTC pool</span> for
              potentially lower price impact
            </Trans>
          </AlertInfoCard>
        </Section>

        <Section title="Text + ColorfulButtonLink">
          <ColorfulBanner color="blue" icon={InfoIcon} onClose={noop}>
            <Trans>0.0045 WETH remaining in old 1CT subaccount</Trans>
            <ColorfulButtonLink color="blue" onClick={noop}>
              <Trans>Withdraw</Trans>
            </ColorfulButtonLink>
          </ColorfulBanner>

          <ColorfulBanner color="yellow" icon={WarnIcon} className="text-body-small">
            <Trans>Settlement network changed to Arbitrum, but $12.50 remains in your Base GMX Account</Trans>
            <ColorfulButtonLink color="yellow" onClick={noop}>
              <Trans>Change to Base</Trans>
            </ColorfulButtonLink>
          </ColorfulBanner>

          <ColorfulBanner color="blue" icon={OneClickIcon} onClose={noop}>
            <Trans>One-Click Trading is disabled. Action limit exceeded.</Trans>
            <ColorfulButtonLink color="blue" onClick={noop}>
              <Trans>Re-enable</Trans>
            </ColorfulButtonLink>
          </ColorfulBanner>

          <AlertInfoCard type="error" hideClose>
            <Trans>Insufficient liquidity in WETH-USDC pool. Select a different pool.</Trans>
            <ColorfulButtonLink color="blue" onClick={noop}>
              <Trans>Switch to WBTC-USDC pool</Trans>
            </ColorfulButtonLink>
          </AlertInfoCard>

          <AlertInfoCard type="error" hideClose>
            <Trans>Insufficient liquidity in WETH-USDC pool. Choosing a different pool creates a new position.</Trans>
            <ColorfulButtonLink color="blue" onClick={noop}>
              <Trans>Switch to WBTC-USDC pool</Trans>
            </ColorfulButtonLink>
          </AlertInfoCard>
        </Section>

        <Section title="Stacked spans">
          <ColorfulBanner color="blue" icon={AlertIcon} onClose={noop}>
            <div className="flex flex-col gap-4">
              <span className="font-medium text-blue-300">
                <Trans>Skip creating a referral code?</Trans>
              </span>
              <span className="text-blue-100">
                <Trans>Earn rewards by sharing your referral code</Trans>
              </span>
            </div>
          </ColorfulBanner>
        </Section>

        <Section title="Text + inline ColorfulButtonLink">
          <AlertInfoCard type="warning" hideClose>
            <Trans>
              Existing position in WETH-USDC pool.
              <ColorfulButtonLink color="blue" onClick={noop}>
                Switch to WETH-USDC pool
              </ColorfulButtonLink>
            </Trans>
          </AlertInfoCard>

          <AlertInfoCard type="warning" hideClose>
            <Trans>
              Existing limit order in WETH-USDC pool.
              <ColorfulButtonLink onClick={noop}>Switch to WETH-USDC pool</ColorfulButtonLink>
            </Trans>
          </AlertInfoCard>

          <AlertInfoCard>
            <Trans>
              Existing position uses USDC collateral. This action won't affect it.{" "}
              <ColorfulButtonLink color="blue" onClick={noop}>
                Switch to USDC collateral
              </ColorfulButtonLink>
            </Trans>
          </AlertInfoCard>
        </Section>

        <Section title="Plain text">
          <ColorfulBanner color="yellow" icon={AlertIcon}>
            <Trans>High leverage increases liquidation risk</Trans>
          </ColorfulBanner>

          <ColorfulBanner color="blue" icon={ExpressIcon}>
            <Trans>Express Trading is unavailable for wrapping or unwrapping native token ETH</Trans>
          </ColorfulBanner>

          <AlertInfoCard type="warning" hideClose>
            <Trans>Existing position in WETH-USDC pool but lacks liquidity for this order</Trans>
          </AlertInfoCard>

          <AlertInfoCard type="error" hideClose>
            <Trans>Insufficient liquidity in any BTC/USD pool</Trans>
          </AlertInfoCard>

          <AlertInfoCard type="warning" hideClose>
            <Trans>High price impact</Trans>
          </AlertInfoCard>

          <AlertInfoCard type="error" hideClose>
            <Trans>
              GMX Account support on Avalanche is ending. New positions and additional deposits are unavailable. Switch
              to Arbitrum as a settlement network.
            </Trans>
          </AlertInfoCard>

          <AlertInfoCard type="warning" hideClose>
            <Trans>Existing limit order in WETH-USDC pool but lacks liquidity for this order</Trans>
          </AlertInfoCard>
        </Section>

        <Section title="Div-wrapped content">
          <ColorfulBanner color="red" icon={ExpressIcon}>
            <div>
              <Trans>Insufficient gas balance. Deposit more ETH.</Trans>
              <br />
              <ColorfulButtonLink color="red" onClick={noop}>
                <Trans>Deposit ETH</Trans>
              </ColorfulButtonLink>
            </div>
          </ColorfulBanner>

          <AlertInfoCard type="info" onClose={noop}>
            <div>
              <Trans>Convert esGMX to GMX tokens. Read the vesting details before using the vaults.</Trans>
              <ColorfulButtonLink to="https://docs.gmx.io/" newTab>
                <Trans>Read details</Trans>
              </ColorfulButtonLink>
            </div>
          </AlertInfoCard>

          <ColorfulBanner color="blue" icon={InfoIcon} onClose={noop}>
            <div className="flex flex-col gap-8">
              <span>
                <span className="cursor-pointer font-medium text-blue-300">
                  <Trans>Use a TWAP order</Trans>
                </span>{" "}
                <Trans>for lower net price impact</Trans>
              </span>
            </div>
          </ColorfulBanner>

          <ColorfulBanner color="blue" icon={OneClickIcon} onClose={noop} onClick={noop} className="cursor-pointer">
            <div>
              <Trans>Try Express Trading</Trans>
            </div>
          </ColorfulBanner>
        </Section>

        <Section title="Inline ExternalLink">
          <ColorfulBanner color="blue" onClose={noop}>
            <span>
              <Trans>
                Simulated orderbook view of GMX liquidity. Opens execute at mark price with zero impact. Net price
                impact applies only on closes (capped, usually at 0.5%).{" "}
                <ExternalLink href="https://docs.gmx.io/" newTab>
                  Read more
                </ExternalLink>
                .
              </Trans>
            </span>
          </ColorfulBanner>

          <AlertInfoCard type="warning" hideClose>
            <Trans>
              Max 5 auto-cancel TP/SL orders allowed. Extra orders require manual cancellation. Existing orders still
              close with the position. <ExternalLink href="https://docs.gmx.io/">Read more</ExternalLink>.
            </Trans>
          </AlertInfoCard>
        </Section>

        <Section title="Structured content">
          <AlertInfoCard type="warning" hideClose>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between gap-4">
                <div>Price impact</div>
                <div className="font-medium text-yellow-300">-2.50%</div>
              </div>
              <div className="flex justify-between gap-4">
                <div>Execution fee</div>
                <div className="font-medium text-yellow-300">$1.25</div>
              </div>
            </div>
          </AlertInfoCard>
        </Section>

        <Section title="Error messages">
          <ColorfulBanner color="red" className="text-red-100">
            <Trans>
              GM bought successfully, but bridge to Base failed. Your funds are safe in your GMX Account. Retry the
              bridge or go to the ETH/USD pool to withdraw your GM tokens.
            </Trans>
          </ColorfulBanner>

          <ColorfulBanner color="red" className="text-red-100">
            <Trans>Buy GM failed</Trans>
          </ColorfulBanner>
        </Section>

        <div className="py-20" />
      </div>
    </div>
  );
}
