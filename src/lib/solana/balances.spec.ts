import { address, getAddressDecoder, getAddressEncoder, getBase64Decoder } from "@solana/kit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SOLANA_SYSTEM_PROGRAM_ID, SOLANA_TOKEN_PROGRAM_ID } from "config/gmsol/program";
import { GMSOL_NATIVE_TOKEN, GMSOL_TOKENS } from "config/gmsol/tokens";
import { getSolanaRpcUrl } from "config/rpc";

import { fetchSolanaBalances } from "./balances";
import { fetchSolanaAccounts } from "./rpc";

const nativeAbort = vi.hoisted(() => {
  // Kit captures the controller at import time; its Node transport needs the native implementation.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { transferableAbortController } = require("node:util");
  const controller = transferableAbortController();
  vi.stubGlobal("AbortController", controller.constructor);
  vi.stubGlobal("AbortSignal", controller.signal.constructor);
  return { Controller: controller.constructor, Signal: controller.signal.constructor };
});

const owner = SOLANA_SYSTEM_PROGRAM_ID;
const amount = 9007199254740993n;
const token = GMSOL_TOKENS.find((token) => token.tokenProgram === SOLANA_TOKEN_PROGRAM_ID)!;
const token2022 = GMSOL_TOKENS.find((token) => token.tokenProgram !== SOLANA_TOKEN_PROGRAM_ID)!;

function tokenAccount(mint = token.address, program: string = token.tokenProgram, size = 165) {
  const bytes = new Uint8Array(size);
  const mintBytes = getAddressEncoder().encode(address(mint));
  const ownerBytes = getAddressEncoder().encode(address(owner));
  for (let index = 0; index < 32; index++) {
    bytes[index] = mintBytes[index];
    bytes[index + 32] = ownerBytes[index];
  }
  new DataView(bytes.buffer).setBigUint64(64, amount, true);
  bytes[108] = 1;
  if (size > 165) bytes[165] = 2;
  return { bytes, program };
}

function mockRpc(account = tokenAccount(), mode?: string) {
  const calls: string[][] = [];
  const tokenIndex = account.program === token.tokenProgram ? 1 : GMSOL_TOKENS.indexOf(token2022) + 1;
  const native = {
    owner: mode === "nativeOwner" ? token.tokenProgram : owner,
    executable: false,
    lamports: 1234,
    data: ["", "base64"],
    space: 0,
  };
  const encoded = { ...native, owner: account.program, data: [getBase64Decoder().decode(account.bytes), "base64"] };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, init) => {
      expect(String(url)).toBe(getSolanaRpcUrl());
      const { id, method, params } = JSON.parse(init.body);
      expect(method).toBe("getMultipleAccounts");
      calls.push(params[0]);
      const value = params[0].map((_: string, index: number) =>
        mode === "missing" ? null : index === 0 ? native : index === tokenIndex ? encoded : null
      );
      const payload =
        mode === "rpc"
          ? { error: { code: -32000, message: "RPC unavailable" } }
          : { result: { context: { slot: 1 }, value: mode === "incomplete" ? [] : value } };
      return new Response(JSON.stringify({ jsonrpc: "2.0", id, ...payload }));
    })
  );
  return calls;
}

beforeEach(() => {
  vi.stubGlobal("AbortController", nativeAbort.Controller);
  vi.stubGlobal("AbortSignal", nativeAbort.Signal);
});
afterEach(() => vi.unstubAllGlobals());

describe("configured Solana balances", () => {
  it.each([
    tokenAccount(),
    tokenAccount(token2022.address, token2022.tokenProgram, 170),
    { ...tokenAccount(), bytes: tokenAccount().bytes.map((byte, i) => (i >= 64 && i < 72 ? 0 : byte)) },
  ])("keeps raw precision, native SOL and missing ATAs with both token programs", async (account) => {
    const calls = mockRpc(account);
    const balances = await fetchSolanaBalances(owner);
    expect(balances[GMSOL_NATIVE_TOKEN.address]).toBe(1234n);
    expect(balances[account.program === token.tokenProgram ? token.address : token2022.address]).toBe(
      new DataView(account.bytes.buffer).getBigUint64(64, true)
    );
    expect(Object.values(balances).filter((balance) => balance === 0n)).toHaveLength(
      GMSOL_TOKENS.length - (account.bytes[64] ? 1 : 0)
    );
    expect(calls[0][0]).toBe(owner);
    expect(calls[0][1]).toBe("HsaAttyEh3fnaPoVnuogmmoAys5gsTEnHvASxeFKhXBa");
    expect(calls[0][GMSOL_TOKENS.indexOf(token2022) + 1]).toBe("A3k6WpTFtWMtFfiNGbAKi3Y3WEELwqMXK6bMLaUaH4j5");
    expect(new Set(calls[0]).size).toBe(GMSOL_TOKENS.length + 1);
  });

  it.each(["mint", "owner", "program", "state", "size", "extension", "rpc", "nativeOwner"])(
    "rejects invalid %s instead of reporting a partial snapshot",
    async (failure) => {
      const account =
        failure === "extension" ? tokenAccount(token2022.address, token2022.tokenProgram, 166) : tokenAccount();
      if (failure === "mint") account.bytes.fill(0, 0, 32);
      if (failure === "owner") account.bytes.fill(1, 32, 64);
      if (failure === "program") account.program = SOLANA_SYSTEM_PROGRAM_ID;
      if (failure === "state") account.bytes[108] = 0;
      if (failure === "size") account.bytes = account.bytes.slice(0, 164);
      if (failure === "extension") account.bytes[165] = 1;
      mockRpc(account, failure);
      await expect(fetchSolanaBalances(owner)).rejects.toThrow();
    }
  );

  it("reports zero for an unfunded owner and absent ATAs", async () => {
    mockRpc(tokenAccount(), "missing");
    const balances = await fetchSolanaBalances(owner);
    expect(Object.keys(balances)).toHaveLength(GMSOL_TOKENS.length + 1);
    expect(Object.values(balances).every((balance) => balance === 0n)).toBe(true);
  });

  it("batches at 100 addresses and rejects missing batch entries", async () => {
    const calls = mockRpc();
    expect(
      await fetchSolanaAccounts(
        Array.from({ length: 201 }, (_, index) => {
          const bytes = new Uint8Array(32);
          new DataView(bytes.buffer).setUint16(0, index);
          return getAddressDecoder().decode(bytes);
        })
      )
    ).toHaveLength(201);
    expect(calls.map((batch) => batch.length)).toEqual([100, 100, 1]);
    mockRpc(tokenAccount(), "incomplete");
    await expect(fetchSolanaBalances(owner)).rejects.toThrow("incomplete");
  });
});
