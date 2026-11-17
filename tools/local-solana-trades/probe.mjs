import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { encodeBase58 } from "ethers";

// Same store/discriminator filters as the reviewed API indexer. No data slicing or omitted accounts.
const url = process.env.TRD136_RPC_URL;
if (!url) throw new Error("Set TRD136_RPC_URL to an authorized read/simulation RPC endpoint");
const report = { checkedAt: new Date().toISOString(), genesis: undefined, scans: [] };
try {
  const rpc = async (method, params) => {
    const startedAt = performance.now();
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(25000),
    });
    const body = await response.text();
    const json = JSON.parse(body);
    if (!response.ok || json.error)
      throw new Error(`${method} failed (HTTP ${response.status}, RPC ${json.error?.code ?? "unknown"})`);
    return {
      result: json.result,
      elapsedMs: Math.round(performance.now() - startedAt),
      responseBytes: Buffer.byteLength(body),
    };
  };
  report.genesis = (await rpc("getGenesisHash", [])).result;
  if (report.genesis !== "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d")
    throw new Error("Mainnet is required for the fixed store configuration");
  for (const [kind, name, offset] of [
    ["position", "Position", 10],
    ["order", "Order", 24],
    ["user", "UserHeader", 56],
  ]) {
    const { result, elapsedMs, responseBytes } = await rpc("getProgramAccounts", [
      "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo",
      {
        encoding: "base64",
        commitment: "confirmed",
        withContext: true,
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: encodeBase58(createHash("sha256").update(`account:${name}`).digest().subarray(0, 8)),
            },
          },
          { memcmp: { offset, bytes: "CTDLvGGXnoxvqLyTpGzdGLg9pD6JexKxKXSV8tqqo8bN" } },
        ],
      },
    ]);
    report.scans.push({
      kind,
      elapsedMs,
      responseBytes,
      slot: result.context.slot,
      count: result.value.length,
      partial: result.pageKey !== undefined && result.pageKey !== null,
    });
  }
  await mkdir(".local/trd-136", { recursive: true });
  await writeFile(".local/trd-136/rpc-capacity.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  // No persistent RPC process is started by this diagnostic.
}
