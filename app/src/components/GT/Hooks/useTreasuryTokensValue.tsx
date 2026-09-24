import { GMX_SOLANA_TREASURY_VAULT_CONFIG_ADDRESS } from '@/config/program';
import { DEFAULT_SWR_REFRESH_INTERVAL_15S } from '@/config/ui';
import { useAnchorProvider, useTreasuryProgram } from '@/contexts/anchor';
import { BN } from '@coral-xyz/anchor';
import { AccountLayout, getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';

// =====add
import { useTokenPriceMap } from './useTokenPriceMap';
import { useTokenMetadatasForGlv } from '@/components/Pools/Hooks/useTokenMetadatasForGlv';
import { useGlvMarkets } from '@/components/Pools/Hooks/useGlvMarkets';
import { GMX_SOLANA_GLV_TOKENS } from '@/config/program';
import { BN_ZERO } from '@solana/spl-governance';
import { useMarkets } from '@/components/Pools/Hooks/useMarkets';

const TREASURY_VALUE_KEY = 'treasury/value';
const GMX_SOLANA_TREASURY_VAULT_ADDRESS = new PublicKey('3j2gq4ZhnCKaLa5JJW9WVR42GhFBs7GjWRyt2tbQ4zXV');

export const useTreasuryTokensValue = () => {
  const { tokenPriceMap } = useTokenPriceMap();
  const provider = useAnchorProvider();
  const treasuryProgram = useTreasuryProgram();
  const treasuryVaultConfig = GMX_SOLANA_TREASURY_VAULT_CONFIG_ADDRESS;
  // calc glvPrice
  const { tokenMetadatas: glvTokenMetadatas } = useTokenMetadatasForGlv(
    GMX_SOLANA_GLV_TOKENS
  );
  const { glvs } = useGlvMarkets(GMX_SOLANA_GLV_TOKENS);
  const { marketInfosMap } = useMarkets();
  const lastGlvPriceVersionRef = useRef<string>('');
  const [glvPriceMap, setGlvPriceMap] = useState<Map<string, BN>>(new Map());
  const { mutate } = useSWRConfig();

  const tokenPriceReady = useMemo(() => {
    try {
      return tokenPriceMap && Object.keys(tokenPriceMap).length > 0;
    } catch {
      return false;
    }
  }, [tokenPriceMap]);
  const glvPriceReady = useMemo(() => (glvPriceMap && glvPriceMap.size > 0), [glvPriceMap]);
  const marketInfosReady = useMemo(() => {
    try { return Boolean(marketInfosMap && marketInfosMap.size > 0); } catch { return false; }
  }, [marketInfosMap]);

  useEffect(() => {
    if (!glvTokenMetadatas && !glvs) {
      return;
    }
    const glvPriceBNMap: Map<string, BN> = new Map();
    Object.entries(glvs).forEach(([key, info]) => {
      let sumGmBalance = new BN(0);
      let sumGmBalanceUsd = new BN(0);
      info?.markets.forEach((market) => {
        const marketToken = market?.marketTokenAddress?.toBase58?.();
        if (!marketToken) return;
        const gmBalance = market?.gmBalance || BN_ZERO;
        const marketInfo = marketInfosMap?.get(marketToken);
        if (!marketInfo) {
          return;
        }
        const marketPriceStr: string = marketInfo?.marketPrice ?? '0';
        const marketPriceBN = new BN(marketPriceStr || '0');
        const gmBalanceUsd = gmBalance
          .mul(marketPriceBN)
          ?.div(new BN(10).pow(new BN(marketInfo?.marketDecimals || 0)));
        sumGmBalance = sumGmBalance.add(market?.gmBalance || BN_ZERO);
        sumGmBalanceUsd = sumGmBalanceUsd.add(gmBalanceUsd);
      });
      const glvPriceBN = glvTokenMetadatas[key]?.totalSupply?.gt(new BN(0))
        ? sumGmBalanceUsd?.div(glvTokenMetadatas[key]?.totalSupply)
        : new BN(0);
      glvPriceBNMap.set(key, glvPriceBN);
    });
    const entries = Array.from(glvPriceBNMap.entries())
      .map(([k, v]) => `${k}:${v?.toString?.() || String(v)}`)
      .sort();
    const version = entries.join('|');
    if (lastGlvPriceVersionRef.current !== version) {
      setGlvPriceMap(glvPriceBNMap);
      lastGlvPriceVersionRef.current = version;
    }
  }, [glvs, marketInfosMap]);

  const swrKey = useMemo(() => {
    if (!treasuryVaultConfig || !provider) return null;
    return [
      TREASURY_VALUE_KEY,
      treasuryVaultConfig.toString(),
      tokenPriceReady,
      glvPriceReady,
      marketInfosReady,
    ];
  }, [treasuryVaultConfig, provider, tokenPriceReady, glvPriceReady, marketInfosReady]);

  const lastKeyRef = useRef<string>('');
  useEffect(() => {
    if (!swrKey) return;
    const isReady = Boolean(tokenPriceReady || glvPriceReady || marketInfosReady);
    const keyStr = JSON.stringify(swrKey);
    if (isReady && lastKeyRef.current !== keyStr) {
      lastKeyRef.current = keyStr;
      void mutate(swrKey, undefined, { revalidate: true });
    }
  }, [swrKey, tokenPriceReady, glvPriceReady, marketInfosReady, mutate]);

  const { data: totalValue, isLoading } = useSWR(
    swrKey,
    async (args) => {
      const [, treasuryVaultConfigStr] = args as [string, string, boolean, boolean, boolean];
      if (!provider) return new BN(0);

      const treasuryVaultConfigPubkey = new PublicKey(treasuryVaultConfigStr);

      // Fetch treasury config account data
      const treasuryVaultConfigAccount =
        await treasuryProgram.account.treasuryVaultConfig.fetch(
          treasuryVaultConfigPubkey
        );

      // Get token list from treasury config
      const tokenAddresses = treasuryVaultConfigAccount.tokens.data
        .slice(0, treasuryVaultConfigAccount.tokens.count)
        .map((entry) => new PublicKey(entry.key).toString());

      const tokenAddresses2 = [];
      const tokenAccounts = await treasuryProgram.provider.connection.getTokenAccountsByOwner(
        GMX_SOLANA_TREASURY_VAULT_ADDRESS,
        {
          programId: TOKEN_PROGRAM_ID// SPL Token program
        }
      );
      if (tokenAccounts && tokenAccounts?.value) {
        tokenAccounts.value.forEach((item) => {
          tokenAddresses2.push({
            mint: AccountLayout.decode(item.account.data).mint,
            pubkey: item.pubkey.toString()
          })
        })
      }

      const tokenAccounts2 = await treasuryProgram.provider.connection.getTokenAccountsByOwner(
        GMX_SOLANA_TREASURY_VAULT_ADDRESS,
        {
          programId: TOKEN_2022_PROGRAM_ID// SPL Token program
        }
      );
      if (tokenAccounts2 && tokenAccounts2?.value) {
        tokenAccounts2.value.forEach((item) => {
          tokenAddresses2.push({
            mint: AccountLayout.decode(item.account.data).mint,
            pubkey: item.pubkey.toString()
          })
        })
      }

      let totalValueBN = new BN(0);

      const solBalance = await provider.connection.getBalance(GMX_SOLANA_TREASURY_VAULT_ADDRESS);
      if (solBalance > 0) {
        const solPrice = tokenPriceMap['So11111111111111111111111111111111111111112']?.maxUnitPrice;
        if (solPrice) {
          const solValue = new BN(solBalance)
            .mul(new BN(solPrice))
            .div(new BN(10).pow(new BN(9))); // SOL has 9 decimals
          totalValueBN = totalValueBN.add(solValue);
        }
      }

      await Promise.all(
        tokenAddresses.map(async (tokenAddress) => {
          try {
            const tokenPubkey = new PublicKey(tokenAddress);
            const tokenMaxPrice = tokenPriceMap[tokenAddress]?.maxUnitPrice;

            // Skip if token data or prices are not available
            if (!tokenMaxPrice) return;

            const ata = getAssociatedTokenAddressSync(
              tokenPubkey,
              treasuryVaultConfigPubkey,
              true
            );

            // Get token account balance, return early if account doesn't exist
            const balance = await provider.connection
              .getTokenAccountBalance(ata)
              .catch(() => null);

            if (!balance?.value?.amount) return;

            const tokenBalance = new BN(balance.value.amount);

            // Calculate token value: balance * price / (10 ^ decimals)
            const tokenValue = tokenBalance
              .mul(new BN(tokenMaxPrice));
            totalValueBN = totalValueBN.add(tokenValue);
          } catch (error) {
            console.warn(
              `Warning: Failed to fetch value for token ${tokenAddress}:`,
              error
            );
          }
        })
      );

      await Promise.all(
        tokenAddresses2.map(async (tokenAddress) => {
          try {
            const tokenPubkey = new PublicKey(tokenAddress.pubkey);
            const tokenMaxPrice = tokenPriceMap[tokenAddress.mint.toBase58()]?.maxUnitPrice;
            const glvPrice = glvPriceMap?.get(tokenAddress.mint.toBase58());
            const gmTokenPrice = marketInfosMap?.get(tokenAddress.mint.toBase58())?.marketPrice ?
              new BN(marketInfosMap?.get(tokenAddress.mint.toBase58())?.marketPrice)?.div(new BN(10).pow(new BN(marketInfosMap?.get(tokenAddress.mint.toBase58())?.marketDecimals))) : null;

            // Skip if token data or prices are not available
            if (
              !tokenMaxPrice &&
              !glvPrice &&
              !gmTokenPrice
            ) return;

            // Get token account balance, return early if account doesn't exist
            const balance = await provider.connection
              .getTokenAccountBalance(tokenPubkey)
              .catch(() => null);

            if (!balance?.value?.amount) return;

            const tokenBalance = new BN(balance.value.amount);
            const tokenPrice =
              tokenMaxPrice ||
              glvPrice ||
              gmTokenPrice;

            // Calculate token value: balance * price / (10 ^ decimals)
            const tokenValue = tokenBalance
              .mul(new BN(tokenPrice?.toString()));
            totalValueBN = totalValueBN.add(tokenValue);
          } catch (error) {
            console.warn(
              `Warning: Failed to fetch value for token ${tokenAddress}:`,
              error
            );
          }
        })
      );

      return totalValueBN;
    },
    {
      refreshInterval: 8000,
      revalidateOnMount: false,
      revalidateIfStale: true,
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      isPaused: () => !(tokenPriceReady || glvPriceReady || marketInfosReady),
    }
  );

  return {
    treasuryValue: totalValue || new BN(0),
    isLoading,
  };
};
