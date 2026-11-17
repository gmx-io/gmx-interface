import chunk from "lodash/chunk";
import { Hash } from "viem";

import { getIndexerUrl } from "config/indexers";
import graphqlFetcher from "sdk/utils/graphqlFetcher";
import { decodeReferralCode } from "sdk/utils/referrals";

import type { CodeOwnershipInfo } from "../types";

type CodeOwnersGraphqlResponse = {
  referralCodes: Array<{ owner: string; id: string }>;
};

// subgraph defaults to 100 rows and caps `first` at 1000
const MAX_CODES_PER_QUERY = 1000;

const CODE_OWNERS_GQL = /* GraphQL */ `
  query allCodes($codes: [String!]!, $first: Int!) {
    referralCodes(first: $first, where: { code_in: $codes }) {
      owner
      id
    }
  }
`;

export async function getCodeOwnersData(
  chainId: number,
  account: string | null | undefined,
  codes: string[] = []
): Promise<CodeOwnershipInfo[] | undefined> {
  if (codes.length === 0 || !account || !chainId) {
    return undefined;
  }

  const referralsUrl = getIndexerUrl(chainId, "referrals");
  if (!referralsUrl) return undefined;

  const responses = await Promise.all(
    chunk(codes, MAX_CODES_PER_QUERY).map((codesChunk) =>
      graphqlFetcher<CodeOwnersGraphqlResponse>(referralsUrl, CODE_OWNERS_GQL, {
        codes: codesChunk,
        first: codesChunk.length,
      })
    )
  );

  const codeOwners: Record<string, string> = {};
  for (const res of responses) {
    if (!res) return undefined;

    for (const referralCode of res.referralCodes) {
      codeOwners[referralCode.id] = referralCode.owner;
    }
  }

  return codes.map((code) => {
    const owner = codeOwners[code];
    return {
      code,
      codeString: decodeReferralCode(code as Hash),
      owner,
      isTaken: Boolean(owner),
      isTakenByCurrentUser: owner ? owner.toLowerCase() === account.toLowerCase() : false,
    };
  });
}
