import { RawMarketInfo } from "types/markets";
import { TokenData } from "types/tokens";
import { IHttp } from "utils/http/types";
import { deserializeBigIntsInObject } from "utils/numbers";

export async function fetchApiMarketsInfo(ctx: { api: IHttp }): Promise<RawMarketInfo[]> {
  const mInfos: any[] = await ctx.api.fetchJson("/markets/info");
  return mInfos.map((mInfo) => deserializeBigIntsInObject(mInfo, { handleInts: true })) as RawMarketInfo[];
}

export async function fetchApiTokensData(ctx: { api: IHttp }): Promise<TokenData[]> {
  const tInfos: any[] = await ctx.api.fetchJson("/tokens/info");
  return tInfos.map((tInfo) => deserializeBigIntsInObject(tInfo, { handleInts: true })) as TokenData[];
}
