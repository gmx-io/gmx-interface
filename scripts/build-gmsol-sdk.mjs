import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const root = fileURLToPath(new URL("../", import.meta.url));
const vendor = path.join(root, "vendor/gmsol-sdk");
const manifestPath = path.join(vendor, "build.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
assert.equal(`${process.platform}-${process.arch}`, manifest.platform, "Use the pinned Linux arm64 builder image");
const { values } = parseArgs({ options: { write: { type: "boolean" }, "source-dir": { type: "string" } } });
const temporary = mkdtempSync(path.join(tmpdir(), "gmx-gmsol-sdk-"));
const source = values["source-dir"] ? path.resolve(values["source-dir"]) : path.join(temporary, "source");
const output = path.join(temporary, "pkg");
const env = { ...process.env, RUSTUP_TOOLCHAIN: manifest.rust };
const cargoHome = process.env.CARGO_HOME || path.join(homedir(), ".cargo");
const rustupHome = process.env.RUSTUP_HOME || path.join(homedir(), ".rustup");
// Panic locations otherwise embed host-specific registry/source paths in the WASM.
env.CARGO_ENCODED_RUSTFLAGS = [
  `--remap-path-prefix=${source}=/gmx-solana`,
  `--remap-path-prefix=${cargoHome}=/cargo`,
  `--remap-path-prefix=${rustupHome}=/rustup`,
].join("\x1f");
delete env.RUSTFLAGS;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const run = (command, args, cwd = source) =>
  execFileSync(command, args, { cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
const files = [
  "index.js",
  "index_bg.js",
  "index.d.ts",
  "index_bg.wasm",
  "index_bg.wasm.d.ts",
  "package.json",
  "README.md",
  "LICENSE",
];

try {
  if (!values["source-dir"]) {
    mkdirSync(source);
    run("git", ["init", "--quiet"]);
    run("git", ["fetch", "--depth=1", manifest.repository, manifest.revision]);
    run("git", ["checkout", "--detach", "FETCH_HEAD"]);
  }
  assert.equal(run("git", ["rev-parse", "HEAD"]), manifest.revision, "Unexpected gmsol source revision");
  assert.equal(run("git", ["status", "--porcelain", "--untracked-files=all"]), "", "gmsol source must be clean");
  assert.equal(sha256(readFileSync(path.join(source, "Cargo.lock"))), manifest.cargoLockSha256, "Cargo.lock changed");
  const upstream = JSON.parse(readFileSync(path.join(source, "crates/sdk/package.json"), "utf8"));
  assert.equal(upstream.version, manifest.version, "Unexpected upstream SDK version");
  assert.ok(run("rustc", ["--version"]).startsWith(`rustc ${manifest.rust} (`), "Unexpected Rust version");
  assert.equal(run("wasm-pack", ["--version"]), `wasm-pack ${manifest.wasmPack}`, "Unexpected wasm-pack version");

  // Rust release LTO is enabled upstream. Skip the unpinned, downloaded wasm-opt pass.
  run("wasm-pack", [
    "build",
    "crates/sdk",
    "--release",
    "--target",
    "bundler",
    "--out-name",
    "index",
    "--scope",
    "gmsol-labs",
    "--no-opt",
    "--out-dir",
    output,
    "--",
    "--locked",
    "--features",
    "js",
  ]);
  assert.equal(sha256(readFileSync(path.join(source, "Cargo.lock"))), manifest.cargoLockSha256);
  const generated = JSON.parse(readFileSync(path.join(output, "package.json"), "utf8"));
  assert.equal(generated.version, manifest.version);
  // wasm-pack preserves the upstream relative license path, which is invalid once vendored.
  generated.license = "SEE LICENSE IN LICENSE";
  generated.files.push("index_bg.wasm.d.ts", "LICENSE");
  writeFileSync(path.join(output, "package.json"), JSON.stringify(generated, null, 2) + "\n");
  writeFileSync(path.join(output, "LICENSE"), readFileSync(path.join(source, "LICENSE")));

  const hashes = {};
  for (const file of files) {
    const bytes = readFileSync(path.join(output, file));
    hashes[file] = sha256(bytes);
    if (values.write) {
      writeFileSync(path.join(vendor, file), bytes);
    } else {
      assert.equal(hashes[file], manifest.files[file], `Rebuilt ${file} differs from its approved hash`);
      assert.ok(
        bytes.equals(readFileSync(path.join(vendor, file))),
        `Rebuilt ${file} differs from the committed artifact`
      );
    }
  }
  if (values.write) {
    writeFileSync(manifestPath, JSON.stringify({ ...manifest, files: hashes }, null, 2) + "\n");
  }
  console.log(`GMX gmsol SDK ${manifest.version}: ${values.write ? "written" : "verified"}`);
  console.log(`WASM SHA-256: ${hashes["index_bg.wasm"]}`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
