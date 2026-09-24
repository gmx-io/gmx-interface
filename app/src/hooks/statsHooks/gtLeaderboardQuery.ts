import { GRAPHQL_ENDPOINT } from '@/config/url';
import { BN_ZERO } from '@/config/constants';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

export interface GtUserInfo {
  gt: BN;
  fees: BN;
  volume: BN;
  owner: PublicKey;
  lastLoginTime: string;
}

interface UserGtInfoRaw {
  gt: string;
  gtRank: string;
  id: string;
}

interface UserGtInfosResponse {
  data: {
    userGtInfos: UserGtInfoRaw[];
  };
}

export const LEADERBOARD_MAX_DISPLAY_ITEMS = 1000;

async function gqlFetch<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await response.json()) as T & { errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }
  return json;
}

function mapUserGtInfo(raw: UserGtInfoRaw): GtUserInfo {
  return {
    gt: new BN(raw.gt),
    fees: BN_ZERO,
    volume: BN_ZERO,
    owner: new PublicKey(raw.id),
    lastLoginTime: '',
  };
}

function mapPinnedCurrentUser(ownerAddress: string, gt: BN): GtUserInfo {
  return {
    gt,
    fees: BN_ZERO,
    volume: BN_ZERO,
    owner: new PublicKey(ownerAddress),
    lastLoginTime: '',
  };
}

async function fetchRankedGtUsers(offset: number, limit: number): Promise<GtUserInfo[]> {
  const result = await gqlFetch<UserGtInfosResponse>({
    query: `
      query {
        userGtInfos(
          orderBy: gtRank_ASC,
          limit: ${limit},
          offset: ${offset}
        ) {
          gt
          gtRank
          id
        }
      }
    `,
  });

  return (result.data?.userGtInfos ?? []).map(mapUserGtInfo);
}

function globalIndexForOthersIndex(othersIndex: number, userRank0: number): number {
  return othersIndex + (othersIndex >= userRank0 ? 1 : 0);
}

export async function fetchLeaderboardPage(
  page: number,
  pageSize: number,
  options: {
    pinCurrentUser: boolean;
    currentUserAddress?: string;
    currentUserRank?: number;
    currentUserGt?: BN;
  }
): Promise<GtUserInfo[]> {
  const { pinCurrentUser, currentUserAddress, currentUserRank, currentUserGt } = options;

  if (!pinCurrentUser || !currentUserAddress || !currentUserRank || !currentUserGt) {
    const offset = (page - 1) * pageSize;
    return fetchRankedGtUsers(offset, pageSize);
  }

  const userRank0 = currentUserRank - 1;

  if (page === 1) {
    const topUsers = await fetchRankedGtUsers(0, pageSize);
    const otherUsers = topUsers
      .filter((user) => user.owner.toBase58() !== currentUserAddress)
      .slice(0, pageSize - 1);

    return [mapPinnedCurrentUser(currentUserAddress, currentUserGt), ...otherUsers];
  }

  const othersStart = (page - 1) * pageSize - 1;
  const othersEnd = othersStart + pageSize - 1;
  const globalStart = globalIndexForOthersIndex(othersStart, userRank0);
  const globalEnd = globalIndexForOthersIndex(othersEnd, userRank0);

  return fetchRankedGtUsers(globalStart, globalEnd - globalStart + 1);
}
