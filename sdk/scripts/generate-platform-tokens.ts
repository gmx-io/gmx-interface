/* eslint-disable no-console */
/**
 * Generate platform tokens JSON from gmxLayerZero deployments folder
 *
 * Prerequisites:
 * Cloned https://github.com/gmx-io/layer-zero repository
 *
 * Usage:
 *   yarn tsx sdk/scripts/generate-platform-tokens.ts <layer-zero-path>
 *
 * Example:
 *   # Relative to monorepo root
 *   yarn tsx sdk/scripts/generate-platform-tokens.ts ../layer-zero
 *   yarn tsx sdk/scripts/generate-platform-tokens.ts /path/to/layer-zero
 *
 *
 * Expected folder structure:
 *   layer-zero/
 *     deployments/
 *       arbitrum-mainnet/
 *         .chainId
 *         TokenName.json
 *       base-mainnet/
 *         .chainId
 *         TokenName.json
 *       ...
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getAddress } from "viem";

import { ARBITRUM_SEPOLIA, AVALANCHE_FUJI, SOURCE_OPTIMISM_SEPOLIA, SOURCE_SEPOLIA } from "../src/configs/chainIds";
import type { SettlementChainId, SourceChainId } from "../src/configs/chains";
import { SETTLEMENT_CHAIN_IDS_DEV, SOURCE_CHAIN_IDS } from "../src/configs/chains";

type DeploymentData = {
  address: string;
  args: string[];
};

type TokenDeployment = {
  address: string;
  stargate: string;
};

type DeploymentEntry = {
  chainId: number;
  deployment: TokenDeployment;
  filename: string;
};

type BaseSymbolData = {
  baseSymbol: string;
  deployments: DeploymentEntry[];
};

type PlatformTokens = {
  mainnets: {
    [symbol: string]: {
      [chainId: number]: TokenDeployment;
    };
  };
  testnets: {
    [symbol: string]: {
      [chainId: number]: TokenDeployment;
    };
  };
};

function isTestnetChain(chainId: number): boolean {
  return [AVALANCHE_FUJI, ARBITRUM_SEPOLIA, SOURCE_SEPOLIA, SOURCE_OPTIMISM_SEPOLIA].includes(chainId);
}

// @ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getChainId(chainPath: string): number | null {
  const chainIdPath = path.join(chainPath, ".chainId");
  if (!fs.existsSync(chainIdPath)) {
    return null;
  }
  try {
    const chainId = parseInt(fs.readFileSync(chainIdPath, "utf8").trim(), 10);
    if (isNaN(chainId)) {
      return null;
    }
    return chainId;
  } catch (_error) {
    return null;
  }
}

function extractTokenSymbol(filename: string): string | null {
  const name = filename.replace(/\.json$/i, "");

  if (name.startsWith("GlvToken_")) {
    const suffix = name.replace("GlvToken_", "");
    const parts = suffix.replace(/^(Adapter|OFT)_/, "").split("_");
    if (parts.length < 2) {
      return null;
    }
    return `<GLV-${parts.join("-")}>`;
  }

  if (name.startsWith("MarketToken_")) {
    const suffix = name.replace("MarketToken_", "").replace(/^(Adapter|OFT)_/, "");
    return `<GM-${suffix.replace(/_/g, "-")}>`;
  }

  return null;
}

function readTokenDeployment(filePath: string): TokenDeployment | null {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(content) as DeploymentData;

    const filename = path.basename(filePath, ".json");
    const isOFT = filename.includes("_OFT_");
    const isAdapter = filename.includes("_Adapter_");

    if (isOFT) {
      return {
        address: getAddress(data.address),
        stargate: getAddress(data.address),
      };
    }

    if (isAdapter) {
      return {
        address: getAddress(data.args[0]),
        stargate: getAddress(data.address),
      };
    }

    return null;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
}

function generatePlatformTokens(gmxLayerZeroPath: string): PlatformTokens {
  const deploymentsPath = path.join(gmxLayerZeroPath, "deployments");

  if (!fs.existsSync(deploymentsPath)) {
    console.error(`Error: deployments folder not found at ${deploymentsPath}`);
    process.exit(1);
  }

  const allowedChains = [...SETTLEMENT_CHAIN_IDS_DEV, ...SOURCE_CHAIN_IDS];

  const chainFolders = fs
    .readdirSync(deploymentsPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .filter((chainFolder) => {
      const chainPath = path.join(deploymentsPath, chainFolder);
      const chainId = getChainId(chainPath);
      return chainId !== null && allowedChains.includes(chainId as SourceChainId | SettlementChainId);
    });

  console.log(`Found ${chainFolders.length} valid chain folders:`, chainFolders.join(", "));

  const baseSymbolMap: Record<string, BaseSymbolData> = {};

  for (const chainFolder of chainFolders) {
    const chainPath = path.join(deploymentsPath, chainFolder);
    const chainId = getChainId(chainPath);

    if (!chainId) {
      continue;
    }

    const files = fs.readdirSync(chainPath).filter((file) => file.endsWith(".json") && file !== ".chainId");

    console.log(`\nProcessing ${chainFolder} (chain ID: ${chainId}):`);

    for (const file of files) {
      const filePath = path.join(chainPath, file);
      const deployment = readTokenDeployment(filePath);

      if (!deployment) {
        continue;
      }

      const baseSymbol = extractTokenSymbol(file);

      if (!baseSymbol) {
        continue;
      }

      if (!baseSymbolMap[baseSymbol]) {
        baseSymbolMap[baseSymbol] = {
          baseSymbol,

          deployments: [],
        };
      }

      baseSymbolMap[baseSymbol].deployments.push({
        chainId,
        deployment,
        filename: file,
      });

      console.log(`  ✓ ${baseSymbol}: ${deployment.address}`);
    }
  }

  const result: PlatformTokens = {
    mainnets: {},
    testnets: {},
  };

  for (const { baseSymbol, deployments } of Object.values(baseSymbolMap)) {
    const settlementDeployment = deployments.find(({ chainId }) =>
      SETTLEMENT_CHAIN_IDS_DEV.includes(chainId as SettlementChainId)
    );

    if (!settlementDeployment) {
      console.error(`Warning: No settlement chain found for ${baseSymbol}`);
      continue;
    }

    const settlementAddress = settlementDeployment.deployment.address;
    const addressSuffix = settlementAddress.slice(-6);
    const finalSymbol = baseSymbol.replace(">", `-${addressSuffix}>`);

    const isTestnet = isTestnetChain(settlementDeployment.chainId);
    const targetGroup = isTestnet ? result.testnets : result.mainnets;

    targetGroup[finalSymbol] = {};
    for (const { chainId, deployment } of deployments) {
      targetGroup[finalSymbol][chainId] = {
        address: deployment.address,
        stargate: deployment.stargate,
      };
    }
  }

  return result;
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: tsx scripts/generate-platform-tokens.ts <gmxLayerZero-path>");
    console.error("Example: tsx scripts/generate-platform-tokens.ts ../gmx-layerzero");
    process.exit(1);
  }

  const gmxLayerZeroPath = path.resolve(args[0]);

  if (!fs.existsSync(gmxLayerZeroPath)) {
    console.error(`Error: Path does not exist: ${gmxLayerZeroPath}`);
    process.exit(1);
  }

  console.log(`Scanning deployments in: ${gmxLayerZeroPath}\n`);

  const platformTokens = generatePlatformTokens(gmxLayerZeroPath);

  const outputPath = path.join(__dirname, "..", "src", "codegen", "platformTokens.json");

  fs.writeFileSync(outputPath, JSON.stringify(platformTokens, null, 2) + "\n", "utf8");

  console.log(`\n✓ Generated platform tokens JSON at: ${outputPath}`);

  const totalTokenSymbols = new Set([...Object.keys(platformTokens.mainnets), ...Object.keys(platformTokens.testnets)])
    .size;
  console.log(`✓ Found ${totalTokenSymbols} token symbols`);

  const totalChainEntries = [
    ...Object.values(platformTokens.mainnets),
    ...Object.values(platformTokens.testnets),
  ].reduce((sum, tokenChains) => sum + Object.keys(tokenChains).length, 0);
  console.log(`✓ Total chain entries: ${totalChainEntries}`);
}

main();
