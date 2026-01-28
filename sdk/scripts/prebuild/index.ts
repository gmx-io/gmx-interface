import fs from "fs";
import { resolve } from "path";

import { prebuildKinkModelMarketRatesKeys } from "./prebuildKinkModelMarketRatesKeys";
import { prebuildMarketConfigKeys } from "./prebuildMarketConfigKeys";
import { prebuildMarketValuesKeys } from "./prebuildMarketValuesKeys";

/* eslint-disable-next-line no-restricted-globals */
const OUTPUT_DIR = resolve(process.cwd(), "src/codegen/prebuilt");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

prebuildMarketValuesKeys(OUTPUT_DIR);
prebuildMarketConfigKeys(OUTPUT_DIR);
prebuildKinkModelMarketRatesKeys(OUTPUT_DIR);
