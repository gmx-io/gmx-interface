import type { IHttp } from "utils/http/types";
import { getApiFieldReaders } from "utils/http/validation";

import type { FeeDiscount } from "./types";

const FEE_DISCOUNT_ENDPOINT = "/v1/fee-discount";

const { readBigInt, readBoolean, readNullableString, readString, readUint } = getApiFieldReaders(FEE_DISCOUNT_ENDPOINT);

export function parseFeeDiscount(raw: unknown): FeeDiscount {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${FEE_DISCOUNT_ENDPOINT}: expected an object`);
  }

  const record = raw as Record<string, unknown>;

  return {
    userReferralInfo: {
      userReferralCode: readString(record.userReferralCode, "userReferralCode"),
      userReferralCodeString: readString(record.userReferralCodeString, "userReferralCodeString"),
      referralCodeForTxn: readString(record.referralCodeForTxn, "referralCodeForTxn"),
      attachedOnChain: readBoolean(record.attachedOnChain, "attachedOnChain"),
      affiliate: readString(record.affiliate, "affiliate"),
      tierId: readUint(record.tierId, "tierId"),
      totalRebate: readBigInt(record.totalRebate, "totalRebate"),
      totalRebateFactor: readBigInt(record.totalRebateFactor, "totalRebateFactor"),
      discountShare: readBigInt(record.discountShare, "discountShare"),
      discountFactor: readBigInt(record.discountFactor, "discountFactor"),
    },
    orderFeeDiscountFactor: readBigInt(record.orderFeeDiscountFactor, "orderFeeDiscountFactor"),
    gtRank: readUint(record.gtRank, "gtRank"),
    rankDiscountFactor: readBigInt(record.rankDiscountFactor, "rankDiscountFactor"),
    referrer: readNullableString(record.referrer, "referrer"),
    referredUserDiscountFactor: readBigInt(record.referredUserDiscountFactor, "referredUserDiscountFactor"),
    updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : undefined,
  };
}

export async function fetchApiFeeDiscount(ctx: { api: IHttp }, params: { address: string }): Promise<FeeDiscount> {
  const raw: unknown = await ctx.api.fetchJson(FEE_DISCOUNT_ENDPOINT, { query: { address: params.address } });
  return parseFeeDiscount(raw);
}
