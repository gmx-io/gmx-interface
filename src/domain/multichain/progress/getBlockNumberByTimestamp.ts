import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { bigMath } from "sdk/utils/bigmath";

const BLOCKS_TO_GO_BACK = 100_000n;

/**
 * Returns a rough block number before the given timestamp.
 */
export async function getBlockNumberBeforeTimestamp(chainId: number, timestamp: bigint) {
  const currentBlock = await getPublicClientWithRpc(chainId).getBlock();

  if (timestamp >= currentBlock.timestamp) {
    return currentBlock.number;
  }

  const someOldBlock = await getPublicClientWithRpc(chainId).getBlock({
    blockNumber: bigMath.max(0n, currentBlock.number - BLOCKS_TO_GO_BACK),
  });

  const blockDiff = currentBlock.number - someOldBlock.number;
  const timeDiff = currentBlock.timestamp - someOldBlock.timestamp;

  let estimatedSearchedBlockNumber =
    bigMath.mulDiv(timestamp - someOldBlock.timestamp, blockDiff, timeDiff) + someOldBlock.number;

  estimatedSearchedBlockNumber = bigMath.max(0n, bigMath.min(estimatedSearchedBlockNumber, currentBlock.number));

  let searchedBlock = await getPublicClientWithRpc(chainId).getBlock({
    blockNumber: estimatedSearchedBlockNumber,
  });

  while (searchedBlock.timestamp > timestamp && searchedBlock.number > 0n) {
    const timeDiffFromTarget = searchedBlock.timestamp - timestamp;

    const blocksToGoBack = bigMath.max(1n, bigMath.mulDiv(timeDiffFromTarget, blockDiff, timeDiff));

    const newBlockNumber = bigMath.max(0n, searchedBlock.number - blocksToGoBack);
    searchedBlock = await getPublicClientWithRpc(chainId).getBlock({
      blockNumber: newBlockNumber,
    });
  }

  // If block timestamp is before searched timestamp, it's good enough
  return searchedBlock.number;
}
