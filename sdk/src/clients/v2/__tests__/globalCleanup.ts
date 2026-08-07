import { expressFlow, getTestSdk, getTestSigner, waitForOrderStatus } from "./testUtil";

/**
 * The funded suite trades a shared wallet, so anything a failed run leaves behind — resting
 * orders and open positions — locks collateral and skews the next run's starting state.
 * Sweep before the run so it starts flat, and again after so nothing is left holding funds.
 */
async function sweep(label: string): Promise<void> {
  const signer = getTestSigner();
  if (!signer) return;

  const sdk = getTestSdk();
  const account = signer.address;

  try {
    const orders = await sdk.fetchOrders({ address: account });

    if (orders.length > 0) {
      const prepared = await sdk.prepareCancelOrder({ all: true, mode: "express", from: account });
      const signature = await sdk.signOrder(prepared, signer);
      await sdk.submitOrder({
        mode: prepared.mode,
        requestId: prepared.requestId,
        signature,
        from: account,
        idempotencyKey: prepared.idempotencyKey,
        eip712Data: {
          batchParams: prepared.payload.batchParams,
          relayParams: prepared.payload.relayParams,
        },
      });
      // eslint-disable-next-line no-console
      console.log(`[cleanup:${label}] cancelled ${orders.length} resting order(s)`);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`[cleanup:${label}] cancel-all failed:`, (error as Error).message);
  }

  // Positions can reappear while a close settles, so re-read rather than trusting one snapshot.
  for (let attempt = 0; attempt < 4; attempt++) {
    let positions: any[];

    try {
      positions = await sdk.fetchPositionsInfo({ address: account });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`[cleanup:${label}] fetchPositions failed:`, (error as Error).message);
      return;
    }

    const open = positions.filter((p) => BigInt(p.sizeInUsd) > 0n);
    if (open.length === 0) return;

    for (const position of open) {
      try {
        const { submitted } = await expressFlow(sdk, signer, {
          kind: "decrease",
          symbol: position.marketAddress,
          direction: position.isLong ? "long" : "short",
          orderType: "market",
          size: BigInt(position.sizeInUsd),
          collateralToken: position.collateralTokenAddress,
          // Settle back into USDC, otherwise the wallet slowly drains into the index token.
          receiveToken: "USDC",
          mode: "express",
          from: account,
        });

        await waitForOrderStatus(sdk, submitted.requestId);
        // eslint-disable-next-line no-console
        console.log(`[cleanup:${label}] closed position on ${position.marketAddress}`);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`[cleanup:${label}] close failed for ${position.marketAddress}:`, (error as Error).message);
      }
    }
  }
}

export default async function setup() {
  await sweep("before");

  return async () => {
    await sweep("after");
  };
}
