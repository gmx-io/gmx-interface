/* eslint-disable no-console */

import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import childProcess from "node:child_process";
import prompts from "prompts";
import { format as formatDateFn } from "date-fns";
import chalk from "chalk";
import { isAddress } from "viem";
import pick from "lodash/pick";
import { format as formatPrettier } from "prettier";

import { MarketConfig as _MarketConfig } from "sdk/configs/markets";
import { Token } from "sdk/types/tokens";

import { calculateDisplayDecimals } from "./utils/calculateDisplayDecimals";
import { sdkConfigs } from "./sdkConfigs";

// @ts-ignore
const dirname = import.meta.dirname;

const PROJECT_PATH = path.join(dirname, "..", "..");
const TEMP_PATH = path.join(dirname, "..", "temp");
const ICONS_PATH = path.join(PROJECT_PATH, "src", "img");

const MARKETS_CONFIG_PATH = path.join(PROJECT_PATH, "sdk", "src", "configs", "source", "markets");
const TOKENS_CONFIG_PATH = path.join(PROJECT_PATH, "sdk", "src", "configs", "source", "tokens");
const SORTED_MARKETS_CONFIG_PATH = path.join(PROJECT_PATH, "src", "config", "source", "sortedMarkets");
const MARKETS_UI_CONFIG_PATH = path.join(PROJECT_PATH, "src", "config", "source", "marketsUi");

type Chain = "arbitrum" | "avalanche" | "avalanche_fuji";

type MarketConfig = Omit<_MarketConfig, "listingDate"> & { listingDate: string; enabled: boolean };

type ListingsSetting = {
  chain: Chain;
  markets: MarketConfig[];
  tokens: Token[];
};

const makeChainMap = (): { [key in Chain]: Chain } => {
  return {
    arbitrum: "arbitrum",
    avalanche: "avalanche",
    avalanche_fuji: "avalanche_fuji",
  };
};

const Chains = makeChainMap();

const PLACEHOLDER = "__FILL_ME__";

const makeTokenIconsArray = (symbol: string) => [`ic_${symbol.toLowerCase()}_24.svg`, `ic_${symbol.toLowerCase()}_40.svg`];

const formatJsonData = async (data: any) => {
  return await formatPrettier(JSON.stringify(data, null, 2), { parser: "json" });
};

const fetchTokensData = async (chain: Chain) => {
  const res = await fetch(`${sdkConfigs[chain].oracleUrl}/tokens`);
  const data = (await res.json()) as {
    tokens: { address: string; symbol: string; decimals: number; synthetic: boolean }[];
  };

  return data;
};

const fetchMarketsData = async (chain: Chain) => {
  const res = await fetch(`${sdkConfigs[chain].oracleUrl}/markets`);
  const data = (await res.json()) as {
    markets: { marketToken: string; indexToken: string; longToken: string; shortToken: string; listingDate: string }[];
  };

  return data;
};

const fetchPricesData = async (chain: Chain) => {
  const res = await fetch(`${sdkConfigs[chain].oracleUrl}/prices/tickers`);
  const data = (await res.json()) as { tokenAddress: string; minPrice: string }[];

  return data;
};

const promptForInitialSettings = async () => {
  const { chain } = await prompts({
    type: "select",
    name: "chain",
    message: "Select the chain you want to generate listings for",
    choices: [
      { title: "Arbitrum", value: Chains.arbitrum },
      { title: "Avalanche", value: Chains.avalanche },
      { title: "Avalanche Fuji", value: Chains.avalanche_fuji },
    ],
  });

  const { marketsCount } = await prompts({
    type: "select",
    name: "marketsCount",
    message: "How many markets do you want to generate?",
    choices: [
      { title: "1", value: 1 },
      { title: "2", value: 2 },
    ],
  });

  const answers = await prompts(
    new Array(marketsCount).fill(null).map((_, index) => ({
      type: "text",
      name: `marketTokenAddress_${index}`,
      message: `Enter the market token address for market ${index + 1}`,
      validate: (value) => {
        if (isAddress(value)) {
          return true;
        }

        return "Invalid address";
      },
    }))
  );

  const marketsTokensAddresses = Object.values(answers);

  return {
    chain,
    marketsTokensAddresses,
  };
};

const pregenerateMarkets = async (chain: Chain, marketsTokensAddresses: string[]) => {
  const marketsData = await fetchMarketsData(chain);

  if (!marketsData.markets) {
    throw new Error("No markets data found");
  }

  const pregeneratedMarkets = marketsTokensAddresses.map((d): MarketConfig => {
    const market = marketsData.markets.find((m) => m.marketToken === d);

    if (!market) {
      throw new Error(`Market ${d} not found`);
    }

    return {
      marketTokenAddress: d,
      indexTokenAddress: market.indexToken,
      longTokenAddress: market.longToken,
      shortTokenAddress: market.shortToken,
      listingDate: formatDateFn(new Date(market.listingDate), "dd MMM yyyy"),
      enabled: true,
    };
  });

  return { pregeneratedMarkets };
};

const pregenerateTokens = async (chain: Chain, pregeneratedMarkets: MarketConfig[]) => {
  const tokenAddresses = pregeneratedMarkets.flatMap((d) => [
    d.indexTokenAddress,
    d.longTokenAddress,
    d.shortTokenAddress,
  ]);
  const existingTokens: Token[] = await fs
    .readFile(path.join(TOKENS_CONFIG_PATH, `${chain}.json`), "utf-8")
    .then(JSON.parse);
  const tokensData = await fetchTokensData(chain);
  const pricesData = await fetchPricesData(chain);

  const pregeneratedTokens = tokenAddresses
    .filter((d) => !existingTokens.some((t) => t.address === d))
    .map((d): Token => {
      const token = tokensData.tokens.find((t) => t.address === d);
      const ticker = pricesData.find((t) => t.tokenAddress === d);

      if (!token) {
        throw new Error(`Token ${d} not found`);
      }

      if (!ticker) {
        throw new Error(`Ticker ${d} not found`);
      }

      const priceDecimals = calculateDisplayDecimals(BigInt(ticker.minPrice), 30 - token.decimals);

      let iconsNames = makeTokenIconsArray(token.symbol);

      iconsNames = iconsNames.filter((d) => {
        return !fsSync.existsSync(path.join(ICONS_PATH, d));
      });

      if (iconsNames.length === 0) {
        console.info(chalk.cyan(`Icons for ${token.symbol} already exist`));
      }

      iconsNames.forEach((d) => fsSync.writeFileSync(path.join(TEMP_PATH, d), `<svg>${PLACEHOLDER}</svg>`));

      console.info(
        chalk.yellow(
          `Try to search for token ${token.symbol} https://www.coingecko.com/en/search?query=${token.symbol}`
        )
      );

      return {
        name: PLACEHOLDER,
        symbol: token.symbol,
        address: token.address,
        decimals: token.decimals,
        priceDecimals: priceDecimals,
        categories: [],
        imageUrl: PLACEHOLDER,
        coingeckoUrl: PLACEHOLDER,
        isSynthetic: token.synthetic,
      };
    });

  return { pregeneratedTokens };
};

const validateSettings = async (settings: ListingsSetting) => {
  const { markets, tokens, chain } = settings;

  const configMarkets = await fs.readFile(path.join(MARKETS_CONFIG_PATH, `${chain}.json`), "utf-8").then(JSON.parse);
  const configTokens = await fs.readFile(path.join(TOKENS_CONFIG_PATH, `${chain}.json`), "utf-8").then(JSON.parse);
  const configSortedMarkets = await fs
    .readFile(path.join(SORTED_MARKETS_CONFIG_PATH, `${chain}.json`), "utf-8")
    .then(JSON.parse);
  const configMarketsUi = await fs
    .readFile(path.join(MARKETS_UI_CONFIG_PATH, `${chain}.json`), "utf-8")
    .then(JSON.parse);

  const existingMarkets = Object.keys(configMarkets);
  const existingMarketsUi = Object.keys(configMarketsUi);

  markets.forEach((m) => {
    if (existingMarkets.includes(m.marketTokenAddress)) {
      throw new Error(`Market ${m.marketTokenAddress} already exists in markets config`);
    }
    if (existingMarketsUi.includes(m.marketTokenAddress)) {
      throw new Error(`Market ${m.marketTokenAddress} already exists in marketsUi config`);
    }
    if (configSortedMarkets.includes(m.marketTokenAddress)) {
      throw new Error(`Market ${m.marketTokenAddress} already exists in sortedMarkets config`);
    }
  });

  const existingTokens = configTokens.map((t) => t.address);
  tokens.forEach((t) => {
    if (existingTokens.includes(t.address)) {
      throw new Error(`Token ${t.address} already exists in tokens config`);
    }
    if (Object.values(t).some((d) => d === PLACEHOLDER)) {
      throw new Error(`Token ${t.address} has placeholder in one of the fields`);
    }
    if (t.categories?.length === 0) {
      throw new Error(`Token ${t.address} has no categories`);
    }

    let iconsNames = makeTokenIconsArray(t.symbol);

    iconsNames.forEach((d) => {
      if (!fsSync.existsSync(path.join(TEMP_PATH, d)) && !fsSync.existsSync(path.join(ICONS_PATH, d))) {
        throw new Error(`Icon ${d} for ${t.symbol} not found`);
      }
    });
  });
};

const generateListingsCode = async () => {
  await fs.mkdir(TEMP_PATH, { recursive: true });

  let settings: ListingsSetting | null = await fs
    .readFile(path.join(TEMP_PATH, "settings.json"), "utf-8")
    .then(JSON.parse)
    .catch(() => null);

  if (!settings) {
    const { chain, marketsTokensAddresses } = await promptForInitialSettings();

    const existingMarkets = await fs
      .readFile(path.join(MARKETS_CONFIG_PATH, `${chain}.json`), "utf-8")
      .then(JSON.parse);

    if (marketsTokensAddresses.some((m) => existingMarkets[m])) {
      const market = marketsTokensAddresses.find((m) => existingMarkets[m]);

      throw new Error(`Market ${market} already exists`);
    }

    const { pregeneratedMarkets } = await pregenerateMarkets(chain, marketsTokensAddresses);

    const { pregeneratedTokens } = await pregenerateTokens(chain, pregeneratedMarkets);

    const settings: ListingsSetting = {
      markets: pregeneratedMarkets,
      tokens: pregeneratedTokens,
      chain,
    };

    await fs.writeFile(path.join(TEMP_PATH, "settings.json"), await formatJsonData(settings));

    console.info(
      chalk.green(
        "[-] Settings file created. To continue, replace placeholders in the settings file and icons and run the script again"
      )
    );
    return;
  }

  await validateSettings(settings);

  const { markets, tokens, chain } = settings;

  const configMarkets = await fs.readFile(path.join(MARKETS_CONFIG_PATH, `${chain}.json`), "utf-8").then(JSON.parse);
  const configTokens = await fs.readFile(path.join(TOKENS_CONFIG_PATH, `${chain}.json`), "utf-8").then(JSON.parse);
  const configMarketsUi = await fs
    .readFile(path.join(MARKETS_UI_CONFIG_PATH, `${chain}.json`), "utf-8")
    .then(JSON.parse);
  const configSortedMarkets = await fs
    .readFile(path.join(SORTED_MARKETS_CONFIG_PATH, `${chain}.json`), "utf-8")
    .then(JSON.parse);

  markets.forEach(
    (m) =>
      (configMarkets[m.marketTokenAddress] = pick(m, [
        "marketTokenAddress",
        "indexTokenAddress",
        "longTokenAddress",
        "shortTokenAddress",
      ]))
  );
  await fs.writeFile(path.join(MARKETS_CONFIG_PATH, `${chain}.json`), await formatJsonData(configMarkets));

  await fs.writeFile(path.join(TOKENS_CONFIG_PATH, `${chain}.json`), await formatJsonData(configTokens.concat(tokens)));

  markets.forEach((m) => (configMarketsUi[m.marketTokenAddress] = pick(m, ["enabled", "listingDate"])));
  await fs.writeFile(path.join(MARKETS_UI_CONFIG_PATH, `${chain}.json`), await formatJsonData(configMarketsUi));

  await fs.writeFile(
    path.join(SORTED_MARKETS_CONFIG_PATH, `${chain}.json`),
    await formatJsonData(configSortedMarkets.concat(markets.map((m) => m.marketTokenAddress)))
  );

  await fs.rm(TEMP_PATH, { recursive: true, force: true });

  await childProcess.exec(`cd ${PROJECT_PATH} && yarn prebuild`);
};

generateListingsCode().catch((error) => {
  console.error(chalk.red("Script failed!"));

  console.error(chalk.red(error.message));
  process.exit(1);
});
