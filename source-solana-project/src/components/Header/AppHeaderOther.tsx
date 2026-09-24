import './Header.scss';
import { useAppStore } from '@/zustand/useAppStore';
import { Trans } from '@lingui/macro';
import Settings from '@/img/header/Settings.svg?react';
import IconDocs from '@/img/header/docs.svg?react';
import IconLanguage from '@/img/header/language.svg?react';
import IconCollapse from '@/img/header/collapse.svg?react';
import SupportChatIcon from '@/img/support-chat.svg?react';
import { useMedia } from 'react-use';
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import SettingsModal from '@/components/TradeBoxNew/components/childs/Settings';
import { DEFAULT_DOCS_ENV } from '@/config/env';
import { show } from '@intercom/messenger-js-sdk';
import { useShowSupportChat } from '@/domain/supportChat/useShowSupportChat';
import { useSupportChatUnreadCount } from '@/domain/supportChat/useSupportChatUnreadCount';
interface Props {
  small?: boolean;
  minimal?: boolean;
}

export function AppHeaderOther({ small, minimal }: Props) {
  const settings = useAppStore((state) => state.settings);
  const { isCollapsed, setIsCollapsed, setIsOpenLanguage } = settings;
  const { connected } = useWallet();
  const { shouldShowSupportChat } = useShowSupportChat();
  const [supportChatUnreadCount] = useSupportChatUnreadCount();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };
  const isMobile = useMedia('(max-width: 1024px)');
  const handleDocsClick = () => {
    // window.open('https://docs.gmxsol.io/', '_blank', 'noopener noreferrer');
    window.open(DEFAULT_DOCS_ENV, '_blank', 'noopener noreferrer');
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  const handleLanguageClick = () => {
    setIsOpenLanguage(true);
  };

  const handleSupportClick = () => {
    console.log('[support] Support clicked', {
      connected,
      hasGlobalIntercom: typeof window.Intercom === 'function',
      hasIntercomFrame: Boolean(
        document.querySelector('.intercom-lightweight-app, .intercom-app')
      ),
    });

    try {
      show();
      console.log('[support] show call completed');
      window.setTimeout(() => {
        console.log('[support] state after show', {
          hasGlobalIntercom: typeof window.Intercom === 'function',
          hasIntercomFrame: Boolean(
            document.querySelector('.intercom-lightweight-app, .intercom-app')
          ),
          intercomIframeCount: document.querySelectorAll(
            'iframe[name^="intercom"], iframe[src*="intercom"]'
          ).length,
        });
      }, 1000);
    } catch (error) {
      console.error('[support] show call failed', error);
    }
  };

  return (
    <div className="App-header-user" style={{ paddingRight: '0.8rem' }}>
      {shouldShowSupportChat && (
        <div
          className="common App-header-user-docs cursor-pointer"
          onClick={handleSupportClick}
        >
          <span className="relative inline-flex shrink-0">
            <SupportChatIcon
              aria-hidden="true"
              focusable="false"
              fill="currentColor"
              style={{
                width: '22px',
                height: '22px',
                color: '#A3A3A3',
              }}
            />
            {isCollapsed && supportChatUnreadCount > 0 && (
              <span
                aria-label={`${supportChatUnreadCount} unread support messages`}
                className="absolute -right-8 -top-8 z-10 inline-flex h-16 min-w-16 items-center justify-center rounded-full bg-[#FA7B4E] px-3 text-[10px] font-medium leading-none text-white ring-2 ring-[#131313]"
              >
                {supportChatUnreadCount > 9 ? '9+' : supportChatUnreadCount}
              </span>
            )}
          </span>
          {isCollapsed && (
            <span className="text" style={{ fontWeight: '500' }}>
              <Trans>Support</Trans>
            </span>
          )}
          {!isCollapsed && (
            <div className="col flex" style={{ fontWeight: '500' }}>
              <Trans>Support</Trans>
            </div>
          )}
          {!isCollapsed && supportChatUnreadCount > 0 && (
            <span
              aria-label={`${supportChatUnreadCount} unread support messages`}
              className="ml-6 inline-flex h-20 min-w-20 items-center justify-center rounded-full bg-[#FA7B4E] px-4 text-[11px] font-medium text-white"
            >
              {supportChatUnreadCount > 9 ? '9+' : supportChatUnreadCount}
            </span>
          )}
        </div>
      )}
      <div className="common App-header-user-docs" onClick={handleDocsClick}>
        <IconDocs
          fill="currentColor"
          style={{
            width: '24px',
            height: '24px',
            color: '#A3A3A3',
          }}
        />
        {isCollapsed && (
          <span className="text" style={{fontWeight:'500'}}>
            <Trans>Docs</Trans>
          </span>
        )}
        {!isCollapsed && (
          <div className="col flex cursor-pointer" style={{fontWeight:'500'}}>
            <Trans>Docs</Trans>
          </div>
        )}
      </div>
      <div className="common App-header-user-language" onClick={handleLanguageClick}>
        {isCollapsed && (
          <span className="text" style={{fontWeight:'500'}}>
            <Trans>Language</Trans>
          </span>
        )}
        <IconLanguage
          fill="currentColor"
          style={{
            width: '24px',
            height: '24px',
            color: '#A3A3A3',
          }}
        />
        {!isCollapsed && (
          <>
            <button className="bg-dark-blue-500 inline-flex cursor-pointer items-center justify-center border-none p-0 text-[#A3A3A3] hover:text-white" style={{fontWeight:'500'}}>
              <Trans>Language</Trans>
            </button>
          </>
        )}
      </div>
      {!isMobile && (
        <div
          className="common App-header-user-setting"
          onClick={handleToggleCollapse}
        >
          <IconCollapse
            fill="currentColor"
            style={{
              width: '24px',
              height: '24px',
              color: '#A3A3A3',
            }}
          />
          {isCollapsed && (
            <span className="text" style={{fontWeight:'500'}}>
              <Trans>Expand</Trans>
            </span>
          )}
          {!isCollapsed && <Trans>Collapse</Trans>}
        </div>
      )}
      {isMobile && (
        <div className="common App-header-user-setting" onClick={handleSettingsClick} >
          <>
            <Settings
              fill="currentColor"
              style={{
                width: '24px',
                height: '24px',
                color: '#A3A3A3',
              }}
            />
            {!isCollapsed && <Trans>Settings</Trans>}
          </>
        </div>
      )}
      <SettingsModal isOpen={isSettingsOpen} onClose={handleCloseSettings} />
    </div>
  );
}
