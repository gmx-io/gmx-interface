import * as React from 'react';
import { Trans } from '@lingui/macro';
import { useAppStore } from '@/zustand/useAppStore';
import {
  selectGtGlobalDetailsDecimals,
  selectGtGlobalDetailsGrowStepAmount,
  selectGtGlobalDetailsGrowSteps,
  selectGtGlobalDetailsTotalMintedAmount,
} from '@/selectors/gt/gtGlobalDetailsSelectors';
import { selectGtCycleRemainderAmount } from '@/selectors/gt/selectGtCycleRemainderAmount';
import { selectGtMintingCost } from '@/selectors/gt/selectGtMintingCost';
import { USD_DECIMALS } from '@/config/constants';
import { formatAmount, formatAmountWithoutHalfUp } from '@/utils/legacy/format';
import { useMedia } from 'react-use'
import './headerInfo.scss';

const HeaderInfo = () => {
  const gtDecimals = useAppStore(selectGtGlobalDetailsDecimals);
  const mintingCost = useAppStore(selectGtMintingCost);
  const totalGtMinted = useAppStore(selectGtGlobalDetailsTotalMintedAmount);
  const cycle = useAppStore(selectGtGlobalDetailsGrowSteps);
  const gtMintedCycle = useAppStore(selectGtCycleRemainderAmount);
  const gtTotalCycle = useAppStore(selectGtGlobalDetailsGrowStepAmount);
  const mintingCostText = `$${formatAmountWithoutHalfUp(mintingCost, USD_DECIMALS, 4, true)}`;

  const isMobile = useMedia('(max-width: 768px)');

  // Progress through the current minting cycle
  const progress = gtTotalCycle.isZero()
    ? 0
    : gtMintedCycle.muln(100).div(gtTotalCycle).toNumber();

  return isMobile ? (
    <div className="w-full bg-fill-surface-base flex flex-col items-center mb-[0.8rem] rounded-[0.8rem] gap-x-[4rem] p-[2rem]">
      <div className='flex flex-col gap-y-[0.8rem] w-full'>
        <p className='font-medium text-[16px]'><Trans>Cycle</Trans> {cycle.toString()}</p>
        <ProgressBar progress={progress}></ProgressBar>
        <div className='flex justify-between font-medium text-primary-tones-400'>
          <div><span className='text-white'>{formatAmount(gtMintedCycle, gtDecimals, 0, true)}</span> / {formatAmount(gtTotalCycle, gtDecimals, 0, true)} GT</div>
          <p>{progress}%</p>
        </div>
      </div>
      <div className='flex gap-x-[1rem] w-full mt-[4rem]'>
        {/* Current Minting Price Card */}
        <div className='px-[1.2rem] py-[1.8rem] flex flex-col gap-y-[0.4rem] rounded-[1.2rem] bg-fill-surface-elevated flex-1'>
          <p className='text-secondary font-medium text-[1.1rem]'><Trans>Current Minting Price</Trans></p>
          <p className='font-medium'>{mintingCostText}/GT</p>
        </div>
        {/* Total GT Minted Card */}
        <div className='px-[1.2rem] py-[1.8rem] flex flex-col gap-y-[0.4rem] rounded-[1.2rem] bg-fill-surface-elevated flex-1'>
          <p className='text-secondary font-medium text-[1.1rem]'><Trans>Total GT Minted</Trans></p>
          <p className='font-medium'>{formatAmount(totalGtMinted, gtDecimals, 0, true)}</p>
        </div>
      </div>
    </div>
  ) : (
    <div className="w-full bg-fill-surface-base h-[13.2rem] flex items-center mb-[0.8rem] rounded-[0.8rem] px-[2rem] gap-x-[4rem]">
      <div className='w-[370px] flex flex-col gap-y-[0.8rem]'>
        <p className='font-medium text-[16px]'><Trans>Cycle</Trans> {cycle.toString()}</p>
        <ProgressBar progress={progress}></ProgressBar>
        <div className='flex justify-between font-medium text-primary-tones-400'>
          <div>{formatAmount(gtMintedCycle, gtDecimals, 0, true)} / {formatAmount(gtTotalCycle, gtDecimals, 0, true)} GT</div>
          <p>{progress}%</p>
        </div>
      </div>
      <div className='flex flex-1 gap-x-[1.2rem]'>
        {/* Current Minting Price Card */}
        <div className='h-[7.7rem] p-[2rem] flex flex-col gap-y-[0.4rem] rounded-[1.2rem] bg-fill-surface-elevated flex-1'>
          <p className='text-secondary font-medium'><Trans>Current Minting Price</Trans></p>
          <p className='text-[16px] font-medium'>{mintingCostText}/GT</p>
        </div>
        {/* Total GT Minted Card */}
        <div className='h-[7.7rem] p-[2rem] flex flex-col gap-y-[0.4rem] rounded-[1.2rem] bg-fill-surface-elevated flex-1'>
          <p className='text-secondary font-medium'><Trans>Total GT Minted</Trans></p>
          <p className='text-[16px] font-medium'>{formatAmount(totalGtMinted, gtDecimals, 0, true)}</p>
        </div>
      </div>
    </div>
  );
};

type ProgressProps = {
  progress: number
}

const ProgressBar: React.FC<ProgressProps> = ({ progress }: ProgressProps) => {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="relative h-[1rem] w-full bg-primary-tones-600 rounded-[1rem]">
      {/* Filled progress bar with primary color */}
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-primary-300"
        style={{
          width: `${clampedProgress}%`,
          boxShadow: '0 0 16px 4px rgba(250, 123, 78, 0.30)'
        }}
      />

      {/* White circular indicator */}
      {clampedProgress > 0 && (
        <div
          className="progress-bar-tip absolute top-1/2 h-[1rem] w-[1rem] -translate-y-1/2 rounded-full"
          style={{
            // Offset scales from 0 to the dot's full width (1rem) so the dot
            // stays inside the track at both ends 
            // 0.55 rem = 1/2 indicator width
            left: `calc(${clampedProgress}% - 0.55rem)`,
            background: 'linear-gradient(0deg, #FFDED2 16.9%, #FFBBA0 69.42%)',
          }}
        />
      )}
    </div>
  )
}

export default HeaderInfo;
