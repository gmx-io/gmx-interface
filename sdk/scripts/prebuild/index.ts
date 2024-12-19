import { resolve } from "path";

import { prebuildMarketValuesKeys } from "./prebuildMarketValuesKeys";
import { prebuildMarketConfigKeys } from "./prebuildMarketConfigKeys";
import { prebuildKinkModelMarketRatesKeys } from "./prebuildKinkModelMarketRatesKeys";

/* eslint-disable-next-line no-restricted-globals */
const OUTPUT_DIR = resolve(process.cwd(), "src/prebuilt");

prebuildMarketValuesKeys(OUTPUT_DIR);
prebuildMarketConfigKeys(OUTPUT_DIR);
prebuildKinkModelMarketRatesKeys(OUTPUT_DIR);
