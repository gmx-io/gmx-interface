import { useCurrentRpcUrl } from '@/hooks/utilsHooks/useCurrentRpcUrl';
import { selectRpcEndpointType } from '@/selectors/setting/baseSelectors';
import { shouldAutoConnectWallet } from '@/zustand/slices/settingsSlice';
import { useAppStore } from '@/zustand/useAppStore';
import { AnchorProvider } from '@coral-xyz/anchor';
import {
  ConnectionProvider,
  useAnchorWallet,
  useConnection,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { ReactNode, useMemo } from 'react';

import { AnchorStateContext } from '.';
import { makeNullWalletProvider } from './utils';

function Inner({ children }: { children: ReactNode }) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const value = useMemo(() => {
    const provider = wallet
      ? new AnchorProvider(connection, wallet)
      : makeNullWalletProvider(connection);
    const active = wallet ? true : false;
    return {
      connection,
      provider,
      active,
      owner: wallet?.publicKey,
    };
  }, [connection, wallet]);
  return (
    <AnchorStateContext.Provider value={value}>
      {children}
    </AnchorStateContext.Provider>
  );
}

export function AnchorStateProvider({ children }: { children: ReactNode }) {
  // Get the current RPC URL using our custom hook
  const currentRpcUrl = useCurrentRpcUrl();
  const rpcEndpointType = useAppStore(selectRpcEndpointType);
  const autoConnect = shouldAutoConnectWallet(rpcEndpointType);

  // useEffect(() => {
  //   console.log(`Using endpoint: ${currentRpcUrl}`);
  // }, [currentRpcUrl]);

  return (
    <ConnectionProvider endpoint={currentRpcUrl}>
      <WalletProvider
        wallets={[]}
        autoConnect={autoConnect}
        onError={(e) => console.error('wallet error:', e)}
      >
        <WalletModalProvider>
          <Inner>{children}</Inner>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
