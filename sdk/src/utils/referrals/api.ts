import type { IHttp } from "utils/http/types";
import { readApiString, readApiUnsignedBigInt } from "utils/http/validation";
import { isRecord } from "utils/objects";

import type { FeeDiscount } from "./types";

const FEE_DISCOUNT_ENDPOINT = "/v1/fee-discount";

export function parseFeeDiscount(raw: unknown): FeeDiscount {
  if (!isRecord(raw)) {
    throw new Error(`${FEE_DISCOUNT_ENDPOINT}: expected an object`);
  }

  const record = raw;
  const endpoint = FEE_DISCOUNT_ENDPOINT;

  if (typeof record.attachedOnChain !== "boolean") {
    throw new Error(`${FEE_DISCOUNT_ENDPOINT}: expected boolean field "attachedOnChain"`);
  }

  if (typeof record.tierId !== "number" || !Number.isSafeInteger(record.tierId) || record.tierId < 0) {
    throw new Error(`${FEE_DISCOUNT_ENDPOINT}: expected number field "tierId"`);
  }

  return {
    userReferralInfo: {
      userReferralCode: readApiString({ record, name: "userReferralCode", endpoint }),
      userReferralCodeString: readApiString({ record, name: "userReferralCodeString", endpoint }),
      referralCodeForTxn: readApiString({ record, name: "referralCodeForTxn", endpoint }),
      attachedOnChain: record.attachedOnChain,
      affiliate: readApiString({ record, name: "affiliate", endpoint }),
      tierId: record.tierId,
      totalRebate: readApiUnsignedBigInt({ record, name: "totalRebate", endpoint }),
      totalRebateFactor: readApiUnsignedBigInt({ record, name: "totalRebateFactor", endpoint }),
      discountShare: readApiUnsignedBigInt({ record, name: "discountShare", endpoint }),
      discountFactor: readApiUnsignedBigInt({ record, name: "discountFactor", endpoint }),
    },
    orderFeeDiscountFactor: readApiUnsignedBigInt({ record, name: "orderFeeDiscountFactor", endpoint }),
    updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : undefined,
  };
}

export async function fetchApiFeeDiscount(ctx: { api: IHttp }, params: { address: string }): Promise<FeeDiscount> {
  const raw: unknown = await ctx.api.fetchJson(FEE_DISCOUNT_ENDPOINT, { query: { address: params.address } });
  return parseFeeDiscount(raw);
}
