import { useConnection } from '@solana/wallet-adapter-react';
import { toBN } from 'gmsol';
import { useMemo } from 'react';
import useSWR from 'swr';

export const useRentExemptionAmount = (dataLength: number) => {
  const connection = useConnection();
  const { data } = useSWR(
    ['rent-exemption-amount', dataLength],
    async (key) => {
      return await connection.connection.getMinimumBalanceForRentExemption(
        key[1]
      );
    },
    { refreshInterval: 3600000 }
  );

  return useMemo(() => {
    if (data) {
      return toBN(data);
    }
  }, [data]);
};
