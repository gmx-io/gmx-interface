import { setAppCrashSnapshot } from '@/components/ErrorBoundary/appCrashSnapshot';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function AppCrashSnapshotSync() {
  const location = useLocation();
  const { publicKey } = useWallet();
  const route = `${location.pathname}${location.search}${location.hash}`;
  const walletAddress = publicKey?.toBase58() ?? null;

  useEffect(() => {
    setAppCrashSnapshot({ route, walletAddress });
  }, [route, walletAddress]);

  return null;
}
