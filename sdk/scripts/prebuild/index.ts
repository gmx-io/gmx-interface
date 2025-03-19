import { resolve } from "path";

import { prebuildKinkModelMarketRatesKeys } from "./prebuildKinkModelMarketRatesKeys";
import { prebuildMarketConfigKeys } from "./prebuildMarketConfigKeys";
import { prebuildMarketValuesKeys } from "./prebuildMarketValuesKeys";

/* eslint-disable-next-line no-restricted-globals */
const OUTPUT_DIR = resolve(process.cwd(), "src/prebuilt");

prebuildMarketValuesKeys(OUTPUT_DIR);
prebuildMarketConfigKeys(OUTPUT_DIR);
prebuildKinkModelMarketRatesKeys(OUTPUT_DIR);
