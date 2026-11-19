import path from "node:path";

export function enableSolanaNetwork(root) {
  const config = path.join(root, "src/config/ab.ts");
  return {
    name: "trd136-enable-solana-network",
    enforce: "pre",
    transform(source, id) {
      if (id.split("?")[0] !== config) return;

      const defaultShare = "solanaNetwork: 0,";
      if (!source.includes(defaultShare)) {
        this.error("The playground Solana AB flag override no longer matches src/config/ab.ts");
      }

      return {
        code: source.replace(defaultShare, "solanaNetwork: 1,"),
        map: { mappings: "" },
      };
    },
  };
}
