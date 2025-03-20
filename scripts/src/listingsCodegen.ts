import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import prompts from "prompts";
import { format as formatDateFn } from "date-fns";

import { MarketConfig as _MarketConfig } from "sdk/configs/markets";
import { Token } from "sdk/types/tokens";
import { GmxSdk } from "sdk";

import { calculateDisplayDecimals } from "./utils/calculateDisplayDecimals";

import { sdkConfigs } from "./sdkConfigs";

// @ts-ignore
const TEMP_PATH = path.join(import.meta.dirname, "..", "temp");
// @ts-ignore
const ICONS_PATH = path.join(import.meta.dirname, "..", "..", "src", "img");

type Chain = "arbitrum" | "avalanche" | "avalanche_fuji";

type ListingsSetting = {
  marketIndexTokenAddress: string;
};

type MarketConfig = Omit<_MarketConfig, "listingDate"> & { listingDate: string };

type PreGeneratedSettings = {
  markets: MarketConfig[];
  tokens: Token[];
};

const PLACEHOLDER = "__FILL_ME__";

const fetchTokensData = async (chain: Chain) => {
  const res = await fetch(`${sdkConfigs[chain].oracleUrl}/tokens`);
  const data = await res.json();

  return data;
};

const fetchMarketsData = async (chain: Chain) => {
  const res = await fetch(`${sdkConfigs[chain].oracleUrl}/markets`);
  const data = await res.json();

  return data;
};

const fetchPricesData = async (chain: Chain) => {
  const res = await fetch(`${sdkConfigs[chain].oracleUrl}/prices/tickers`);
  const data = await res.json();

  return data;
};

const generateListingsCode = async () => {
  await fs.rm(TEMP_PATH, { recursive: true, force: true });
  await fs.mkdir(TEMP_PATH, { recursive: true });

  let settings: ListingsSetting[] | null = await fs
    .readFile(path.join(TEMP_PATH, "settings.json"), "utf-8")
    .then(JSON.parse)
    .catch(() => null);

  if (!settings) {
    const { chain } = await prompts({
      type: "select",
      name: "chain",
      message: "Select the chain you want to generate listings for",
      choices: [
        { title: "Arbitrum", value: "arbitrum" },
        { title: "Avalanche", value: "avalanche" },
        { title: "Avalanche Fuji", value: "avalanche_fuji" },
      ],
    });

    const sdk = new GmxSdk(sdkConfigs[chain as Chain]);

    const { marketsCount } = await prompts({
      type: "number",
      name: "marketsCount",
      message: "How many markets do you want to generate?",
    });

    const answers = await prompts(
      new Array(marketsCount).fill(null).map((_, index) => ({
        type: "text",
        name: `marketTokenAddress_${index}`,
        message: `Enter the market token address for market ${index + 1}`,
      }))
    );

    const marketsTokensAddresses = Object.values(answers);

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
        listingDate: formatDateFn(market.listingDate, "dd MMM yyyy"),
        enabled: true,
      };
    });

    const tokenAddresses = pregeneratedMarkets.flatMap((d) => [
      d.indexTokenAddress,
      d.longTokenAddress,
      d.shortTokenAddress,
    ]);
    const existingTokens = await sdk.tokens.getTokensData();
    const tokensData = await fetchTokensData(chain);
    const pricesData = await fetchPricesData(chain);

    if (!existingTokens.tokensData) {
      throw new Error("No tokens data found");
    }

    // 0x2aE5c5Cd4843cf588AA8D1289894318130acc823

    const pregeneratedTokens = tokenAddresses
      .filter((d) => !existingTokens.tokensData?.[d])
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

        let iconsNames = [`ic_${token.symbol.toLowerCase()}_24.svg`, `ic_${token.symbol.toLowerCase()}_40.svg`];

        iconsNames = iconsNames.filter((d) => {
          return !fsSync.existsSync(path.join(ICONS_PATH, d));
        });

        if (iconsNames.length === 0) {
          console.info(`Icons for ${token.symbol} already exist`);
        }

        iconsNames.forEach((d) =>
          fsSync.writeFileSync(path.join(TEMP_PATH, d), `<svg>${PLACEHOLDER}</svg>`)
        );

        console.info(
          `Try to search for token ${token.symbol} https://www.coingecko.com/en/search?query=${token.symbol}`
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

    await fs.writeFile(
      path.join(TEMP_PATH, "settings.json"),
      JSON.stringify(
        {
          markets: pregeneratedMarkets,
          tokens: pregeneratedTokens,
        },
        null,
        2
      )
    );

    console.info(
      "[-] Settings file created. To continue, replace placeholders in the settings file and icons and run the script again"
    );
    return;
  }
};

generateListingsCode().catch((error) => {
  console.error("Script failed");
  throw error;
});
