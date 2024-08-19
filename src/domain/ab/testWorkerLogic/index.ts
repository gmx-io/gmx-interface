import { getIsFlagEnabled } from "config/ab";

import { buildMarketsValuesRequest as buildMarketsValuesRequestEmbedded } from "domain/ab/testWorkerLogic/withEmbeddedMulticallHashData/buildMarketsValuesRequest";
import { buildMarketsConfigsRequest as buildMarketsConfigsRequestEmbedded } from "domain/ab/testWorkerLogic/withEmbeddedMulticallHashData/buildMarketsConfigsRequest";

import { buildMarketsValuesRequest as buildMarketsValuesRequestAsync } from "domain/ab/testWorkerLogic/withAsyncHashData/buildMarketsValuesRequest";
import { buildMarketsConfigsRequest as buildMarketsConfigsRequestAsync } from "domain/ab/testWorkerLogic/withAsyncHashData/buildMarketsConfigsRequest";

export const buildMarketsValuesRequest = getIsFlagEnabled("testWorkerLogic")
  ? buildMarketsValuesRequestEmbedded
  : buildMarketsValuesRequestAsync;

export const buildMarketsConfigsRequest = getIsFlagEnabled("testWorkerLogic")
  ? buildMarketsConfigsRequestEmbedded
  : buildMarketsConfigsRequestAsync;
