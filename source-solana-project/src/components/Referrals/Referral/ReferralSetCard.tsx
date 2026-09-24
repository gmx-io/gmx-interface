import * as React from 'react'
import { useAppStore } from '@/zustand/useAppStore';
import {
  selectReferrer,
  selectHasReferrer,
  selectReferralIsLoading,
} from '@/selectors/referral/baseSelectors';
import CloseIcon from '@/img/header/close.svg?react';
import RightArrow from '@/img/ArrowRight.svg?react'
import referralSetIcon from '@/img/referrals/referral-set-icon.png';
import Button from '@/components/Common/Button/Button';
import { Trans } from '@lingui/macro';
import { selectOpenReferralModal } from '@/selectors/referral/baseSelectors';
import { useMedia } from 'react-use';


const ReferralSetCard = () => {
  const [showSetReferral, setShowSetReferral] = React.useState(true)
  const referrer = useAppStore(selectReferrer);
  const hasReferrer = useAppStore(selectHasReferrer);
  const isReferralLoading = useAppStore(selectReferralIsLoading);
  const openReferralModal = useAppStore(selectOpenReferralModal);
  const isMobile = useMedia('(max-width: 768px)');

  if (isReferralLoading || hasReferrer) {
    return null;
  }

  const handleSetReferrer = () => {
    if (!referrer) {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = (urlParams.get('ref') ?? '').trim();
      if (refCode) {
        sessionStorage.setItem('pending_referral_code', refCode);
      }
    }
    openReferralModal();
  };

  const cardContent = (
    <>
      <div className='flex justify-end py-[4px]'>
        <CloseIcon
          aria-label="close"
          className="cursor-pointer transition-[filter] hover:brightness-0 hover:invert"
          style={{ maxWidth: 'none', width: '20px', height: '20px' }}
          onClick={() => setShowSetReferral(false)}
        />
      </div>
      <img className='mx-auto h-[194px] w-[194px]' src={referralSetIcon} alt="" />
      <p className='mt-[8px] text-center text-[16px] font-medium leading-[125%]'>
        <Trans>Get a permanent 10% fee discount.</Trans>
      </p>
      <Button
        className='group mt-[32px] flex w-full items-center justify-center !rounded-[8px] text-[13px] font-semibold'
        variant="primary"
        type="button"
        onClick={handleSetReferrer}
      >
        <Trans>Set your referrer</Trans>
        <RightArrow className='ml-[4px] transition-[margin] group-hover:ml-[8px]' />
      </Button>
    </>
  );

  return showSetReferral && !isMobile ? (
    <div
      style={{
        background:
          'radial-gradient(160.2% 162.98% at 12.14% -107.79%, rgba(250, 123, 78, 0.70) 0%, rgba(250, 123, 78, 0.00) 100%), #181818',
      }}
      className='referral-set-card absolute bottom-[40px] right-[20px] w-[350px] rounded-[8px] border-[0.5px] border-stroke-primary p-[20px]'
    >
      {cardContent}
    </div>
  ) : showSetReferral ? (
    <div
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      className='fixed inset-0 z-[1000] flex items-end justify-center overflow-hidden'
      onClick={() => setShowSetReferral(false)}
    >
      <div
        style={{
          background:
            'radial-gradient(160.2% 162.98% at 12.14% -107.79%, rgba(250, 123, 78, 0.70) 0%, rgba(250, 123, 78, 0.00) 100%), #181818',
        }}
        className='referral-set-card w-full max-w-none rounded-t-[8px] border-x-[0.5px] border-t-[0.5px] border-b-0 border-stroke-primary p-[2rem]'
        onClick={(event) => event.stopPropagation()}
      >
        {cardContent}
      </div>
    </div>
  ) : null
}

export default ReferralSetCard
