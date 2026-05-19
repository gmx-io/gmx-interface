import { Trans } from "@lingui/macro";
import { useState } from "react";

import TradeIcon from "img/ic_candles_filled.svg?react";
import DiscountsSvg from "img/ic_discounts.svg?react";
import EarnIcon from "img/ic_earn.svg?react";

import { HowItWorksBlock } from "./HowItWorksBlock";

export function HowItWorksSection() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-20">
      <h3 className="mb-20 text-20 font-medium text-typography-primary max-xl:pl-8">
        <Trans>How it works?</Trans>
      </h3>
      <div className="grid grid-cols-3 gap-8 max-md:grid-cols-1">
        <HowItWorksBlock
          icon={<TradeIcon className="size-20 text-blue-300" />}
          title={<Trans>Trade and Stake</Trans>}
          isExpanded={isExpanded}
          onToggle={setIsExpanded}
        >
          <p className="text-12 text-typography-secondary">
            <Trans>
              Trade on GMX and optionally stake GMX tokens to increase your earning power. Trading generates points,
              while staking boosts how many points you earn.
            </Trans>
          </p>
        </HowItWorksBlock>

        <HowItWorksBlock
          icon={<EarnIcon className="size-20 text-blue-300" />}
          title={<Trans>Earn Points</Trans>}
          isExpanded={isExpanded}
          onToggle={setIsExpanded}
        >
          <p className="text-12 text-typography-secondary">
            <Trans>
              You earn points each epoch based on the trading fees you paid and your active multipliers. Your total
              multiplier comes from your volume tier, staking tier, and any applicable boosts. Points are calculated
              automatically and credited after each epoch.
            </Trans>
          </p>
        </HowItWorksBlock>

        <HowItWorksBlock
          icon={<DiscountsSvg className="size-20 text-blue-300" />}
          title={<Trans>Claim Rewards</Trans>}
          isExpanded={isExpanded}
          onToggle={setIsExpanded}
        >
          <p className="text-12 text-typography-secondary">
            <Trans>
              Points are automatically converted into trading fee discounts. Discounts reduce up to 50% of your open and
              close trading fees and are applied automatically on eligible trades. Older points are used first, and
              unused points expire over time.
            </Trans>
          </p>
        </HowItWorksBlock>
      </div>
    </div>
  );
}
