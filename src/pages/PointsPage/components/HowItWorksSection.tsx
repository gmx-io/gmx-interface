import { Trans } from "@lingui/macro";
import { useState } from "react";

import { ExpandableRow } from "components/ExpandableRow";

import DiscountsSvg from "img/ic_discounts.svg?react";
import EarnIcon from "img/ic_earn.svg?react";
import TradeIcon from "img/ic_trade_solid.svg?react";

export function HowItWorksSection() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-20">
      <h3 className="mb-12 text-20 font-medium text-typography-primary max-xl:pl-8">
        <Trans>How it works?</Trans>
      </h3>
      <div className="grid grid-cols-3 gap-8 max-md:grid-cols-1">
        <div className="flex flex-col gap-12 rounded-8 border-1/2 border-slate-600 bg-slate-950 p-16">
          <ExpandableRow
            title={
              <span className="flex items-center gap-12">
                <TradeIcon className="size-20 text-blue-300" />
                <span className="text-14 font-medium text-typography-primary">
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
                <EarnIcon className="size-20 text-blue-300" />
                <span className="text-14 font-medium text-typography-primary">
                  <Trans>Earn Points</Trans>
                </span>
              </span>
            }
            open={isExpanded}
            onToggle={setIsExpanded}
          >
            <p className="text-body-small text-typography-secondary">
              <Trans>
                You earn points each epoch based on the trading fees you paid and your active multipliers. Your total
                multiplier comes from your volume tier, staking tier, and any applicable boosts. Points are calculated
                automatically and credited after each epoch.
              </Trans>
            </p>
          </ExpandableRow>
        </div>

        <div className="flex flex-col gap-12 rounded-8 border-1/2 border-slate-600 bg-slate-950 p-16">
          <ExpandableRow
            title={
              <span className="flex items-center gap-12">
                <DiscountsSvg className="size-20 text-blue-300" />
                <span className="text-14 font-medium text-typography-primary">
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
