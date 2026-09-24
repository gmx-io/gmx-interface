import { useConnection } from '@solana/wallet-adapter-react';
import useSWR from 'swr';

export const useGenesisHash = () => {
  const connection = useConnection();
  const endpoint = connection.connection.rpcEndpoint;
  const { data } = useSWR(
    `genesis/${endpoint}`,
    async () => {
      // console.debug('updating genesis hash');
      return await connection.connection.getGenesisHash();
    },
    {
      refreshInterval: 0,
      // A new RPC endpoint must not inherit the previous network identity.
      keepPreviousData: false,
    }
  );
  return data;
};
