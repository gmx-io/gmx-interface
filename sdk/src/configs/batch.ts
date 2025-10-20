import { ClientConfig, MulticallBatchOptions } from "viem";

import {
  AnyChainId,
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  AVALANCHE_FUJI,
  BOTANIX,
  SOURCE_BASE_MAINNET,
  SOURCE_BSC_MAINNET,
  SOURCE_OPTIMISM_SEPOLIA,
  SOURCE_SEPOLIA,
} from "./chains";

export const BATCH_CONFIGS: Record<
  AnyChainId,
  {
    http: MulticallBatchOptions;
    client: ClientConfig["batch"];
  }
> = {
  [ARBITRUM]: {
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
  },
  [AVALANCHE]: {
    http: {
      batchSize: 0,
      wait: 0,
    },
    client: {
      multicall: {
        batchSize: 1024 * 1024,
        wait: 0,
      },
    },
  },

  [SOURCE_BASE_MAINNET]: {
    http: {
      batchSize: 0,
      wait: 0,
    },
    client: {
      multicall: {
        batchSize: 1024 * 1024,
        wait: 0,
      },
    },
  },
  [SOURCE_BSC_MAINNET]: {
    http: {
      batchSize: 0,
      wait: 0,
    },
    client: {
      multicall: {
        batchSize: 1024 * 1024,
        wait: 0,
      },
    },
  },

  [AVALANCHE_FUJI]: {
    http: {
      batchSize: 40,
      wait: 0,
    },
    client: {
      multicall: {
        batchSize: 1024 * 1024,
        wait: 0,
      },
    },
  },
  [BOTANIX]: {
    http: {
      batchSize: 0,
      wait: 0,
    },
    client: {
      multicall: {
        batchSize: 1024 * 1024,
        wait: 0,
      },
    },
  },
  [ARBITRUM_SEPOLIA]: {
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
  },
  [SOURCE_OPTIMISM_SEPOLIA]: {
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
  },
  [SOURCE_SEPOLIA]: {
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
  },
};
