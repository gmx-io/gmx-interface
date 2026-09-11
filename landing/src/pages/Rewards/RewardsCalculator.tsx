import { t, Trans } from "@lingui/macro";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { getRewardsSliderAmount, getRewardsSliderPosition, getRewardsSliderStops } from "landing/utils/rewardsSlider";
import { useMemo, useState } from "react";

import { ES_GMX_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import { getLandingRewardEstimate } from "domain/synthetics/incentives/v2/landingCalculator";
import type { BoostId, IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { formatMultiplier, formatMultiplierAdjustment } from "domain/synthetics/incentives/v2/utils";
import { expandDecimals, formatAmount, formatAmountHuman, formatUsd, USD_DECIMALS } from "lib/numbers";

import { RewardsTradeButton } from "./RewardsTradeButton";

const BOOST_IDS = ["ManualAllocation", "FeaturedMarkets", "BalancingTrades", "LifetimeTrading"] as const;
const ROW_VARIANTS: Variants = {
  collapsed: { height: 0, opacity: 0, marginTop: 0 },
  expanded: (marginTop: number) => ({ height: "auto", opacity: 1, marginTop }),
};
const ROW_TRANSITION = { duration: 0.18, ease: "easeOut" } as const;
const REDUCED_MOTION_TRANSITION = { duration: 0 };

export function RewardsCalculator({ config }: { config: IncentivesConfig }) {
  const reducedMotion = useReducedMotion();
  const [volumeUsd, setVolumeUsd] = useState(expandDecimals(200_000, USD_DECIMALS));
  const [stakedAmount, setStakedAmount] = useState(expandDecimals(1_000, ES_GMX_DECIMALS));
  const [boosts, setBoosts] = useState<BoostId[]>(["ManualAllocation"]);
  const estimate = getLandingRewardEstimate({ config, volumeUsd, stakedAmount, boosts });
  const boostLabels: Record<BoostId, string> = {
    ManualAllocation: t`Comeback boost`,
    FeaturedMarkets: t`Featured markets`,
    BalancingTrades: t`Balancing trades`,
    LifetimeTrading: t`${formatAmountHuman(config.lifetimeVolumeThreshold, USD_DECIMALS, true, 0).toUpperCase()}+ lifetime`,
  };

  return (
    <div className="rewards-calculator">
      <div className="rewards-calculator-controls">
        <TierSlider
          label={t`Weekly volume`}
          value={volumeUsd}
          tiers={config.volumeTiers}
          onChange={setVolumeUsd}
          displayValue={formatAmountHuman(volumeUsd, USD_DECIMALS, true, 0).toUpperCase()}
        />
        <TierSlider
          label={t`GMX + esGMX staked`}
          value={stakedAmount}
          tiers={config.stakingTiers}
          onChange={setStakedAmount}
          displayValue={formatAmount(stakedAmount, ES_GMX_DECIMALS, 0, true)}
        />
        <div className="rewards-boost-controls">
          <div className="rewards-boost-options">
            {BOOST_IDS.map((boost) => (
              <label className={`rewards-boost-toggle ${boosts.includes(boost) ? "is-active" : ""}`} key={boost}>
                <input
                  type="checkbox"
                  checked={boosts.includes(boost)}
                  onChange={(event) => {
                    setBoosts(event.target.checked ? [...boosts, boost] : boosts.filter((value) => value !== boost));
                  }}
                />
                {boostLabels[boost]}
              </label>
            ))}
          </div>
          <a href="#comeback">
            <Trans>Traded here before? Check your wallet →</Trans>
          </a>
        </div>
      </div>
      <div className="rewards-receipt" aria-live="polite" aria-atomic="true">
        <div className="rewards-receipt-fees">
          <span>
            <Trans>Your fees</Trans>
          </span>
          <strong>{formatUsd(estimate.feesUsd)}</strong>
        </div>
        <dl className="rewards-receipt-breakdown">
          <div>
            <dt>
              <Trans>Volume</Trans>
            </dt>
            <dd>{formatMultiplierAdjustment(estimate.volumeMultiplier, config.multiplierDecimals)}</dd>
          </div>
          <div>
            <dt>
              <Trans>Staking</Trans>
            </dt>
            <dd>{formatMultiplierAdjustment(estimate.stakingMultiplier, config.multiplierDecimals)}</dd>
          </div>
          <AnimatePresence initial={false}>
            {estimate.boostMultipliers.map(({ boost, multiplier }) => (
              <motion.div
                key={boost}
                className="rewards-receipt-boost"
                variants={ROW_VARIANTS}
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                custom={4}
                transition={reducedMotion ? REDUCED_MOTION_TRANSITION : ROW_TRANSITION}
              >
                <dt>{boostLabels[boost]}</dt>
                <dd>{formatMultiplierAdjustment(multiplier, config.multiplierDecimals)}</dd>
              </motion.div>
            ))}
          </AnimatePresence>
        </dl>
        <div className="rewards-receipt-multiplier">
          <span>
            <Trans>Your multiplier</Trans>
          </span>
          <strong>{formatMultiplier(estimate.multiplier, config.multiplierDecimals)}</strong>
        </div>
        <AnimatePresence initial={false}>
          {estimate.isCapped && (
            <motion.p
              className="rewards-cap-note"
              variants={ROW_VARIANTS}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              custom={6}
              transition={reducedMotion ? REDUCED_MOTION_TRANSITION : ROW_TRANSITION}
            >
              <Trans>Maximum multiplier reached</Trans>
            </motion.p>
          )}
        </AnimatePresence>
        <div className="rewards-receipt-total">
          <span>
            <Trans>Returned to you</Trans>
          </span>
          <strong>{formatUsd(estimate.rewardsUsd, { displayDecimals: 0 })}</strong>
        </div>
        <p className="rewards-receipt-split">
          <span>{formatUsd(estimate.esGmxRewardsUsd)} esGMX</span>
          <span>+ {formatUsd(estimate.gtRewardsUsd)} GT</span>
        </p>
        <RewardsTradeButton className="rewards-button-white" />
      </div>
      <p className="rewards-estimate-note">
        <Trans>
          Estimated rewards. Actual rewards depend on eligible fees, active tiers, and remaining boost budget.
        </Trans>
      </p>
    </div>
  );
}

function TierSlider({
  label,
  value,
  tiers,
  onChange,
  displayValue,
}: {
  label: string;
  value: bigint;
  tiers: { threshold: bigint }[];
  onChange: (value: bigint) => void;
  displayValue: string;
}) {
  const stops = getRewardsSliderStops(tiers);
  const position = getRewardsSliderPosition(stops, value);
  const maximum = (stops.length - 1) * 100;
  const style = useMemo(
    () => ({ backgroundSize: `${maximum > 0 ? (position / maximum) * 100 : 0}% 100%` }),
    [maximum, position]
  );

  return (
    <label className="rewards-slider">
      <span>
        <span>{label}</span>
        <output>{displayValue}</output>
      </span>
      <input
        type="range"
        min={0}
        max={maximum}
        step={1}
        value={position}
        style={style}
        aria-label={label}
        aria-valuetext={displayValue}
        onChange={(event) => onChange(getRewardsSliderAmount(stops, Number(event.target.value)))}
      />
    </label>
  );
}
