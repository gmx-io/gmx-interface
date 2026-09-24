import { GRAPHQL_ENDPOINT } from '@/config/url';
import { BN } from '@coral-xyz/anchor';
import useSWR from 'swr';

const USER_VOLUME_KEY = 'data_store/user_volume';
const USER_TOTAL_VOLUME_QUERY = `
  query UserTotalVolume($owner: String!) {
    users(where: { owner_eq: $owner }) {
      volume
      fees
      owner
    }
  }
`;

interface UserVolumeResponse {
  data: {
    users: Array<{
      volume: string;
      fees: string;
      owner: string;
    }>;
  };
}

export interface UserVolumeData {
  totalVolume: BN;
  isLoading: boolean;
}

export const useUserTotalVolume = (userAddress?: string) => {
  const { data, isLoading } = useSWR<UserVolumeData>(
    userAddress ? [USER_VOLUME_KEY, userAddress] : null,
    async ([, address]: [string, string]) => {
      try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: USER_TOTAL_VOLUME_QUERY,
            variables: {
              owner: address,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = (await response.json()) as UserVolumeResponse;

        if (!result.data?.users) {
          throw new Error('Invalid response format');
        }

        const user = result.data.users[0];
        return {
          totalVolume: user ? new BN(user.volume) : new BN(0),
          isLoading: false,
        };
      } catch (error) {
        console.error('Error fetching user volume:', error);
        return {
          totalVolume: new BN(0),
          isLoading: false,
        };
      }
    },
    {}
  );

  return {
    userVolumeData: data ?? {
      totalVolume: new BN(0),
      isLoading: true,
    },
    isLoading,
  };
};
