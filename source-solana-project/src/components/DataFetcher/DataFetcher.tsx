import {
  getGmw301Enabled,
  getGmw300Enabled,
  getGmw299Enabled,
  getGmw391Enabled,
  getGmw395Enabled,
} from '@/config/featureFlagEnable';
import useSocketStore, {
  MAIN_SOCKET_TICKER_TIMEOUT_MS,
} from '@/zustand/socketStore';
import usePositionSocketStore from '@/zustand/positionSocketStore';
import { useAppStore } from '@/zustand/useAppStore';
import { useEffect, useState, useRef, useMemo } from 'react';
import { findPositionPDA } from 'gmsol';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { translateAddress } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { useShallow } from 'zustand/react/shallow';
import { useStoreProgram } from '@/contexts/anchor';

export default function DataFetcher() {
  const [positionKeys, setPositionKeys] = useState<string[]>([]);
  const storeAddress = useMemo(
    () =>
      GMX_SOLANA_STORE_ADDRESS
        ? translateAddress(GMX_SOLANA_STORE_ADDRESS)
        : undefined,
    []
  );

  const { payerInfo } = useAppStore(
    useShallow((state) => state.payerSwapTokens)
  );
  const { markets } = useAppStore(useShallow((state) => state.markets));

  useEffect(() => {
    if (!payerInfo.address || !markets) return;

    const positionKeys = markets.flatMap((market) => {
      const marketTokenAddress = new PublicKey(market.marketToken);
      const longTokenAddress = new PublicKey(market.longToken);
      const shortTokenAddress = new PublicKey(market.shortToken);

      return Array.from(
        new Set([
          findPositionPDA(
            storeAddress,
            new PublicKey(payerInfo.address),
            marketTokenAddress,
            longTokenAddress,
            true
          )[0].toBase58(),
          findPositionPDA(
            storeAddress,
            new PublicKey(payerInfo.address),
            marketTokenAddress,
            longTokenAddress,
            false
          )[0].toBase58(),
          findPositionPDA(
            storeAddress,
            new PublicKey(payerInfo.address),
            marketTokenAddress,
            shortTokenAddress,
            true
          )[0].toBase58(),
          findPositionPDA(
            storeAddress,
            new PublicKey(payerInfo.address),
            marketTokenAddress,
            shortTokenAddress,
            false
          )[0].toBase58(),
        ])
      );
    });

    setPositionKeys(positionKeys);
  }, [payerInfo.address, markets, storeAddress]);

  useMainSocket();
  usePositionSocket(positionKeys);
  return null;
}

// ---------------------- WebSocket ----------------------
const useMainSocket = () => {
  const {
    connect,
    reconnect,
    reconnectImmediately,
    disconnect,
    readyState,
    lastSocketTickerAt,
    sendJsonMessage,
  } = useSocketStore();
  const isGmw300Enabled = getGmw300Enabled();
  const isGmw301Enabled = getGmw301Enabled();
  const isGmw299Enabled = getGmw299Enabled();
  const isGmw391Enabled = getGmw391Enabled();
  const recoverConnection = getGmw395Enabled()
    ? reconnectImmediately
    : reconnect;

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  useEffect(() => {
    const handleVisibility = () => {
      if (
        document.visibilityState === 'visible' &&
        readyState !== WebSocket.OPEN
      ) {
        connect();
      } else if (
        isGmw391Enabled &&
        document.visibilityState === 'visible' &&
        readyState === WebSocket.OPEN &&
        (!lastSocketTickerAt ||
          Date.now() - lastSocketTickerAt > MAIN_SOCKET_TICKER_TIMEOUT_MS)
      ) {
        recoverConnection();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);
  }, [
    readyState,
    lastSocketTickerAt,
    connect,
    recoverConnection,
    isGmw391Enabled,
  ]);

  useEffect(() => {
    if (!isGmw391Enabled) return;
    const handleOnline = () => {
      // A connection can remain OPEN in the browser while its underlying TCP
      // connection was lost. Replace it whenever the browser reports recovery.
      recoverConnection();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [recoverConnection, isGmw391Enabled]);

  const prevReadyRef = useRef<number>(WebSocket.CLOSED);
  useEffect(() => {
    const isNewOpen =
      readyState === WebSocket.OPEN && prevReadyRef.current !== WebSocket.OPEN;
    if (isNewOpen) {
      sendJsonMessage({
        query: 'candles',
        payload: { tokenSymbol: 'BTC', period: '1m', limit: 3 },
      });
      sendJsonMessage({ subscribe: 'tickers' });
      sendJsonMessage({ subscribe: 'indexTokens' });
      sendJsonMessage({ subscribe: 'swapList' });
      if (isGmw299Enabled) {
        sendJsonMessage({
          subscribe: 'glvs',
          withSnapshot: true,
        });
      }
      if (isGmw300Enabled) {
        sendJsonMessage({
          subscribe: 'tokenMints',
          withSnapshot: true,
        });
      }
      if (isGmw301Enabled) {
        sendJsonMessage({
          subscribe: 'storeBalances',
          payload: {
            store: GMX_SOLANA_STORE_ADDRESS.toString(),
            withSnapshot: true,
          },
        });
      }
    }
    prevReadyRef.current = readyState;
  }, [
    readyState,
    sendJsonMessage,
    isGmw299Enabled,
    isGmw300Enabled,
    isGmw301Enabled,
  ]);
};

// ---------------------- WebSocket ----------------------
const usePositionSocket = (positionKeys: string[]) => {
  const { connect, disconnect, readyState, sendJsonMessage } =
    usePositionSocketStore();
  const program = useStoreProgram();

  useEffect(() => {
    if (!positionKeys.length) return;

    connect(program);

    return () => {
      disconnect();
    };
  }, [connect, disconnect, program, positionKeys]);

  useEffect(() => {
    const handleVisibility = () => {
      if (
        document.visibilityState === 'visible' &&
        readyState !== WebSocket.OPEN &&
        positionKeys.length > 0
      ) {
        console.warn('[PositionSocket] Reconnecting after wake...');
        connect(program);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);
  }, [readyState, connect, program, positionKeys]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (
        (readyState === WebSocket.CLOSED || readyState === WebSocket.CLOSING) &&
        positionKeys.length > 0
      ) {
        console.warn(
          '[PositionSocket] Detected closed connection, reconnecting...'
        );
        connect(program);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [readyState, connect, program, positionKeys]);

  const prevReadyRef = useRef<number>(WebSocket.CLOSED);
  useEffect(() => {
    const isNewOpen =
      readyState === WebSocket.OPEN && prevReadyRef.current !== WebSocket.OPEN;
    if (isNewOpen && positionKeys.length > 0) {
      sendJsonMessage(positionKeys);
    }
    prevReadyRef.current = readyState;
  }, [readyState, sendJsonMessage, positionKeys]);
};
