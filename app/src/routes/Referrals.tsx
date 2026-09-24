import './Referrals.scss';
import {
  getGmw35Enabled,
  getGmw404Enabled,
} from '@/config/featureFlagEnable';
import { t } from '@lingui/macro';
import ReferralsCard from '@/components/Referrals/ReferralsCard/ReferralsCard';
import ReferralsDirections from '@/components/Referrals/Directions/Directions';
import ReferralSetCard from '@/components/Referrals/Referral/ReferralSetCard';
import Header from '@/components/NewHeader/Header';
import { useGtGlobalDetails, useReferralDetails } from '@/hooks/fetchHooks';
import { useAppStore } from '@/zustand/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useEffect, useRef, useState } from 'react';
import { useMedia } from 'react-use';
import { useWallet } from '@solana/wallet-adapter-react';
import { useLingui } from '@lingui/react';
import { BlockUsIpModal } from '@/components/BlockUsIpModal';
import { Navigate, useSearchParams } from 'react-router-dom';


export default function Referrals() {
  const { i18n } = useLingui();
  const [searchParams] = useSearchParams();
  const legacyReferralCode = (searchParams.get('ref') ?? '').trim();
  const isMobile = useMedia('(max-width: 870px)');
  const isScreen1024 = useMedia('(max-width: 1024px)');
  const { publicKey } = useWallet();
  const userKey = publicKey?.toBase58() ?? null;
  const prevUserKeyRef = useRef<string | null>(null);
  const [isDataReady, setIsDataReady] = useState(true);
  useEffect(() => {
    if (prevUserKeyRef.current !== null && prevUserKeyRef.current !== userKey) {
      console.log(
        '[Referrals] userKey changed from',
        prevUserKeyRef.current,
        'to',
        userKey
      );
      setIsDataReady(false);
    }
    prevUserKeyRef.current = userKey;
  }, [userKey]);

  const useFetchReferralDetails = (currentUserKey: string | null) => {
    const { setReferralDetails, setIsLoading } = useAppStore(
      useShallow((state) => ({
        setReferralDetails: state.referralState.setDetails,
        setIsLoading: state.referralState.setIsLoading,
      }))
    );

    const { referralDetails, isLoading } = useReferralDetails(currentUserKey);
    const requestedUserKeyRef = useRef(currentUserKey);
    useEffect(() => {
      requestedUserKeyRef.current = currentUserKey;
      if (prevUserKeyRef.current !== null) {
        setIsLoading(true);
        setReferralDetails(null);
      }
    }, [currentUserKey, setIsLoading, setReferralDetails]);

    useEffect(() => {
      if (!isLoading) {
        if (requestedUserKeyRef.current !== currentUserKey) {
          return;
        }
        setIsLoading(false);
        if (currentUserKey) {
          setReferralDetails(referralDetails ?? null);
        } else {
          setReferralDetails(null);
        }
        setIsDataReady(true);
      }
    }, [currentUserKey, isLoading, referralDetails, setIsLoading, setReferralDetails]);
  };

  const useFetchGtGlobalDetails = () => {
    const { setGlobalDetails, setIsLoading } = useAppStore(
      useShallow((state) => ({
        setGlobalDetails: state.gtState.setGlobalDetails,
        setIsLoading: state.gtState.setIsLoading,
      }))
    );

    const { gtGlobalDetails, isLoading } = useGtGlobalDetails();

    useEffect(() => {
      if (!isLoading) {
        setIsLoading(false);
        setGlobalDetails(gtGlobalDetails ?? null);
      }
    }, [isLoading, gtGlobalDetails, setIsLoading, setGlobalDetails]);
  };

  useFetchGtGlobalDetails();
  useFetchReferralDetails(userKey);

  if (legacyReferralCode && getGmw35Enabled()) {
    return (
      <Navigate
        to="/trade"
        replace
        state={{ code: legacyReferralCode }}
      />
    );
  }

  if (!isDataReady && userKey) {
    return (
      <div className="referrals px-[0.8rem] pb-[2rem]">
        <Header isReferral={true} />
        <div className="m-[auto] max-w-[172.8rem]">
          <p className="referrals-title mt-[1.6rem] pl-[2rem] text-[4rem] font-[500]">{t`Referrals`}</p>
          <p className="referrals-des mb-[2rem] mt-[0.8rem] flex flex-wrap items-center gap-[0.6rem] pl-[2rem] text-[1.4rem] font-[500] text-[#A3A3A3]">
            {t`Loading...`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="referrals"
      key={`${i18n.locale}-${userKey}`}
    >
      <Header isReferral={true} />
      <BlockUsIpModal />
      {/* <Header isGt={true} /> */}
      {/* {mobile && (
        <div className="sonala-data mt-[1.2rem] ml-[0.8rem]">
          <img src={solana} alt="Solana Logo" width={20} height={20} />
          <span>Solana Data</span>
        </div>
      )} */}
      <div className="m-[auto] max-w-[172.8rem]  px-[0.8rem]">
        <p className={`referrals-title text-[3.2rem] font-[500] ${isMobile || isScreen1024 ? 'mt-[2rem]' : ''}`}>{t`Referrals`}</p>
        <p className={`referrals-des mb-[2rem] mt-[0.8rem]  flex flex-wrap  items-center gap-[0.6rem] font-[500] text-[#A3A3A3] ${isMobile ? 'text-[1.2rem]' : 'text-[1.4rem]'}`}>
          {t`Get fee discounts and earn GT rewards through the GMTrade referral program.`}
        </p>
        <div className="referrals-content flex  flex-wrap gap-[0.8rem]">
          <ReferralsCard key={userKey} />
          <ReferralsDirections />
        </div>
      </div>
      {getGmw404Enabled() && <ReferralSetCard />}
    </div>
  );
}
