import createClient from "openapi-fetch";

import type { paths } from "./gen";

const LZ_BASE_URL = "https://scan.layerzero-api.com/v1";

export const layerZeroApi = createClient<paths>({ baseUrl: LZ_BASE_URL });
