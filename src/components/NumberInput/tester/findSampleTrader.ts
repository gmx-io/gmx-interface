// Tester for the long numbers design review: finds a trader with an open USDC-margin position from public market data,
// so no address is written into the code. Local only, never merged.
import { gql } from "@apollo/client";

import { getSubsquidGraphClient } from "lib/indexers/clients";

type Result = {
  positions: { account: string }[];
};

export async function findSampleTrader(chainId: number, collateralTokenAddress: string): Promise<string | undefined> {
  const client = getSubsquidGraphClient(chainId);
  if (!client) return undefined;

  const { data } = await client.query<Result>({
    query: gql`
      query LongNumbersTesterTraders($collateral: String!) {
        positions(
          where: { collateralToken_eq: $collateral, sizeInUsd_gt: "0", isSnapshot_eq: false }
          orderBy: sizeInUsd_DESC
          limit: 20
        ) {
          account
        }
      }
    `,
    variables: { collateral: collateralTokenAddress },
    fetchPolicy: "no-cache",
  });

  return data?.positions?.[0]?.account;
}
