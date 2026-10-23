import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

// Solana mint (NATIVE_TOKEN_ADDRESS for native SOL) → Arbitrum token symbol, so Solana markets can reuse
// Arbitrum oracle keeper prices, candles and 24h stats. Wrapped and synthetic twins share one symbol.
// Keep in sync with GMSOL_TOKENS.
export const GMSOL_TO_ARBITRUM_SYMBOL: Readonly<Record<string, string>> = {
  [NATIVE_TOKEN_ADDRESS]: "SOL",
  So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH: "SOL",
  So11111111111111111111111111111111111111112: "SOL", // WSOL
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "USDT",
  EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm: "WIF",
  "2wpTofQ8SkACrkZWrZDjXPitYa8AwWgX8AfxdeBRRVLX": "LINK",
  BtcTQYRj7HRRk7MwnWiTFj8rWqN2ALt2QYig4cSWqTbv: "BTC",
  "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh": "BTC", // WBTC
  EthK4kKnQQUd1Ae1w7sdiMAUaJwq2RMwr7AtscXEdEsF: "ETH",
  "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs": "ETH", // WETH
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: "BONK",
  "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN": "TRUMP",
  "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump": "FARTCOIN",
  GmxDsqjKYUrwgbvccGrpF1LoyHPUq8FQqT1FJfkvrMfY: "GMX",
  "9wX6Qz1Y5YQe71dfnFYFfZYXZhKqjYKQwdqfrRkmYUSX": "GMX", // WGMX
  DogeJP1vR955QsXWKT1vw5gJsyiTthqPEtJZj8enDWxF: "DOGE",
  LtcsFqdfsLyoHZ7cRt9BkijqbFRAN1M4fB8naGaykTF: "LTC",
  Unicsoj67GbDzQyWXQEh9vG5jBiVhMREtWBVDAFVpQq: "UNI",
  XrpSaeAcbKAGv8P3kWbMbwbq8xcWgR548yvyiKKJUB9: "XRP",
  BnbuyeSZgnWxXppzkRgiA5TR4t3L9NBRnk6Hbr9m5GsJ: "BNB",
  AaveaPPwFJx88apsgcpzck7xkohpiZPViKkNndRZJ6pv: "AAVE",
  PepeCS5SuDLkUwfnhmBLsPsVdpy9WR5bmXT4dkipR9i: "PEPE",
  SuiyRuzKdsxGgdhVJGg5dDz6wtNSQUAWN21zSdCmYXs: "SUI",
  BchGdYptcKvUDCpHMDAB5h1MfXq2LPzRLcU8b4r8dQiQ: "BCH",
  KgV1GvrHQmRBY8sHQQeUKwTm2r2h8t4C8qt12Cw1HVE: "AVAX",
  TrxYuLyf3WbYPrQ84cjyWgfcEeKTc7m5cKBNBZhY5MN: "TRX",
  X1mpyVGnE5VhzwbAqLp1FuAW7oY45WPTDisbcEkbVLq: "XLM",
  AdamfezT5MsUMv5PtSBDWHwPCpcYVyq2CWAseqNbwU7Q: "ADA",
  DotB5VDVP2VbfETfRsEsWnPH42tBiQZxHjGNH4iaNGSR: "DOT",
  ShibkCetJam99AeDv93Q4KKVkeLCBSLSmBKNLpwt1ik: "SHIB",
  pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn: "PUMP",
  WLFinEv6ypjkczcS83FZqFpgFZYwQXutRbxGe7oC16g: "WLFI",
  C1MHyoTJpRTeS9AQCyspNVu2EWAYCZwmJ1jNkEArFP1f: "APE",
  Ast9jCRDBog1oWQUJbhXbGhiPcjPTgsbPKf3qGK8vixc: "ASTER",
  EnaRUVoWPozu58p8FerezM3fP8erLU5pFeXmjikq9qmR: "ENA",
  HypeVcgZWXS1fSuij5R5Kp9JcYjw34ZG6yic1bde9vS5: "HYPE",
  Xp1adJXBj9MhK7hwAbgPN2rhuiK64nfMYTSg9vzgUB2: "XPL",
  A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS: "ZEC",
  TaouYgVPRRT3TUkfTK7fQWkoSM35cbuMVEFAXifsuAf: "TAO",
  Nearqg83ZH4Wbj2DDeN1EE86CUZaPFX2n8vErWNCPov: "NEAR",
  arb61K9FqhdBzLQdwi4aae6MLn94RzbcMs8varqwUt5: "ARB",
  w1d1cTQ734BFeBdjUAHgH8tBk8EJ52PjcvroUq5Jekw: "WLD",
  LitYCK3XFM7imaCwzutins43WCKfH8iubaEhp9JFPcj: "LIT",
  ondoq3GfxTjnebAmpJ3mCLeoA2mZBRU8Kqoo6vTiaz1: "ONDO",
  VvvGPgHYN8KiC7H4aUQwJdfze5uB6rxkL63nHymxjZM: "VVV",
  Xmric3gq5zb9bcuUW5o2MePQsnni3FxG2wavk6REm6X: "XMR",
};

export function getArbitrumSymbolForGmsolToken(address: string): string | undefined {
  return GMSOL_TO_ARBITRUM_SYMBOL[address];
}
