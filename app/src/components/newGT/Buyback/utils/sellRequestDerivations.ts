import type { GtBuybackSellContext } from '../api/gtBuybackSqd';
import { uiToRawAmountString } from './buybackDerivations';

export type SellRequestParameters = {
  amountRaw: string;
  nonce: string;
  quotaReferenceSlot: string;
};

export function deriveSellRequestParameters(
  context: GtBuybackSellContext,
  uiAmount: number,
  gtDecimals: number
): SellRequestParameters {
  if (!context.sellQuotaSnapshot) {
    throw new Error('Sell quota snapshot is not available');
  }
  if (context.referenceSlot <= 0) {
    throw new Error('Sell quota reference slot is not ready');
  }
  const amountRaw = uiToRawAmountString(uiAmount, gtDecimals);
  if (amountRaw === '0') {
    throw new Error('Amount must be greater than zero');
  }
  const nonce = BigInt(context.userSrState?.authoritativeNonce ?? '0') + 1n;
  return {
    amountRaw,
    nonce: nonce.toString(),
    quotaReferenceSlot: context.referenceSlot.toString(),
  };
}
