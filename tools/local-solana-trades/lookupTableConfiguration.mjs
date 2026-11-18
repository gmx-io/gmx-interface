import path from "node:path";

// Share the experimental no-LUT configuration across serving, building and simulation.
export function withoutLookupTables(root) {
  const config = path.join(root, "src/config/gmsol/lookupTables.ts");
  return {
    name: "trd136-no-lookup-tables",
    enforce: "pre",
    transform(_source, id) {
      if (id.split("?")[0] === config) {
        return {
          code: "export const GMSOL_LOOKUP_TABLE_ADDRESSES = []; export const GMSOL_LOOKUP_TABLE_AUTHORITIES = {};",
          map: { mappings: "" },
        };
      }
    },
  };
}
