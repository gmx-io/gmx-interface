import { Market } from '@/selectors/market/types';
import { SerializeBN, SupportedArg } from '@/zustand/types';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { createJSONStorage } from 'zustand/middleware';

export function getMarketMetaForRequest(market: Market) {
  return {
    key: market.marketTokenAddress,
    address: market.marketAddress,
    indexToken: market.indexTokenAddress,
    longToken: market.longTokenAddress,
    shortToken: market.shortTokenAddress,
  };
}

export function getStableMarketRequestSignature(markets: Market[]) {
  return markets
    .map((market) => {
      const meta = getMarketMetaForRequest(market);
      return [
        meta.key,
        meta.address,
        meta.indexToken,
        meta.longToken,
        meta.shortToken,
      ]
        .map((value) => value.toBase58?.() ?? String(value))
        .join(':');
    })
    .sort()
    .join('|');
}

export function getKeyForArgs(...args: SupportedArg[]) {
  return args
    .map((arg) => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (arg instanceof PublicKey) return arg.toBase58();
      if (arg instanceof BN) return arg.toString('hex');
      if (typeof arg === 'object') {
        return (
          Object.entries(arg)
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            .map(([k, v]) => `${k}=${v}`)
            .join(';')
        );
      }
      return String(arg);
    })
    .join(',');
}

export function createStorage() {
  return createJSONStorage(() => localStorage, {
    reviver: (key, value) => {
      if (key === 'leverage' && value && (value as SerializeBN).type === 'BN') {
        return new BN((value as SerializeBN).data, 'hex');
      }
      return value;
    },
    replacer: (key, value) => {
      if (key === 'leverage' && typeof value === 'string') {
        return {
          type: 'BN',
          data: value,
        } satisfies SerializeBN;
      }
      return value;
    },
  });
}
