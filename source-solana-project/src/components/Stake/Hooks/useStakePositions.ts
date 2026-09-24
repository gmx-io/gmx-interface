import useSWR from "swr";
import { useCallback } from "react";
import { useStakeProgram } from '@/contexts/anchor';
import { MemcmpFilter } from "@solana/web3.js";
import { PublicKey } from '@solana/web3.js';
import { utils, BN } from "@coral-xyz/anchor";
import { DEFAULT_SWR_REFRESH_INTERVAL_30S } from '@/config/ui';
import { useWallet } from '@solana/wallet-adapter-react';

type Account = {
  data: Uint8Array;
};

export interface StakeAccount {
  account: Account;
  pubkey: PublicKey;
}

export interface StakePosition {
  controller: PublicKey;
  cumInvCost: BN;
  lpMint: PublicKey; 
  positionAddress: PublicKey; 
  positionId: PublicKey; 
  reserved: Uint8Array; 
  stakeStartTime: BN; 
  stakedAmount: BN; 
  stakedValueUsd: BN; 
  vault: PublicKey; 
  poolType?: string;
  marketToken?: PublicKey;
  value?: BN;
  decimals: number;
}

const EMPTY_STAKE_POSITIONS: StakePosition[] = [];

export const useStakePositions = (owner: PublicKey) => {
  const stakeProgram = useStakeProgram();
  const { connected } = useWallet();
  const ownerAddress = owner?.toBase58();
  
  // ========== fetcher ==========
  const fetchStake = useCallback(async () => {
    if (!owner) return [];

    const POSITION_DISCRIMATOR = "VZMoMoKgZQb";
    const DISCRIMATOR_LENGTH = 8;
    const SELECTOR_OFFSET = 0;

    const selector = Buffer.concat([owner.toBytes()]);
    const filters: MemcmpFilter[] = [
      { memcmp: { offset: 0, bytes: POSITION_DISCRIMATOR } },
      {
        memcmp: {
          offset: DISCRIMATOR_LENGTH + SELECTOR_OFFSET,
          bytes: utils.bytes.bs58.encode(selector),
          encoding: "base58",
        },
      },
    ];

    const position: Array<StakePosition> = [];

    // console.log('position62', new Date().getTime());
    const accounts: ReadonlyArray<StakeAccount>  = await stakeProgram.provider.connection.getProgramAccounts(stakeProgram.programId, { filters });

    // console.log('position64', new Date().getTime());
    accounts?.forEach((e) => {
      const data: StakePosition = stakeProgram.coder.accounts.decode("position", Buffer.from(e?.account?.data));
      data.positionAddress = e.pubkey;
      position.push(data);
    });
    // console.log('position70', position, new Date().getTime());

    return position.sort((a, b) => b?.stakeStartTime.toNumber() - a?.stakeStartTime.toNumber());
  }, [owner, stakeProgram]);

  // ========== SWR ==========
  const { data, isLoading, mutate } = useSWR(
    connected && ownerAddress ? ['stake-positions', ownerAddress] : null,
    fetchStake,
    {
      refreshInterval: DEFAULT_SWR_REFRESH_INTERVAL_30S,
      keepPreviousData: true,
    }
  );

  return {
    stakePositions: (connected && data) || EMPTY_STAKE_POSITIONS,
    isLoading,
    refresh: mutate,
  };
};
