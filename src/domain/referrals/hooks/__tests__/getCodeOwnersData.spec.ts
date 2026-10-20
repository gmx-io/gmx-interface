import { beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { encodeReferralCode } from "sdk/utils/referrals";

import { getCodeOwnersData } from "../useUserCodesOnAllChain";

const mocks = vi.hoisted(() => ({
  graphqlFetcher: vi.fn(),
}));

vi.mock("sdk/utils/graphqlFetcher", () => ({
  default: mocks.graphqlFetcher,
}));

const ACCOUNT = "0xB48EE0066723BA6a0b1a5a31A770F5f18cB1a21b";
const OTHER_OWNER = "0x38C7eD4a77D1Cf6196b710F1749409300579231b";

function getCodes(count: number) {
  return Array.from({ length: count }, (_, i) => encodeReferralCode(`code${i}`));
}

// mimics the subgraph: 100 rows unless `first` is passed, and `first` above 1000 is rejected
function mockSubgraph(owners: Record<string, string>) {
  mocks.graphqlFetcher.mockImplementation(
    async (_url: string, _query: string, variables: { codes: string[]; first?: number }) => {
      const first = variables.first ?? 100;
      if (first > 1000) {
        throw new Error("The `first` argument must be between 0 and 1000");
      }

      return {
        referralCodes: variables.codes
          .filter((code) => owners[code])
          .slice(0, first)
          .map((code) => ({ id: code, owner: owners[code] })),
      };
    }
  );
}

describe("getCodeOwnersData", () => {
  beforeEach(() => {
    mocks.graphqlFetcher.mockReset();
  });

  it("returns owners for every code when there are more than 100 codes", async () => {
    const codes = getCodes(363);
    mockSubgraph(Object.fromEntries(codes.map((code) => [code, OTHER_OWNER])));

    const result = await getCodeOwnersData(ARBITRUM, ACCOUNT, codes);

    expect(result).toHaveLength(363);
    expect(result!.every((info) => info.isTaken && !info.isTakenByCurrentUser)).toBe(true);
    expect(result![362]).toMatchObject({ codeString: "code362", owner: OTHER_OWNER });
  });

  it("splits more than 1000 codes into separate queries", async () => {
    const codes = getCodes(1500);
    const owners = Object.fromEntries(codes.map((code, i) => [code, i % 2 === 0 ? ACCOUNT : OTHER_OWNER]));
    mockSubgraph(owners);

    const result = await getCodeOwnersData(ARBITRUM, ACCOUNT, codes);

    expect(mocks.graphqlFetcher).toHaveBeenCalledTimes(2);
    expect(mocks.graphqlFetcher.mock.calls.map(([, , variables]) => variables.first)).toEqual([1000, 500]);
    expect(result).toHaveLength(1500);
    expect(result!.every((info) => info.isTaken)).toBe(true);
    expect(result![1499]).toMatchObject({ owner: OTHER_OWNER, isTakenByCurrentUser: false });
    expect(result![1498]).toMatchObject({ owner: ACCOUNT, isTakenByCurrentUser: true });
  });

  it("marks codes missing from the subgraph as not taken", async () => {
    const [ownedCode, freeCode] = getCodes(2);
    mockSubgraph({ [ownedCode]: OTHER_OWNER });

    const result = await getCodeOwnersData(ARBITRUM, ACCOUNT, [ownedCode, freeCode]);

    expect(result).toEqual([
      expect.objectContaining({ code: ownedCode, isTaken: true }),
      expect.objectContaining({ code: freeCode, owner: undefined, isTaken: false }),
    ]);
  });

  it("returns undefined when any chunk has no data", async () => {
    const codes = getCodes(1001);
    mocks.graphqlFetcher.mockResolvedValueOnce({ referralCodes: [] }).mockResolvedValueOnce(undefined);

    expect(await getCodeOwnersData(ARBITRUM, ACCOUNT, codes)).toBeUndefined();
  });
});
