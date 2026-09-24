/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { getMarketMetaForRequest } from '@/zustand/utils';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { StateCreator } from 'zustand';

export type SliceCreator<T> = StateCreator<T, [['zustand/devtools', never]]>;

export type MarketMetaForRequest = ReturnType<typeof getMarketMetaForRequest>;

export type Arg = boolean | string | undefined | null | number | PublicKey | BN;

export type SupportedArg = Arg | Record<string, Arg>;

export type CachedSelector<T> =
  ReturnType<typeof createAppStoreSelector> extends (...args: any[]) => any
    ? (...args: any[]) => T
    : never;

export interface SerializeBN {
  type: 'BN';
  data: string;
}
