import { ClientConfig, MulticallBatchOptions } from "viem";

import {
  AnyChainId,
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  AVALANCHE_FUJI,
  BOTANIX,
  MEGAETH,
  SOURCE_BASE_MAINNET,
  SOURCE_BSC_MAINNET,
  SOURCE_ETHEREUM_MAINNET,
  SOURCE_OPTIMISM_SEPOLIA,
  SOURCE_SEPOLIA,
} from "./chains";

const DEFAULT_PROD_BATCH_CONFIG: {
  http: MulticallBatchOptions;
  client: ClientConfig["batch"];
} = {
  http: {
    batchSize: 0, // disable batches, here batchSize is the number of eth_calls in a batch
    wait: 0, // keep this setting in case batches are enabled in future
  },
  client: {
    multicall: {
      batchSize: 1024 * 1024, // here batchSize is the number of bytes in a multicall
      wait: 0, // zero delay means formation of a batch in the current macro-task, like setTimeout(fn, 0)
    },
  },
};

const DEFAULT_TESTNET_BATCH_CONFIG: {
  http: MulticallBatchOptions;
  client: ClientConfig["batch"];
} = {
  http: {
    batchSize: 40,
    wait: 100,
  },
  client: {
    multicall: {
      batchSize: 1024 * 1024,
      wait: 100,
    },
  },
};

const MEGAETH_BATCH_CONFIG: typeof DEFAULT_PROD_BATCH_CONFIG = {
  http: {
    batchSize: 0,
    wait: 0,
  },
  client: {
    multicall: {
      batchSize: 4_096,
      wait: 0,
    },
  },
};

export const BATCH_CONFIGS: Record<
  AnyChainId,
  {
    http: MulticallBatchOptions;
    client: ClientConfig["batch"];
  }
> = {
  [ARBITRUM]: DEFAULT_PROD_BATCH_CONFIG,
  [AVALANCHE]: DEFAULT_PROD_BATCH_CONFIG,
  [BOTANIX]: DEFAULT_PROD_BATCH_CONFIG,
  [MEGAETH]: MEGAETH_BATCH_CONFIG,

  [SOURCE_BASE_MAINNET]: DEFAULT_PROD_BATCH_CONFIG,
  [SOURCE_BSC_MAINNET]: DEFAULT_PROD_BATCH_CONFIG,
  [SOURCE_ETHEREUM_MAINNET]: DEFAULT_PROD_BATCH_CONFIG,

  [AVALANCHE_FUJI]: DEFAULT_TESTNET_BATCH_CONFIG,
  [ARBITRUM_SEPOLIA]: DEFAULT_TESTNET_BATCH_CONFIG,
  [SOURCE_OPTIMISM_SEPOLIA]: DEFAULT_TESTNET_BATCH_CONFIG,
  [SOURCE_SEPOLIA]: DEFAULT_TESTNET_BATCH_CONFIG,
};

export const SUBSQUID_PAGINATION_LIMIT = 500;
