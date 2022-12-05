import { Web3Provider } from "@ethersproject/providers";
import { ContractCallContext, ContractCallResults } from "ethereum-multicall";
import { sleep } from "lib/sleep";
import { CacheKey } from "./types";
import { executeMulticall } from "./utils";

const KEY_SEPARATOR = "::";

type ChainBatch = {
  batchDelay?: Promise<void>;
  listenners: {
    [key: string]: {
      resolve: (result: ContractCallResults) => void;
      reject: (e: Error) => void;
    };
  };
  requests: { [key: string]: ContractCallContext[] };
};

export class MulticallBatcher {
  batches: {
    [chainId: number]: ChainBatch;
  } = {};

  library: Web3Provider | undefined;

  constructor(public batchInterval = 10) {}

  setLibrary(library: Web3Provider) {
    this.library = library;
  }

  async processMulticall(chainId: number) {
    const batch = this.getCurrentBatch(chainId);

    const requestsKeys = Object.keys(batch.requests);
    const requests: ContractCallContext[] = [];

    requestsKeys.forEach((key) => {
      const req = batch.requests[key].map((requestItem) => ({
        ...requestItem,
        reference: `${key}${KEY_SEPARATOR}${requestItem.reference}`,
      }));

      delete batch.requests[key];

      requests.push(...req);
    });

    try {
      const results = await executeMulticall(chainId, this.library, requests, "batch");

      const responses = {};

      Object.keys(results.results).forEach((key) => {
        const [originalKey, reference] = key.split(KEY_SEPARATOR);

        responses[originalKey] = responses[originalKey] || {};

        responses[originalKey][reference] = {
          ...results.results[key],
        };
      });

      Object.keys(responses).forEach((key) => {
        batch.listenners[key].resolve({ results: responses[key] } as any);

        delete batch.listenners[key];
      });
    } catch (e) {
      requestsKeys.forEach((key) => {
        batch.listenners[key].reject(e);
        delete batch.listenners[key];
      });
    }
  }

  async registerRequest(chainId: number, req: ContractCallContext<any>[], cacheKey: CacheKey) {
    return new Promise<ContractCallResults>((resolve, reject) => {
      const key = cacheKey.join("-");
      const batch = this.getCurrentBatch(chainId);

      batch.requests[key] = req;
      batch.listenners[key] = { resolve, reject };

      if (!batch.batchDelay) {
        batch.batchDelay = sleep(this.batchInterval).then(() => {
          batch.batchDelay = undefined;
          this.processMulticall(chainId);
        });
      }
    });
  }

  getCurrentBatch(chainId: number) {
    // initialize with default
    this.batches[chainId] = this.batches[chainId] || {
      listenners: {},
      requests: {},
      batchDelay: undefined,
    };

    return this.batches[chainId];
  }
}
