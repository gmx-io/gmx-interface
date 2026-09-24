import { useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export function useShowSupportChat() {
  const { connected } = useWallet();
  const shouldOpenChatOnBoot = useRef(
    new URLSearchParams(window.location.search).get('openChat') === '1'
  ).current;

  useEffect(() => {
    if (!shouldOpenChatOnBoot) return;

    const url = new URL(window.location.href);
    url.searchParams.delete('openChat');
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`
    );
  }, [shouldOpenChatOnBoot]);

  return {
    shouldShowSupportChat: connected,
    shouldOpenChatOnBoot: connected && shouldOpenChatOnBoot,
  };
}
