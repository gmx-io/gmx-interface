import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { usePositions } from '@/hooks/fetchHooks';
import { useAppStore } from '@/zustand/useAppStore';
import { useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useWallet } from '@solana/wallet-adapter-react';
import isEqual from 'lodash/isEqual';
import { Position } from '@/selectors/position/types';

export const usePositionsData = ({
  updatePosition = false,
  setUpdatePosition = () => {},
}: {
  updatePosition?: boolean;
  setUpdatePosition?: (value: boolean) => void;
}) => {
  const { connected } = useWallet();
  const store = GMX_SOLANA_STORE_ADDRESS;
  const { markets, setPositions, setIsPositionLoading } = useAppStore(
    useShallow((state) => ({
      markets: state.markets.markets,
      setPositions: state.positionState.setPositions,
      setIsPositionLoading: state.positionState.setIsPositionsLoading,
    }))
  );

  const prevConnectedRef = useRef(connected);
  const prevLoadingRef = useRef(false);
  const prevPositionsRef = useRef<Record<string, Position>>({});
  const refreshTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Only fetch positions when wallet is connected
  const { positions, isLoading, refresh } = usePositions(
    connected ? store : undefined,
    connected ? markets : [],
    prevPositionsRef.current,
    updatePosition
  );
  const positionsByAddress = useMemo<Record<string, Position>>(
    () =>
      Object.fromEntries(
        (positions as Position[]).map((position) => [
          position.address.toBase58(),
          position,
        ])
      ),
    [positions]
  );

  // Handle connection state changes
  useEffect(() => {
    const prevConnected = prevConnectedRef.current;
    prevConnectedRef.current = connected;

    if (!connected && prevConnected) {
      setPositions({});
      setIsPositionLoading(false);
    }
  }, [connected, setPositions, setIsPositionLoading]);

  // Handle loading state changes
  useEffect(() => {
    if (prevLoadingRef.current !== isLoading) {
      prevLoadingRef.current = isLoading;
      setIsPositionLoading(isLoading);
    }
  }, [isLoading, setIsPositionLoading]);

  // Handle position data updates
  useEffect(() => {
    if (
      !isLoading &&
      connected &&
      !isEqual(positionsByAddress, prevPositionsRef.current)
    ) {
      // console.log('positions list data:', positionsByAddress);
      prevPositionsRef.current = positionsByAddress;
      setPositions(positionsByAddress);
    }
  }, [connected, isLoading, positionsByAddress, setPositions]);

  useEffect(() => {
    // console.log('updatePosition update', updatePosition, new Date().getTime())
    if (updatePosition) {
      void refresh();
      refreshTimersRef.current.forEach(clearTimeout);
      refreshTimersRef.current = [
        setTimeout(() => void refresh(), 3000),
        setTimeout(() => void refresh(), 8000),
      ];
      setUpdatePosition(false);
    }
  }, [refresh, setUpdatePosition, updatePosition]);

  useEffect(() => {
    return () => {
      refreshTimersRef.current.forEach(clearTimeout);
      refreshTimersRef.current = [];
    };
  }, []);
};
