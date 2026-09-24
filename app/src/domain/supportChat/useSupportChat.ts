import Intercom, {
  hide,
  hideNotifications,
  onUnreadCountChange,
  show,
  update,
} from '@intercom/messenger-js-sdk';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useMemo, useRef } from 'react';

import { useGenesisHash } from '@/hooks/fetchHooks/useGenesisHash';
import { useUserTotalVolume } from '@/hooks/statsHooks/useUserTotalVolume';
import { USD_DECIMALS } from '@/config/constants';
import { formatAmount } from '@/utils/legacy/format';

import { INTERCOM_APP_ID } from './constants';
import { useShowSupportChat } from './useShowSupportChat';
import { useSupportChatUnreadCount } from './useSupportChatUnreadCount';
import { getOrCreateSupportChatUserId, getSupportChatNetwork } from './utils';
import { tradingErrorTracker } from './tradingErrorTracker';

const INTERCOM_LOADER_ID = '_intercom_npm_loader';

function logIntercomLoaderState(stage: string) {
  const loader = document.getElementById(
    INTERCOM_LOADER_ID
  ) as HTMLScriptElement | null;
  const queuedCommands = (
    window.Intercom as (typeof window.Intercom & { q?: unknown[] }) | undefined
  )?.q;
  const resource = performance
    .getEntriesByType('resource')
    .find((entry) => entry.name.includes('widget.intercom.io'));

  console.log(`[support] loader state: ${stage}`, {
    pageOrigin: window.location.origin,
    loaderExists: Boolean(loader),
    loaderSrc: loader?.src,
    queuedCommandCount: queuedCommands?.length,
    isQueueHolder: Array.isArray(queuedCommands),
    resourceLoaded: Boolean(resource),
    resourceDuration: resource?.duration,
  });
}

export function useSupportChat() {
  const { publicKey, wallet, connected } = useWallet();
  const { shouldShowSupportChat, shouldOpenChatOnBoot } = useShowSupportChat();
  const genesisHash = useGenesisHash();
  const network = getSupportChatNetwork(genesisHash);
  const walletAddress = connected ? publicKey?.toBase58() : undefined;
  const walletProvider = connected ? wallet?.adapter.name : undefined;
  const { userVolumeData } = useUserTotalVolume(walletAddress);
  const [, setUnreadCount] = useSupportChatUnreadCount();
  const wasIntercomInitialized = useRef(false);

  useEffect(() => {
    tradingErrorTracker.setContext({
      walletAddress,
      walletProvider,
      network,
    });
  }, [walletAddress, walletProvider, network]);

  const userAttributes = useMemo(
    () => ({
      // Explicit values replace attributes retained by Intercom after disconnect.
      'Wallet Address': connected ? walletAddress ?? 'Unknown' : 'Not connected',
      'Wallet Provider': connected ? walletProvider ?? 'Unknown' : 'Not connected',
      'Wallet Connected': connected,
      'Active Network': network ?? 'Unknown',
      Environment: 'SOLANA',
      'Total Volume': !connected
        ? 0
        : userVolumeData.isLoading
          ? undefined
          : Number(formatAmount(userVolumeData.totalVolume, USD_DECIMALS, 2)),
    }),
    [
      connected,
      walletAddress,
      walletProvider,
      network,
      userVolumeData.isLoading,
      userVolumeData.totalVolume,
    ]
  );
  const lastSentUserAttributes = useRef<typeof userAttributes>();

  useEffect(() => {
    console.log('[support] visibility changed', {
      shouldShowSupportChat,
      shouldOpenChatOnBoot,
    });

    if (!shouldShowSupportChat) {
      console.log('[support] hide chat while wallet is disconnected');
      if (wasIntercomInitialized.current) {
        try {
          hide();
          hideNotifications(true);
        } catch (error) {
          console.error('[support] failed to hide Intercom', error);
        }
      }
      return;
    }

    const supportChatUserId = getOrCreateSupportChatUserId();
    const settings = {
      app_id: INTERCOM_APP_ID,
      alignment: 'left' as const,
      horizontal_padding: 20,
      vertical_padding: 20,
      hide_default_launcher: true,
      hide_notifications: false,
      user_id: supportChatUserId,
      theme_mode: 'dark' as const,
    };

    try {
      if (!wasIntercomInitialized.current) {
        console.log('[support] initialize Intercom', {
          appId: INTERCOM_APP_ID,
          hasUserId: Boolean(supportChatUserId),
        });
        Intercom(settings);
        wasIntercomInitialized.current = true;
      } else {
        hideNotifications(false);
      }

      console.log('[support] Intercom initialization call completed', {
        hasGlobalIntercom: typeof window.Intercom === 'function',
      });

      const loader = document.getElementById(
        INTERCOM_LOADER_ID
      ) as HTMLScriptElement | null;
      loader?.addEventListener('load', () => {
        console.log('[support] widget script loaded');
        logIntercomLoaderState('script load');
      });
      loader?.addEventListener('error', (event) => {
        console.error('[support] widget script failed to load', {
          src: loader.src,
          event,
        });
        logIntercomLoaderState('script error');
      });

      logIntercomLoaderState('after initialization');
      window.setTimeout(() => logIntercomLoaderState('after 3 seconds'), 3000);

      onUnreadCountChange((count: number) => {
        console.log('[support] unread count changed', { count });
        setUnreadCount(count);
      });

      if (shouldOpenChatOnBoot) {
        console.log('[support] open chat from deep link');
        show();
      }
    } catch (error) {
      console.error('[support] Intercom initialization failed', error);
    }
  }, [shouldOpenChatOnBoot, shouldShowSupportChat, setUnreadCount]);

  useEffect(() => {
    if (
      !shouldShowSupportChat ||
      lastSentUserAttributes.current === userAttributes
    ) {
      return;
    }

    try {
      update(userAttributes);
      lastSentUserAttributes.current = userAttributes;
      console.log('[support] user attributes updated', {
        walletAddress: userAttributes['Wallet Address'],
        walletProvider: userAttributes['Wallet Provider'],
        walletConnected: userAttributes['Wallet Connected'],
        activeNetwork: userAttributes['Active Network'],
      });
    } catch (error) {
      console.error('[support] user attributes update failed', error);
    }
  }, [shouldShowSupportChat, userAttributes]);
}
