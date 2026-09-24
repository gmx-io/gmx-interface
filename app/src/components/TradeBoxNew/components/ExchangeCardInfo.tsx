import { memo, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/zustand/useAppStore';
import { useReferralDetails } from '@/hooks/fetchHooks';
import ExecutionPanel from './childs/ExecutionPanel'
import {
  useGtGlobalDetails,
  useGtUserDetails,
} from '@/hooks/fetchHooks';

import { useWallet } from '@solana/wallet-adapter-react';

export default memo(function ExchangeCardInfo() {
    
    const { publicKey } = useWallet();
    const { setUserDetails } = useAppStore(
        useShallow((state) => ({
            setUserDetails: state.gtState.setUserDetails,
        }))
    );

    const { gtDetails } = useGtUserDetails();
    useEffect(() => {
        // console.log('gtDetails', gtDetails);
        setUserDetails(gtDetails ?? null);
    }, [gtDetails, setUserDetails]);

    const { setGlobalDetails } = useAppStore(
    useShallow((state) => ({
        setGlobalDetails: state.gtState.setGlobalDetails,
    }))
    );

    const { gtGlobalDetails } = useGtGlobalDetails();

    useEffect(() => {
        // console.log('gtGlobalDetails', gtGlobalDetails);
        setGlobalDetails(gtGlobalDetails ?? null);
    }, [gtGlobalDetails, setGlobalDetails]);

    const { setReferralDetails } = useAppStore(
        useShallow((state) => ({
            setReferralDetails: state.referralState.setDetails,
        }))
    );
    const { referralDetails } = useReferralDetails(publicKey?.toBase58());

    useEffect(() => {
        setReferralDetails(referralDetails ?? null);
    }, [referralDetails, setReferralDetails]);

    return (
        <div className="tradeBox-exchangeCardInfo">
            <ExecutionPanel />
        </div>
    )
})