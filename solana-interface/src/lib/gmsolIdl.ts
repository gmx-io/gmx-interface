import type { Idl } from "@coral-xyz/anchor";

/**
 * Anchor's `Program` converts IDL names to camelCase before building its coder, but the
 * standalone `BorshCoder` does not, and `convertIdlToCamelCase` is not exported from the
 * package root. This mirrors that conversion so `coder.accounts.decode("position", …)`
 * returns camelCase fields (`marketToken`, `state.sizeInUsd`, `meta.indexTokenMint`).
 */
const KEYS_TO_CONVERT = new Set(["name", "path", "account", "relations", "generic"]);

export function toAnchorCamelCase(value: string): string {
  return value
    .split(".")
    .map((segment) => {
      const parts = segment.split(/[_\s-]+/).filter(Boolean);
      if (parts.length === 0) return segment;
      return parts
        .map((part, index) => {
          const lower = part.toLowerCase();
          return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join("");
    })
    .join(".");
}

function convertNames(node: unknown): void {
  if (!node || typeof node !== "object") return;
  const record = node as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (KEYS_TO_CONVERT.has(key)) {
      if (Array.isArray(value))
        record[key] = value.map((item) => (typeof item === "string" ? toAnchorCamelCase(item) : item));
      else if (typeof value === "string") record[key] = toAnchorCamelCase(value);
    } else if (typeof value === "object") {
      convertNames(value);
    }
  }
}

export function camelCaseGmsolIdl<I extends Idl>(idl: I): I {
  const copy = structuredClone(idl);
  convertNames(copy);
  return copy;
}
