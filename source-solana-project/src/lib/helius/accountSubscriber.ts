/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
// Singleton manager for Helius `accountSubscribe` JSON-RPC subscriptions
// over the existing Helius WebSocket endpoint. One physical WS connection
// is shared across all consumers; per-pubkey subscriptions are reference-
// counted so independent React components can subscribe to overlapping
// pubkeys without duplicating Helius traffic.
//
// Helius `accountSubscribe` does NOT replay current state on subscribe.
// Consumers must seed initial balances themselves (e.g. via a one-shot
// getMultipleAccountsInfo) and then use this watcher for deltas.

import { HELIUS_WSS_ENDPOINT } from '@/config/url';
import { getGmw334Enabled } from '@/config/featureFlagEnable';

// Reconnect with exponential backoff capped at 20s, giving up only after
// 999 attempts. The attempt counter resets on every successful connect.
const HELIUS_MAX_RECONNECT_ATTEMPTS = 999;
const HELIUS_RECONNECT_BASE_DELAY = 1000;
const HELIUS_RECONNECT_MAX_DELAY = 20000;

export interface AccountSnapshot {
  // Raw base64-decoded account data buffer. SPL token accounts decode via
  // `AccountLayout.decode`; system accounts have empty data.
  data: Buffer;
  lamports: number;
  owner: string;
  executable: boolean;
  rentEpoch: number;
  slot: number;
  // True when the account no longer exists on chain. Consumers should treat
  // this as a removal signal rather than a regular empty snapshot.
  removed?: boolean;
}

type Listener = (snapshot: AccountSnapshot) => void;

interface SubscriptionState {
  // Helius-assigned numeric id, populated when subscribe response returns.
  // null while the subscribe request is in flight or the WS is down.
  subId: number | null;
  // Monotonically increasing token for the latest subscribe request sent
  // for this pubkey. Used to ignore stale responses after dispose/recreate.
  pendingToken: number;
  listeners: Set<Listener>;
}

interface PendingRequest {
  pubkey: string;
  token: number;
}

export const isHeliusAccountSubscribeEnabled = (): boolean =>
  Boolean(HELIUS_WSS_ENDPOINT);

class HeliusAccountWatcher {
  private ws: WebSocket | null = null;
  // Pubkey base58 -> subscription state
  private subscriptions = new Map<string, SubscriptionState>();
  // Helius-assigned subId -> pubkey, for routing accountNotification events
  private subIdToPubkey = new Map<number, string>();
  // Outstanding subscribe/unsubscribe request id -> context
  private pendingRequests = new Map<number, PendingRequest>();
  private reqIdCounter = 1;
  private subscribeTokenCounter = 1;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;

  private ensureConnected(): void {
    if (!HELIUS_WSS_ENDPOINT) {
      console.error(
        '[helius] account subscribe requested but VITE_HELIUS_WSS_ENDPOINT is not set'
      );
      return;
    }
    if (this.ws) {
      const state = this.ws.readyState;
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;
    }
    this.connect();
  }

  private connect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    try {
      this.ws = new WebSocket(HELIUS_WSS_ENDPOINT);
    } catch (err) {
      console.error('[helius] failed to construct WebSocket', err);
      this.scheduleReconnect();
      return;
    }
    this.ws.onopen = () => {
      // Connection is healthy again: reset the backoff attempt counter.
      this.reconnectAttempts = 0;
      // Re-issue subscribe for every active pubkey so reconnects do not
      // silently lose deltas. Subscription ids are reset since old ids
      // were owned by the previous server connection.
      this.subIdToPubkey.clear();
      for (const [, state] of this.subscriptions) {
        state.subId = null;
      }
      for (const [pubkey, state] of this.subscriptions) {
        this.sendSubscribe(pubkey, state);
      }
    };
    this.ws.onmessage = (event) => {
      try {
        this.handleMessage(JSON.parse(event.data));
      } catch (err) {
        console.error('[helius] bad WS message', err);
      }
    };
    this.ws.onclose = () => {
      this.ws = null;
      if (getGmw334Enabled()) {
        // Responses belong to the closed socket and can never arrive on the
        // replacement connection. Drop their routing state before re-subscribing
        // active pubkeys so reconnects cannot retain stale request contexts.
        this.pendingRequests.clear();
        this.subIdToPubkey.clear();
        for (const [, state] of this.subscriptions) {
          state.subId = null;
        }
      }
      if (this.subscriptions.size > 0) {
        this.scheduleReconnect();
      }
    };
    this.ws.onerror = (err) => {
      console.error('[helius] WS error', err);
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    if (this.reconnectAttempts >= HELIUS_MAX_RECONNECT_ATTEMPTS) {
      console.error(
        '[helius] giving up reconnect after',
        HELIUS_MAX_RECONNECT_ATTEMPTS,
        'attempts'
      );
      return;
    }
    const delay = Math.min(
      HELIUS_RECONNECT_MAX_DELAY,
      HELIUS_RECONNECT_BASE_DELAY * 2 ** this.reconnectAttempts
    );
    const jitter = Math.floor(Math.random() * 1000);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay + jitter);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleMessage(msg: any): void {
    // Account state delta for an existing subscription
    if (msg?.method === 'accountNotification') {
      const subId = msg.params?.subscription as number | undefined;
      if (typeof subId !== 'number') return;
      const pubkey = this.subIdToPubkey.get(subId);
      if (!pubkey) return;
      const state = this.subscriptions.get(pubkey);
      if (!state) return;
      const value = msg.params?.result?.value;
      if (!value) {
        const snapshot: AccountSnapshot = {
          data: Buffer.alloc(0),
          lamports: 0,
          owner: '',
          executable: false,
          rentEpoch: 0,
          slot: Number(msg.params?.result?.context?.slot || 0),
          removed: true,
        };
        for (const listener of state.listeners) {
          try {
            listener(snapshot);
          } catch (err) {
            console.error('[helius] listener threw', err);
          }
        }
        return;
      }
      const dataField = value.data;
      let buffer: Buffer;
      try {
        if (Array.isArray(dataField) && typeof dataField[0] === 'string') {
          buffer = Buffer.from(dataField[0], 'base64');
        } else if (typeof dataField === 'string') {
          buffer = Buffer.from(dataField, 'base64');
        } else {
          buffer = Buffer.alloc(0);
        }
      } catch (err) {
        console.error(
          '[helius] failed to decode account data for',
          pubkey,
          err
        );
        return;
      }
      const snapshot: AccountSnapshot = {
        data: buffer,
        lamports: Number(value.lamports || 0),
        owner: String(value.owner || ''),
        executable: Boolean(value.executable),
        rentEpoch: Number(value.rentEpoch || 0),
        slot: Number(msg.params?.result?.context?.slot || 0),
      };
      for (const listener of state.listeners) {
        try {
          listener(snapshot);
        } catch (err) {
          console.error('[helius] listener threw', err);
        }
      }
      return;
    }

    // Response to a subscribe / unsubscribe request
    if (typeof msg?.id === 'number') {
      const pending = this.pendingRequests.get(msg.id);
      if (!pending) return;
      this.pendingRequests.delete(msg.id);
      if (typeof msg.result === 'number') {
        // accountSubscribe response: result is the new subscription id
        const state = this.subscriptions.get(pending.pubkey);
        if (
          state &&
          state.pendingToken === pending.token &&
          state.subId == null
        ) {
          state.subId = msg.result;
          this.subIdToPubkey.set(msg.result, pending.pubkey);
        } else {
          // The state was disposed while this subscribe request was in
          // flight, or a newer subscribe request has already superseded it.
          // Release the orphan subscription on the server so we do not
          // leak it for the lifetime of the WS connection.
          this.sendUnsubscribe(msg.result);
        }
      }
    }
  }

  private sendSubscribe(pubkey: string, state: SubscriptionState): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const id = this.reqIdCounter++;
    const token = this.subscribeTokenCounter++;
    state.pendingToken = token;
    this.pendingRequests.set(id, { pubkey, token });
    this.ws.send(
      JSON.stringify({
        jsonrpc: '2.0',
        id,
        method: 'accountSubscribe',
        params: [pubkey, { commitment: 'confirmed', encoding: 'base64' }],
      })
    );
  }

  private sendUnsubscribe(subId: number): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const id = this.reqIdCounter++;
    this.ws.send(
      JSON.stringify({
        jsonrpc: '2.0',
        id,
        method: 'accountUnsubscribe',
        params: [subId],
      })
    );
  }

  // Subscribe a listener to account-state pushes for `pubkey`. Multiple
  // calls for the same pubkey share one Helius subscription and dispatch
  // to all listeners. Returns a disposer that detaches the listener and,
  // when the last listener leaves, releases the underlying subscription.
  watch(pubkey: string, listener: Listener): () => void {
    let state = this.subscriptions.get(pubkey);
    if (!state) {
      state = { subId: null, pendingToken: 0, listeners: new Set() };
      this.subscriptions.set(pubkey, state);
      this.ensureConnected();
      // If WS is already open, send subscribe immediately. Otherwise the
      // onopen handler will issue it once the connection settles.
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendSubscribe(pubkey, state);
      }
    }
    state.listeners.add(listener);

    return () => {
      const current = this.subscriptions.get(pubkey);
      if (!current) return;
      current.listeners.delete(listener);
      if (current.listeners.size > 0) return;
      // Last listener gone: release the subscription and forget the
      // server-assigned id mapping.
      if (current.subId != null) {
        this.sendUnsubscribe(current.subId);
        this.subIdToPubkey.delete(current.subId);
      }
      this.subscriptions.delete(pubkey);
    };
  }
}

let singleton: HeliusAccountWatcher | null = null;

export const getHeliusAccountWatcher = (): HeliusAccountWatcher => {
  if (!singleton) singleton = new HeliusAccountWatcher();
  return singleton;
};
