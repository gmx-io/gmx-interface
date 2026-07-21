import { Trans } from "@lingui/macro";

import Button from "components/Button/Button";
import { ProgressRow } from "components/ProgressRow/ProgressRow";

import CloseIcon from "img/ic_close.svg?react";
import EarnIcon from "img/ic_earn.svg?react";
import VestIcon from "img/ic_increaselimit_16.svg?react";
import InfoIcon from "img/ic_info_circle_stroke.svg?react";
import ArrowRightIcon from "img/ic_mid_chevron.svg?react";

function AmountHeader({ step, label, unit }: { step: number; label: React.ReactNode; unit: React.ReactNode }) {
  return (
    <div className="flex h-[105px] w-full flex-col items-start p-8">
      <div className="flex h-24 items-center gap-8">
        <span className="flex size-20 items-center justify-center rounded-full bg-blue-300/20 px-4 py-2 text-12 font-medium text-blue-300 numbers">
          {step}
        </span>
        <span className="text-12 font-medium text-typography-secondary">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="leading-none text-[40px] font-medium tracking-[-0.016em] text-typography-primary numbers">
          —
        </span>
        <span className="pb-6 text-16 font-medium text-typography-secondary">{unit}</span>
      </div>
      <span className="text-12 font-medium text-typography-disabled numbers">= —</span>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex w-40 shrink-0 items-center justify-center rounded-8 bg-slate-900/90 max-xl:h-40 max-xl:w-full">
      <ArrowRightIcon className="size-20 text-typography-secondary max-xl:rotate-90" />
    </div>
  );
}

export function RewardsVestingFlow() {
  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)_40px_minmax(0,1fr)] items-stretch gap-8 max-xl:grid-cols-1"
      data-testid="rewards-vesting-flow"
    >
      <section className="flex min-h-[265px] min-w-0 flex-col gap-4 rounded-8 bg-slate-900 p-12">
        <AmountHeader step={1} label={<Trans>Available esGMX</Trans>} unit="esGMX" />
        <div className="flex h-[132px] w-full flex-col gap-12 rounded-12 border-1/2 border-slate-600 bg-slate-950/50 p-12 backdrop-blur-[50px]">
          <div className="flex grow items-center gap-8 px-4">
            <InfoIcon className="size-20 shrink-0 text-blue-300" />
            <div className="flex min-w-0 flex-col gap-2 text-left">
              <div className="text-13 font-medium text-blue-300">
                <Trans>Vesting turns esGMX into GMX over 12 months.</Trans>
              </div>
              <p className="text-13 text-typography-secondary">
                <Trans>Your GMX collateral stays locked until it's done.</Trans>
              </p>
            </div>
          </div>
          <Button variant="primary" size="medium" className="w-full shrink-0" disabled>
            <Trans>Coming soon</Trans>
            <VestIcon className="size-20" />
          </Button>
        </div>
      </section>

      <FlowArrow />

      <section className="flex min-h-[265px] min-w-0 flex-col gap-4 rounded-8 bg-slate-900 p-12">
        <AmountHeader step={2} label={<Trans>Vesting esGMX</Trans>} unit={<Trans>esGMX left</Trans>} />
        <div className="flex h-[132px] w-full flex-col gap-12 rounded-12 border-1/2 border-slate-600 bg-slate-950/50 p-12 backdrop-blur-[50px]">
          <div className="flex grow flex-col gap-4 px-4">
            <div className="flex items-center justify-between gap-8 text-14">
              <span className="font-medium text-typography-secondary">
                <Trans>Collateral locked</Trans>
              </span>
              <span className="text-typography-primary numbers">—</span>
            </div>
            <ProgressRow label={<Trans>Status</Trans>} value="—" currentValue={undefined} totalValue={undefined} />
          </div>
          <Button variant="secondary" size="medium" className="w-full shrink-0" disabled>
            <Trans>Coming soon</Trans>
            <CloseIcon className="size-20 p-5" />
          </Button>
        </div>
      </section>

      <FlowArrow />

      <section className="flex min-h-[265px] min-w-0 flex-col gap-4 rounded-8 bg-slate-900 p-12">
        <AmountHeader step={3} label={<Trans>Rewards</Trans>} unit={<Trans>GMX Claimable</Trans>} />
        <div className="flex h-[132px] w-full flex-col gap-12 rounded-12 border-1/2 border-slate-600 bg-slate-950/50 p-12 backdrop-blur-[50px]">
          <div className="flex grow flex-col px-4">
            <div className="flex h-24 items-center justify-between gap-8 text-14">
              <span className="font-medium text-typography-secondary">
                <Trans>Wallet</Trans>
              </span>
              <span className="text-typography-primary numbers">—</span>
            </div>
            <div className="flex h-24 items-center justify-between gap-8 text-14">
              <span className="font-medium text-typography-secondary">
                <Trans>Staked</Trans>
              </span>
              <span className="text-typography-primary numbers">—</span>
            </div>
          </div>
          <Button variant="primary" size="medium" className="w-full shrink-0" disabled>
            <Trans>Coming soon</Trans>
            <EarnIcon className="size-20" />
          </Button>
        </div>
      </section>
    </div>
  );
}
