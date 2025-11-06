import createClient from "openapi-fetch";

import { isDevelopment } from "config/env";

import type { paths } from "./gen";

const TESTNET_BASE_URL = "https://scan-testnet.layerzero-api.com/v1";
const MAINNET_BASE_URL = "https://scan.layerzero-api.com/v1";

const BASE_URL = isDevelopment() ? TESTNET_BASE_URL : MAINNET_BASE_URL;

export const layerZeroApi = createClient<paths>({ baseUrl: BASE_URL });
