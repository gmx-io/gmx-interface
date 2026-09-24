import useSWR from "swr";
import { useCallback } from "react";
import { useStakeProgram } from '@/contexts/anchor';
import { MemcmpFilter } from "@solana/web3.js";
import { PublicKey } from '@solana/web3.js';
import { BN } from "@coral-xyz/anchor";
import { DEFAULT_SWR_REFRESH_INTERVAL_60S } from '@/config/ui';

export interface StakeQueryController {
  controllerAddress: PublicKey;
  controllerIndex: BN;
  disabledAt: BN; 
  disabledCumInvCost: BN; 
  globalState: PublicKey; 
  isEnabled: boolean; 
  lpTokenMint: PublicKey; 
  reserved: Uint8Array; 
  totalPositions: BN; 
}

const CONTROLLER_DISCRIMATOR = "cESaNZEPqVa";
const EMPTY_STAKE_QUERY_CONTROLLERS: StakeQueryController[] = [];

export const useStakeQueryController = () => {
  const stakeProgram = useStakeProgram();

  // ========== fetcher ==========
  const fetchStake = useCallback(async () => {
    const filters: MemcmpFilter[] = [
      { memcmp: { offset: 0, bytes: CONTROLLER_DISCRIMATOR } },
    ];

    const orders: Array<StakeQueryController> = [];
    const accounts = await stakeProgram.provider.connection.getProgramAccounts(stakeProgram.programId, { filters });
    accounts?.forEach((e) => {
      const controller: StakeQueryController = stakeProgram.coder.accounts.decode("lpTokenController", e.account.data);
      controller.controllerAddress = e.pubkey;
      orders.push(controller);
    });

    return orders;
  }, [stakeProgram]);

  // ========== SWR ==========
  const { data, isLoading, mutate } = useSWR(
    "stake-query-controller",
    fetchStake,
    {
      refreshInterval: DEFAULT_SWR_REFRESH_INTERVAL_60S,
      keepPreviousData: true,
    }
  );

  return {
    stakeQueryController: data ?? EMPTY_STAKE_QUERY_CONTROLLERS,
    isLoading,
    refresh: mutate,
  };
};
