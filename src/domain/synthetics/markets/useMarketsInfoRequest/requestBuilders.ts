import { getIsFlagEnabled } from "config/ab";

import { buildMarketsValuesRequest as buildMarketsValuesRequestEmbedded } from "./withEmbeddedMulticallHashData/buildMarketsValuesRequest";
import { buildMarketsConfigsRequest as buildMarketsConfigsRequestEmbedded } from "./withEmbeddedMulticallHashData/buildMarketsConfigsRequest";

import { buildMarketsValuesRequest as buildMarketsValuesRequestAsync } from "./withAsyncHashData/buildMarketsValuesRequest";
import { buildMarketsConfigsRequest as buildMarketsConfigsRequestAsync } from "./withAsyncHashData/buildMarketsConfigsRequest";

export const buildMarketsValuesRequest = getIsFlagEnabled("testWorkerLogic")
  ? buildMarketsValuesRequestEmbedded
  : buildMarketsValuesRequestAsync;
export const buildMarketsConfigsRequest = getIsFlagEnabled("testWorkerLogic")
  ? buildMarketsConfigsRequestEmbedded
  : buildMarketsConfigsRequestAsync;
