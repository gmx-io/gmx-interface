
import fetch from 'node-fetch';
import {SourceMapConsumer} from 'source-map';

const errorString = `TypeError: Failed to fetch
    at Uz.fetchOracleCandles (https://app.gmx.io/assets/index-CB-WICZY.js:11:95333)
    at xst.getLimitBars (https://app.gmx.io/assets/index-CB-WICZY.js:935:127532)
    at xst.getTokenLastBars (https://app.gmx.io/assets/index-CB-WICZY.js:749:61104)
    at xst.updateLiveBars (https://app.gmx.io/assets/index-CB-WICZY.js:749:60554)
    at https://app.gmx.io/assets/index-CB-WICZY.js:749:60266`

// const errorString = `TypeError: Failed to fetch
//     at Lz.fetchOracleCandles (http://localhost:3000/assets/index-DdKF-MF0.js:11:120914)
//     at ost.getLimitBars (http://localhost:3000/assets/index-DdKF-MF0.js:935:127532)
//     at ost.getTokenLastBars (http://localhost:3000/assets/index-DdKF-MF0.js:749:61104)
//     at ost.updateLiveBars (http://localhost:3000/assets/index-DdKF-MF0.js:749:60554)
//     at http://localhost:3000/assets/index-DdKF-MF0.js:749:60266`

type Trace = {
  line: number;
  column: number;
  filename: string;
  filePath: string;
}

export type ErrorMetricData = {
  errorContext?: string;
  errorMessage?: string;
  errorStack?: string;
  errorStackMapped?: string;
  errorStackHash?: string;
  errorName?: string;
  contractError?: string;
  isUserError?: boolean;
  isUserRejectedError?: boolean;
  reason?: string;
  txErrorType?: string;
  txErrorData?: unknown;
  errorSource?: string;
};

class StacktraceMapper {
    sourceMaps: LRUCache<SourceMapConsumer> = new LRUCache(10);

    PRODUCTION_HOST = 'http://app.gmx.io';
    ASSETS_PATH = `${this.PRODUCTION_HOST}/assets`

    STACK_SOURCE_REGEXP = new RegExp(`(?<filePath>${this.ASSETS_PATH.replace('/', '\/')}\/(?<filename>[A-Za-z0-9-.]+)):(?<line>\\d+):(?<column>\\d+)`);

    async processMetricData(customFields: ErrorMetricData) {
      const result = {...customFields};

      if (result.errorStack) {
        result.errorStackMapped = await this.applySourceMap(result.errorStack);
      }

      return result;
    }

    async applySourceMap(errorString: string)  {
        const stackLines = errorString.split('\n');

        const error = stackLines.shift(); // First line is an error message
        const mappedStackLines: string[] = [];

        for (const line of stackLines) {
          const trace = this.resolveTraceFromLine(line);
          const sourceMap = trace?.filePath ? await this.getSourceMap(trace.filePath) : undefined;
          const originalPosition = trace ? sourceMap?.originalPositionFor(trace) : undefined;

          if (!originalPosition) {
            mappedStackLines.push(`<unmapped>${line}`);
            continue;
          }

          if (originalPosition) {
            mappedStackLines.push(`at ${originalPosition.name} (${originalPosition.source}:${originalPosition.line}:${originalPosition.column})`)
          }
        }
  
        const mappedError = `${error} \n ${mappedStackLines.join('\n')}`

        return mappedError;
    }

    async getSourceMap(filePath: string) {
        if (this.sourceMaps.has(filePath)) {
          return this.sourceMaps.get(filePath)
        }

        try {
            const url = filePath.replace('.js', '.js.map');
            const res = await fetch(url)
            const rawSourceMap = await res.text();
            const sourceMap = await new SourceMapConsumer(rawSourceMap, url)
            this.sourceMaps.set(filePath, sourceMap)
            return sourceMap;
        } catch (error) {
            console.error(`error fetching source map for ${filePath}`, error)
            return undefined;
        }
    }

    resolveTraceFromLine(stackLine: string) {
     const match = stackLine.match(this.STACK_SOURCE_REGEXP);

     if (!match?.groups) {
      console.error(`cannot matching trace regexp for ${stackLine}`);
      return undefined
     }

     const trace: Trace = {
      filename: match.groups.filename,
      filePath: match.groups.filePath,
      line: parseInt(match.groups.line),
      column: parseInt(match.groups.column)
     }

     return trace
    }
}


export class LRUCache<T> {
    private capacity: number;
    private cache: Map<string, T>;
    private recentKeys: string[];
  
    constructor(capacity: number) {
      this.capacity = capacity;
      this.cache = new Map<string, T>();
      this.recentKeys = [];
    }
  
    has(key: string): boolean {
      return this.cache.has(key);
    }
  
    get(key: string): T | undefined {
      if (this.cache.has(key)) {
        // Update recentKeys to reflect the usage
        this.updateRecentKeys(key);
        return this.cache.get(key);
      }
      return undefined;
    }
  
    set(key: string, value: T): void {
      if (typeof key !== "string") {
        throw new Error("Key must be a string");
      }
  
      // If key exists, update its value and move it to the front of recentKeys
      if (this.cache.has(key)) {
        this.cache.set(key, value);
        this.updateRecentKeys(key);
      } else {
        // If capacity is reached, remove least recently used item
        if (this.cache.size === this.capacity) {
          const lruKey = this.recentKeys.shift();
          if (lruKey) {
            this.cache.delete(lruKey);
          }
        }
        // Add the new key-value pair to the cache and recentKeys
        this.cache.set(key, value);
        this.recentKeys.push(key);
      }
    }
  
    private updateRecentKeys(key: string): void {
      // Move the key to the end (most recently used) of recentKeys
      this.recentKeys = this.recentKeys.filter((k) => k !== key);
      this.recentKeys.push(key);
    }
}
  
const mapper = new StacktraceMapper();
mapper.applySourceMap(errorString)