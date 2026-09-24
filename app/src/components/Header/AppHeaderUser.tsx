import './Header.scss';
import '@solana/wallet-adapter-react-ui/styles.css';

import AddressDropdown from '@/components/Header/AddressDropdown';
import ConnectWalletButton from '@/components/Header/ConnectWalletButton';
import { useOpenConnectModal } from '@/contexts/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useState } from 'react';
import { useMedia } from 'react-use';
import classNames from 'classnames';
import Settings from '@/components/TradeBoxNew/assets/Settings.svg';
import SettingsComponent from '@/components/TradeBoxNew/components/childs/Settings';
import { GtBalanceDisplay } from './GtBalanceDisplay';
import NetworkSelector from './NetworkSelector/NetworkSelector';
import Burger from '@/img/Burger.svg';
import { useAppStore } from '@/zustand/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { selectGtUserDetailsAmount } from '@/selectors/gt/gtUserDetailsSelectors';
import { useGtGlobalDetails } from '@/hooks/fetchHooks/useGtGlobalDetails';
import { getGmw460Enabled } from '@/config/featureFlagEnable';

interface Props {
  small?: boolean;
  minimal?: boolean;
}

export function AppHeaderUser({ small, minimal }: Props) {
  const isScreen1280 = useMedia('(max-width: 1280px)');
  const isScreen1024 = useMedia('(max-width: 1024px)');
  const isMobile = useMedia('(max-width: 768px)');
  const wallet = useWallet();
  const { connected, connecting, disconnecting, publicKey } = wallet;
  const openConnectModal = useOpenConnectModal();
  const disconnectAccountAndCloseSettings = useCallback(() => {
    void wallet.disconnect();
  }, [wallet]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const { setIsRightNavigationOpen } = useAppStore(
    useShallow((state) => ({
      setIsRightNavigationOpen: state.settings.setIsRightNavigationOpen,
    }))
  );
  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  const handleLeftNavigationClick = () => {
    setIsRightNavigationOpen(true);
  };

  return (
    <div className="flex gap-8">
      <>
        {!minimal && (
          <>
            {connected && publicKey ? (
              <ConnectedHeaderAccount
                isScreen1280={isScreen1280}
                publicKey={publicKey}
                disconnectAccountAndCloseSettings={
                  disconnectAccountAndCloseSettings
                }
              />
            ) : (
              <>
                <ConnectWalletButton
                  small={small}
                  onConnect={openConnectModal}
                  onCancel={disconnectAccountAndCloseSettings}
                  connecting={connecting}
                  disconnecting={disconnecting}
                />
              </>
            )}
          </>
        )}
        {getGmw460Enabled() && <NetworkSelector />}
        {/* <div className="rounded-8 flex items-center justify-center bg-[#1F1F1F] px-10">
          <img src={AlarmIcon} alt="alarm" />
        </div> */}
        {/* <div className="setting">
          <img
            src={Settings}
            alt="settings"
            onClick={handleSettingsClick}
          />
        </div> */}
        {isScreen1024 && (
          <div className="setting">
            <img
              src={Burger}
              alt="burger"
              onClick={handleLeftNavigationClick}
            />
          </div>
        )}

        {/* <div className="App-header-user-language">
          <LanguageSelector />
        </div>
        <div className="App-header-user-setting">
          <SettingSelector />
        </div> */}
        {isSettingsOpen && (
          <SettingsComponent
            isOpen={isSettingsOpen}
            onClose={handleCloseSettings}
          />
        )}
      </>
    </div>
  );
}

function ConnectedHeaderAccount({
  isScreen1280,
  publicKey,
  disconnectAccountAndCloseSettings,
}: {
  isScreen1280: boolean;
  publicKey: NonNullable<ReturnType<typeof useWallet>['publicKey']>;
  disconnectAccountAndCloseSettings: () => void;
}) {
  const userAmount = useAppStore(selectGtUserDetailsAmount);
  const { gtGlobalDetails } = useGtGlobalDetails();

  return (
    <>
      <GtBalanceDisplay
        amount={userAmount}
        decimals={gtGlobalDetails?.decimals}
      />
      <div
        className={classNames('rounded-8 bg-[#1F1F1F] header-button-container', {
          'w-auto': isScreen1280,
        })}
      >
        {/* style={{minWidth: '18.5rem'}} */}
        <AddressDropdown
          account={publicKey}
          disconnectAccountAndCloseSettings={disconnectAccountAndCloseSettings}
          amount={userAmount}
          decimals={gtGlobalDetails?.decimals}
        />
      </div>
    </>
  );
}
