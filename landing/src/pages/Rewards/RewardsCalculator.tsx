import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { getRewardsSliderAmount, getRewardsSliderPosition, getRewardsSliderStops } from "landing/utils/rewardsSlider";
import { useMemo, useState, type ReactNode } from "react";

import { ES_GMX_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import { getLandingRewardEstimate } from "domain/synthetics/incentives/v2/landingCalculator";
import type { BoostId, IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import {
  formatFactorPercentage,
  formatMultiplier,
  formatMultiplierAdjustment,
  getMaxRewardRateFactor,
} from "domain/synthetics/incentives/v2/utils";
import { expandDecimals, formatAmount, formatAmountHuman, formatUsd, USD_DECIMALS } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";

import { RewardsTradeButton } from "./RewardsTradeButton";
import { RewardsValue } from "./RewardsValue";

const BOOST_IDS = ["ManualAllocation", "FeaturedMarkets", "BalancingTrades", "LifetimeTrading"] as const;
const ROW_VARIANTS: Variants = {
  collapsed: { height: 0, opacity: 0, marginTop: 0 },
  expanded: (marginTop: number) => ({ height: "auto", opacity: 1, marginTop }),
};
const ROW_TRANSITION = { duration: 0.18, ease: "easeOut" } as const;
const REDUCED_MOTION_TRANSITION = { duration: 0 };

export function RewardsCalculator({
  config,
  loading,
}: {
  config: IncentivesConfig | null | undefined;
  loading: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const [volumeUsd, setVolumeUsd] = useState(expandDecimals(1_000_000, USD_DECIMALS));
  const [stakedAmount, setStakedAmount] = useState(expandDecimals(1_000, ES_GMX_DECIMALS));
  const [boosts, setBoosts] = useState<BoostId[]>(["ManualAllocation"]);
  const estimate = config ? getLandingRewardEstimate({ config, volumeUsd, stakedAmount, boosts }) : undefined;
  const rewardRate = (
    <RewardsValue loading={loading}>
      {estimate && config
        ? formatFactorPercentage(getMaxRewardRateFactor({ ...config, maxMultiplier: estimate.multiplier }), 0)
        : undefined}
    </RewardsValue>
  );
  const boostMultipliers = estimate?.boostMultipliers ?? boosts.map((boost) => ({ boost, multiplier: undefined }));
  const boostLabels: Record<BoostId, ReactNode> = {
    ManualAllocation: t`Comeback boost`,
    FeaturedMarkets: t`Featured markets`,
    BalancingTrades: t`Balancing trades`,
    LifetimeTrading: (
      <Trans>
        {config ? (
          formatAmountHuman(config.lifetimeVolumeThreshold, USD_DECIMALS, true, 0).toUpperCase()
        ) : (
          <RewardsValue loading={loading} width="4ch" />
        )}
        + lifetime
      </Trans>
    ),
  };

  return (
    <div className="relative">
      <div
        className={cx(
          "relative grid grid-cols-[minmax(0,_1fr)_404px] items-center gap-x-40 rounded-32 p-32",
          "shadow-[inset_0_0_0_0.5px_#2e3b47,_0_24px_60px_#090a1424] [backdrop-filter:blur(8px)] [background:#17182799]",
          "max-tablet:grid-cols-[minmax(0,_1fr)_340px] max-tablet:gap-24 max-tablet:p-24",
          "max-mobile:grid-cols-[1fr] max-mobile:gap-0 max-mobile:rounded-32 max-mobile:p-16"
        )}
      >
        <div className="flex min-w-0 flex-col max-mobile:contents">
          <TierSlider
            label={t`Weekly volume`}
            value={volumeUsd}
            decimals={USD_DECIMALS}
            tiers={config?.volumeTiers ?? EMPTY_ARRAY}
            disabled={!config}
            onChange={setVolumeUsd}
            displayValue={formatAmountHuman(volumeUsd, USD_DECIMALS, true, 0).toUpperCase()}
          />
          <TierSlider
            label={t`GMX staked`}
            value={stakedAmount}
            decimals={ES_GMX_DECIMALS}
            tiers={config?.stakingTiers ?? EMPTY_ARRAY}
            disabled={!config}
            onChange={setStakedAmount}
            displayValue={formatAmount(stakedAmount, ES_GMX_DECIMALS, 0, true)}
          />
          <div
            className={cx(
              "mt-64 pt-40 text-14 font-medium leading-[19px] [border-top:1px_solid_#7885ff33]",
              "max-mobile:mb-20 max-mobile:ml-0 max-mobile:mr-0 max-mobile:mt-16 max-mobile:pb-20 max-mobile:pl-0 max-mobile:pr-0 max-mobile:pt-0",
              "max-mobile:[border-bottom:1px_solid_#7885ff33] max-mobile:[border-top:0] max-mobile:[order:-1]",
              "[&_a]:text-[#8c96ff]"
            )}
          >
            <div className="mb-20 flex flex-wrap gap-12 max-mobile:m-0 max-mobile:grid max-mobile:grid-cols-[repeat(4,_minmax(0,_1fr))] max-mobile:gap-4">
              {BOOST_IDS.map((boost) => (
                <label
                  className={cx(
                    "inline-flex cursor-pointer items-center gap-8 whitespace-nowrap rounded-16 px-12 py-8 text-14 font-medium leading-[20px]",
                    "text-slate-500 [background:#171827] [border:1px_solid_#3c4067]",
                    "[&:has(input:disabled):hover]:border-transparent",
                    "max-mobile:relative max-mobile:min-h-46 max-mobile:justify-center max-mobile:whitespace-normal max-mobile:px-4 max-mobile:py-7",
                    "max-mobile:text-center max-mobile:text-12 max-mobile:leading-[15px] max-mobile:tracking-[0.002em] max-mobile:[overflow-wrap:anywhere]",
                    "[&.is-active]:border-blue-400 [&.is-active]:text-white [&.is-active]:[background:#2d42fc]",
                    "[&:has(input:disabled)]:cursor-default",
                    "max-mobile:[&:has(input:focus-visible)]:[outline-offset:2px] max-mobile:[&:has(input:focus-visible)]:[outline:2px_solid_#a4c3f9]",
                    "[&:hover]:border-blue-300",
                    "[&_input:checked::after]:block [&_input:checked::after]:h-8 [&_input:checked::after]:w-5",
                    "[&_input:checked::after]:border-solid [&_input:checked::after]:border-blue-400 [&_input:checked::after]:[border-width:0_1.5px_1.5px_0] [&_input:checked::after]:[content:'']",
                    "[&_input:checked::after]:[transform:translate(4.5px,_2px)_rotate(45deg)]",
                    "[&_input:checked]:[background:#fff]",
                    "[&_input]:h-14 [&_input]:w-14 [&_input]:shrink-0 [&_input]:appearance-none [&_input]:rounded-3 [&_input]:[background:#a0a3c4]",
                    "max-mobile:[&_input]:absolute max-mobile:[&_input]:h-1 max-mobile:[&_input]:w-1 max-mobile:[&_input]:opacity-[0]",
                    boosts.includes(boost) ? "is-active" : ""
                  )}
                  key={boost}
                >
                  <input
                    type="checkbox"
                    checked={boosts.includes(boost)}
                    disabled={!config}
                    onChange={(event) => {
                      setBoosts(event.target.checked ? [...boosts, boost] : boosts.filter((value) => value !== boost));
                    }}
                  />
                  {boostLabels[boost]}
                </label>
              ))}
            </div>
            <a
              className={cx(
                "rewards-wallet-link-desktop inline-block",
                "[&:focus-visible]:decoration-current",
                "[@media(hover:hover)]:[&:hover]:decoration-current [@media(hover:hover)]:[&:hover]:[transform:translateX(3px)]",
                "max-mobile:hidden",
                "[&:active]:[transform:translateX(1px)]"
              )}
              href="#comeback"
            >
              <Trans>Traded here before? Check your wallet →</Trans>
            </a>
          </div>
        </div>
        <div
          className={cx(
            "flex min-w-0 flex-col rounded-16 p-24 text-16 font-medium leading-[24px] shadow-[0_6px_16px_#1416271f]",
            "[--rewards-skeleton-base:#ffffff26] [--rewards-skeleton-highlight:#ffffff4d]",
            "[background:#2d42fc_url('../../src/img/rewards-landing/summary-background.webp')_center_/_100%_100%_no-repeat]",
            "max-mobile:p-16 max-mobile:[order:-2]",
            "[&_.rewards-button]:mt-16 [&_.rewards-button]:w-full [&_.rewards-button]:rounded-12",
            "max-mobile:[&_.rewards-button]:hidden",
            "[&_dd]:whitespace-nowrap [&_dd]:tabular-nums",
            "[&_strong]:whitespace-nowrap [&_strong]:tabular-nums"
          )}
          aria-live="polite"
          aria-atomic="true"
          aria-busy={!config && loading}
        >
          <dl
            className={cx(
              "flex min-h-[108px] flex-col text-16 leading-[24px] text-[#ffffff99]",
              "max-mobile:min-h-92 max-mobile:text-14 max-mobile:leading-[20px]",
              "[&>div+div]:mt-4",
              "[&>div]:flex [&>div]:items-center [&>div]:justify-between [&>div]:gap-16",
              "[&_dd]:text-white"
            )}
          >
            <div>
              <dt>
                <Trans>Volume</Trans>
              </dt>
              <dd>
                <RewardsValue loading={loading}>
                  {estimate && config
                    ? formatMultiplierAdjustment(estimate.volumeMultiplier, config.multiplierDecimals)
                    : undefined}
                </RewardsValue>
              </dd>
            </div>
            <div>
              <dt>
                <Trans>Staking</Trans>
              </dt>
              <dd>
                <RewardsValue loading={loading}>
                  {estimate && config
                    ? formatMultiplierAdjustment(estimate.stakingMultiplier, config.multiplierDecimals)
                    : undefined}
                </RewardsValue>
              </dd>
            </div>
            <AnimatePresence initial={false}>
              {boostMultipliers.map(({ boost, multiplier }) => (
                <motion.div
                  key={boost}
                  className="overflow-hidden"
                  variants={ROW_VARIANTS}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  custom={4}
                  transition={reducedMotion ? REDUCED_MOTION_TRANSITION : ROW_TRANSITION}
                >
                  <dt>{boostLabels[boost]}</dt>
                  <dd>
                    <RewardsValue loading={loading}>
                      {config && multiplier !== undefined
                        ? formatMultiplierAdjustment(multiplier, config.multiplierDecimals)
                        : undefined}
                    </RewardsValue>
                  </dd>
                </motion.div>
              ))}
            </AnimatePresence>
          </dl>
          <div className="mt-8 flex items-center justify-between gap-16 [&_strong]:text-[28px] [&_strong]:font-medium [&_strong]:leading-[32px] [&_strong]:tracking-[-0.03em]">
            <span>
              <Trans>Total multiplier</Trans>
            </span>
            <strong>
              <RewardsValue loading={loading} width="2ch">
                {estimate && config
                  ? formatMultiplier(estimate.multiplier, config.multiplierDecimals, 2, config.maxMultiplier)
                  : undefined}
              </RewardsValue>
            </strong>
          </div>
          <AnimatePresence initial={false}>
            {estimate?.isMaxMultiplierReached && (
              <motion.p
                className="mt-6 overflow-hidden text-right text-12 leading-[18px] text-[#d2d7ff]"
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
          <div
            className={cx(
              "mt-16 flex items-center justify-between gap-16 pt-15 [border-top:1px_dashed_#7885ff66]",
              "max-mobile:mt-8 max-mobile:pt-7",
              "[&_strong]:text-[40px] [&_strong]:font-medium [&_strong]:leading-[48px] [&_strong]:tracking-[-0.03em]",
              "max-mobile:[&_strong]:text-[28px] max-mobile:[&_strong]:leading-[32px]"
            )}
          >
            <span>
              <Trans>Fees back</Trans>
            </span>
            <strong>{rewardRate}</strong>
          </div>
          <div className="mt-8 flex flex-col items-end gap-4">
            <strong className="rewards-receipt-amount max-mobile:text-18 text-24 font-medium leading-[28px] tracking-[-0.032em] max-mobile:leading-[24px]">
              <RewardsValue loading={loading} width="5ch">
                {estimate ? formatUsd(estimate.rewardsUsd, { displayDecimals: 0 }) : undefined}
              </RewardsValue>
            </strong>
            <p className="rewards-receipt-split flex flex-wrap content-start justify-end gap-x-4 text-right text-14 leading-[20px] text-blue-100 [&>span]:whitespace-nowrap [&>span]:tabular-nums">
              <span>
                <RewardsValue loading={loading} width="5ch">
                  {estimate ? formatUsd(estimate.esGmxRewardsUsd, { displayDecimals: 0 }) : undefined}
                </RewardsValue>{" "}
                esGMX
              </span>
              <span>
                +{" "}
                <RewardsValue loading={loading} width="5ch">
                  {estimate ? formatUsd(estimate.gtRewardsUsd, { displayDecimals: 0 }) : undefined}
                </RewardsValue>{" "}
                GT
              </span>
            </p>
          </div>
          <RewardsTradeButton
            className="rewards-button-white [&.rewards-button-white]:text-blue-400 [&.rewards-button-white]:[background:#fff]"
            placement="Calculator"
          />
        </div>
        <RewardsTradeButton
          className={cx(
            "rewards-button-white rewards-mobile-trade-button",
            "[&.rewards-button-white]:text-blue-400 [&.rewards-button-white]:[background:#fff]",
            "[&.rewards-mobile-trade-button]:hidden",
            "max-mobile:[&.rewards-mobile-trade-button]:mt-32 max-mobile:[&.rewards-mobile-trade-button]:flex",
            "max-mobile:[&.rewards-mobile-trade-button]:rounded-12 max-mobile:[&.rewards-mobile-trade-button]:text-slate-900"
          )}
          placement="MobileCalculator"
        />
      </div>
      <a
        className={cx(
          "rewards-wallet-link-mobile hidden",
          "[&:focus-visible]:decoration-current",
          "[@media(hover:hover)]:[&:hover]:decoration-current [@media(hover:hover)]:[&:hover]:[transform:translateX(3px)]",
          "max-mobile:mt-16 max-mobile:inline-block max-mobile:text-14 max-mobile:text-[#8c96ff]",
          "[&:active]:[transform:translateX(1px)]"
        )}
        href="#comeback"
      >
        <Trans>Traded here before? Check your wallet →</Trans>
      </a>
      <p
        className={cx(
          "absolute left-32 right-32 top-full mt-16 text-12 text-[#a0a3c4cc]",
          "max-mobile:static max-mobile:mt-16 max-mobile:text-12 max-mobile:leading-[15px] max-mobile:tracking-[0.002em] max-mobile:text-slate-600"
        )}
      >
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
  decimals,
  tiers,
  onChange,
  displayValue,
  disabled,
}: {
  label: string;
  value: bigint;
  decimals: number;
  tiers: { threshold: bigint }[];
  onChange: (value: bigint) => void;
  displayValue: string;
  disabled: boolean;
}) {
  const stops = getRewardsSliderStops(tiers);
  const maximum = (stops.length - 1) * 100;
  const [selectedPosition, setSelectedPosition] = useState<number>();
  const position =
    selectedPosition !== undefined &&
    selectedPosition <= maximum &&
    getRewardsSliderAmount(stops, selectedPosition, decimals) === value
      ? selectedPosition
      : getRewardsSliderPosition(stops, value);
  const style = useMemo(
    () => ({ backgroundSize: `${maximum > 0 ? (position / maximum) * 100 : 0}% 100%, 12px 100%` }),
    [maximum, position]
  );

  return (
    <label
      className={cx(
        "rewards-slider block text-[var(--rewards-muted)]",
        "[&_output]:text-transparent [&_output]:text-[28px] [&_output]:tabular-nums [&_output]:leading-[1.08] [&_output]:[background-clip:text]",
        "[&_output]:[background-image:linear-gradient(170deg,_#a4c3f9_15%,_#2d42fc_205%)]",
        "max-mobile:[&>span]:text-18 max-mobile:[&>span]:leading-[24px]",
        "max-mobile:[&_output]:text-18",
        "max-compact:[&>span]:gap-12",
        "max-compact:[&_output]:whitespace-nowrap",
        "[&+.rewards-slider]:mt-64",
        "max-mobile:[&+.rewards-slider]:mt-20",
        "[&>span]:flex [&>span]:items-center [&>span]:justify-between [&>span]:gap-16 [&>span]:text-24 [&>span]:font-medium [&>span]:leading-[32px]",
        "[&>span]:tracking-[-0.032em]",
        "[&_input::-moz-range-thumb]:h-14 [&_input::-moz-range-thumb]:w-14 [&_input::-moz-range-thumb]:rounded-full",
        "[&_input::-moz-range-thumb]:shadow-[0_0_0_5px_#151622] [&_input::-moz-range-thumb]:[background:#2d42fc]",
        "[&_input::-moz-range-thumb]:[border:4px_solid_#fff]",
        "[&_input::-webkit-slider-thumb]:h-20 [&_input::-webkit-slider-thumb]:w-20 [&_input::-webkit-slider-thumb]:appearance-none",
        "[&_input::-webkit-slider-thumb]:rounded-full [&_input::-webkit-slider-thumb]:shadow-[0_0_0_5px_#151622]",
        "[&_input::-webkit-slider-thumb]:[background:#2d42fc] [&_input::-webkit-slider-thumb]:[border:4px_solid_#fff]",
        "[&_input:disabled]:cursor-default",
        "[&_input]:mb-6 [&_input]:ml-0 [&_input]:mr-0 [&_input]:mt-18 [&_input]:block [&_input]:h-12 [&_input]:w-full [&_input]:cursor-pointer",
        "[&_input]:appearance-none [&_input]:rounded-30 [&_input]:bg-slate-600",
        "[&_input]:[background-image:linear-gradient(90deg,_#7885ff,_#2d42fc),_radial-gradient(circle,_#a0a3c4_0.5px,_transparent_0.75px)]",
        "[&_input]:[background-position:left_center,_right_center] [&_input]:[background-repeat:no-repeat,_repeat-x] [&_input]:[border:0]",
        "max-mobile:[&_input]:mb-6 max-mobile:[&_input]:ml-0 max-mobile:[&_input]:mr-0 max-mobile:[&_input]:mt-14"
      )}
    >
      <span>
        <span>{label}</span>
        <output>{displayValue}</output>
      </span>
      <input
        type="range"
        min={0}
        max={Math.max(maximum, 1)}
        step={1}
        value={position}
        style={style}
        aria-label={label}
        aria-valuetext={displayValue}
        disabled={disabled}
        onChange={(event) => {
          const nextPosition = Number(event.target.value);
          setSelectedPosition(nextPosition);
          onChange(getRewardsSliderAmount(stops, nextPosition, decimals));
        }}
      />
    </label>
  );
}
