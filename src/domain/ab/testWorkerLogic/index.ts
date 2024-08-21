import { getIsFlagEnabled } from "config/ab";

import { buildMarketsValuesRequest as buildMarketsValuesRequestEmbedded } from "domain/ab/testWorkerLogic/enabled/buildMarketsValuesRequest";
import { buildMarketsConfigsRequest as buildMarketsConfigsRequestEmbedded } from "domain/ab/testWorkerLogic/enabled/buildMarketsConfigsRequest";

import { buildMarketsValuesRequest as buildMarketsValuesRequestAsync } from "domain/ab/testWorkerLogic/disabled/buildMarketsValuesRequest";
import { buildMarketsConfigsRequest as buildMarketsConfigsRequestAsync } from "domain/ab/testWorkerLogic/disabled/buildMarketsConfigsRequest";

export const buildMarketsValuesRequest = getIsFlagEnabled("testWorkerLogic")
  ? buildMarketsValuesRequestEmbedded
  : buildMarketsValuesRequestAsync;

export const buildMarketsConfigsRequest = getIsFlagEnabled("testWorkerLogic")
  ? buildMarketsConfigsRequestEmbedded
  : buildMarketsConfigsRequestAsync;
