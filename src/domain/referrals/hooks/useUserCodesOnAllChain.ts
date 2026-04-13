import { Hash } from "viem";

import { getIndexerUrl } from "config/indexers";
import graphqlFetcher from "sdk/utils/graphqlFetcher";
import { decodeReferralCode } from "sdk/utils/referrals";

import type { CodeOwnershipInfo } from "../types";

type CodeOwnersGraphqlResponse = {
  referralCodes: Array<{ owner: string; id: string }>;
};

const CODE_OWNERS_GQL = /* GraphQL */ `
  query allCodes($codes: [String!]!) {
    referralCodes(where: { code_in: $codes }) {
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

  const res = await graphqlFetcher<CodeOwnersGraphqlResponse>(referralsUrl, CODE_OWNERS_GQL, { codes });
  if (!res) return undefined;

  const codeOwners = res.referralCodes.reduce<Record<string, string>>((acc, cv) => {
    acc[cv.id] = cv.owner;
    return acc;
  }, {});

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
