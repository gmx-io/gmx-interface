import { encodeAbiParameters, type Hash } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM_SEPOLIA } from "config/chains";
import { getContract } from "config/contracts";
import { getRewardsVestingConfig } from "config/vesting";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";

import { fetchEsGmxDistributions } from "./esGmxDistributions";

vi.mock("lib/wallets/walletConfig", () => ({ getPublicClientWithRpc: vi.fn() }));

const account = "0x52908400098527886E0F7030069857D2E4169EE7";
const otherAccount = "0x2BE7f46c991dEFF90936fDbEdf987d6bb629BC51";
const config = getRewardsVestingConfig(ARBITRUM_SEPOLIA);
if (config.type !== "ratio") throw new Error("Expected ratio vesting config");
const issuerConfig = config;
const getLogs = vi.fn();
const getBlock = vi.fn();
const blockHash = `0x${"a".repeat(64)}` as Hash;
const transactionHash = `0x${"b".repeat(64)}` as Hash;

function makeLog(logIndex = 1) {
  return {
    removed: false,
    blockHash,
    transactionHash,
    logIndex,
    args: {
      msgSender: issuerConfig.issuer,
      eventName: "EsGmxIssued",
      eventData: {
        addressItems: { items: [{ key: "account", value: account }], arrayItems: [] },
        uintItems: {
          items: [
            { key: "amount", value: 100n * 10n ** 18n },
            { key: "epochId", value: 1_790_067_600n },
            { key: "batchIndex", value: 0n },
          ],
          arrayItems: [],
        },
        intItems: { items: [], arrayItems: [] },
        boolItems: { items: [], arrayItems: [] },
        bytes32Items: { items: [], arrayItems: [] },
        bytesItems: { items: [], arrayItems: [] },
        stringItems: { items: [], arrayItems: [] },
      },
    },
  };
}

describe("esGMX issuer distribution history", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getPublicClientWithRpc).mockReturnValue({ getLogs, getBlock } as any);
    getLogs.mockResolvedValue([makeLog()]);
    getBlock.mockResolvedValue({ timestamp: 1_790_069_000n });
  });

  it("loads actual issuance amounts from the configured deployment and account", async () => {
    const entries = await fetchEsGmxDistributions(ARBITRUM_SEPOLIA, account, issuerConfig);
    expect(getLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        address: getContract(ARBITRUM_SEPOLIA, "EventEmitter"),
        fromBlock: issuerConfig.issuerDeploymentBlock,
        args: { eventNameHash: "EsGmxIssued", topic1: encodeAbiParameters([{ type: "address" }], [account]) },
      })
    );
    expect(entries).toEqual([
      {
        id: `esGmxIssuer-${transactionHash}-1`,
        amount: 100n * 10n ** 18n,
        epochId: 1_790_067_600n,
        batchIndex: 0n,
        timestamp: 1_790_069_000,
        transactionHash,
      },
    ]);
  });

  it("excludes other issuers, other recipients, removed logs, and non-issuance events", async () => {
    const wrongIssuer = makeLog();
    wrongIssuer.args.msgSender = otherAccount;
    const wrongRecipient = makeLog();
    wrongRecipient.args.eventData.addressItems.items[0].value = otherAccount;
    const removed = { ...makeLog(), removed: true };
    const claimed = makeLog();
    claimed.args.eventName = "EsGmxIssuerClaim";
    getLogs.mockResolvedValue([wrongIssuer, wrongRecipient, removed, claimed]);
    expect(await fetchEsGmxDistributions(ARBITRUM_SEPOLIA, account, issuerConfig)).toEqual([]);
    expect(getBlock).not.toHaveBeenCalled();
  });

  it("keeps distinct batches in one transaction and fetches each block only once", async () => {
    const first = makeLog(1);
    const second = makeLog(2);
    second.args.eventData.uintItems.items[2].value = 1n;
    getLogs.mockResolvedValue([first, second]);
    const entries = await fetchEsGmxDistributions(ARBITRUM_SEPOLIA, account, issuerConfig);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(2);
    expect(entries.map((entry) => entry.batchIndex)).toEqual([0n, 1n]);
    expect(getBlock).toHaveBeenCalledTimes(1);
  });

  it("sorts by the actual block timestamp, not the reward epoch", async () => {
    const later = { ...makeLog(2), blockHash: `0x${"c".repeat(64)}` as Hash };
    getLogs.mockResolvedValue([makeLog(), later]);
    getBlock.mockResolvedValueOnce({ timestamp: 100n }).mockResolvedValueOnce({ timestamp: 200n });
    expect(
      (await fetchEsGmxDistributions(ARBITRUM_SEPOLIA, account, issuerConfig)).map((entry) => entry.timestamp)
    ).toEqual([200, 100]);
  });

  it("surfaces RPC failures instead of returning an empty history", async () => {
    getLogs.mockRejectedValue(new Error("RPC unavailable"));
    await expect(fetchEsGmxDistributions(ARBITRUM_SEPOLIA, account, issuerConfig)).rejects.toThrow("RPC unavailable");
  });

  it("rejects incomplete issuance events", async () => {
    const log = makeLog();
    log.args.eventData.uintItems.items = [];
    getLogs.mockResolvedValue([log]);
    await expect(fetchEsGmxDistributions(ARBITRUM_SEPOLIA, account, issuerConfig)).rejects.toThrow(
      "Incomplete esGMX distribution event"
    );
  });
});
