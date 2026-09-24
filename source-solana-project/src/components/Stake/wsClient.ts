import { createClient, Client } from 'graphql-ws';
import { setStakeWsGateConnected } from './stakeWsGate';
import { useWsLastUpdatedAtStore } from '@/zustand/wsLastUpdatedAtStore';

// Reconnect with exponential backoff capped at 20s, giving up only after
// 999 attempts. The counter resets after a successful connection.
const MAX_MANUAL_RETRIES = 999;
const STAKE_WS_RECONNECT_BASE_DELAY = 1000;
const STAKE_WS_RECONNECT_MAX_DELAY = 20000;

// The current manual retry counter will be reset after successful connection.
let manualRetryCount = 0;

export const socketStatus = {
  isConnected: false,
  manualRetryCount: 0,
  maxManualRetries: MAX_MANUAL_RETRIES
};

type StatusListener = (status: typeof socketStatus) => void;
const listeners: StatusListener[] = [];

export const subscribeToStatusChange = (listener: StatusListener) => {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}

function notifyListeners() {
  listeners.forEach(listener => listener({ ...socketStatus })); 
}

const STAKE_WSS_ENDPOINT = import.meta.env.VITE_STAKE_WSS_ENDPOINT as string;
let stakeWsClient: Client | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let shouldReconnect = false;

function clearReconnectTimer() {
  if (!reconnectTimer) return;
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
}

function resetStakeWsClient() {
  const client = stakeWsClient;
  stakeWsClient = null;
  if (!client) return;

  const disposeResult = client.dispose();
  if (disposeResult instanceof Promise) {
    void disposeResult.catch((error) => {
      console.warn('WebSocket dispose failed:', error);
    });
  }
}

function scheduleStakeWsReconnect() {
  if (!shouldReconnect || reconnectTimer) return;
  if (manualRetryCount >= MAX_MANUAL_RETRIES) {
    console.error(
      '[stake] giving up reconnect after',
      MAX_MANUAL_RETRIES,
      'attempts'
    );
    return;
  }

  const delay = Math.min(
    STAKE_WS_RECONNECT_MAX_DELAY,
    STAKE_WS_RECONNECT_BASE_DELAY * 2 ** manualRetryCount
  );
  const jitter = Math.floor(Math.random() * 1000);
  manualRetryCount += 1;
  socketStatus.manualRetryCount = manualRetryCount;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    resetStakeWsClient();
    startStakeWsClient();
  }, delay + jitter);
}

export function startStakeWsClient() {
  shouldReconnect = true;
  if (stakeWsClient) return stakeWsClient;

  clearReconnectTimer();
  const nextClient = createClient({
    // url: 'wss://mainnet.marin-6e9e22b8.gmxsolana.io/graphql-ws',
    // url: 'wss://dev.marin-bca7ba6a.gmxsolana.io/graphql-ws',
    // url: 'wss://marin-d36ebb63.gmxsolana.io/graphql-ws',
    url: STAKE_WSS_ENDPOINT,
    keepAlive: 10000,
    lazy: false,
    retryAttempts: 0,
    on: {
      connected: () => {
        if (stakeWsClient !== nextClient) return;
        clearReconnectTimer();
        socketStatus.isConnected = true;
        manualRetryCount = 0;
        socketStatus.manualRetryCount = 0;
        console.log('WebSocket success！');
        setStakeWsGateConnected(true);
        notifyListeners();
      },

      // Stamp the freshness timestamp on every incoming message. graphql-ws
      // emits this for data (`next`) as well as keepAlive pongs, so the value
      // also advances while idle, reflecting connection liveness.
      message: () => {
        if (stakeWsClient !== nextClient) return;
        useWsLastUpdatedAtStore.getState().setWsLastUpdatedAt('stake');
      },

      closed: (event) => {
        if (stakeWsClient !== nextClient) return;
        socketStatus.isConnected = false;
        setStakeWsGateConnected(false);
        if ((event as CloseEvent).code !== 1000) {
          console.warn('WebSocket The connection is abnormally closed:', event);
        } else {
          console.info('WebSocket The connection was closed normally。');
        }
        notifyListeners();
        scheduleStakeWsReconnect();
      },

      error: (err) => {
        if (stakeWsClient !== nextClient) return;
        socketStatus.isConnected = false;
        setStakeWsGateConnected(false);
        console.error('WebSocket Connection error occurred:', err);
        console.warn('--- Socket link failed, reconnecting with backoff ---');
        notifyListeners();
        scheduleStakeWsReconnect();
      },
    },
  });
  stakeWsClient = nextClient;

  return stakeWsClient;
}

export const wsClient: Client = {
  on: (event, listener) => startStakeWsClient().on(event, listener),
  subscribe: (payload, sink) => startStakeWsClient().subscribe(payload, sink),
  iterate: (payload) => startStakeWsClient().iterate(payload),
  terminate: () => stakeWsClient?.terminate(),
  dispose: () => {
    shouldReconnect = false;
    clearReconnectTimer();
    const client = stakeWsClient;
    stakeWsClient = null;
    return client?.dispose();
  },
};
