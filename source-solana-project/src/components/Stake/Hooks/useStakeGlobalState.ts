import useSWR from "swr";
import { useCallback } from "react";
import { useStakeProgram } from '@/contexts/anchor';
import { PublicKey } from '@solana/web3.js';
import { BN, utils} from "@coral-xyz/anchor";
import { DEFAULT_SWR_REFRESH_INTERVAL_60S } from '@/config/ui';

type ApyGradient = Array<BN>;

export interface StakeGlobalState {
  apyGradient: ApyGradient;
  authority: BN;
  claimEnabled: boolean;
  minStakeValue: BN;
  pendingAuthority: BN;
  pricingStalenessSeconds: number;
  reserved: Uint8Array;
  stateAddress: PublicKey;
}

const encodeUtf8 = utils.bytes.utf8.encode;
const STATE_SEED = encodeUtf8('global_state');
const EMPTY_STAKE_GLOBAL_STATE = {};

// useStakeGlobalState
export const useStakeGlobalState = () => {
  const stakeProgram = useStakeProgram();

  // ========== fetcher ==========
  const fetchStakeState = useCallback(async () => {
    const stateAddress = PublicKey.findProgramAddressSync(
      [
        STATE_SEED
      ],
      stakeProgram.programId
    )[0];

    const accounts = await stakeProgram.provider.connection.getAccountInfo(stateAddress);
    if (!accounts) return null;

    const globalState: StakeGlobalState = stakeProgram.coder.accounts.decode("globalState", accounts.data);

    // const apyGradient = globalState?.apyGradient?.map(item => item.muln(100)) || [];

    return {
      ...globalState,
      // apyGradient: apyGradient,
      stateAddress
    }
  }, [stakeProgram]);

  // ========== SWR ==========
  const { data, isLoading, mutate } = useSWR(
    "stake-global-state",
    fetchStakeState,
    {
      refreshInterval: DEFAULT_SWR_REFRESH_INTERVAL_60S,
      keepPreviousData: true,
    }
  );

  return {
    stakeGloablState: data ?? EMPTY_STAKE_GLOBAL_STATE,
    isLoading,
    refresh: mutate,
  };
};
