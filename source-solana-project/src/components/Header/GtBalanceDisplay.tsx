import './Header.scss';

import { selectGtUserDetailsAmount } from '@/selectors/gt/gtUserDetailsSelectors';
import { formatAmount } from '@/utils/legacy/format';
import { useAppStore } from '@/zustand/useAppStore';
import { useWallet } from '@solana/wallet-adapter-react';
import icon_gmx_solana from '@/img/logo_gmx_solana_24.svg';
import { useMedia } from 'react-use';
import { useNavigate } from 'react-router-dom';
import { getGmw431Enabled } from '@/config/featureFlagEnable';
import { useGtGlobalDetails } from '@/hooks/fetchHooks/useGtGlobalDetails';
import { BN } from '@coral-xyz/anchor';

export function GtBalanceDisplay({
  amount,
  decimals,
}: {
  amount: BN;
  decimals: number;
}) {
  const { connected } = useWallet();
  const isMobile = useMedia('(max-width: 768px)');
  const navigate = useNavigate();

  if (!connected) return null;

  return (
    <div className="rounded-8 header-button-container bg-[#1F1F1F]">
      <button
        className="App-cta small transparent address-btn"
        onClick={() => navigate(getGmw431Enabled() ? '/gt/my' : '/gt')}
        style={{
          display: 'inline-flex',
          flexWrap: 'nowrap',
          alignItems: 'center',
          height: '100%',
        }}
      >
        {/* {!isMobile && (
          <img
            className="gt-icon"
            src={icon_gmx_solana}
            alt="GT Logo"
            width={24}
            height={24}
          />
        )} */}
        <div className="gt-balance" style={{ display: 'flex' }}>
          <span
            className="gt-amount"
            style={{
              // background: '#323232',
              borderRadius: '0.4rem',
              color: '#fff',
              fontWeight: '500',
              fontSize: isMobile ? '1.12rem' : '1.4rem',
              // padding: '0.4rem 0.8rem',
              // display: 'inline-block',
              paddingLeft: isMobile ? '' : '0.8rem',
              whiteSpace: 'nowrap',
            }}
          >
            {formatAmount(amount, decimals, 2, true, true)} GT
          </span>
        </div>
      </button>
    </div>
  );
}
