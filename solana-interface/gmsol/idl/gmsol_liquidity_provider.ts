/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/gmsol_liquidity_provider.json`.
 */
export type GmsolLiquidityProvider = {
  "address": "LPMWczEVgXyQ3979XaqqEttanCXmYGvtJqPVtw1PvC8",
  "metadata": {
    "name": "gmsolLiquidityProvider",
    "version": "0.8.0",
    "spec": "0.1.0",
    "description": "GMX-Solana is an extension of GMX on the Solana blockchain.",
    "repository": "https://github.com/gmsol-labs/gmx-solana"
  },
  "instructions": [
    {
      "name": "acceptAuthority",
      "docs": [
        "Accept authority if you are the pending_authority; finalizes the handover."
      ],
      "discriminator": [
        107,
        86,
        198,
        91,
        33,
        12,
        107,
        160
      ],
      "accounts": [
        {
          "name": "globalState",
          "docs": [
            "Global config (PDA). The signer must equal `global_state.pending_authority`."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "pendingAuthority",
          "docs": [
            "Pending authority accepting control (must match `global_state.pending_authority`)"
          ],
          "signer": true,
          "relations": [
            "globalState"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "calculateGtReward",
      "docs": [
        "Calculate GT rewards for LP based on stored Position data (no mint)"
      ],
      "discriminator": [
        118,
        226,
        87,
        38,
        17,
        161,
        244,
        218
      ],
      "accounts": [
        {
          "name": "globalState",
          "docs": [
            "Global config (PDA)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          },
          "relations": [
            "controller"
          ]
        },
        {
          "name": "controller",
          "docs": [
            "LP token controller for this position's mint"
          ],
          "relations": [
            "position"
          ]
        },
        {
          "name": "gtStore",
          "docs": [
            "The GT Store account (loaded & mutated by CPI)"
          ],
          "writable": true
        },
        {
          "name": "gtProgram",
          "docs": [
            "The GT program"
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        },
        {
          "name": "position",
          "docs": [
            "Position tied to (controller, owner, position_id)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "controller"
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "positionId"
              }
            ]
          }
        },
        {
          "name": "owner",
          "docs": [
            "Owner of the position (not required to sign for read-only calc)"
          ],
          "relations": [
            "position"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "claimGt",
      "docs": [
        "Claim GT rewards for a position, minting tokens and updating snapshot"
      ],
      "discriminator": [
        13,
        225,
        198,
        47,
        68,
        147,
        199,
        163
      ],
      "accounts": [
        {
          "name": "globalState",
          "docs": [
            "Global config (PDA)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          },
          "relations": [
            "controller"
          ]
        },
        {
          "name": "controller",
          "docs": [
            "LP token controller for this position's mint"
          ],
          "relations": [
            "position"
          ]
        },
        {
          "name": "store",
          "docs": [
            "The GT Store account (mutated by CPI)"
          ],
          "writable": true,
          "relations": [
            "gtUser"
          ]
        },
        {
          "name": "gtProgram",
          "docs": [
            "The GT program"
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        },
        {
          "name": "position",
          "docs": [
            "Position tied to (controller, owner, position_id)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "controller"
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "positionId"
              }
            ]
          }
        },
        {
          "name": "owner",
          "docs": [
            "Owner of the position"
          ],
          "signer": true,
          "relations": [
            "position",
            "gtUser"
          ]
        },
        {
          "name": "gtUser",
          "docs": [
            "GT User account (mut) managed by the GT program; must correspond to (store, owner)"
          ],
          "writable": true
        },
        {
          "name": "eventAuthority"
        }
      ],
      "args": [
        {
          "name": "positionId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createLpTokenController",
      "docs": [
        "Create a new LP token controller for a specific token mint"
      ],
      "discriminator": [
        192,
        171,
        199,
        177,
        191,
        214,
        186,
        8
      ],
      "accounts": [
        {
          "name": "globalState",
          "docs": [
            "Global config (PDA). The `authority` signer must match `global_state.authority`."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "controller",
          "docs": [
            "LP token controller to initialize"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  99,
                  111,
                  110,
                  116,
                  114,
                  111,
                  108,
                  108,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "globalState"
              },
              {
                "kind": "arg",
                "path": "lpTokenMint"
              },
              {
                "kind": "arg",
                "path": "controllerIndex"
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "Current authority"
          ],
          "writable": true,
          "signer": true,
          "relations": [
            "globalState"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "lpTokenMint",
          "type": "pubkey"
        },
        {
          "name": "controllerIndex",
          "type": "u64"
        }
      ]
    },
    {
      "name": "disableLpTokenController",
      "docs": [
        "Disable LP token controller (irreversible)"
      ],
      "discriminator": [
        234,
        244,
        255,
        11,
        164,
        136,
        159,
        144
      ],
      "accounts": [
        {
          "name": "globalState",
          "docs": [
            "Global config (PDA). The `authority` signer must match `global_state.authority`."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          },
          "relations": [
            "controller"
          ]
        },
        {
          "name": "controller",
          "docs": [
            "LP token controller to disable"
          ],
          "writable": true
        },
        {
          "name": "gtStore",
          "docs": [
            "The GT Store account (mutated by CPI)"
          ],
          "writable": true
        },
        {
          "name": "gtProgram",
          "docs": [
            "GT program"
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        },
        {
          "name": "authority",
          "docs": [
            "Current authority"
          ],
          "signer": true,
          "relations": [
            "globalState"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "docs": [
        "Initialize LP staking program"
      ],
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "globalState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "minStakeValue",
          "type": "u128"
        },
        {
          "name": "initialApy",
          "type": "u128"
        }
      ]
    },
    {
      "name": "setClaimEnabled",
      "docs": [
        "Toggle whether LPs can claim GT without unstaking."
      ],
      "discriminator": [
        251,
        228,
        158,
        120,
        230,
        38,
        185,
        27
      ],
      "accounts": [
        {
          "name": "globalState",
          "docs": [
            "Global config (PDA). The `authority` signer must match `global_state.authority`."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "Current authority"
          ],
          "signer": true,
          "relations": [
            "globalState"
          ]
        }
      ],
      "args": [
        {
          "name": "enabled",
          "type": "bool"
        }
      ]
    },
    {
      "name": "setPricingStaleness",
      "docs": [
        "Set pricing staleness configuration"
      ],
      "discriminator": [
        161,
        221,
        21,
        196,
        66,
        110,
        222,
        97
      ],
      "accounts": [
        {
          "name": "globalState",
          "docs": [
            "Global config (PDA). The `authority` signer must match `global_state.authority`."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "Current authority"
          ],
          "signer": true,
          "relations": [
            "globalState"
          ]
        }
      ],
      "args": [
        {
          "name": "stalenessSeconds",
          "type": "u32"
        }
      ]
    },
    {
      "name": "stakeGlv",
      "docs": [
        "Stake GLV tokens with automatic pricing via CPI"
      ],
      "discriminator": [
        156,
        92,
        208,
        171,
        0,
        173,
        219,
        232
      ],
      "accounts": [
        {
          "name": "globalState",
          "docs": [
            "Global config (PDA)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          },
          "relations": [
            "controller"
          ]
        },
        {
          "name": "controller",
          "docs": [
            "LP token controller for this mint"
          ],
          "writable": true
        },
        {
          "name": "lpMint",
          "docs": [
            "GLV token mint to be staked"
          ]
        },
        {
          "name": "position",
          "docs": [
            "Position PDA to initialize"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "controller"
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "positionId"
              }
            ]
          }
        },
        {
          "name": "positionVault",
          "docs": [
            "Vault token account (PDA) to hold staked GLV tokens"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "position"
              }
            ]
          }
        },
        {
          "name": "gtStore",
          "docs": [
            "The GT Store account (mutated by CPI)"
          ],
          "writable": true
        },
        {
          "name": "gtProgram",
          "docs": [
            "GT program"
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        },
        {
          "name": "owner",
          "docs": [
            "Owner paying rent and recorded as position owner"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "userLpToken",
          "docs": [
            "User's GLV token account"
          ],
          "writable": true
        },
        {
          "name": "tokenMap"
        },
        {
          "name": "oracle",
          "writable": true
        },
        {
          "name": "glv"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "positionId",
          "type": "u64"
        },
        {
          "name": "glvStakedAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "stakeGm",
      "docs": [
        "Stake GM tokens with automatic pricing via CPI"
      ],
      "discriminator": [
        42,
        189,
        6,
        136,
        24,
        96,
        191,
        130
      ],
      "accounts": [
        {
          "name": "globalState",
          "docs": [
            "Global config (PDA)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          },
          "relations": [
            "controller"
          ]
        },
        {
          "name": "controller",
          "docs": [
            "LP token controller for this mint"
          ],
          "writable": true
        },
        {
          "name": "lpMint",
          "docs": [
            "GM token mint to be staked (market token)"
          ]
        },
        {
          "name": "position",
          "docs": [
            "Position PDA to initialize"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "controller"
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "positionId"
              }
            ]
          }
        },
        {
          "name": "positionVault",
          "docs": [
            "Vault token account (PDA) to hold staked GM tokens"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "position"
              }
            ]
          }
        },
        {
          "name": "gtStore",
          "docs": [
            "The GT Store account (mutated by CPI)"
          ],
          "writable": true
        },
        {
          "name": "gtProgram",
          "docs": [
            "GT program"
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        },
        {
          "name": "owner",
          "docs": [
            "Owner paying rent and recorded as position owner"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "userLpToken",
          "docs": [
            "User's GM token account"
          ],
          "writable": true
        },
        {
          "name": "tokenMap"
        },
        {
          "name": "oracle",
          "writable": true
        },
        {
          "name": "market"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "positionId",
          "type": "u64"
        },
        {
          "name": "gmStakedAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "transferAuthority",
      "docs": [
        "Propose transferring program authority to `new_authority` (two-step handover)."
      ],
      "discriminator": [
        48,
        169,
        76,
        72,
        229,
        180,
        55,
        161
      ],
      "accounts": [
        {
          "name": "globalState",
          "docs": [
            "Global config (PDA). The `authority` signer must match `global_state.authority`."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "Current authority proposing a transfer"
          ],
          "signer": true,
          "relations": [
            "globalState"
          ]
        }
      ],
      "args": [
        {
          "name": "newAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "unstakeLp",
      "docs": [
        "Unstake LP: first claim rewards, then either close the position (full) or update proportionally (partial)"
      ],
      "discriminator": [
        114,
        4,
        7,
        206,
        251,
        176,
        233,
        119
      ],
      "accounts": [
        {
          "name": "globalState",
          "docs": [
            "Global config (PDA)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          },
          "relations": [
            "controller"
          ]
        },
        {
          "name": "controller",
          "docs": [
            "LP token controller for this position's mint"
          ],
          "writable": true,
          "relations": [
            "position"
          ]
        },
        {
          "name": "lpMint",
          "docs": [
            "LP token mint for this position (must match position.lp_mint)"
          ]
        },
        {
          "name": "store",
          "docs": [
            "The GT Store account (mutated by CPI)"
          ],
          "writable": true,
          "relations": [
            "gtUser"
          ]
        },
        {
          "name": "gtProgram",
          "docs": [
            "The GT program"
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        },
        {
          "name": "position",
          "docs": [
            "Position tied to (controller, owner, position_id)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "controller"
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "positionId"
              }
            ]
          }
        },
        {
          "name": "positionVault",
          "docs": [
            "Vault holding staked LP tokens (PDA)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "position"
              }
            ]
          }
        },
        {
          "name": "owner",
          "docs": [
            "Owner of the position"
          ],
          "signer": true,
          "relations": [
            "position",
            "gtUser"
          ]
        },
        {
          "name": "gtUser",
          "docs": [
            "GT User account (mut) managed by the GT program; must correspond to (store, owner)"
          ],
          "writable": true
        },
        {
          "name": "userLpToken",
          "docs": [
            "Destination LP token account to receive unstaked tokens"
          ],
          "writable": true
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "positionId",
          "type": "u64"
        },
        {
          "name": "unstakeAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateApyGradientRange",
      "docs": [
        "Update APY gradient for a contiguous range of buckets",
        "",
        "Note: APY changes are applied retroactively and affect all existing positions.",
        "Rewards are calculated using current APY gradients at claim/unstake time."
      ],
      "discriminator": [
        11,
        49,
        254,
        237,
        67,
        100,
        145,
        61
      ],
      "accounts": [
        {
          "name": "globalState",
          "docs": [
            "Global config (PDA). The `authority` signer must match `global_state.authority`."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "Current authority"
          ],
          "signer": true,
          "relations": [
            "globalState"
          ]
        }
      ],
      "args": [
        {
          "name": "startBucket",
          "type": "u8"
        },
        {
          "name": "endBucket",
          "type": "u8"
        },
        {
          "name": "apyValues",
          "type": {
            "vec": "u128"
          }
        }
      ]
    },
    {
      "name": "updateApyGradientSparse",
      "docs": [
        "Update APY gradient with a sparse table (only non-zero buckets)",
        "",
        "Note: APY changes are applied retroactively and affect all existing positions.",
        "Rewards are calculated using current APY gradients at claim/unstake time."
      ],
      "discriminator": [
        130,
        192,
        17,
        128,
        242,
        224,
        186,
        254
      ],
      "accounts": [
        {
          "name": "globalState",
          "docs": [
            "Global config (PDA). The `authority` signer must match `global_state.authority`."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "Current authority"
          ],
          "signer": true,
          "relations": [
            "globalState"
          ]
        }
      ],
      "args": [
        {
          "name": "bucketIndices",
          "type": "bytes"
        },
        {
          "name": "apyValues",
          "type": {
            "vec": "u128"
          }
        }
      ]
    },
    {
      "name": "updateMinStakeValue",
      "docs": [
        "Update the minimum stake value (1e20 scaled)"
      ],
      "discriminator": [
        226,
        7,
        46,
        39,
        38,
        22,
        164,
        122
      ],
      "accounts": [
        {
          "name": "globalState",
          "docs": [
            "Global config (PDA). The `authority` signer must match `global_state.authority`."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "Current authority"
          ],
          "signer": true,
          "relations": [
            "globalState"
          ]
        }
      ],
      "args": [
        {
          "name": "newMinStakeValue",
          "type": "u128"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "globalState",
      "discriminator": [
        163,
        46,
        74,
        168,
        216,
        123,
        133,
        98
      ]
    },
    {
      "name": "glv",
      "discriminator": [
        136,
        174,
        157,
        179,
        203,
        155,
        156,
        243
      ]
    },
    {
      "name": "lpTokenController",
      "discriminator": [
        210,
        163,
        6,
        69,
        215,
        217,
        239,
        57
      ]
    },
    {
      "name": "market",
      "discriminator": [
        219,
        190,
        213,
        55,
        0,
        227,
        198,
        154
      ]
    },
    {
      "name": "oracle",
      "discriminator": [
        139,
        194,
        131,
        179,
        140,
        179,
        229,
        244
      ]
    },
    {
      "name": "position",
      "discriminator": [
        170,
        188,
        143,
        228,
        122,
        64,
        247,
        208
      ]
    },
    {
      "name": "store",
      "discriminator": [
        130,
        48,
        247,
        244,
        182,
        191,
        30,
        26
      ]
    },
    {
      "name": "tokenMapHeader",
      "discriminator": [
        107,
        43,
        27,
        24,
        245,
        62,
        145,
        126
      ]
    },
    {
      "name": "userHeader",
      "discriminator": [
        12,
        78,
        211,
        244,
        225,
        77,
        209,
        249
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Unauthorized operation"
    },
    {
      "code": 6001,
      "name": "invalidArgument",
      "msg": "Invalid argument"
    },
    {
      "code": 6002,
      "name": "mathOverflow",
      "msg": "Math overflow"
    },
    {
      "code": 6003,
      "name": "apyTooLarge",
      "msg": "APY value exceeds the configured maximum"
    },
    {
      "code": 6004,
      "name": "claimDisabled",
      "msg": "Claim is disabled by protocol policy"
    },
    {
      "code": 6005,
      "name": "controllerNotFound",
      "msg": "LP token controller not found"
    },
    {
      "code": 6006,
      "name": "stakingDisabled",
      "msg": "Staking is disabled for this LP token"
    },
    {
      "code": 6007,
      "name": "alreadyDisabled",
      "msg": "Controller is already disabled"
    }
  ],
  "types": [
    {
      "name": "addresses",
      "docs": [
        "Addresses."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "holding",
            "type": "pubkey"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "pubkey",
                30
              ]
            }
          }
        ]
      }
    },
    {
      "name": "amounts",
      "docs": [
        "Amounts."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "claimableTimeWindow",
            "type": "u64"
          },
          {
            "name": "recentTimeWindow",
            "type": "u64"
          },
          {
            "name": "requestExpiration",
            "type": "u64"
          },
          {
            "name": "oracleMaxAge",
            "type": "u64"
          },
          {
            "name": "oracleMaxTimestampRange",
            "type": "u64"
          },
          {
            "name": "oracleMaxFutureTimestampExcess",
            "type": "u64"
          },
          {
            "name": "adlPricesMaxStaleness",
            "type": "u64"
          },
          {
            "name": "minPositionAgeForManualClose",
            "type": "u64"
          },
          {
            "name": "marketClosedPricesMaxStaleness",
            "type": "u64"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u64",
                124
              ]
            }
          }
        ]
      }
    },
    {
      "name": "clocks",
      "docs": [
        "Market clocks."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "rev",
            "type": "u64"
          },
          {
            "name": "priceImpactDistribution",
            "type": "i64"
          },
          {
            "name": "borrowing",
            "type": "i64"
          },
          {
            "name": "funding",
            "type": "i64"
          },
          {
            "name": "adlForLong",
            "type": "i64"
          },
          {
            "name": "adlForShort",
            "type": "i64"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "i64",
                3
              ]
            }
          }
        ]
      }
    },
    {
      "name": "disabledFeatures",
      "docs": [
        "Disabled Features State."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "map",
            "type": {
              "defined": {
                "name": "disabledMap"
              }
            }
          }
        ]
      }
    },
    {
      "name": "disabledMap",
      "docs": [
        "Fixed size map generated by the macro."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "data",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "disabledMapEntry"
                  }
                },
                64
              ]
            }
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                0
              ]
            }
          },
          {
            "name": "count",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "disabledMapEntry",
      "docs": [
        "Entry."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "key",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "value",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "factors",
      "docs": [
        "Factors."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oracleRefPriceDeviation",
            "type": "u128"
          },
          {
            "name": "orderFeeDiscountForReferredUser",
            "type": "u128"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u128",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "globalState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Program administrator with governance privileges"
            ],
            "type": "pubkey"
          },
          {
            "name": "pendingAuthority",
            "docs": [
              "Pending authority awaiting acceptance (Pubkey::default() if none)"
            ],
            "type": "pubkey"
          },
          {
            "name": "apyGradient",
            "docs": [
              "APY gradient buckets (APY_BUCKETS), each is 1e20-scaled APR for week buckets [0-1), [1-2), ..., [APY_BUCKETS, +inf)"
            ],
            "type": {
              "array": [
                "u128",
                53
              ]
            }
          },
          {
            "name": "minStakeValue",
            "docs": [
              "Minimum stake value in USD scaled by 1e20"
            ],
            "type": "u128"
          },
          {
            "name": "claimEnabled",
            "docs": [
              "If true, LPs may call `claim_gt` at any time without unstaking"
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump for this GlobalState (derived from seed [GLOBAL_STATE_SEED])"
            ],
            "type": "u8"
          },
          {
            "name": "pricingStalenessSeconds",
            "docs": [
              "Price staleness configuration in seconds"
            ],
            "type": "u32"
          },
          {
            "name": "reserved",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "glv",
      "docs": [
        "Glv."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "bumpBytes",
            "type": {
              "array": [
                "u8",
                1
              ]
            }
          },
          {
            "name": "padding0",
            "type": {
              "array": [
                "u8",
                3
              ]
            }
          },
          {
            "name": "index",
            "type": "u16"
          },
          {
            "name": "store",
            "type": "pubkey"
          },
          {
            "name": "glvToken",
            "type": "pubkey"
          },
          {
            "name": "longToken",
            "type": "pubkey"
          },
          {
            "name": "shortToken",
            "type": "pubkey"
          },
          {
            "name": "shiftLastExecutedAt",
            "type": "i64"
          },
          {
            "name": "minTokensForFirstDeposit",
            "type": "u64"
          },
          {
            "name": "shiftMinIntervalSecs",
            "type": "u32"
          },
          {
            "name": "padding1",
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "shiftMaxPriceImpactFactor",
            "type": "u128"
          },
          {
            "name": "shiftMinValue",
            "type": "u128"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                256
              ]
            }
          },
          {
            "name": "markets",
            "type": {
              "defined": {
                "name": "glvMarkets"
              }
            }
          }
        ]
      }
    },
    {
      "name": "glvMarketConfig",
      "docs": [
        "Market Config for GLV."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "maxAmount",
            "type": "u64"
          },
          {
            "name": "flags",
            "type": {
              "defined": {
                "name": "glvMarketFlagContainer"
              }
            }
          },
          {
            "name": "padding0",
            "type": {
              "array": [
                "u8",
                7
              ]
            }
          },
          {
            "name": "maxValue",
            "type": "u128"
          },
          {
            "name": "balance",
            "type": "u64"
          },
          {
            "name": "padding1",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          }
        ]
      }
    },
    {
      "name": "glvMarketFlagContainer",
      "docs": [
        "Flags container generated by the macro."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "value",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "glvMarkets",
      "docs": [
        "Fixed size map generated by the macro."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "data",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "glvMarketsEntry"
                  }
                },
                96
              ]
            }
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                12
              ]
            }
          },
          {
            "name": "count",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "glvMarketsEntry",
      "docs": [
        "Entry."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "key",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "value",
            "type": {
              "defined": {
                "name": "glvMarketConfig"
              }
            }
          }
        ]
      }
    },
    {
      "name": "gtState",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "padding0",
            "type": {
              "array": [
                "u8",
                7
              ]
            }
          },
          {
            "name": "lastMintedAt",
            "type": "i64"
          },
          {
            "name": "totalMinted",
            "type": "u64"
          },
          {
            "name": "growStepAmount",
            "type": "u64"
          },
          {
            "name": "growSteps",
            "type": "u64"
          },
          {
            "name": "supply",
            "type": "u64"
          },
          {
            "name": "lastCumulativeInvCostFactorTs",
            "type": "i64"
          },
          {
            "name": "gtVault",
            "type": "u64"
          },
          {
            "name": "cumulativeInvCostFactor",
            "type": "u128"
          },
          {
            "name": "mintingCostGrowFactor",
            "type": "u128"
          },
          {
            "name": "mintingCost",
            "type": "u128"
          },
          {
            "name": "padding3",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "exchangeTimeWindow",
            "type": "u32"
          },
          {
            "name": "padding4",
            "type": {
              "array": [
                "u8",
                12
              ]
            }
          },
          {
            "name": "maxRank",
            "type": "u64"
          },
          {
            "name": "ranks",
            "type": {
              "array": [
                "u64",
                15
              ]
            }
          },
          {
            "name": "orderFeeDiscountFactors",
            "type": {
              "array": [
                "u128",
                16
              ]
            }
          },
          {
            "name": "referralRewardFactors",
            "type": {
              "array": [
                "u128",
                16
              ]
            }
          },
          {
            "name": "padding5",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                256
              ]
            }
          }
        ]
      }
    },
    {
      "name": "indexer",
      "docs": [
        "Market indexer."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tradeCount",
            "type": "u64"
          },
          {
            "name": "depositCount",
            "type": "u64"
          },
          {
            "name": "withdrawalCount",
            "type": "u64"
          },
          {
            "name": "orderCount",
            "type": "u64"
          },
          {
            "name": "shiftCount",
            "type": "u64"
          },
          {
            "name": "glvDepositCount",
            "type": "u64"
          },
          {
            "name": "glvWithdrawalCount",
            "type": "u64"
          },
          {
            "name": "padding0",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          }
        ]
      }
    },
    {
      "name": "lpTokenController",
      "docs": [
        "LP Token Controller for managing specific LP token staking"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "globalState",
            "docs": [
              "Associated global_state"
            ],
            "type": "pubkey"
          },
          {
            "name": "lpTokenMint",
            "docs": [
              "Corresponding LP token mint"
            ],
            "type": "pubkey"
          },
          {
            "name": "controllerIndex",
            "docs": [
              "Controller index to allow multiple controllers per token"
            ],
            "type": "u64"
          },
          {
            "name": "totalPositions",
            "docs": [
              "Current number of active positions"
            ],
            "type": "u64"
          },
          {
            "name": "isEnabled",
            "docs": [
              "Whether staking is enabled (default true, irreversible when set to false)"
            ],
            "type": "bool"
          },
          {
            "name": "disabledAt",
            "docs": [
              "Timestamp when disabled (only valid when is_enabled = false)"
            ],
            "type": "i64"
          },
          {
            "name": "disabledCumInvCost",
            "docs": [
              "Cumulative inverse cost factor snapshot when disabled (only valid when is_enabled = false)"
            ],
            "type": "u128"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump"
            ],
            "type": "u8"
          },
          {
            "name": "reserved",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "market",
      "docs": [
        "Market."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "flags",
            "type": {
              "defined": {
                "name": "marketFlagContainer"
              }
            }
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                5
              ]
            }
          },
          {
            "name": "closedStateUpdatedAt",
            "type": "i64"
          },
          {
            "name": "name",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "meta",
            "type": {
              "defined": {
                "name": "marketMeta"
              }
            }
          },
          {
            "name": "store",
            "type": "pubkey"
          },
          {
            "name": "config",
            "type": {
              "defined": {
                "name": "marketConfig"
              }
            }
          },
          {
            "name": "indexer",
            "type": {
              "defined": {
                "name": "indexer"
              }
            }
          },
          {
            "name": "state",
            "type": {
              "defined": {
                "name": "state"
              }
            }
          },
          {
            "name": "buffer",
            "type": {
              "defined": {
                "name": "revertibleBuffer"
              }
            }
          },
          {
            "name": "virtualInventoryForSwaps",
            "type": "pubkey"
          },
          {
            "name": "virtualInventoryForPositions",
            "type": "pubkey"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                192
              ]
            }
          }
        ]
      }
    },
    {
      "name": "marketConfig",
      "docs": [
        "Market Config."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "flag",
            "type": {
              "defined": {
                "name": "marketConfigFlagContainer"
              }
            }
          },
          {
            "name": "swapImpactExponent",
            "type": "u128"
          },
          {
            "name": "swapImpactPositiveFactor",
            "type": "u128"
          },
          {
            "name": "swapImpactNegativeFactor",
            "type": "u128"
          },
          {
            "name": "swapFeeReceiverFactor",
            "type": "u128"
          },
          {
            "name": "swapFeeFactorForPositiveImpact",
            "type": "u128"
          },
          {
            "name": "swapFeeFactorForNegativeImpact",
            "type": "u128"
          },
          {
            "name": "minPositionSizeUsd",
            "type": "u128"
          },
          {
            "name": "minCollateralValue",
            "type": "u128"
          },
          {
            "name": "minCollateralFactor",
            "type": "u128"
          },
          {
            "name": "minCollateralFactorForOpenInterestMultiplierForLong",
            "type": "u128"
          },
          {
            "name": "minCollateralFactorForOpenInterestMultiplierForShort",
            "type": "u128"
          },
          {
            "name": "maxPositivePositionImpactFactor",
            "type": "u128"
          },
          {
            "name": "maxNegativePositionImpactFactor",
            "type": "u128"
          },
          {
            "name": "maxPositionImpactFactorForLiquidations",
            "type": "u128"
          },
          {
            "name": "positionImpactExponent",
            "type": "u128"
          },
          {
            "name": "positionImpactPositiveFactor",
            "type": "u128"
          },
          {
            "name": "positionImpactNegativeFactor",
            "type": "u128"
          },
          {
            "name": "orderFeeReceiverFactor",
            "type": "u128"
          },
          {
            "name": "orderFeeFactorForPositiveImpact",
            "type": "u128"
          },
          {
            "name": "orderFeeFactorForNegativeImpact",
            "type": "u128"
          },
          {
            "name": "liquidationFeeReceiverFactor",
            "type": "u128"
          },
          {
            "name": "liquidationFeeFactor",
            "type": "u128"
          },
          {
            "name": "positionImpactDistributeFactor",
            "type": "u128"
          },
          {
            "name": "minPositionImpactPoolAmount",
            "type": "u128"
          },
          {
            "name": "borrowingFeeReceiverFactor",
            "type": "u128"
          },
          {
            "name": "borrowingFeeFactorForLong",
            "type": "u128"
          },
          {
            "name": "borrowingFeeFactorForShort",
            "type": "u128"
          },
          {
            "name": "borrowingFeeExponentForLong",
            "type": "u128"
          },
          {
            "name": "borrowingFeeExponentForShort",
            "type": "u128"
          },
          {
            "name": "borrowingFeeOptimalUsageFactorForLong",
            "type": "u128"
          },
          {
            "name": "borrowingFeeOptimalUsageFactorForShort",
            "type": "u128"
          },
          {
            "name": "borrowingFeeBaseFactorForLong",
            "type": "u128"
          },
          {
            "name": "borrowingFeeBaseFactorForShort",
            "type": "u128"
          },
          {
            "name": "borrowingFeeAboveOptimalUsageFactorForLong",
            "type": "u128"
          },
          {
            "name": "borrowingFeeAboveOptimalUsageFactorForShort",
            "type": "u128"
          },
          {
            "name": "fundingFeeExponent",
            "type": "u128"
          },
          {
            "name": "fundingFeeFactor",
            "type": "u128"
          },
          {
            "name": "fundingFeeMaxFactorPerSecond",
            "type": "u128"
          },
          {
            "name": "fundingFeeMinFactorPerSecond",
            "type": "u128"
          },
          {
            "name": "fundingFeeIncreaseFactorPerSecond",
            "type": "u128"
          },
          {
            "name": "fundingFeeDecreaseFactorPerSecond",
            "type": "u128"
          },
          {
            "name": "fundingFeeThresholdForStableFunding",
            "type": "u128"
          },
          {
            "name": "fundingFeeThresholdForDecreaseFunding",
            "type": "u128"
          },
          {
            "name": "reserveFactor",
            "type": "u128"
          },
          {
            "name": "openInterestReserveFactor",
            "type": "u128"
          },
          {
            "name": "maxPnlFactorForLongDeposit",
            "type": "u128"
          },
          {
            "name": "maxPnlFactorForShortDeposit",
            "type": "u128"
          },
          {
            "name": "maxPnlFactorForLongWithdrawal",
            "type": "u128"
          },
          {
            "name": "maxPnlFactorForShortWithdrawal",
            "type": "u128"
          },
          {
            "name": "maxPnlFactorForLongTrader",
            "type": "u128"
          },
          {
            "name": "maxPnlFactorForShortTrader",
            "type": "u128"
          },
          {
            "name": "maxPnlFactorForLongAdl",
            "type": "u128"
          },
          {
            "name": "maxPnlFactorForShortAdl",
            "type": "u128"
          },
          {
            "name": "minPnlFactorAfterLongAdl",
            "type": "u128"
          },
          {
            "name": "minPnlFactorAfterShortAdl",
            "type": "u128"
          },
          {
            "name": "maxPoolAmountForLongToken",
            "type": "u128"
          },
          {
            "name": "maxPoolAmountForShortToken",
            "type": "u128"
          },
          {
            "name": "maxPoolValueForDepositForLongToken",
            "type": "u128"
          },
          {
            "name": "maxPoolValueForDepositForShortToken",
            "type": "u128"
          },
          {
            "name": "maxOpenInterestForLong",
            "type": "u128"
          },
          {
            "name": "maxOpenInterestForShort",
            "type": "u128"
          },
          {
            "name": "minTokensForFirstDeposit",
            "type": "u128"
          },
          {
            "name": "minCollateralFactorForLiquidation",
            "type": "u128"
          },
          {
            "name": "marketClosedMinCollateralFactorForLiquidation",
            "type": "u128"
          },
          {
            "name": "marketClosedBorrowingFeeBaseFactor",
            "type": "u128"
          },
          {
            "name": "marketClosedBorrowingFeeAboveOptimalUsageFactor",
            "type": "u128"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u128",
                28
              ]
            }
          }
        ]
      }
    },
    {
      "name": "marketConfigFactorContainer",
      "docs": [
        "Flags container generated by the macro."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "value",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "marketConfigFlagContainer",
      "docs": [
        "Flags container generated by the macro."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "value",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "marketConfigPermissions",
      "docs": [
        "Permission store related to market config."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "updatableMarketConfigFlags",
            "type": {
              "defined": {
                "name": "marketConfigFlagContainer"
              }
            }
          },
          {
            "name": "updatableMarketConfigFactors",
            "type": {
              "defined": {
                "name": "marketConfigFactorContainer"
              }
            }
          }
        ]
      }
    },
    {
      "name": "marketFlagContainer",
      "docs": [
        "Flags container generated by the macro."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "value",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "marketMeta",
      "docs": [
        "Market Metadata."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketTokenMint",
            "type": "pubkey"
          },
          {
            "name": "indexTokenMint",
            "type": "pubkey"
          },
          {
            "name": "longTokenMint",
            "type": "pubkey"
          },
          {
            "name": "shortTokenMint",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "members",
      "docs": [
        "Fixed size map generated by the macro."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "data",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "membersEntry"
                  }
                },
                64
              ]
            }
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                0
              ]
            }
          },
          {
            "name": "count",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "membersEntry",
      "docs": [
        "Entry."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "key",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "value",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "oracle",
      "docs": [
        "Oracle Account."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "padding0",
            "type": {
              "array": [
                "u8",
                7
              ]
            }
          },
          {
            "name": "store",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "minOracleTs",
            "type": "i64"
          },
          {
            "name": "maxOracleTs",
            "type": "i64"
          },
          {
            "name": "minOracleSlot",
            "type": "u64"
          },
          {
            "name": "primary",
            "type": {
              "defined": {
                "name": "priceMap"
              }
            }
          },
          {
            "name": "flags",
            "type": {
              "defined": {
                "name": "oracleFlagContainer"
              }
            }
          },
          {
            "name": "padding1",
            "type": {
              "array": [
                "u8",
                3
              ]
            }
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                256
              ]
            }
          }
        ]
      }
    },
    {
      "name": "oracleFlagContainer",
      "docs": [
        "Flags container generated by the macro."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "value",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "oraclePriceFlagContainer",
      "docs": [
        "Flags container generated by the macro."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "value",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "otherState",
      "docs": [
        "Market State."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "rev",
            "type": "u64"
          },
          {
            "name": "tradeCount",
            "type": "u64"
          },
          {
            "name": "longTokenBalance",
            "type": "u64"
          },
          {
            "name": "shortTokenBalance",
            "type": "u64"
          },
          {
            "name": "fundingFactorPerSecond",
            "type": "i128"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                256
              ]
            }
          }
        ]
      }
    },
    {
      "name": "pool",
      "docs": [
        "A pool for market."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "isPure",
            "type": "u8"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                15
              ]
            }
          },
          {
            "name": "longTokenAmount",
            "type": "u128"
          },
          {
            "name": "shortTokenAmount",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "poolStorage",
      "docs": [
        "A pool storage for market."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rev",
            "type": "u64"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "pool",
            "type": {
              "defined": {
                "name": "pool"
              }
            }
          }
        ]
      }
    },
    {
      "name": "pools",
      "docs": [
        "Market Pools."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "primary",
            "type": {
              "defined": {
                "name": "poolStorage"
              }
            }
          },
          {
            "name": "swapImpact",
            "type": {
              "defined": {
                "name": "poolStorage"
              }
            }
          },
          {
            "name": "claimableFee",
            "type": {
              "defined": {
                "name": "poolStorage"
              }
            }
          },
          {
            "name": "openInterestForLong",
            "type": {
              "defined": {
                "name": "poolStorage"
              }
            }
          },
          {
            "name": "openInterestForShort",
            "type": {
              "defined": {
                "name": "poolStorage"
              }
            }
          },
          {
            "name": "openInterestInTokensForLong",
            "type": {
              "defined": {
                "name": "poolStorage"
              }
            }
          },
          {
            "name": "openInterestInTokensForShort",
            "type": {
              "defined": {
                "name": "poolStorage"
              }
            }
          },
          {
            "name": "positionImpact",
            "type": {
              "defined": {
                "name": "poolStorage"
              }
            }
          },
          {
            "name": "borrowingFactor",
            "type": {
              "defined": {
                "name": "poolStorage"
              }
            }
          },
          {
            "name": "fundingAmountPerSizeForLong",
            "type": {
              "defined": {
                "name": "poolStorage"
              }
            }
          },
          {
            "name": "fundingAmountPerSizeForShort",
            "type": {
              "defined": {
                "name": "poolStorage"
              }
            }
          },
          {
            "name": "claimableFundingAmountPerSizeForLong",
            "type": {
              "defined": {
                "name": "poolStorage"
              }
            }
          },
          {
            "name": "claimableFundingAmountPerSizeForShort",
            "type": {
              "defined": {
                "name": "poolStorage"
              }
            }
          },
          {
            "name": "collateralSumForLong",
            "type": {
              "defined": {
                "name": "poolStorage"
              }
            }
          },
          {
            "name": "collateralSumForShort",
            "type": {
              "defined": {
                "name": "poolStorage"
              }
            }
          },
          {
            "name": "totalBorrowing",
            "type": {
              "defined": {
                "name": "poolStorage"
              }
            }
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "poolStorage"
                  }
                },
                16
              ]
            }
          }
        ]
      }
    },
    {
      "name": "position",
      "docs": [
        "Position account to persist LP stake data and snapshot stake-time values"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "docs": [
              "Owner of this LP position"
            ],
            "type": "pubkey"
          },
          {
            "name": "controller",
            "docs": [
              "LP token controller that manages this position"
            ],
            "type": "pubkey"
          },
          {
            "name": "lpMint",
            "docs": [
              "LP token mint for this position"
            ],
            "type": "pubkey"
          },
          {
            "name": "vault",
            "docs": [
              "PDA token account that escrows staked LP tokens"
            ],
            "type": "pubkey"
          },
          {
            "name": "positionId",
            "docs": [
              "Position id to allow multiple positions per owner"
            ],
            "type": "u64"
          },
          {
            "name": "stakedAmount",
            "docs": [
              "Staked LP amount at stake time (raw amount as provided by caller; optional semantics)"
            ],
            "type": "u64"
          },
          {
            "name": "stakedValueUsd",
            "docs": [
              "Staked value in USD (scaled by 1e20) captured at stake time"
            ],
            "type": "u128"
          },
          {
            "name": "stakeStartTime",
            "docs": [
              "Stake start unix timestamp (seconds)"
            ],
            "type": "i64"
          },
          {
            "name": "cumInvCost",
            "docs": [
              "Cumulative inverse-cost factor snapshot (last claim/stake checkpoint)"
            ],
            "type": "u128"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump"
            ],
            "type": "u8"
          },
          {
            "name": "reserved",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "priceMap",
      "docs": [
        "Fixed size map generated by the macro."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "data",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "priceMapEntry"
                  }
                },
                512
              ]
            }
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                0
              ]
            }
          },
          {
            "name": "count",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "priceMapEntry",
      "docs": [
        "Entry."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "key",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "value",
            "type": {
              "defined": {
                "name": "smallPrices"
              }
            }
          }
        ]
      }
    },
    {
      "name": "referral",
      "docs": [
        "Referral."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "referrer",
            "type": "pubkey"
          },
          {
            "name": "code",
            "type": "pubkey"
          },
          {
            "name": "refereeCount",
            "type": "u128"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "revertibleBuffer",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rev",
            "type": "u64"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "state",
            "type": {
              "defined": {
                "name": "state"
              }
            }
          }
        ]
      }
    },
    {
      "name": "roleMap",
      "docs": [
        "Fixed size map generated by the macro."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "data",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "roleMapEntry"
                  }
                },
                32
              ]
            }
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                0
              ]
            }
          },
          {
            "name": "count",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "roleMapEntry",
      "docs": [
        "Entry."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "key",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "value",
            "type": {
              "defined": {
                "name": "roleMetadata"
              }
            }
          }
        ]
      }
    },
    {
      "name": "roleMetadata",
      "docs": [
        "Role Metadata."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "enabled",
            "type": "u8"
          },
          {
            "name": "index",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "roleStore",
      "docs": [
        "Roles Store."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "roles",
            "type": {
              "defined": {
                "name": "roleMap"
              }
            }
          },
          {
            "name": "members",
            "type": {
              "defined": {
                "name": "members"
              }
            }
          }
        ]
      }
    },
    {
      "name": "smallPrices",
      "docs": [
        "Zero-copy price structure for storing min max prices."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "decimalMultiplier",
            "type": "u8"
          },
          {
            "name": "flags",
            "type": {
              "defined": {
                "name": "oraclePriceFlagContainer"
              }
            }
          },
          {
            "name": "padding0",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "min",
            "type": "u32"
          },
          {
            "name": "max",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "state",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pools",
            "type": {
              "defined": {
                "name": "pools"
              }
            }
          },
          {
            "name": "clocks",
            "type": {
              "defined": {
                "name": "clocks"
              }
            }
          },
          {
            "name": "other",
            "type": {
              "defined": {
                "name": "otherState"
              }
            }
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                1024
              ]
            }
          }
        ]
      }
    },
    {
      "name": "store",
      "docs": [
        "Data Store."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": {
              "array": [
                "u8",
                1
              ]
            }
          },
          {
            "name": "keySeed",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "key",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "padding0",
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "role",
            "type": {
              "defined": {
                "name": "roleStore"
              }
            }
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "nextAuthority",
            "type": "pubkey"
          },
          {
            "name": "tokenMap",
            "type": "pubkey"
          },
          {
            "name": "disabledFeatures",
            "type": {
              "defined": {
                "name": "disabledFeatures"
              }
            }
          },
          {
            "name": "padding1",
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "lastRestartedSlot",
            "type": "u64"
          },
          {
            "name": "treasury",
            "type": {
              "defined": {
                "name": "treasury"
              }
            }
          },
          {
            "name": "amount",
            "type": {
              "defined": {
                "name": "amounts"
              }
            }
          },
          {
            "name": "padding2",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "factor",
            "type": {
              "defined": {
                "name": "factors"
              }
            }
          },
          {
            "name": "address",
            "type": {
              "defined": {
                "name": "addresses"
              }
            }
          },
          {
            "name": "gt",
            "type": {
              "defined": {
                "name": "gtState"
              }
            }
          },
          {
            "name": "marketConfigPermissions",
            "type": {
              "defined": {
                "name": "marketConfigPermissions"
              }
            }
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                992
              ]
            }
          }
        ]
      }
    },
    {
      "name": "tokenMapHeader",
      "docs": [
        "Header of `TokenMap`."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "padding0",
            "type": {
              "array": [
                "u8",
                7
              ]
            }
          },
          {
            "name": "store",
            "type": "pubkey"
          },
          {
            "name": "tokens",
            "type": {
              "defined": {
                "name": "tokens"
              }
            }
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "tokens",
      "docs": [
        "Fixed size map generated by the macro."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "data",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "tokensEntry"
                  }
                },
                256
              ]
            }
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                0
              ]
            }
          },
          {
            "name": "count",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "tokensEntry",
      "docs": [
        "Entry."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "key",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "value",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "treasury",
      "docs": [
        "Treasury."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "receiver",
            "type": "pubkey"
          },
          {
            "name": "nextReceiver",
            "type": "pubkey"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          }
        ]
      }
    },
    {
      "name": "userFlagContainer",
      "docs": [
        "Flags container generated by the macro."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "value",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "userGtState",
      "docs": [
        "GT State."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rank",
            "type": "u8"
          },
          {
            "name": "padding0",
            "type": {
              "array": [
                "u8",
                7
              ]
            }
          },
          {
            "name": "lastMintedAt",
            "type": "i64"
          },
          {
            "name": "totalMinted",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "padding1",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "paidFeeValue",
            "type": "u128"
          },
          {
            "name": "mintedFeeValue",
            "type": "u128"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "userHeader",
      "docs": [
        "Header of `User` Account."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "flags",
            "type": {
              "defined": {
                "name": "userFlagContainer"
              }
            }
          },
          {
            "name": "padding0",
            "type": {
              "array": [
                "u8",
                13
              ]
            }
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "store",
            "type": "pubkey"
          },
          {
            "name": "referral",
            "type": {
              "defined": {
                "name": "referral"
              }
            }
          },
          {
            "name": "gt",
            "type": {
              "defined": {
                "name": "userGtState"
              }
            }
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "apyBucketsU8",
      "type": "u8",
      "value": "53"
    },
    {
      "name": "apyLastIndexU8",
      "type": "u8",
      "value": "52"
    },
    {
      "name": "apyMax",
      "type": "u128",
      "value": "200000000000000000000"
    },
    {
      "name": "defaultPricingStalenessSeconds",
      "type": "u32",
      "value": "300"
    },
    {
      "name": "globalStateReservedLen",
      "type": "u32",
      "value": "256"
    },
    {
      "name": "globalStateSeed",
      "type": "bytes",
      "value": "[103, 108, 111, 98, 97, 108, 95, 115, 116, 97, 116, 101]"
    },
    {
      "name": "lpTokenControllerReservedLen",
      "type": "u32",
      "value": "256"
    },
    {
      "name": "lpTokenControllerSeed",
      "type": "bytes",
      "value": "[108, 112, 95, 116, 111, 107, 101, 110, 95, 99, 111, 110, 116, 114, 111, 108, 108, 101, 114]"
    },
    {
      "name": "positionReservedLen",
      "type": "u32",
      "value": "64"
    },
    {
      "name": "positionSeed",
      "type": "bytes",
      "value": "[112, 111, 115, 105, 116, 105, 111, 110]"
    },
    {
      "name": "vaultSeed",
      "type": "bytes",
      "value": "[118, 97, 117, 108, 116]"
    }
  ]
};
