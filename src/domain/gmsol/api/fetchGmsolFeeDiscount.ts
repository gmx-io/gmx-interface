import type { IHttp } from "sdk/utils/http/types";
import type { UserReferralInfo } from "sdk/utils/referrals/types";

const FEE_DISCOUNT_ENDPOINT = "/v1/fee-discount";

export type GmsolFeeDiscount = {
  userReferralInfo: UserReferralInfo;
  // The wallet's combined discount from its GT rank and referrer, USD factor ×10^30.
  orderFeeDiscountFactor: bigint;
  updatedAt: number | undefined;
};

function readString(raw: Record<string, unknown>, name: string): string {
  const value = raw[name];
  if (typeof value !== "string") {
    throw new Error(`${FEE_DISCOUNT_ENDPOINT}: expected string field "${name}"`);
  }
  return value;
}

function readBigInt(raw: Record<string, unknown>, name: string): bigint {
  const value = raw[name];
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(`${FEE_DISCOUNT_ENDPOINT}: expected bigint field "${name}"`);
  }
  return BigInt(value);
}

export function parseGmsolFeeDiscount(raw: unknown): GmsolFeeDiscount {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${FEE_DISCOUNT_ENDPOINT}: expected an object`);
  }

  const record = raw as Record<string, unknown>;

  if (typeof record.attachedOnChain !== "boolean") {
    throw new Error(`${FEE_DISCOUNT_ENDPOINT}: expected boolean field "attachedOnChain"`);
  }

  if (typeof record.tierId !== "number") {
    throw new Error(`${FEE_DISCOUNT_ENDPOINT}: expected number field "tierId"`);
  }

  return {
    userReferralInfo: {
      userReferralCode: readString(record, "userReferralCode"),
      userReferralCodeString: readString(record, "userReferralCodeString"),
      referralCodeForTxn: readString(record, "referralCodeForTxn"),
      attachedOnChain: record.attachedOnChain,
      affiliate: readString(record, "affiliate"),
      tierId: record.tierId,
      totalRebate: readBigInt(record, "totalRebate"),
      totalRebateFactor: readBigInt(record, "totalRebateFactor"),
      discountShare: readBigInt(record, "discountShare"),
      discountFactor: readBigInt(record, "discountFactor"),
    },
    orderFeeDiscountFactor: readBigInt(record, "orderFeeDiscountFactor"),
    updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : undefined,
  };
}

export async function fetchGmsolFeeDiscount(api: IHttp, address: string): Promise<GmsolFeeDiscount> {
  const raw: unknown = await api.fetchJson(FEE_DISCOUNT_ENDPOINT, { query: { address } });
  return parseGmsolFeeDiscount(raw);
}
