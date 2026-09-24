import type { Client } from 'graphql-ws';

export const isMarinEnabled = (): boolean => false;

let cachedClient: Client | null = null;

export const getMarinClient = (): Client => {
  if (cachedClient) {
    return cachedClient;
  }

  throw new Error('Marin subscriptions are disabled.');
};

export const resetMarinClient = (): void => {
  if (cachedClient) {
    void cachedClient.dispose();
    cachedClient = null;
  }
};
