import { describe, expect, it } from "vitest";

import { ARBITRUM_SEPOLIA, SOURCE_BASE_MAINNET } from "sdk/configs/chains";

import { getBlockNumberBeforeTimestamp } from "../getBlockNumberByTimestamp";
import { watchLzTxApi, watchLzTxRpc, type LzStatus } from "../watchLzTx";

describe("getBlockNumberByTimestamp", () => {
  it("should return the block number for a given timestamp", async () => {
    const timestamp = 1730624700n;

    const result = await getBlockNumberBeforeTimestamp(ARBITRUM_SEPOLIA, timestamp);

    expect(result).toBeGreaterThan(0n);
    expect(result).toBeLessThanOrEqual(211319488n);
    expect(typeof result).toBe("bigint");
  });
});

describe.concurrent("watchLzTx watchers (Arbitrum withdraw)", () => {
  const TX_HASH = "0x1d84b3cb0b93d1634ccbc1916dc7d9d03a65556d4badcf6327480d64403e271f";

  const EXPECTED_FINAL_UPDATE_CALL: LzStatus[] = [
    {
      guid: "0x6f5fc6e2b86ffff601709c3a83d8c87c9e3cff957ae28137e7af66ae6d464efa",
      source: "confirmed",
      sourceTx: "0x1d84b3cb0b93d1634ccbc1916dc7d9d03a65556d4badcf6327480d64403e271f",
      destination: "confirmed",
      destinationTx: "0x5e2e5dc0a428f6ce54c3464aacf6a3a94b3a213fbc6811cca71bddfc9d32d354",
      destinationChainId: 42161,
      lz: "confirmed",
      lzTx: "0x06eb415c4b93c73ef7ec4cc498e360ae92d8674cf59d436dd0b7ced6120ffa33",
    },
  ];

  it("watchLzTxApi", async () => {
    let lastUpdateCall: LzStatus[] = [];

    await watchLzTxApi(SOURCE_BASE_MAINNET, TX_HASH, (data) => {
      lastUpdateCall = data;
    });

    expect(lastUpdateCall).toEqual(EXPECTED_FINAL_UPDATE_CALL);
  }, 30_000);

  it("watchLzTxRpc (with compose)", async () => {
    let lastUpdateCall: LzStatus[] = [];

    const onUpdate = (data: LzStatus[]) => {
      lastUpdateCall = data;
    };

    await watchLzTxRpc(SOURCE_BASE_MAINNET, TX_HASH, onUpdate, true);

    expect(lastUpdateCall).toEqual(EXPECTED_FINAL_UPDATE_CALL);
  }, 30_000);
});

// prod glv buy
// 0xad92d1f23344ef580d57cffe75000938842b552c76744f4695efa4def34c88f6
describe.concurrent("watchLzTx watchers (Arbitrum withdraw)", () => {
  const TX_HASH = "0xad92d1f23344ef580d57cffe75000938842b552c76744f4695efa4def34c88f6";

  const EXPECTED_FINAL_UPDATE_CALL: LzStatus[] = [
    {
      destination: "confirmed",
      destinationChainId: 42161,
      destinationTx: "0x6259e63a59a687c71988ec41f4a283b747c164268cc77f52249e5adbc1f3c15d",
      guid: "0x3451cd5398e7ee4ac70f861c9ad2e3f4bfd8d2248ae057e93c9fedc6e26e2992",
      lz: "confirmed",
      lzTx: "0x83be6975aa478cbad9d88dbcc151d127f288be1a23018ca26bd454f8f943b640",
      source: "confirmed",
      sourceTx: "0xad92d1f23344ef580d57cffe75000938842b552c76744f4695efa4def34c88f6",
    },
  ];

  it("watchLzTxApi", async () => {
    let lastUpdateCall: LzStatus[] = [];

    await watchLzTxApi(SOURCE_BASE_MAINNET, TX_HASH, (data) => {
      lastUpdateCall = data;
    });

    expect(lastUpdateCall).toEqual(EXPECTED_FINAL_UPDATE_CALL);
  }, 30_000);

  it("watchLzTxRpc (with compose)", async () => {
    let lastUpdateCall: LzStatus[] = [];

    const onUpdate = (data: LzStatus[]) => {
      lastUpdateCall = data;
    };

    await watchLzTxRpc(SOURCE_BASE_MAINNET, TX_HASH, onUpdate, true);

    expect(lastUpdateCall).toEqual(EXPECTED_FINAL_UPDATE_CALL);
  }, 30_000);
});
