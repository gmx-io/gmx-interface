import { Trans } from "@lingui/macro";
import { useState } from "react";

import { ExpandableRow } from "components/ExpandableRow";

import BoostSvg from "img/ic_boost.svg?react";
import DiscountsSvg from "img/ic_discounts.svg?react";
import StakingSvg from "img/ic_staking.svg?react";

export function HowItWorksSection() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div>
      <h3 className="text-body-large mb-8 font-semibold text-typography-primary">
        <Trans>How it works?</Trans>
      </h3>
      <div className="grid grid-cols-3 gap-8 max-md:grid-cols-1">
        <div className="flex flex-col gap-12 rounded-8 border-1/2 border-slate-600 bg-slate-950 p-16">
          <ExpandableRow
            title={
              <span className="flex items-center gap-12">
                <StakingSvg className="size-20 text-blue-300" />
                <span className="text-body-medium font-semibold">
                  <Trans>Trade and Stake</Trans>
                </span>
              </span>
            }
            open={isExpanded}
            onToggle={setIsExpanded}
          >
            <p className="text-body-small text-typography-secondary">
              <Trans>
                Trade on GMX and optionally stake GMX tokens to increase your earning power. Trading generates points,
                while staking boosts how many points you earn.
              </Trans>
            </p>
          </ExpandableRow>
        </div>

        <div className="flex flex-col gap-12 rounded-8 border-1/2 border-slate-600 bg-slate-950 p-16">
          <ExpandableRow
            title={
              <span className="flex items-center gap-12">
                <BoostSvg className="size-20 text-green-500" />
                <span className="text-body-medium font-semibold">
                  <Trans>Earn Points</Trans>
                </span>
              </span>
            }
            open={isExpanded}
            onToggle={setIsExpanded}
          >
            <p className="text-body-small text-typography-secondary">
              <Trans>
                You earn points every week based on the trading fees you paid and your active multipliers. Your total
                multiplier comes from your volume tier, staking tier, and any applicable boosts. Points are calculated
                automatically and credited weekly.
              </Trans>
            </p>
          </ExpandableRow>
        </div>

        <div className="flex flex-col gap-12 rounded-8 border-1/2 border-slate-600 bg-slate-950 p-16">
          <ExpandableRow
            title={
              <span className="flex items-center gap-12">
                <DiscountsSvg className="size-20 text-blue-500" />
                <span className="text-body-medium font-semibold">
                  <Trans>Claim Rewards</Trans>
                </span>
              </span>
            }
            open={isExpanded}
            onToggle={setIsExpanded}
          >
            <p className="text-body-small text-typography-secondary">
              <Trans>
                Points are automatically converted into trading fee discounts. Discounts reduce up to 50% of your open
                and close trading fees and are applied automatically on eligible trades. Older points are used first,
                and unused points expire over time.
              </Trans>
            </p>
          </ExpandableRow>
        </div>
      </div>
    </div>
  );
}
