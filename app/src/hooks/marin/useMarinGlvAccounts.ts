import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { findGlvPDA } from 'gmsol';
import { useEffect, useMemo } from 'react';

import { BN_ZERO } from '@/config/constants';
import { GlvInfoData, GlvMarketData } from '@/selectors/glv/types';
import useSocketStore, { GlvAccountPayload } from '@/zustand/socketStore';
import { useAppStore } from '@/zustand/useAppStore';

type GlvMarketsResponse = Record<string, GlvInfoData>;

function toBN(value: string | number | undefined): BN {
  return new BN(value ?? 0);
}

function toGlvInfo(record: GlvAccountPayload): GlvInfoData | null {
  if (!record?.config) return null;

  try {
    const longTokenAddress = new PublicKey(record.config.longToken);
    const shortTokenAddress = new PublicKey(record.config.shortToken);

    const markets: GlvMarketData[] = (record.markets ?? []).map((market) => ({
      marketTokenAddress: new PublicKey(market.marketToken),
      isDisabled: false,
      isSingle: longTokenAddress.equals(shortTokenAddress),
      minTokensForFirstDeposit: toBN(record.config.minTokensForFirstDeposit),
      maxMarketTokenBalanceUsd: toBN(market.maxValue),
      glvMaxMarketTokenBalanceAmount: toBN(market.maxAmount),
      gmBalance: BN_ZERO,
    }));

    return {
      glvAddress: new PublicKey(record.glv),
      glvTokenAddress: new PublicKey(record.config.glvToken),
      longTokenAddress,
      shortTokenAddress,
      shiftLastExecutedAt: toBN(record.config.shiftLastExecutedAt),
      markets,
    };
  } catch (error) {
    console.error('[GMW-299] failed to parse GLV account payload', record, error);
    return null;
  }
}

export function useMarinGlvAccounts(glvTokens: PublicKey[], enabled: boolean) {
  const glvAccounts = useSocketStore((state) => state.glvAccounts);
  const { setGlvMapBase64 } = useAppStore((state) => state.pools);

  const requestedGlvs = useMemo(() => {
    return glvTokens.map((token) => ({
      glvToken: token.toBase58(),
      glvAddress: findGlvPDA(token)[0].toBase58(),
    }));
  }, [glvTokens]);

  useEffect(() => {
    if (!enabled || !requestedGlvs.length) return;

    const glvBase64Map = new Map<string, string>();
    for (const { glvToken, glvAddress } of requestedGlvs) {
      const record = glvAccounts[glvAddress];
      if (record?.data) {
        glvBase64Map.set(glvToken, record.data);
      }
    }

    setGlvMapBase64(glvBase64Map);
  }, [enabled, glvAccounts, requestedGlvs, setGlvMapBase64]);

  return useMemo(() => {
    if (!enabled) {
      return {
        glvsData: {},
        isLoading: false,
      };
    }

    const glvsData: GlvMarketsResponse = {};
    let missingGlvCount = 0;

    for (const { glvAddress } of requestedGlvs) {
      const record = glvAccounts[glvAddress];
      const glvInfo = record ? toGlvInfo(record) : null;

      if (glvInfo) {
        glvsData[glvInfo.glvTokenAddress.toBase58()] = glvInfo;
      } else {
        missingGlvCount += 1;
      }
    }

    return {
      glvsData,
      isLoading: missingGlvCount > 0,
    };
  }, [enabled, glvAccounts, requestedGlvs]);
}
