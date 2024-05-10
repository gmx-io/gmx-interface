import { gql } from "@apollo/client";

import { getReferralsGraphClient } from "lib/subgraph";

import type { CodeOwnershipInfo } from "../types";
import { decodeReferralCode } from "../utils";

const CODE_OWNERS_GQL = gql`
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
  return getReferralsGraphClient(chainId)
    .query({ query: CODE_OWNERS_GQL, variables: { codes } })
    .then(({ data }) => {
      const { referralCodes } = data;
      const codeOwners = referralCodes.reduce((acc, cv) => {
        acc[cv.id] = cv.owner;
        return acc;
      }, {});
      return codes.map((code) => {
        const owner = codeOwners[code];
        return {
          code,
          codeString: decodeReferralCode(code),
          owner,
          isTaken: Boolean(owner),
          isTakenByCurrentUser: owner && owner.toLowerCase() === account.toLowerCase(),
        };
      });
    });
}
