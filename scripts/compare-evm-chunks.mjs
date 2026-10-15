import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

async function javascriptHashes(root, directory = "") {
  const hashes = {};
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const relative = path.join(directory, entry.name);
    if (directory === "" && entry.name === "gmsol-sdk") continue;
    if (entry.isDirectory()) {
      Object.assign(hashes, await javascriptHashes(root, relative));
    } else if (entry.name.endsWith(".js")) {
      hashes[relative] = createHash("sha256")
        .update(await readFile(path.join(root, relative)))
        .digest("hex");
    }
  }
  return hashes;
}

const [before, after] = process.argv.slice(2);
assert(before && after, "Usage: node scripts/compare-evm-chunks.mjs <baseline-output> <current-output>");
const baseline = await javascriptHashes(before);
const current = await javascriptHashes(after);
assert(Object.keys(baseline).length > 0, "The baseline must contain JavaScript files");
assert.deepEqual(current, baseline, "EVM JavaScript filenames or SHA-256 hashes changed");
console.log(`Verified ${Object.keys(baseline).length} unchanged JavaScript files (excluding gmsol-sdk/).`);
