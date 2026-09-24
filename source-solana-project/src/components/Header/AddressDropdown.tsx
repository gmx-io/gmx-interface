import './AddressDropdown.scss';

import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { generateAccountInfo } from '@/utils/index';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AccountModal from './AccountModal';
import { BN } from '@coral-xyz/anchor';
import { usePayerSwapList } from '@/components/TradeBoxNew/Hooks/usePayerSwapList';
import { useAppStore } from '@/zustand/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { getGmw404Enabled } from '@/config/featureFlagEnable';
import { useReferrerReferralCode } from '@/hooks/referralHooks';


type Props = {
  account: PublicKey;
  disconnectAccountAndCloseSettings: () => void;
  amount: BN;
  decimals: number;
};

function AddressDropdown({
  account,
  disconnectAccountAndCloseSettings,
  amount,
  decimals,
}: Props) {
  const { wallet } = useWallet();
  const { referralCode: prefetchedReferralCode } =
    useReferrerReferralCode(getGmw404Enabled() ? account : null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const location = useLocation();
  const shouldCloseAccountModal = Boolean(
    (location.state as { closeAccountModal?: boolean } | null)
      ?.closeAccountModal
  );

  useEffect(() => {
    if (getGmw404Enabled() && shouldCloseAccountModal) {
      setIsAccountModalOpen(false);
    }
  }, [shouldCloseAccountModal]);


  const formatDisplayAddress = (address: string) => {
    if (!address) return '';
    // if (isSmallMobile) {
    //   return `${address.slice(0, 2)}...${address.slice(-2)}`;
    // }
    // if (isMobile) {
    //   return `${address.slice(0, 3)}...${address.slice(-3)}`;
    // }
    return `${address.slice(0, 8)}...${address.slice(-3)}`;
  };

  return (
    <>
      <button
        className={`App-cta small transparent address-btn ${isAccountModalOpen && "address-custom-btn"}`}
        onClick={() => setIsAccountModalOpen(true)}
      >
        <div className="user-avatar">
          {wallet && (
            <img width={24} height={24} style={{ borderRadius: '50%' }} src={generateAccountInfo(account.toBase58()).avator} />
          )}
        </div>
        <span className="user-address">
          {formatDisplayAddress(account.toBase58())}
        </span>
        {/* <FiChevronDown
        className={`transition-transform ${open ? 'rotate-180' : ''}`}
      /> */}
      </button>
      {isAccountModalOpen && (
        <AccountModalWithPayerList
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
          amount={amount}
          decimals={decimals}
          initialDecodedReferralCode={
            getGmw404Enabled() ? (prefetchedReferralCode ?? '') : ''
          }
        />
      )}
    </>
  );
}

function AccountModalWithPayerList({
  isOpen,
  onClose,
  amount,
  decimals,
  initialDecodedReferralCode,
}: {
  isOpen: boolean;
  onClose: () => void;
  amount: BN;
  decimals: number;
  initialDecodedReferralCode: string;
}) {
  usePayerSwapList();
  const { payerSwapList } = useAppStore(
    useShallow((state) => state.payerSwapTokens)
  );

  return (
    <AccountModal
      isOpen={isOpen}
      onClose={onClose}
      amount={amount}
      decimals={decimals}
      payerSwapList={payerSwapList}
      initialDecodedReferralCode={initialDecodedReferralCode}
    />
  );
}

export default AddressDropdown;
