export type GmsolMarketConfig = {
  marketTokenAddress: string;
  indexTokenAddress: string;
  longTokenAddress: string;
  shortTokenAddress: string;
};

// Mainnet market accounts decoded with the gmsol store IDL at finalized slot 459231146 (2026-10-20).
// Crypto markets only; TON, MELANIA, BOME and stock/FX/commodity markets are excluded.
// Inert until a consumer behind solanaNetwork uses this list; do not register it in the SDK.
export const GMSOL_MARKETS: readonly GmsolMarketConfig[] = [
  // ETH/USD[USDC-USDC]
  {
    marketTokenAddress: "DAY6Qr1FKgJQFvjJAhFUZUWHzx8UbbbkRmt6G6AYswWG",
    indexTokenAddress: "EthK4kKnQQUd1Ae1w7sdiMAUaJwq2RMwr7AtscXEdEsF",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // ETH/USD[WETH-WETH]
  {
    marketTokenAddress: "AC7iz89CBopxsuzoPU5drW59PB9rZJYpvqaedGxAjFeK",
    indexTokenAddress: "EthK4kKnQQUd1Ae1w7sdiMAUaJwq2RMwr7AtscXEdEsF",
    longTokenAddress: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
    shortTokenAddress: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
  },
  // BONK/USD[WSOL-USDC]
  {
    marketTokenAddress: "BvC73rarCMrhEnk3JmqaLntpnrwfUCR5eTrf7HQu6ieg",
    indexTokenAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    longTokenAddress: "So11111111111111111111111111111111111111112",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // BTC/USD[USDC-USDC]
  {
    marketTokenAddress: "Dqq58gS1TgRMDouUbdvhhzc51XXTNHG921WLxH9X2eB8",
    indexTokenAddress: "BtcTQYRj7HRRk7MwnWiTFj8rWqN2ALt2QYig4cSWqTbv",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // SOL/USD[USDC-USDC]
  {
    marketTokenAddress: "6UU9sF5fryafHDYPcmVcV7ucfnYs6iMVcvb8p7SBQgTc",
    indexTokenAddress: "So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // BTC/USD[WBTC-WBTC]
  {
    marketTokenAddress: "9JMZj2F9EEMLoJTpftpxSHeixoPZXXkbJ9qLH5vhPXWT",
    indexTokenAddress: "BtcTQYRj7HRRk7MwnWiTFj8rWqN2ALt2QYig4cSWqTbv",
    longTokenAddress: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
    shortTokenAddress: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
  },
  // LINK/USD[WSOL-USDC]
  {
    marketTokenAddress: "3pHXv5NsrxwkDdus2e1rTHoaNK9zUUnGwcwg1oeeCGzd",
    indexTokenAddress: "2wpTofQ8SkACrkZWrZDjXPitYa8AwWgX8AfxdeBRRVLX",
    longTokenAddress: "So11111111111111111111111111111111111111112",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // SOL/USD[WSOL-WSOL]
  {
    marketTokenAddress: "xiLDzynfr7JEoYinAEunZtdz9ubjVAqa5Ap7gJ9y43L",
    indexTokenAddress: "So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH",
    longTokenAddress: "So11111111111111111111111111111111111111112",
    shortTokenAddress: "So11111111111111111111111111111111111111112",
  },
  // TRUMP/USD[USDC-USDC]
  {
    marketTokenAddress: "Eck19AsZP2sqGp4oAkrstTrgUmxjF6nQSQxiiHerweLg",
    indexTokenAddress: "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // WIF/USD[WSOL-USDC]
  {
    marketTokenAddress: "FvuQqxh9MJLDXD1FvDdv5X4HecoTEYHJA5558z8ptim4",
    indexTokenAddress: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    longTokenAddress: "So11111111111111111111111111111111111111112",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // FARTCOIN/USD[WSOL-USDC]
  {
    marketTokenAddress: "GErzt3fxfuQScQYtaKGGbgNtdk3LWDmKZ1YVZX2L4Tjc",
    indexTokenAddress: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump",
    longTokenAddress: "So11111111111111111111111111111111111111112",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // GMX/USD[WSOL-USDC]
  {
    marketTokenAddress: "E6kfBQcdHL3fdWNaydrWViXVtQLTgpxzZicLy98ZNc5v",
    indexTokenAddress: "GmxDsqjKYUrwgbvccGrpF1LoyHPUq8FQqT1FJfkvrMfY",
    longTokenAddress: "So11111111111111111111111111111111111111112",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // BNB/USD[WSOL-USDC]
  {
    marketTokenAddress: "J42dzcHkgmzU7MARv7k29TrkKaGQ1j2mTaYjkBkN7pn5",
    indexTokenAddress: "BnbuyeSZgnWxXppzkRgiA5TR4t3L9NBRnk6Hbr9m5GsJ",
    longTokenAddress: "So11111111111111111111111111111111111111112",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // XRP/USD[WSOL-USDC]
  {
    marketTokenAddress: "FVUbre5BEnWKAN5ZxQ6MUgezS1X2ZUecq4HZDDsa1Q6i",
    indexTokenAddress: "XrpSaeAcbKAGv8P3kWbMbwbq8xcWgR548yvyiKKJUB9",
    longTokenAddress: "So11111111111111111111111111111111111111112",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // DOGE/USD[WSOL-USDC]
  {
    marketTokenAddress: "BjEpsvvjca1cQ6KGaeULn6sp8hPsP7XhRvUhepPX181c",
    indexTokenAddress: "DogeJP1vR955QsXWKT1vw5gJsyiTthqPEtJZj8enDWxF",
    longTokenAddress: "So11111111111111111111111111111111111111112",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // SUI/USD[WSOL-USDC]
  {
    marketTokenAddress: "2MS6KM17L6JjQfAPfkzjezKre3xKsARdRQVjrdd6Kvmf",
    indexTokenAddress: "SuiyRuzKdsxGgdhVJGg5dDz6wtNSQUAWN21zSdCmYXs",
    longTokenAddress: "So11111111111111111111111111111111111111112",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // LTC/USD[WSOL-USDC]
  {
    marketTokenAddress: "527jUvh7guN8Fip96TeJhKWreeWdcwD9CFFwXG9mTiHQ",
    indexTokenAddress: "LtcsFqdfsLyoHZ7cRt9BkijqbFRAN1M4fB8naGaykTF",
    longTokenAddress: "So11111111111111111111111111111111111111112",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // PEPE/USD[WSOL-USDC]
  {
    marketTokenAddress: "BeyjceC5eXoq3pkmdoDHrE2UVwuYamAdXkM9GmphZFhE",
    indexTokenAddress: "PepeCS5SuDLkUwfnhmBLsPsVdpy9WR5bmXT4dkipR9i",
    longTokenAddress: "So11111111111111111111111111111111111111112",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // BCH/USD[WSOL-USDC]
  {
    marketTokenAddress: "sWvE7CfFpES3WCbgeM45ZvAXRm34c9ssdf8PEApTqaX",
    indexTokenAddress: "BchGdYptcKvUDCpHMDAB5h1MfXq2LPzRLcU8b4r8dQiQ",
    longTokenAddress: "So11111111111111111111111111111111111111112",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // UNI/USD[WSOL-USDC]
  {
    marketTokenAddress: "6dDEEisqtCL6Wh49gAHtXaoE9NkSKXHvLLuTqLPz9sDM",
    indexTokenAddress: "Unicsoj67GbDzQyWXQEh9vG5jBiVhMREtWBVDAFVpQq",
    longTokenAddress: "So11111111111111111111111111111111111111112",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // AAVE/USD[WSOL-USDC]
  {
    marketTokenAddress: "2dVHXNgzC7vvcsDi89S6crSkX3Y6HzPgZfmWqttEzvmo",
    indexTokenAddress: "AaveaPPwFJx88apsgcpzck7xkohpiZPViKkNndRZJ6pv",
    longTokenAddress: "So11111111111111111111111111111111111111112",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // BTC/USD[WSOL-USDC]
  {
    marketTokenAddress: "EE889Nsvqkk3A82GXhxbCbpNkM6Fkqdgp8UNv5sZ2qU",
    indexTokenAddress: "BtcTQYRj7HRRk7MwnWiTFj8rWqN2ALt2QYig4cSWqTbv",
    longTokenAddress: "So11111111111111111111111111111111111111112",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // ETH/USD[WSOL-USDC]
  {
    marketTokenAddress: "73mxoziw5uKnrXSAKA693b225r5aru1Sdkn9msXznh4R",
    indexTokenAddress: "EthK4kKnQQUd1Ae1w7sdiMAUaJwq2RMwr7AtscXEdEsF",
    longTokenAddress: "So11111111111111111111111111111111111111112",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // SOL/USD[WSOL-USDC]
  {
    marketTokenAddress: "BwN2FWixP5JyKjJNyD1YcRKN1XhgvFtnzrPrkfyb4DkW",
    indexTokenAddress: "So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH",
    longTokenAddress: "So11111111111111111111111111111111111111112",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // XLM/USD[USDC-USDC]
  {
    marketTokenAddress: "2aGHXNEJAHmsiSVdz5h4stSjnLfohs79iSJdkDdZBs4F",
    indexTokenAddress: "X1mpyVGnE5VhzwbAqLp1FuAW7oY45WPTDisbcEkbVLq",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // TRX/USD[USDC-USDC]
  {
    marketTokenAddress: "4QX94xP34zFJyeTxJQ4oJ4MeWcuRYViCDmxTjwAYN9Vp",
    indexTokenAddress: "TrxYuLyf3WbYPrQ84cjyWgfcEeKTc7m5cKBNBZhY5MN",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // SHIB/USD[USDC-USDC]
  {
    marketTokenAddress: "6kKGHF9tPoXvtyAGUY8mfuRCFXBw61xWfhfS4sSJbXFr",
    indexTokenAddress: "ShibkCetJam99AeDv93Q4KKVkeLCBSLSmBKNLpwt1ik",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // ETH/USD[WETH-USDC]
  {
    marketTokenAddress: "5KSsaGZebQSAxZcYuzRz5JWCxoYztWYcfTcRBWLCwoMX",
    indexTokenAddress: "EthK4kKnQQUd1Ae1w7sdiMAUaJwq2RMwr7AtscXEdEsF",
    longTokenAddress: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // DOT/USD[USDC-USDC]
  {
    marketTokenAddress: "2Ek8kU98XKeH4ErvQcEGoEf2Q2xqBMEK6bfjanypVeZP",
    indexTokenAddress: "DotB5VDVP2VbfETfRsEsWnPH42tBiQZxHjGNH4iaNGSR",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // BTC/USD[WBTC-USDC]
  {
    marketTokenAddress: "7RNev94wKusSmFEqo3gvv1d1zMweP6sa2LtjJjroAvym",
    indexTokenAddress: "BtcTQYRj7HRRk7MwnWiTFj8rWqN2ALt2QYig4cSWqTbv",
    longTokenAddress: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // AVAX/USD[USDC-USDC]
  {
    marketTokenAddress: "2wxH1sGLH4Rui6Ws4F1nFDHtW3aJDG1fAF3gZVJ7ktwV",
    indexTokenAddress: "KgV1GvrHQmRBY8sHQQeUKwTm2r2h8t4C8qt12Cw1HVE",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // ADA/USD[USDC-USDC]
  {
    marketTokenAddress: "4x3BBE2tx8fFG2V6BjHEWevo3j3jraYWTAHVfKTt31w2",
    indexTokenAddress: "AdamfezT5MsUMv5PtSBDWHwPCpcYVyq2CWAseqNbwU7Q",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // TRUMP/USD[WSOL-USDC]
  {
    marketTokenAddress: "AyCysi8mWtHWs7TLe13tFPCB515kSQHmBqkszpAeEqbK",
    indexTokenAddress: "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN",
    longTokenAddress: "So11111111111111111111111111111111111111112",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // PUMP/USD[USDC-USDC]
  {
    marketTokenAddress: "C1d1rAehpY5U79593gB7ne7V4CDErYgAcwpvjSMd3dok",
    indexTokenAddress: "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // BCH/USD[USDC-USDC]
  {
    marketTokenAddress: "7X3EpLG2yW7SzPzz9NYarouQGMsPkYxZJBGEhVkkdXWW",
    indexTokenAddress: "BchGdYptcKvUDCpHMDAB5h1MfXq2LPzRLcU8b4r8dQiQ",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // BNB/USD[USDC-USDC]
  {
    marketTokenAddress: "5bi8Ve65rhCjwP2ssmhwTQ7dtfRk5BSo6jYwtrJxkDQH",
    indexTokenAddress: "BnbuyeSZgnWxXppzkRgiA5TR4t3L9NBRnk6Hbr9m5GsJ",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // DOGE/USD[USDC-USDC]
  {
    marketTokenAddress: "D8VqUfw81UPnreceozYSHbmwdGizk9C4ekV6fXZqr6YJ",
    indexTokenAddress: "DogeJP1vR955QsXWKT1vw5gJsyiTthqPEtJZj8enDWxF",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // LINK/USD[USDC-USDC]
  {
    marketTokenAddress: "EFdTdjGE6hze8RD4XjwmQJRd8CD9Soq3rbPm53dPcMsx",
    indexTokenAddress: "2wpTofQ8SkACrkZWrZDjXPitYa8AwWgX8AfxdeBRRVLX",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // LTC/USD[USDC-USDC]
  {
    marketTokenAddress: "5Sv9AETZBdR8JGpe3YMZJKzhvQmnLsAgcrfViJ8y8LB7",
    indexTokenAddress: "LtcsFqdfsLyoHZ7cRt9BkijqbFRAN1M4fB8naGaykTF",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // SUI/USD[USDC-USDC]
  {
    marketTokenAddress: "FWw1tetkZETBz4iyToM7K1VhBMcnQQpHzqbHa1eqkdWe",
    indexTokenAddress: "SuiyRuzKdsxGgdhVJGg5dDz6wtNSQUAWN21zSdCmYXs",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // UNI/USD[USDC-USDC]
  {
    marketTokenAddress: "6udTz3TdPfKRZQ1GF1L372DkpFoFu4Hz2HSpyjdXrMVr",
    indexTokenAddress: "Unicsoj67GbDzQyWXQEh9vG5jBiVhMREtWBVDAFVpQq",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // XRP/USD[USDC-USDC]
  {
    marketTokenAddress: "6vUDkCZqCNF2dZnPRHDySDDYvvvVPQGM68qie4cYBQHL",
    indexTokenAddress: "XrpSaeAcbKAGv8P3kWbMbwbq8xcWgR548yvyiKKJUB9",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // WLFI/USD[USDC-USDC]
  {
    marketTokenAddress: "9uQdTgDAvZgTwPYFGyzTaotAjSZcUKndwhLuzsQt1vto",
    indexTokenAddress: "WLFinEv6ypjkczcS83FZqFpgFZYwQXutRbxGe7oC16g",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // APE/USD[APE-USDC]
  {
    marketTokenAddress: "3oy9VYvMUh9iPRA4adCdGHJLPg2QUAqxupQZoaFR7vwV",
    indexTokenAddress: "C1MHyoTJpRTeS9AQCyspNVu2EWAYCZwmJ1jNkEArFP1f",
    longTokenAddress: "C1MHyoTJpRTeS9AQCyspNVu2EWAYCZwmJ1jNkEArFP1f",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // HYPE/USD[USDC-USDC]
  {
    marketTokenAddress: "4GmYJA45W11rQYsWcq3CHvASY199wTQz2LFj8tQBqqWC",
    indexTokenAddress: "HypeVcgZWXS1fSuij5R5Kp9JcYjw34ZG6yic1bde9vS5",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // ENA/USD[USDC-USDC]
  {
    marketTokenAddress: "BgiWpn6fEU3duXEyZN49kHwjxMdazkJi1aZrUQGQkWJn",
    indexTokenAddress: "EnaRUVoWPozu58p8FerezM3fP8erLU5pFeXmjikq9qmR",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // ASTER/USD[USDC-USDC]
  {
    marketTokenAddress: "EVDVoXejNDFumTNos8C84nWRTUXPYJqCAdWfei7TwxZC",
    indexTokenAddress: "Ast9jCRDBog1oWQUJbhXbGhiPcjPTgsbPKf3qGK8vixc",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // XPL/USD[USDC-USDC]
  {
    marketTokenAddress: "6D5w1vz5yqLUTXsCpFBUPcZ5AnbHBsgG6XVGpc2ZcttK",
    indexTokenAddress: "Xp1adJXBj9MhK7hwAbgPN2rhuiK64nfMYTSg9vzgUB2",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // GMX/USD[WGMX-USDC]
  {
    marketTokenAddress: "CH7pboF6PnCTAuWZbhC1eLKsX6rjd2UAPG87oqsizxR2",
    indexTokenAddress: "GmxDsqjKYUrwgbvccGrpF1LoyHPUq8FQqT1FJfkvrMfY",
    longTokenAddress: "9wX6Qz1Y5YQe71dfnFYFfZYXZhKqjYKQwdqfrRkmYUSX",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // ZEC/USD[WGMX-USDC]
  {
    marketTokenAddress: "6RXHXFAXmAkNkgk59b15ycEKxYrdEYB8Sv7WiyUT24vj",
    indexTokenAddress: "A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS",
    longTokenAddress: "9wX6Qz1Y5YQe71dfnFYFfZYXZhKqjYKQwdqfrRkmYUSX",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // TAO/USD[WGMX-USDC]
  {
    marketTokenAddress: "2gYBsHNtxwj6Ydz159frrp7em7rT4KfEnk9a6AXDMyNV",
    indexTokenAddress: "TaouYgVPRRT3TUkfTK7fQWkoSM35cbuMVEFAXifsuAf",
    longTokenAddress: "9wX6Qz1Y5YQe71dfnFYFfZYXZhKqjYKQwdqfrRkmYUSX",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // NEAR/USD[WGMX-USDC]
  {
    marketTokenAddress: "7p6syvfgMsUmCDjsX9wyBtXUk1zZoMH4WYquS83r1Scm",
    indexTokenAddress: "Nearqg83ZH4Wbj2DDeN1EE86CUZaPFX2n8vErWNCPov",
    longTokenAddress: "9wX6Qz1Y5YQe71dfnFYFfZYXZhKqjYKQwdqfrRkmYUSX",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // ARB/USD[WGMX-USDC]
  {
    marketTokenAddress: "5PRmYd1WbEb1onzHAqaxevt6vAU2fCRSBeJBqSsMmkEh",
    indexTokenAddress: "arb61K9FqhdBzLQdwi4aae6MLn94RzbcMs8varqwUt5",
    longTokenAddress: "9wX6Qz1Y5YQe71dfnFYFfZYXZhKqjYKQwdqfrRkmYUSX",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // WLD/USD[WGMX-USDC]
  {
    marketTokenAddress: "JA3xB9zFPBsWaAeDveLd3ia7maznJdL9qzLP81z5r73Z",
    indexTokenAddress: "w1d1cTQ734BFeBdjUAHgH8tBk8EJ52PjcvroUq5Jekw",
    longTokenAddress: "9wX6Qz1Y5YQe71dfnFYFfZYXZhKqjYKQwdqfrRkmYUSX",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // BONK/USD[USDC-USDC]
  {
    marketTokenAddress: "996QqBhGoKfNike6G7aURTEoD7SX6CrJQw6DMnq354Nw",
    indexTokenAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // FARTCOIN/USD[USDC-USDC]
  {
    marketTokenAddress: "3t88GTQgD1Dyi4qX1BeW1zpJ1d4g8wXieFeX5VXpCTNo",
    indexTokenAddress: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // PEPE/USD[USDC-USDC]
  {
    marketTokenAddress: "4g6FhbTU5gYyqbFSudEsnZ7FgUAb5P9QAogJ6iVM6jYJ",
    indexTokenAddress: "PepeCS5SuDLkUwfnhmBLsPsVdpy9WR5bmXT4dkipR9i",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // WIF/USD[USDC-USDC]
  {
    marketTokenAddress: "BXcGhms3ZnikNcEzU3ivKZJ8ia2Xn9jV1J6Kn8dUdUUH",
    indexTokenAddress: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    longTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // ASTER/USD[USDT-USDT]
  {
    marketTokenAddress: "EgmB7CeymWucnEmVjpqKoXqTuZfMuxzPf89ZziU2gmPE",
    indexTokenAddress: "Ast9jCRDBog1oWQUJbhXbGhiPcjPTgsbPKf3qGK8vixc",
    longTokenAddress: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    shortTokenAddress: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  },
  // LIT/USD[WGMX-USDC]
  {
    marketTokenAddress: "5MpBQqsNFhuSJL27NAJ8W25TQ8yZVr6PZezjrU74LbMq",
    indexTokenAddress: "LitYCK3XFM7imaCwzutins43WCKfH8iubaEhp9JFPcj",
    longTokenAddress: "9wX6Qz1Y5YQe71dfnFYFfZYXZhKqjYKQwdqfrRkmYUSX",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // ONDO/USD[WGMX-USDC]
  {
    marketTokenAddress: "31BzkcazjG25MZu9gbm5eezYb3b3ozEuQAvXdyftD7Q1",
    indexTokenAddress: "ondoq3GfxTjnebAmpJ3mCLeoA2mZBRU8Kqoo6vTiaz1",
    longTokenAddress: "9wX6Qz1Y5YQe71dfnFYFfZYXZhKqjYKQwdqfrRkmYUSX",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // VVV/USD[WGMX-USDC]
  {
    marketTokenAddress: "A5wbRLowPh1T3CtD31KN25i6NqW7wk6Kc5fkED3qCLCn",
    indexTokenAddress: "VvvGPgHYN8KiC7H4aUQwJdfze5uB6rxkL63nHymxjZM",
    longTokenAddress: "9wX6Qz1Y5YQe71dfnFYFfZYXZhKqjYKQwdqfrRkmYUSX",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  // XMR/USD[WGMX-USDC]
  {
    marketTokenAddress: "4X9uP7QX3zqjwQUWJhVznodUYA7RLGquhR2E8WeZeNBk",
    indexTokenAddress: "Xmric3gq5zb9bcuUW5o2MePQsnni3FxG2wavk6REm6X",
    longTokenAddress: "9wX6Qz1Y5YQe71dfnFYFfZYXZhKqjYKQwdqfrRkmYUSX",
    shortTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
];
