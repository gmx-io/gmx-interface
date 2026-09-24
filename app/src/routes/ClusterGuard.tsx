import {
  selectCluster,
  selectSyncCluster,
} from '@/selectors/network/baseSelectors';
import {
  selectCustomRpcUrl,
  selectRpcEndpointType,
  selectSetCurrentRpcUrl,
} from '@/selectors/setting/baseSelectors';
import { toValidCluster } from '@/utils/lib/network';
import { resolveEffectiveRpcUrl } from '@/utils/rpc/resolveEffectiveRpcUrl';
import { useAppStore } from '@/zustand/useAppStore';
import { useEffect } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';

const RPC_REPROBE_INTERVAL_MS = 10000;

export default function ClusterGuard() {
  const [searchParams] = useSearchParams();

  const currentCluster = useAppStore(selectCluster);
  const syncCluster = useAppStore(selectSyncCluster);

  const rpcEndpointType = useAppStore(selectRpcEndpointType);
  const customRpcUrl = useAppStore(selectCustomRpcUrl);
  const setCurrentRpcUrl = useAppStore(selectSetCurrentRpcUrl);

  useEffect(() => {
    let cancelled = false;

    const cluster = searchParams.get('cluster');
    if (!cluster) {
      const newUrl = `${window.location.pathname}`;
      window.history.replaceState({}, '', newUrl);
      syncCluster(currentCluster);
    } else {
      const validCluster = toValidCluster(cluster);
      if (validCluster !== cluster) {
        const newUrl = `${window.location.pathname}`;
        window.history.replaceState({}, '', newUrl);
      }
      syncCluster(validCluster);
    }
  }, [currentCluster, syncCluster, searchParams]);

  useEffect(() => {
    let cancelled = false;

    const updateRpcUrl = async () => {
      const effectiveUrl = await resolveEffectiveRpcUrl(
        rpcEndpointType,
        customRpcUrl
      );
      if (!cancelled) {
        setCurrentRpcUrl(effectiveUrl);
      }
    };

    void updateRpcUrl();

    const shouldReprobe =
      rpcEndpointType === 'custom' && customRpcUrl.trim() !== '';
    const intervalId = shouldReprobe
      ? setInterval(() => void updateRpcUrl(), RPC_REPROBE_INTERVAL_MS)
      : null;

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [rpcEndpointType, customRpcUrl, setCurrentRpcUrl]);

  return <Outlet />;
};
