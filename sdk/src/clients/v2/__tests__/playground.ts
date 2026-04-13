import { ARBITRUM } from "configs/chains";
import { GmxApiSdk } from "../index";

const ACCOUNT = process.env.GMX_TEST_ACCOUNT ?? process.env.GMX_PLAYGROUND_ACCOUNT;

if (!ACCOUNT) {
  console.error("Set GMX_TEST_ACCOUNT or GMX_PLAYGROUND_ACCOUNT env var");
  process.exit(1);
}

async function main() {
  const sdk = new GmxApiSdk({ chainId: ARBITRUM });

  console.log("Fetching positions for", ACCOUNT, "...\n");

  const positions = await sdk.fetchPositionsInfo({ address: ACCOUNT });

  if (!positions.length) {
    console.log("No open positions found.");
    return;
  }

  console.log(`Found ${positions.length} position(s):\n`);

  for (const pos of positions) {
    const sizeUsd = Number(pos.sizeInUsd) / 1e30;
    const collateralUsd = Number(pos.collateralUsd) / 1e30;
    const entryPrice = pos.entryPrice !== undefined ? Number(pos.entryPrice) / 1e30 : undefined;
    const leverage = pos.leverage !== undefined ? Number(pos.leverage) / 1e4 : undefined;
    const pnl = Number(pos.pnlAfterFees) / 1e30;

    console.log("---");
    console.log("  Key:", pos.key);
    console.log("  Market:", pos.marketAddress);
    console.log("  Collateral Token:", pos.collateralTokenAddress);
    console.log("  Side:", pos.isLong ? "LONG" : "SHORT");
    console.log("  Size (USD):", `$${sizeUsd.toFixed(2)}`);
    console.log("  Collateral (USD):", `$${collateralUsd.toFixed(2)}`);
    console.log("  Entry Price:", entryPrice !== undefined ? `$${entryPrice.toFixed(2)}` : "N/A");
    console.log("  Leverage:", leverage !== undefined ? `${leverage.toFixed(2)}x` : "N/A");
    console.log("  PnL after fees:", `$${pnl.toFixed(2)}`);
    console.log();
  }
}

main().catch(console.error);
