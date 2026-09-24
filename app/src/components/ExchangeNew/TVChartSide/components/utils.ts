import { BN } from '@coral-xyz/anchor';

// Define the data structure type
export interface MarketData {
  asks: {
    price: BN;
    formattedPrice: string;
    size: BN;
    total: BN;
  }[];
  bids: {
    price: BN;
    formattedPrice: string;
    size: BN;
    total: BN;
  }[];
  lastPrice: BN;
  markPrice: BN;
  hasLongLiquidity: boolean;
  hasShortLiquidity: boolean;
}

export interface SerializedMarketData {
  asks: {
    price: string;
    formattedPrice: string;
    size: string;
    total: string;
  }[];
  bids: {
    price: string;
    formattedPrice: string;
    size: string;
    total: string;
  }[];
  lastPrice: string;
  markPrice: string;
  hasLongLiquidity: boolean;
  hasShortLiquidity: boolean;
}

// Serializes BN fields to strings for localStorage
export function serializeBNData(data: MarketData): {
  asks: {
    price: string;
    formattedPrice: string;
    size: string;
    total: string;
  }[];
  bids: {
    price: string;
    formattedPrice: string;
    size: string;
    total: string;
  }[];
  lastPrice: string;
  markPrice: string;
  hasLongLiquidity: boolean;
  hasShortLiquidity: boolean;
} {
  return {
    asks: data.asks.map((item) => ({
      price: item.price.toString(),
      formattedPrice: item.formattedPrice,
      size: item.size.toString(),
      total: item.total.toString(),
    })),
    bids: data.bids.map((item) => ({
      price: item.price.toString(),
      formattedPrice: item.formattedPrice,
      size: item.size.toString(),
      total: item.total.toString(),
    })),
    lastPrice: data.lastPrice.toString(),
    markPrice: data.markPrice.toString(),
    hasLongLiquidity: data.hasLongLiquidity,
    hasShortLiquidity: data.hasShortLiquidity,
  };
}

// Deserializes strings back to BN
export function deserializeBNData(
  serializedData: SerializedMarketData
): MarketData {
  return {
    asks: serializedData.asks.map((item) => ({
      price: new BN(item.price),
      formattedPrice: item.formattedPrice,
      size: new BN(item.size),
      total: new BN(item.total),
    })),
    bids: serializedData.bids.map((item) => ({
      price: new BN(item.price),
      formattedPrice: item.formattedPrice,
      size: new BN(item.size),
      total: new BN(item.total),
    })),
    lastPrice: new BN(serializedData.lastPrice),
    markPrice: new BN(serializedData.markPrice),
    hasLongLiquidity: serializedData.hasLongLiquidity,
    hasShortLiquidity: serializedData.hasShortLiquidity,
  };
}
