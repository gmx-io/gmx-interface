import type { IHttp } from "utils/http/types";

import type { FeeDiscount } from "./types";

const FEE_DISCOUNT_ENDPOINT = "/v1/fee-discount";

function readString(raw: Record<string, unknown>, name: string): string {
  const value = raw[name];
  if (typeof value !== "string") {
    throw new Error(`${FEE_DISCOUNT_ENDPOINT}: expected string field "${name}"`);
  }
  return value;
}

function readBigInt(raw: Record<string, unknown>, name: string): bigint {
  const value = raw[name];
  if (
    !(typeof value === "string" && /^\d+$/.test(value)) &&
    !(typeof value === "number" && Number.isSafeInteger(value) && value >= 0)
  ) {
    throw new Error(`${FEE_DISCOUNT_ENDPOINT}: expected bigint field "${name}"`);
  }
  return BigInt(value as string | number);
}

function readBoolean(raw: Record<string, unknown>, name: string): boolean {
  const value = raw[name];
  if (typeof value !== "boolean") {
    throw new Error(`${FEE_DISCOUNT_ENDPOINT}: expected boolean field "${name}"`);
  }
  return value;
}

function readUint(raw: Record<string, unknown>, name: string): number {
  const value = raw[name];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${FEE_DISCOUNT_ENDPOINT}: expected number field "${name}"`);
  }
  return value;
}

export function parseFeeDiscount(raw: unknown): FeeDiscount {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${FEE_DISCOUNT_ENDPOINT}: expected an object`);
  }

  const record = raw as Record<string, unknown>;

  return {
    userReferralInfo: {
      userReferralCode: readString(record, "userReferralCode"),
      userReferralCodeString: readString(record, "userReferralCodeString"),
      referralCodeForTxn: readString(record, "referralCodeForTxn"),
      attachedOnChain: readBoolean(record, "attachedOnChain"),
      affiliate: readString(record, "affiliate"),
      tierId: readUint(record, "tierId"),
      totalRebate: readBigInt(record, "totalRebate"),
      totalRebateFactor: readBigInt(record, "totalRebateFactor"),
      discountShare: readBigInt(record, "discountShare"),
      discountFactor: readBigInt(record, "discountFactor"),
    },
    orderFeeDiscountFactor: readBigInt(record, "orderFeeDiscountFactor"),
    gtRank: readUint(record, "gtRank"),
    rankDiscountFactor: readBigInt(record, "rankDiscountFactor"),
    referrer: record.referrer === null ? undefined : readString(record, "referrer"),
    referredUserDiscountFactor: readBigInt(record, "referredUserDiscountFactor"),
    hasUserAccount: readBoolean(record, "hasUserAccount"),
    updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : undefined,
  };
}

export async function fetchApiFeeDiscount(ctx: { api: IHttp }, params: { address: string }): Promise<FeeDiscount> {
  const raw: unknown = await ctx.api.fetchJson(FEE_DISCOUNT_ENDPOINT, { query: { address: params.address } });
  return parseFeeDiscount(raw);
}
