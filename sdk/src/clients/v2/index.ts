import { getApiUrl } from "configs/api";
import { ContractsChainId } from "configs/chains";
import { HttpClient } from "utils/http/http";
import { IHttp } from "utils/http/types";
import { fetchApiMarketsInfo, fetchApiTokensData } from "utils/markets/api";

export class GmxApiSdk {
  ctx: { chainId: ContractsChainId; api: IHttp };

  constructor({ chainId }: { chainId: ContractsChainId }) {
    this.ctx = {
      chainId,
      api: new HttpClient(getApiUrl(chainId)),
    };
  }

  fetchMarketsInfo() {
    return fetchApiMarketsInfo(this.ctx);
  }

  fetchTokensData() {
    return fetchApiTokensData(this.ctx);
  }
}
