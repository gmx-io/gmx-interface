import { ethers } from 'ethers';
import fs from 'fs';
import { resolve } from 'path';
import keyBy from 'lodash/keyBy';
import entries from 'lodash/entries';

import { hashDataMap } from 'lib/multicall/hashData/hashDataMap';

import {
  OPEN_INTEREST_IN_TOKENS_KEY,
  OPEN_INTEREST_KEY,
  POOL_AMOUNT_KEY,
  POSITION_IMPACT_POOL_AMOUNT_KEY,
  SWAP_IMPACT_POOL_AMOUNT_KEY,
} from "config/dataStore";

import { DataStore__factory } from "typechain-types/factories/DataStore__factory";
import { SyntheticsReader__factory } from "typechain-types/factories/SyntheticsReader__factory";

const ARBITRUM = 42161;
const AVALANCHE = 43114;
const AVALANCHE_FUJI = 43113;

const CONTRACTS = {
  [ARBITRUM]: {
    DataStore: "0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8",
    SyntheticsReader: "0x5Ca84c34a381434786738735265b9f3FD814b824",
  },
  [AVALANCHE]: {
    DataStore: "0x2F0b22339414ADeD7D5F06f9D604c7fF5b2fe3f6",
    SyntheticsReader: "0xBAD04dDcc5CC284A86493aFA75D2BEb970C72216",
  },
  [AVALANCHE_FUJI]: {
    DataStore: "0xEA1BFb4Ea9A412dCCd63454AbC127431eBB0F0d4",
    SyntheticsReader: "0xD52216D3A57F7eb1126498f00A4771553c737AE4",
  },
};

const RPC_URLS = {
  [ARBITRUM]: "https://arb1.arbitrum.io/rpc",
  [AVALANCHE]: "https://api.avax.network/ext/bc/C/rpc",
  [AVALANCHE_FUJI]: "https://api.avax-test.network/ext/bc/C/rpc",
};

const SUPPORTED_CHAIN_IDS = [ARBITRUM, AVALANCHE, AVALANCHE_FUJI];
const MARKETS_COUNT = 1000;

const OUTPUT_DIR = resolve(process.cwd(), "src/prebuild");

type Market = {
  marketTokenAddress: string;
  indexTokenAddress: string;
  longTokenAddress: string;
  shortTokenAddress: string;
};

async function prebuildMarkets() {
  const marketList = await Promise.all(SUPPORTED_CHAIN_IDS.map(async (chainId) => {
    const rpcUrl = RPC_URLS[chainId];

    if (!rpcUrl) {
      throw new Error(`RPC URL is not defined for chainId ${chainId}`);
    }

    const dataStoreAddress = CONTRACTS[chainId].DataStore;
    const syntheticsReaderAddress = CONTRACTS[chainId].SyntheticsReader;

    if (!dataStoreAddress || !syntheticsReaderAddress) {
      throw new Error(`Contract address is not defined for chainId ${chainId}`);
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const DataStore = DataStore__factory.connect(dataStoreAddress, provider);
    const SyntheticsReader = SyntheticsReader__factory.connect(syntheticsReaderAddress, provider);

    const markets = await SyntheticsReader.getMarkets(DataStore, 0, MARKETS_COUNT);
    const marketsPrepared = markets.map((market) => {
      return {
        marketTokenAddress: market.marketToken,
        indexTokenAddress: market.indexToken,
        longTokenAddress: market.longToken,
        shortTokenAddress: market.shortToken,
      }
    });

    return {
      markets: marketsPrepared,
      chainId,
    };
  }));

  const markets = marketList.reduce<Record<string, Record<string, Market>>>((acc, { markets, chainId }) => {
    acc[chainId] = keyBy(markets, 'marketTokenAddress');
    return acc;
  }, {});

  fs.writeFile(resolve(OUTPUT_DIR, 'markets.json'), JSON.stringify(markets, null, 2), (err) => {
    if (err) {
      throw err;
    }
  });

  return markets;
}

async function prebuildMarketInfoKeys() {
  const markets = await prebuildMarkets();

  const chainMarketKeys = SUPPORTED_CHAIN_IDS.reduce((chainsAcc, chainId) => {
    const chainMarkets = entries(markets[chainId]).reduce((marketsAcc, [marketAddress, market]) => {
      const marketKeys = hashDataMap({
        longPoolAmount: [
          ["bytes32", "address", "address"],
          [POOL_AMOUNT_KEY, marketAddress, market.longTokenAddress],
        ],
        shortPoolAmount: [
          ["bytes32", "address", "address"],
          [POOL_AMOUNT_KEY, marketAddress, market.shortTokenAddress],
        ],
        positionImpactPoolAmount: [
          ["bytes32", "address"],
          [POSITION_IMPACT_POOL_AMOUNT_KEY, marketAddress],
        ],
        swapImpactPoolAmountLong: [
          ["bytes32", "address", "address"],
          [SWAP_IMPACT_POOL_AMOUNT_KEY, marketAddress, market.longTokenAddress],
        ],
        swapImpactPoolAmountShort: [
          ["bytes32", "address", "address"],
          [SWAP_IMPACT_POOL_AMOUNT_KEY, marketAddress, market.shortTokenAddress],
        ],
        longInterestUsingLongToken: [
          ["bytes32", "address", "address", "bool"],
          [OPEN_INTEREST_KEY, marketAddress, market.longTokenAddress, true],
        ],
        longInterestUsingShortToken: [
          ["bytes32", "address", "address", "bool"],
          [OPEN_INTEREST_KEY, marketAddress, market.shortTokenAddress, true],
        ],
        shortInterestUsingLongToken: [
          ["bytes32", "address", "address", "bool"],
          [OPEN_INTEREST_KEY, marketAddress, market.longTokenAddress, false],
        ],
        shortInterestUsingShortToken: [
          ["bytes32", "address", "address", "bool"],
          [OPEN_INTEREST_KEY, marketAddress, market.shortTokenAddress, false],
        ],
        longInterestInTokensUsingLongToken: [
          ["bytes32", "address", "address", "bool"],
          [OPEN_INTEREST_IN_TOKENS_KEY, marketAddress, market.longTokenAddress, true],
        ],
        longInterestInTokensUsingShortToken: [
          ["bytes32", "address", "address", "bool"],
          [OPEN_INTEREST_IN_TOKENS_KEY, marketAddress, market.shortTokenAddress, true],
        ],
        shortInterestInTokensUsingLongToken: [
          ["bytes32", "address", "address", "bool"],
          [OPEN_INTEREST_IN_TOKENS_KEY, marketAddress, market.longTokenAddress, false],
        ],
        shortInterestInTokensUsingShortToken: [
          ["bytes32", "address", "address", "bool"],
          [OPEN_INTEREST_IN_TOKENS_KEY, marketAddress, market.shortTokenAddress, false],
        ],
      });

      marketsAcc[marketAddress] = marketKeys;

      return marketsAcc;
    }, {});

    chainsAcc[chainId] = chainMarkets;

    return chainsAcc;
  }, {});

  fs.writeFile(resolve(OUTPUT_DIR, 'marketInfoHashedKeys.json'), JSON.stringify(chainMarketKeys, null, 2), (err) => {
    if (err) {
      throw err;
    }
  });

  return chainMarketKeys;
}

prebuildMarketInfoKeys();
