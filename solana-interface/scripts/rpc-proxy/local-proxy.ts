import { startLocalRpcProxy } from "./createLocalRpcProxy";

void startLocalRpcProxy().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
