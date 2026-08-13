import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchRawClaimActions } from "./useClaimHistory";

const queryMock = vi.fn();

vi.mock("lib/indexers", () => ({
  getSubsquidGraphClient: () => ({ query: queryMock }),
}));

describe("fetchRawClaimActions", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue({ data: { claimActions: [] } });
  });

  it("filters by the indexed scalar timestamp fields", async () => {
    await fetchRawClaimActions({
      chainId: 42161,
      account: "0xAccount",
      pageIndex: 0,
      pageSize: 300,
      fromTxTimestamp: 1783425600,
      toTxTimestamp: 1786620000,
    });

    const body = queryMock.mock.calls[0][0].query.loc.source.body;
    expect(body).toContain("timestamp_gte:1783425600");
    expect(body).toContain("timestamp_lte:1786620000");
    // transaction_timestamp_* is not a valid ClaimActionWhereInput field and fails the whole query
    expect(body).not.toContain("transaction_timestamp");
  });
});
