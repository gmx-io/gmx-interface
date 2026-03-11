/* eslint-disable no-console */
/**
 * Generate/update ABI TypeScript files from gmx-synthetics-private deployments.
 *
 * Copies the contract filtering + naming behavior from extractAddresses.mjs:
 * - allowedChains
 * - allowedContracts
 * - Reader -> SyntheticsReader
 * - Router -> SyntheticsRouter
 *
 * Usage:
 *   yarn tsx sdk/scripts/generate-synthetics-abis.ts <gmx-synthetics-private-path> --chain-name=<chainName>
 *
 * Examples:
 *   yarn tsx sdk/scripts/generate-synthetics-abis.ts ../gmx-synthetics-private --chain-name=arbitrum
 *   yarn tsx sdk/scripts/generate-synthetics-abis.ts /path/to/gmx-synthetics-private --chain-name=avalanche
 */

import fs from "fs";
import path from "path";
import * as prettier from "prettier";
import { fileURLToPath } from "url";

type DeploymentArtifact = {
  address?: string;
  abi?: unknown;
};

// Only process these specific chains (copied from extractAddresses.mjs)
const allowedChains = ["arbitrum", "avalanche", "arbitrumSepolia", "avalancheFuji", "botanix"];

// Only include these specific contracts (copied from extractAddresses.mjs)
const allowedContracts = [
  "DataStore",
  "EventEmitter",
  "ExchangeRouter",
  "SubaccountRouter",
  "Reader",
  "Router",
  "SimulationRouter",
  "GlvReader",
  "GlvRouter",
  "GelatoRelayRouter",
  "SubaccountGelatoRelayRouter",
  "MultichainClaimsRouter",
  "MultichainGlvRouter",
  "MultichainGmRouter",
  "MultichainOrderRouter",
  "MultichainSubaccountRouter",
  "MultichainTransferRouter",
  "MultichainVault",
  "LayerZeroProvider",
  "ReferralStorage",
  "ClaimHandler",
] as const;

// @ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveDeploymentsPath(inputPath: string): string {
  const absoluteInput = path.resolve(inputPath);

  if (path.basename(absoluteInput) === "deployments") {
    return absoluteInput;
  }

  const nestedDeploymentsPath = path.join(absoluteInput, "deployments");
  if (fs.existsSync(nestedDeploymentsPath) && fs.statSync(nestedDeploymentsPath).isDirectory()) {
    return nestedDeploymentsPath;
  }

  console.error(`Error: could not find deployments directory under ${absoluteInput}`);
  process.exit(1);
}

function getOutputName(contractName: string) {
  if (contractName === "Reader") {
    return "SyntheticsReader";
  }
  if (contractName === "Router") {
    return "SyntheticsRouter";
  }
  return contractName;
}

function renderAbiTsFile(abi: unknown): string {
  return `export default ${JSON.stringify(abi, null, 2)} as const;\n`;
}

async function formatAbiContent(
  content: string,
  filePath: string,
  resolvedConfig: Awaited<ReturnType<typeof prettier.resolveConfig>> = {}
): Promise<string> {
  return prettier.format(content, {
    ...resolvedConfig,
    filepath: filePath,
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const chainNameArg = args.find((arg) => arg.startsWith("--chain-name="));
  const targetChainName = chainNameArg?.split("=")[1];
  const basePathArg = args.find((arg) => !arg.startsWith("--"));

  if (!basePathArg || !targetChainName) {
    console.error(
      "Usage: yarn tsx sdk/scripts/generate-synthetics-abis.ts <gmx-synthetics-private-path> --chain-name=<chainName>"
    );
    process.exit(1);
  }

  if (!allowedChains.includes(targetChainName)) {
    console.error(`Error: unsupported chain "${targetChainName}". Allowed chains: ${allowedChains.join(", ")}`);
    process.exit(1);
  }

  const deploymentsPath = resolveDeploymentsPath(basePathArg);
  const chainPath = path.join(deploymentsPath, targetChainName);

  if (!fs.existsSync(chainPath) || !fs.statSync(chainPath).isDirectory()) {
    console.error(`Error: chain deployments folder not found: ${chainPath}`);
    process.exit(1);
  }

  const abiOutputDir = path.join(__dirname, "..", "src", "abis");
  const prettierConfig = (await prettier.resolveConfig(path.join(abiOutputDir, "index.ts"))) ?? {};
  let updatedCount = 0;
  let createdCount = 0;
  let skippedCount = 0;

  console.log(`Reading deployments from: ${chainPath}`);
  console.log(`Writing ABI files to: ${abiOutputDir}\n`);

  for (const contractName of allowedContracts) {
    const artifactPath = path.join(chainPath, `${contractName}.json`);

    if (!fs.existsSync(artifactPath)) {
      console.warn(`- Skip ${contractName}: artifact not found`);
      skippedCount++;
      continue;
    }

    try {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as DeploymentArtifact;

      if (!Array.isArray(artifact.abi)) {
        console.warn(`- Skip ${contractName}: missing or invalid abi`);
        skippedCount++;
        continue;
      }

      const outputName = getOutputName(contractName);
      const outputPath = path.join(abiOutputDir, `${outputName}.ts`);
      const existed = fs.existsSync(outputPath);
      const nextContent = await formatAbiContent(renderAbiTsFile(artifact.abi), outputPath, prettierConfig);
      const prevContent = existed ? fs.readFileSync(outputPath, "utf8") : null;

      if (prevContent === nextContent) {
        console.log(`= ${outputName}: no changes`);
        continue;
      }

      fs.writeFileSync(outputPath, nextContent, "utf8");

      if (existed) {
        updatedCount++;
        console.log(`✓ ${outputName}: updated`);
      } else {
        createdCount++;
        console.log(`+ ${outputName}: created`);
      }
    } catch (error) {
      skippedCount++;
      console.error(`- Skip ${contractName}: failed to process ${artifactPath}`, error);
    }
  }

  console.log("\nDone.");
  console.log(`Updated: ${updatedCount}`);
  console.log(`Created: ${createdCount}`);
  console.log(`Skipped: ${skippedCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
