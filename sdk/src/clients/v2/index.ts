import { getApiUrl } from "configs/api";
import { ContractsChainId } from "configs/chains";
import { HttpClient } from "utils/http/http";
import { IHttp } from "utils/http/types";
import { fetchApiMarketsInfo, fetchApiTokensData } from "utils/markets/api";
import { fetchApiOrders } from "utils/orders/api";
import { fetchApiPositionsInfo } from "utils/positions/api";
import { fetchApiOhlcv } from "utils/prices/api";

export type { OhlcvCandle, OhlcvParams } from "utils/prices/types";
import type { OhlcvParams } from "utils/prices/types";

export class GmxApiSdk {
  ctx: { chainId: ContractsChainId; api: IHttp };

  constructor({ chainId }: { chainId: ContractsChainId }) {
    const apiUrl = getApiUrl(chainId);

    if (!apiUrl) {
      throw new Error("api is not supported for current chainId");
    }

    this.ctx = {
      chainId,
      api: new HttpClient(apiUrl),
    };
  }

  fetchMarketsInfo() {
    return fetchApiMarketsInfo(this.ctx);
  }

  fetchTokensData() {
    return fetchApiTokensData(this.ctx);
  }

  fetchPositionsInfo(params: { address: string; includeRelatedOrders?: boolean }) {
    return fetchApiPositionsInfo(this.ctx, params);
  }

  fetchOrders(params: { address: string }) {
    return fetchApiOrders(this.ctx, params);
  }

  fetchOhlcv(params: OhlcvParams) {
    return fetchApiOhlcv(this.ctx, params);
  }
}
