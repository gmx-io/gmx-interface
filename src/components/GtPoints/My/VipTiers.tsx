import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Skeleton from "react-loading-skeleton";

import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";

import Badge from "components/Badge/Badge";
import ConnectWalletButton from "components/ConnectWalletButton/ConnectWalletButton";
import { EarningValue } from "components/EarningValue/EarningValue";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { formatGt, formatPercent, getCombinedFeeDiscount, getVipProgress } from "../gtPointsFormat";
import { REFERRAL_FEE_DISCOUNT, VIP_TIERS, type VipTier } from "../gtPointsTypes";

// The track runs from the first dot to the last: 10 columns, dots in the middle of each.
const TRACK_STYLE = { left: "5%", right: "5%" };

type Props = {
  balance: bigint | undefined;
  isConnected: boolean;
  /** Data is loading, or a remembered wallet is still being restored */
  isLoading: boolean;
};

export function VipTiers({ balance, isConnected, isLoading }: Props) {
  const progress = isConnected && balance !== undefined ? getVipProgress(balance) : undefined;
  const currentLevel = progress?.current.level;

  // The tier the user is looking at. Follows the current tier until the user picks another one.
  // Without a wallet the card starts on VIP 0; with a wallet but no data yet, no tier is shown.
  const [pickedLevel, setPickedLevel] = useState<number | undefined>(undefined);
  useEffect(() => setPickedLevel(undefined), [currentLevel]);
  const selectedLevel = pickedLevel ?? currentLevel ?? (isConnected || isLoading ? undefined : 0);
  const selectedTier = selectedLevel === undefined ? undefined : VIP_TIERS[selectedLevel];
  const isBrowsing = pickedLevel !== undefined && pickedLevel !== currentLevel;

  // Track fill: whole tiers reached plus the part of the way to the next tier, over the 9 gaps between 10 dots.
  const filledGaps = progress && currentLevel !== undefined ? currentLevel + progress.percentToNext / 100 : 0;
  const fillPercent = Math.min((filledGaps / (VIP_TIERS.length - 1)) * 100, 100);
  const fillStyle = useMemo(() => ({ left: "5%", width: `${fillPercent * 0.9}%` }), [fillPercent]);

  // On narrow screens the ruler scrolls: bring the current tier into view.
  const rulerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ruler = rulerRef.current;
    const stop = currentLevel !== undefined ? ruler?.querySelector<HTMLElement>(`[data-tier="${currentLevel}"]`) : null;
    if (!ruler || !stop || ruler.scrollWidth <= ruler.clientWidth) return;
    ruler.scrollLeft = stop.offsetLeft + stop.offsetWidth / 2 - ruler.clientWidth / 2;
  }, [currentLevel]);

  return (
    <div className="flex flex-col rounded-8 bg-slate-900">
      <div ref={rulerRef} className="overflow-x-auto px-20 pt-16 scrollbar-hide">
        <div className="relative min-w-[560px] pb-16">
          <div className="absolute bottom-[19px] h-2 rounded-full bg-slate-700" style={TRACK_STYLE} />
          <div className="absolute bottom-[19px] h-2 rounded-full bg-blue-300" style={fillStyle} />
          <div className="relative grid grid-cols-10">
            {VIP_TIERS.map((tier) => (
              <TierStop
                key={tier.level}
                tier={tier}
                isReached={currentLevel !== undefined && tier.level <= currentLevel}
                isCurrent={tier.level === currentLevel}
                isSelected={tier.level === selectedLevel}
                onClick={() => setPickedLevel(tier.level === currentLevel ? undefined : tier.level)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="border-t-1/2 border-slate-600" />

      <div className="flex flex-wrap items-center gap-x-32 gap-y-16 p-20">
        <div className="flex min-w-[132px] flex-col items-start gap-8">
          <div className="text-h1 font-medium text-typography-primary numbers">
            {selectedTier ? (
              `VIP ${selectedTier.level}`
            ) : isLoading ? (
              <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={110} />
            ) : (
              "VIP –"
            )}
          </div>
          {selectedLevel !== undefined && currentLevel !== undefined && (
            <TierStatus selectedLevel={selectedLevel} currentLevel={currentLevel} />
          )}
        </div>

        <div className="flex min-w-[180px] flex-1 flex-col gap-4">
          {isBrowsing && selectedTier ? (
            <TierRequirement tier={selectedTier} balance={progress ? balance : undefined} />
          ) : (
            <MyGt
              balance={balance}
              isConnected={isConnected}
              isLoading={isLoading}
              toNextLabel={
                progress?.next ? (
                  <Trans>
                    {formatGt(progress.toNext)} to VIP {progress.next.level}
                  </Trans>
                ) : (
                  <Trans>Highest tier reached</Trans>
                )
              }
            />
          )}
        </div>

        <div className="flex gap-8 max-lg:w-full">
          <BenefitTile
            value={selectedTier ? formatPercent(getCombinedFeeDiscount(selectedTier.feeDiscount)) : undefined}
            isLoading={isLoading}
            label={<Trans>Trading fee discount</Trans>}
            tooltip={selectedTier ? <FeeDiscountTooltip tier={selectedTier} /> : undefined}
          />
          <BenefitTile
            value={selectedTier ? formatPercent(selectedTier.referralRewards) : undefined}
            isLoading={isLoading}
            label={<Trans>Referral rewards</Trans>}
          />
        </div>
      </div>
    </div>
  );
}

function TierStop({
  tier,
  isReached,
  isCurrent,
  isSelected,
  onClick,
}: {
  tier: VipTier;
  isReached: boolean;
  isCurrent: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" data-tier={tier.level} className="group flex flex-col items-center gap-10" onClick={onClick}>
      <span
        className={cx("text-body-small rounded-full px-8 py-2 font-medium transition-colors numbers", {
          "bg-slate-800 text-typography-primary": isSelected,
          "text-blue-300": isCurrent && !isSelected,
          "text-typography-secondary group-hover:text-typography-primary": !isSelected && !isCurrent,
        })}
      >
        VIP {tier.level}
      </span>
      <span
        className={cx("size-10 rounded-full border-2 border-slate-900 transition-colors", {
          "bg-blue-300": isReached,
          "bg-slate-600": !isReached,
          "outline outline-2 outline-blue-300/40": isSelected,
        })}
      />
    </button>
  );
}

function TierStatus({ selectedLevel, currentLevel }: { selectedLevel: number; currentLevel: number }) {
  if (selectedLevel === currentLevel) {
    return (
      <Badge className="!bg-blue-300/20 !text-blue-300">
        <Trans>Your tier</Trans>
      </Badge>
    );
  }

  return selectedLevel < currentLevel ? (
    <Badge>
      <Trans>Unlocked</Trans>
    </Badge>
  ) : (
    <Badge>
      <Trans>Locked</Trans>
    </Badge>
  );
}

function MyGt({
  balance,
  isConnected,
  isLoading,
  toNextLabel,
}: {
  balance: bigint | undefined;
  isConnected: boolean;
  isLoading: boolean;
  toNextLabel: ReactNode;
}) {
  const { openConnectModal } = useConnectModal();

  // No wallet, and none being restored: invite to connect.
  if (!isConnected && !isLoading) {
    return (
      <div className="flex flex-col items-start gap-8">
        <span className="text-body-small font-medium text-typography-secondary">
          <Trans>My GT</Trans>
        </span>
        <span className="text-body-medium text-typography-secondary">
          <Trans>Connect your wallet to see your GT and VIP tier.</Trans>
        </span>
        {openConnectModal && (
          <ConnectWalletButton onClick={openConnectModal}>
            <Trans>Connect wallet</Trans>
          </ConnectWalletButton>
        )}
      </div>
    );
  }

  return (
    <>
      <span className="text-body-small font-medium text-typography-secondary">
        <Trans>My GT</Trans>
      </span>
      <span className="text-h2 font-medium text-typography-primary numbers">
        <EarningValue value={balance} isLoading={isLoading} skeletonWidth={120}>
          {(amount) => formatGt(amount)}
        </EarningValue>
      </span>
      {!isLoading && balance !== undefined && (
        <span className="text-body-small text-typography-secondary numbers">{toNextLabel}</span>
      )}
    </>
  );
}

function TierRequirement({ tier, balance }: { tier: VipTier; balance: bigint | undefined }) {
  const missing = balance !== undefined && tier.minGt > balance ? tier.minGt - balance : 0n;

  return (
    <>
      <span className="text-body-small font-medium text-typography-secondary">
        <Trans>GT required</Trans>
      </span>
      <span className="text-h2 font-medium text-typography-primary numbers">
        ≥{formatGt(tier.minGt, { decimals: 0 })}
      </span>
      {balance !== undefined && (
        <span className="text-body-small text-typography-secondary numbers">
          {missing > 0n ? <Trans>{formatGt(missing)} more to unlock</Trans> : <Trans>Already unlocked</Trans>}
        </span>
      )}
    </>
  );
}

// The VIP discount, the referral discount on top of it, and how the two combine.
function FeeDiscountTooltip({ tier }: { tier: VipTier }) {
  const vip = formatPercent(tier.feeDiscount);
  const referral = formatPercent(REFERRAL_FEE_DISCOUNT);
  const total = formatPercent(getCombinedFeeDiscount(tier.feeDiscount));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <StatsTooltipRow label={t`VIP ${tier.level} discount`} value={vip} showDollar={false} />
        <StatsTooltipRow label={t`Referral discount`} value={referral} showDollar={false} />
        <StatsTooltipRow label={t`Total with referral`} value={total} showDollar={false} />
      </div>
      <span>
        <Trans>The referral discount applies only when you trade with a referral code.</Trans>
      </span>
      <span className="numbers">
        1 − (1 − {vip}) × (1 − {referral}) = {total}
      </span>
    </div>
  );
}

function BenefitTile({
  value,
  isLoading,
  label,
  tooltip,
}: {
  value: string | undefined;
  isLoading: boolean;
  label: ReactNode;
  tooltip?: ReactNode;
}) {
  return (
    <div className="flex min-w-[148px] flex-col gap-2 rounded-8 bg-slate-800 px-16 py-12 max-md:min-w-0 max-md:grow">
      <span className="text-h3 font-medium text-typography-primary numbers">
        {value ?? (isLoading ? <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={56} /> : "–")}
      </span>
      <span className="text-body-small text-typography-secondary">
        {tooltip ? <TooltipWithPortal variant="iconStroke" handle={label} content={tooltip} /> : label}
      </span>
    </div>
  );
}
