import { useWallet } from '@solana/wallet-adapter-react';
import { findUserPDA } from 'gmsol';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { GRAPHQL_ENDPOINT } from '@/config/url';
import useSWR from 'swr';

export type ReferralInfo = { address: string; joinTime: string | number | null };

async function gqlPost<T>(query: string): Promise<T> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return (await response.json()) as T;
}

export const useReferrals = () => {
  const { publicKey } = useWallet();

  const { data: referrals = [], isLoading: loading } = useSWR<ReferralInfo[]>(
    publicKey ? ['referrals', publicKey.toBase58()] : null,
    async () => {
      if (!publicKey) return [];

      try {
        const [currentUserHeaderPda] = findUserPDA(
          GMX_SOLANA_STORE_ADDRESS,
          publicKey
        );
        const result = await gqlPost<{
          data?: {
            setReferrers?: Array<{
              owner: string;
              timestamp: string | number | null;
            }>;
          };
        }>(`
          query {
            setReferrers(where: { referrerUser_eq: "${currentUserHeaderPda.toBase58()}" }) {
              owner
              timestamp
            }
          }
        `);

        return (result.data?.setReferrers ?? []).map((referee) => ({
          address: referee.owner,
          joinTime: referee.timestamp,
        }));
      } catch (error) {
        console.error('get referrals failed:', error);
        return [];
      }
    },
    { revalidateOnFocus: false }
  );

  return { referrals, loading, ready: !!publicKey };
};
