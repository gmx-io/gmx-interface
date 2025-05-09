import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mainAbisDir = path.join(__dirname, "sdk/src/abis");
const arbitrumSepoliaDir = path.join(__dirname, "sdk/src/abis/arbitrumSepolia");

// Get all JSON files from arbitrumSepolia directory
const arbitrumSepoliaFiles = fs.readdirSync(arbitrumSepoliaDir).filter((file) => file.endsWith(".json"));

arbitrumSepoliaFiles.forEach((file) => {
  const arbitrumSepoliaPath = path.join(arbitrumSepoliaDir, file);
  const mainPath = path.join(mainAbisDir, file);

  if (!fs.existsSync(mainPath)) {
    console.log(`${file} exists in arbitrumSepolia but not in main abis directory`);
    return;
  }

  const arbitrumSepoliaContent = JSON.parse(fs.readFileSync(arbitrumSepoliaPath, "utf8"));
  const mainContent = JSON.parse(fs.readFileSync(mainPath, "utf8"));

  // Compare ABIs
  const arbitrumSepoliaAbi = JSON.stringify(arbitrumSepoliaContent.abi);
  const mainAbi = JSON.stringify(mainContent.abi);

  if (arbitrumSepoliaAbi === mainAbi) {
    console.log(`${file}: ABIs are equal`);
  } else {
    console.log(`${file}: ABIs are different`);
  }
});
