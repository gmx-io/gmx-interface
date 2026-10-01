/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/gmsol_treasury.json`.
 */
export type GmsolTreasury = {
  "address": "GTuvYD5SxkTq4FLG6JV1FQ5dkczr1AfgDcBHaFsBdtBg",
  "metadata": {
    "name": "gmsolTreasury",
    "version": "0.8.0",
    "spec": "0.1.0",
    "description": "GMX-Solana is an extension of GMX on the Solana blockchain.",
    "repository": "https://github.com/gmsol-labs/gmx-solana"
  },
  "instructions": [
    {
      "name": "cancelSwap",
      "docs": [
        "Cancel a swap."
      ],
      "discriminator": [
        88,
        174,
        98,
        148,
        24,
        252,
        93,
        89
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Authority."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "store",
          "docs": [
            "Store."
          ],
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "storeWallet",
          "docs": [
            "Store Wallet."
          ],
          "writable": true
        },
        {
          "name": "config"
        },
        {
          "name": "receiver",
          "docs": [
            "Swap order owner (the receiver)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  101,
                  105,
                  118,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "config"
              }
            ]
          }
        },
        {
          "name": "user",
          "docs": [
            "The user account for `owner`."
          ],
          "writable": true
        },
        {
          "name": "swapInToken",
          "docs": [
            "Swap in token."
          ]
        },
        {
          "name": "swapOutToken",
          "docs": [
            "Swap out token."
          ]
        },
        {
          "name": "swapInTokenReceiverVault",
          "docs": [
            "Swap in token receiver vault."
          ],
          "writable": true
        },
        {
          "name": "swapOutTokenReceiverVault",
          "docs": [
            "Swap out token receiver vault."
          ],
          "writable": true
        },
        {
          "name": "swapInTokenEscrow",
          "docs": [
            "The escrow account for swap in token."
          ],
          "writable": true
        },
        {
          "name": "swapOutTokenEscrow",
          "docs": [
            "The escrow account for swap out token."
          ],
          "writable": true
        },
        {
          "name": "order",
          "docs": [
            "The order account."
          ],
          "writable": true
        },
        {
          "name": "eventAuthority",
          "docs": [
            "Event authority."
          ]
        },
        {
          "name": "storeProgram",
          "docs": [
            "Store program."
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "The token program."
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "docs": [
            "Associated token program."
          ],
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "docs": [
            "The system program."
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "claimFees",
      "docs": [
        "Claim fees."
      ],
      "discriminator": [
        82,
        251,
        233,
        156,
        12,
        52,
        184,
        202
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Authority."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "store",
          "docs": [
            "Store."
          ],
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "docs": [
            "Config to initialize with."
          ]
        },
        {
          "name": "receiver",
          "docs": [
            "Receiver."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  101,
                  105,
                  118,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "config"
              }
            ]
          }
        },
        {
          "name": "market",
          "docs": [
            "Market to claim fees from."
          ],
          "writable": true
        },
        {
          "name": "token",
          "docs": [
            "Token."
          ]
        },
        {
          "name": "vault",
          "docs": [
            "Vault."
          ],
          "writable": true
        },
        {
          "name": "receiverVault",
          "docs": [
            "Reciever vault."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "receiver"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "token"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "eventAuthority",
          "docs": [
            "Event authority."
          ]
        },
        {
          "name": "storeProgram",
          "docs": [
            "Store program."
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "The token program."
          ]
        },
        {
          "name": "associatedTokenProgram",
          "docs": [
            "Associated token program."
          ],
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "docs": [
            "The system program."
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "minAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "completeGtExchange",
      "docs": [
        "Complete GT Exchange."
      ],
      "discriminator": [
        15,
        159,
        24,
        137,
        211,
        116,
        174,
        60
      ],
      "accounts": [
        {
          "name": "owner",
          "docs": [
            "Owner."
          ],
          "signer": true
        },
        {
          "name": "store",
          "docs": [
            "Store."
          ],
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "docs": [
            "Config."
          ],
          "relations": [
            "treasuryVaultConfig"
          ]
        },
        {
          "name": "treasuryVaultConfig",
          "docs": [
            "Treasury Config."
          ],
          "relations": [
            "gtBank"
          ]
        },
        {
          "name": "gtExchangeVault",
          "docs": [
            "GT exchange vault."
          ],
          "writable": true,
          "relations": [
            "gtBank"
          ]
        },
        {
          "name": "gtBank",
          "docs": [
            "GT bank."
          ],
          "writable": true
        },
        {
          "name": "exchange",
          "docs": [
            "Exchange to complete.",
            "The ownership should be checked by the CPI."
          ],
          "writable": true
        },
        {
          "name": "storeProgram",
          "docs": [
            "Store program."
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "The token program."
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "token2022Program",
          "docs": [
            "The token-2022 program."
          ],
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "confirmGtBuyback",
      "docs": [
        "Confirm GT buyback."
      ],
      "discriminator": [
        215,
        130,
        25,
        182,
        202,
        240,
        77,
        149
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Authority."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "store",
          "docs": [
            "Store."
          ],
          "writable": true,
          "relations": [
            "config",
            "gtExchangeVault"
          ]
        },
        {
          "name": "config",
          "docs": [
            "Config."
          ],
          "relations": [
            "treasuryVaultConfig"
          ]
        },
        {
          "name": "treasuryVaultConfig",
          "docs": [
            "Treasury Vault Config."
          ],
          "relations": [
            "gtBank"
          ]
        },
        {
          "name": "gtExchangeVault",
          "docs": [
            "GT exchange vault."
          ],
          "writable": true,
          "relations": [
            "gtBank"
          ]
        },
        {
          "name": "gtBank",
          "docs": [
            "GT Bank."
          ],
          "writable": true
        },
        {
          "name": "tokenMap",
          "docs": [
            "Token map."
          ]
        },
        {
          "name": "oracle",
          "docs": [
            "Oracle."
          ],
          "writable": true
        },
        {
          "name": "eventAuthority",
          "docs": [
            "Event authority."
          ]
        },
        {
          "name": "storeProgram",
          "docs": [
            "Store program."
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        },
        {
          "name": "chainlinkProgram",
          "docs": [
            "Chainlink program."
          ],
          "optional": true,
          "address": "HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"
        }
      ],
      "args": []
    },
    {
      "name": "createSwapV2",
      "docs": [
        "Create a swap."
      ],
      "discriminator": [
        83,
        172,
        205,
        183,
        106,
        214,
        68,
        144
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Authority."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "store",
          "docs": [
            "Store."
          ],
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "docs": [
            "Config."
          ],
          "relations": [
            "treasuryVaultConfig"
          ]
        },
        {
          "name": "treasuryVaultConfig",
          "docs": [
            "Treasury Config."
          ]
        },
        {
          "name": "swapInToken",
          "docs": [
            "Swap in token."
          ]
        },
        {
          "name": "swapOutToken",
          "docs": [
            "Swap out token."
          ]
        },
        {
          "name": "swapInTokenReceiverVault",
          "docs": [
            "Swap in token receiver vault."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "receiver"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "swapInToken"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "market",
          "docs": [
            "Market."
          ],
          "writable": true
        },
        {
          "name": "receiver",
          "docs": [
            "Swap order owner (the receiver)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  101,
                  105,
                  118,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "config"
              }
            ]
          }
        },
        {
          "name": "user",
          "docs": [
            "The user account for `receiver`."
          ],
          "writable": true
        },
        {
          "name": "swapInTokenEscrow",
          "docs": [
            "The escrow account for swap in token."
          ],
          "writable": true
        },
        {
          "name": "swapOutTokenEscrow",
          "docs": [
            "The escrow account for swap out token."
          ],
          "writable": true
        },
        {
          "name": "order",
          "docs": [
            "The order account."
          ],
          "writable": true
        },
        {
          "name": "eventAuthority",
          "docs": [
            "Event authority."
          ]
        },
        {
          "name": "storeProgram",
          "docs": [
            "Store program."
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "The token program."
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "docs": [
            "Associated token program."
          ],
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "docs": [
            "The system program."
          ],
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "callbackAuthority",
          "docs": [
            "Callback authority."
          ],
          "optional": true
        },
        {
          "name": "callbackProgram",
          "docs": [
            "Callback authority."
          ],
          "optional": true
        },
        {
          "name": "callbackSharedDataAccount",
          "docs": [
            "Callback config account."
          ],
          "optional": true
        },
        {
          "name": "callbackPartitionedDataAccount",
          "docs": [
            "Callback action stats account."
          ],
          "optional": true
        }
      ],
      "args": [
        {
          "name": "nonce",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "swapPathLength",
          "type": "u8"
        },
        {
          "name": "swapInAmount",
          "type": "u64"
        },
        {
          "name": "minSwapOutAmount",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "callbackVersion",
          "type": {
            "option": "u8"
          }
        }
      ]
    },
    {
      "name": "depositToTreasuryVault",
      "docs": [
        "Deposit to treasury vault."
      ],
      "discriminator": [
        60,
        157,
        62,
        63,
        219,
        46,
        207,
        84
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Authority."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "store",
          "docs": [
            "Store."
          ],
          "relations": [
            "config",
            "gtExchangeVault"
          ]
        },
        {
          "name": "config",
          "docs": [
            "Config."
          ],
          "relations": [
            "treasuryVaultConfig"
          ]
        },
        {
          "name": "treasuryVaultConfig",
          "docs": [
            "Treasury Config."
          ],
          "relations": [
            "gtBank"
          ]
        },
        {
          "name": "receiver",
          "docs": [
            "Receiver."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  101,
                  105,
                  118,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "config"
              }
            ]
          }
        },
        {
          "name": "gtExchangeVault",
          "docs": [
            "GT exchange vault."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  116,
                  95,
                  101,
                  120,
                  99,
                  104,
                  97,
                  110,
                  103,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "store"
              },
              {
                "kind": "account",
                "path": "gtExchangeVault"
              },
              {
                "kind": "account",
                "path": "gtExchangeVault"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                234,
                94,
                74,
                175,
                228,
                208,
                167,
                114,
                85,
                24,
                18,
                149,
                120,
                219,
                76,
                130,
                12,
                54,
                252,
                80,
                147,
                170,
                106,
                18,
                19,
                192,
                130,
                125,
                110,
                213,
                68,
                8
              ]
            }
          },
          "relations": [
            "gtBank"
          ]
        },
        {
          "name": "gtBank",
          "docs": [
            "GT bank."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  116,
                  95,
                  98,
                  97,
                  110,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "treasuryVaultConfig"
              },
              {
                "kind": "account",
                "path": "gtExchangeVault"
              }
            ]
          }
        },
        {
          "name": "token",
          "docs": [
            "Token."
          ]
        },
        {
          "name": "receiverVault",
          "docs": [
            "Receiver vault."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "receiver"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "token"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "treasuryVault",
          "docs": [
            "Treasury vault."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "treasuryVaultConfig"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "token"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "gtBankVault",
          "docs": [
            "GT bank vault."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "gtBank"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "token"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "storeProgram",
          "docs": [
            "Store program."
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "The token program."
          ]
        },
        {
          "name": "associatedTokenProgram",
          "docs": [
            "Associated token program."
          ],
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": []
    },
    {
      "name": "initializeConfig",
      "docs": [
        "Initialize a treasury [`Config`](crate::states::Config) account."
      ],
      "discriminator": [
        208,
        127,
        21,
        1,
        194,
        190,
        196,
        70
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "Payer."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "store",
          "docs": [
            "The store that controls this config."
          ],
          "writable": true
        },
        {
          "name": "config",
          "docs": [
            "The config account."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "store"
              }
            ]
          }
        },
        {
          "name": "receiver",
          "docs": [
            "Receiver."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  101,
                  105,
                  118,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "config"
              }
            ]
          }
        },
        {
          "name": "storeProgram",
          "docs": [
            "The store program."
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        },
        {
          "name": "systemProgram",
          "docs": [
            "The system program."
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeTreasuryVaultConfig",
      "docs": [
        "Initialize a [`TreasuryVaultConfig`](crate::states::TreasuryVaultConfig) account."
      ],
      "discriminator": [
        34,
        70,
        200,
        37,
        152,
        237,
        255,
        216
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Authority."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "store",
          "docs": [
            "Store."
          ],
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "docs": [
            "Config to initialize with."
          ]
        },
        {
          "name": "treasuryVaultConfig",
          "docs": [
            "Treasury vault config account to initialize."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "arg",
                "path": "index"
              }
            ]
          }
        },
        {
          "name": "storeProgram",
          "docs": [
            "Store program."
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        },
        {
          "name": "systemProgram",
          "docs": [
            "The system program."
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "index",
          "type": "u16"
        }
      ]
    },
    {
      "name": "insertTokenToTreasuryVault",
      "docs": [
        "Insert a token to the given [`TreasuryVaultConfig`](crate::states::TreasuryVaultConfig) account.",
        "",
        "# Errors",
        "- The [`token`](InsertTokenToTreasuryVault::token) must not have been inserted."
      ],
      "discriminator": [
        63,
        143,
        140,
        147,
        26,
        69,
        75,
        10
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Authority."
          ],
          "signer": true
        },
        {
          "name": "store",
          "docs": [
            "Store."
          ],
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "docs": [
            "Config."
          ],
          "relations": [
            "treasuryVaultConfig"
          ]
        },
        {
          "name": "treasuryVaultConfig",
          "docs": [
            "Treasury vault config."
          ],
          "writable": true
        },
        {
          "name": "token",
          "docs": [
            "Token to insert."
          ]
        },
        {
          "name": "storeProgram",
          "docs": [
            "Store program."
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        }
      ],
      "args": []
    },
    {
      "name": "prepareGtBank",
      "docs": [
        "Prepare GT Bank."
      ],
      "discriminator": [
        201,
        61,
        232,
        124,
        134,
        42,
        82,
        158
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Authority."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "store",
          "docs": [
            "Store."
          ],
          "relations": [
            "config",
            "gtExchangeVault"
          ]
        },
        {
          "name": "config",
          "docs": [
            "Config."
          ],
          "relations": [
            "treasuryVaultConfig"
          ]
        },
        {
          "name": "treasuryVaultConfig",
          "docs": [
            "Treasury Config."
          ]
        },
        {
          "name": "gtExchangeVault",
          "docs": [
            "GT exchange vault."
          ]
        },
        {
          "name": "gtBank",
          "docs": [
            "GT Bank."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  116,
                  95,
                  98,
                  97,
                  110,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "treasuryVaultConfig"
              },
              {
                "kind": "account",
                "path": "gtExchangeVault"
              }
            ]
          }
        },
        {
          "name": "storeProgram",
          "docs": [
            "Store program."
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        },
        {
          "name": "systemProgram",
          "docs": [
            "The system program."
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "removeTokenFromTreasuryVault",
      "docs": [
        "Remove a token from the given [`TreasuryVaultConfig`](crate::states::TreasuryVaultConfig) account.",
        "",
        "# Errors",
        "- The [`token`](RemoveTokenFromTreasuryVault::token) must have been inserted."
      ],
      "discriminator": [
        77,
        30,
        206,
        14,
        174,
        42,
        208,
        212
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Authority."
          ],
          "signer": true
        },
        {
          "name": "store",
          "docs": [
            "Store."
          ],
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "docs": [
            "Config."
          ],
          "relations": [
            "treasuryVaultConfig"
          ]
        },
        {
          "name": "treasuryVaultConfig",
          "docs": [
            "Treasury Vault Config."
          ],
          "writable": true
        },
        {
          "name": "token",
          "docs": [
            "Token to remove."
          ]
        },
        {
          "name": "storeProgram",
          "docs": [
            "Store program."
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        }
      ],
      "args": []
    },
    {
      "name": "setBuybackFactor",
      "docs": [
        "Set buyback factor."
      ],
      "discriminator": [
        199,
        203,
        251,
        181,
        132,
        180,
        103,
        130
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Authority."
          ],
          "signer": true
        },
        {
          "name": "store",
          "docs": [
            "Store."
          ],
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "docs": [
            "Config to update."
          ],
          "writable": true
        },
        {
          "name": "storeProgram",
          "docs": [
            "Store program."
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        }
      ],
      "args": [
        {
          "name": "factor",
          "type": "u128"
        }
      ]
    },
    {
      "name": "setGtFactor",
      "docs": [
        "Set GT factor."
      ],
      "discriminator": [
        82,
        130,
        30,
        189,
        79,
        73,
        29,
        109
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Authority."
          ],
          "signer": true
        },
        {
          "name": "store",
          "docs": [
            "Store."
          ],
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "docs": [
            "Config to update."
          ],
          "writable": true
        },
        {
          "name": "storeProgram",
          "docs": [
            "Store program."
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        }
      ],
      "args": [
        {
          "name": "factor",
          "type": "u128"
        }
      ]
    },
    {
      "name": "setReferralReward",
      "docs": [
        "Set referral reward factors."
      ],
      "discriminator": [
        31,
        230,
        34,
        144,
        43,
        222,
        71,
        88
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Authority."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "store",
          "docs": [
            "Store."
          ],
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "docs": [
            "Config."
          ]
        },
        {
          "name": "storeProgram",
          "docs": [
            "Store program."
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        }
      ],
      "args": [
        {
          "name": "factors",
          "type": {
            "vec": "u128"
          }
        }
      ]
    },
    {
      "name": "setTreasuryVaultConfig",
      "docs": [
        "Set treasury vault config."
      ],
      "discriminator": [
        243,
        119,
        94,
        154,
        126,
        51,
        26,
        65
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Authority."
          ],
          "signer": true
        },
        {
          "name": "store",
          "docs": [
            "Store."
          ],
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "docs": [
            "Config to update."
          ],
          "writable": true,
          "relations": [
            "treasuryVaultConfig"
          ]
        },
        {
          "name": "treasuryVaultConfig",
          "docs": [
            "Treasury vault config."
          ]
        },
        {
          "name": "storeProgram",
          "docs": [
            "Store program."
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        }
      ],
      "args": []
    },
    {
      "name": "syncGtBankV2",
      "docs": [
        "Sync GT Bank."
      ],
      "discriminator": [
        161,
        150,
        114,
        49,
        152,
        89,
        94,
        45
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Authority."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "store",
          "docs": [
            "Store."
          ],
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "docs": [
            "Config."
          ],
          "relations": [
            "treasuryVaultConfig"
          ]
        },
        {
          "name": "treasuryVaultConfig",
          "docs": [
            "Treasury Vault Config."
          ],
          "relations": [
            "gtBank"
          ]
        },
        {
          "name": "gtBank",
          "docs": [
            "GT bank."
          ],
          "writable": true
        },
        {
          "name": "token",
          "docs": [
            "Token."
          ]
        },
        {
          "name": "treasuryVault",
          "docs": [
            "Treasury vault."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "treasuryVaultConfig"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "token"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "gtBankVault",
          "docs": [
            "GT bank vault."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "gtBank"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "token"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "storeProgram",
          "docs": [
            "Store program."
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "The token program."
          ]
        },
        {
          "name": "associatedTokenProgram",
          "docs": [
            "Associated token program."
          ],
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [],
      "returns": "u64"
    },
    {
      "name": "toggleTokenFlag",
      "docs": [
        "Toggle a flag of the given token.",
        "",
        "# Arguments",
        "- `flag`: the flag to toggle.",
        "- `value`: the value to be changed to.",
        "",
        "# Errors.",
        "- The [`token`](ToggleTokenFlag::token) must be in the token list.",
        "- `flag` must be defined in [`TokenFlag`](crate::states::treasury::TokenFlag)."
      ],
      "discriminator": [
        75,
        32,
        1,
        58,
        29,
        123,
        20,
        11
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Authority."
          ],
          "signer": true
        },
        {
          "name": "store",
          "docs": [
            "Store."
          ],
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "docs": [
            "Config."
          ],
          "relations": [
            "treasuryVaultConfig"
          ]
        },
        {
          "name": "treasuryVaultConfig",
          "docs": [
            "Treasury Vault Config."
          ],
          "writable": true
        },
        {
          "name": "token",
          "docs": [
            "Token."
          ]
        },
        {
          "name": "storeProgram",
          "docs": [
            "Store program."
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        }
      ],
      "args": [
        {
          "name": "flag",
          "type": "string"
        },
        {
          "name": "value",
          "type": "bool"
        }
      ]
    },
    {
      "name": "transferReceiver",
      "docs": [
        "Transfer the receiver permission to a new address."
      ],
      "discriminator": [
        198,
        147,
        229,
        126,
        135,
        119,
        134,
        77
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Authority."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "store",
          "docs": [
            "Store."
          ],
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "docs": [
            "Config."
          ]
        },
        {
          "name": "receiver",
          "docs": [
            "Receiver."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  101,
                  105,
                  118,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "config"
              }
            ]
          }
        },
        {
          "name": "nextReceiver",
          "docs": [
            "The new receiver."
          ]
        },
        {
          "name": "storeProgram",
          "docs": [
            "Store program."
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        },
        {
          "name": "systemProgram",
          "docs": [
            "The system program."
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "withdrawFromTreasuryVault",
      "docs": [
        "Withdraw from treasury vault."
      ],
      "discriminator": [
        249,
        29,
        124,
        28,
        213,
        68,
        237,
        110
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Authority."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "store",
          "docs": [
            "Store."
          ],
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "docs": [
            "Config."
          ],
          "relations": [
            "treasuryVaultConfig"
          ]
        },
        {
          "name": "treasuryVaultConfig",
          "docs": [
            "Treasury Vault Config."
          ]
        },
        {
          "name": "token",
          "docs": [
            "Token."
          ]
        },
        {
          "name": "treasuryVault",
          "docs": [
            "Treasury vault."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "treasuryVaultConfig"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "token"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "target",
          "docs": [
            "Target."
          ],
          "writable": true
        },
        {
          "name": "storeProgram",
          "docs": [
            "Store program."
          ],
          "address": "Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "The token program."
          ]
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "decimals",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "gtBank",
      "discriminator": [
        22,
        238,
        251,
        171,
        93,
        246,
        199,
        113
      ]
    },
    {
      "name": "gtExchange",
      "discriminator": [
        59,
        99,
        208,
        22,
        219,
        145,
        65,
        199
      ]
    },
    {
      "name": "gtExchangeVault",
      "discriminator": [
        123,
        227,
        174,
        214,
        16,
        219,
        214,
        148
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
      "name": "treasuryVaultConfig",
      "discriminator": [
        239,
        10,
        243,
        108,
        249,
        129,
        212,
        29
      ]
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
      "name": "config",
      "docs": [
        "Treasury config account."
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
            "name": "receiverBump",
            "type": "u8"
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
            "name": "store",
            "type": "pubkey"
          },
          {
            "name": "treasuryVaultConfig",
            "type": "pubkey"
          },
          {
            "name": "gtFactor",
            "type": "u128"
          },
          {
            "name": "buybackFactor",
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
      "name": "gtBank",
      "docs": [
        "GT Bank."
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
                "name": "gtBankFlagsContainer"
              }
            }
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                13
              ]
            }
          },
          {
            "name": "treasuryVaultConfig",
            "type": "pubkey"
          },
          {
            "name": "gtExchangeVault",
            "type": "pubkey"
          },
          {
            "name": "remainingConfirmedGtAmount",
            "type": "u64"
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
            "name": "balances",
            "type": {
              "defined": {
                "name": "tokenBalances"
              }
            }
          }
        ]
      }
    },
    {
      "name": "gtBankFlagsContainer",
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
      "name": "gtExchange",
      "docs": [
        "GT Exchange Account."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "docs": [
              "Bump."
            ],
            "type": "u8"
          },
          {
            "name": "flags",
            "type": {
              "defined": {
                "name": "gtExchangeFlagContainer"
              }
            }
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "owner",
            "docs": [
              "Owner address."
            ],
            "type": "pubkey"
          },
          {
            "name": "store",
            "docs": [
              "Store address."
            ],
            "type": "pubkey"
          },
          {
            "name": "vault",
            "docs": [
              "Vault address."
            ],
            "type": "pubkey"
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
      "name": "gtExchangeFlagContainer",
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
      "name": "gtExchangeVault",
      "docs": [
        "GT Exchange Vault."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "docs": [
              "Bump seed."
            ],
            "type": "u8"
          },
          {
            "name": "flags",
            "type": {
              "defined": {
                "name": "gtExchangeVaultFlagContainer"
              }
            }
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "ts",
            "type": "i64"
          },
          {
            "name": "timeWindow",
            "type": "i64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "store",
            "docs": [
              "Store."
            ],
            "type": "pubkey"
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
      "name": "gtExchangeVaultFlagContainer",
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
            "docs": [
              "Grow step amount. It must be immutable."
            ],
            "type": "u64"
          },
          {
            "name": "growSteps",
            "type": "u64"
          },
          {
            "name": "supply",
            "docs": [
              "Supply of buybackable GT."
            ],
            "type": "u64"
          },
          {
            "name": "lastCumulativeInvCostFactorTs",
            "docs": [
              "Timestamp of the last update to `cumulative_inv_cost_factor`."
            ],
            "type": "i64"
          },
          {
            "name": "gtVault",
            "docs": [
              "Vault for non-buybackable GT."
            ],
            "type": "u64"
          },
          {
            "name": "cumulativeInvCostFactor",
            "docs": [
              "Cumulative `1 / minting_cost` factor."
            ],
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
            "docs": [
              "Market config flags updatable by a [`MARKET_CONFIG_KEEPER`](`gmsol_utils::role::RoleKey::MARKET_CONFIG_KEEPER`)."
            ],
            "type": {
              "defined": {
                "name": "marketConfigFlagContainer"
              }
            }
          },
          {
            "name": "updatableMarketConfigFactors",
            "docs": [
              "Market config factors updatable by a [`MARKET_CONFIG_KEEPER`](`gmsol_utils::role::RoleKey::MARKET_CONFIG_KEEPER`)."
            ],
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
            "docs": [
              "Store."
            ],
            "type": "pubkey"
          },
          {
            "name": "authority",
            "docs": [
              "This address is authorized to **directly** modify",
              "the oracle through instructions."
            ],
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
            "docs": [
              "Store authority."
            ],
            "type": "pubkey"
          },
          {
            "name": "nextAuthority",
            "docs": [
              "Next authority."
            ],
            "type": "pubkey"
          },
          {
            "name": "tokenMap",
            "docs": [
              "The token map to used."
            ],
            "type": "pubkey"
          },
          {
            "name": "disabledFeatures",
            "docs": [
              "Disabled features."
            ],
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
            "docs": [
              "Cached last cluster restart slot."
            ],
            "type": "u64"
          },
          {
            "name": "treasury",
            "docs": [
              "Treasury Config."
            ],
            "type": {
              "defined": {
                "name": "treasury"
              }
            }
          },
          {
            "name": "amount",
            "docs": [
              "Amounts."
            ],
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
            "docs": [
              "Factors."
            ],
            "type": {
              "defined": {
                "name": "factors"
              }
            }
          },
          {
            "name": "address",
            "docs": [
              "Addresses."
            ],
            "type": {
              "defined": {
                "name": "addresses"
              }
            }
          },
          {
            "name": "gt",
            "docs": [
              "GT State."
            ],
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
      "name": "tokenBalance",
      "docs": [
        "Token Balance."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "receiverVaultOut",
            "type": "u64"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                56
              ]
            }
          }
        ]
      }
    },
    {
      "name": "tokenBalances",
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
                    "name": "tokenBalancesEntry"
                  }
                },
                16
              ]
            }
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                4
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
      "name": "tokenBalancesEntry",
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
                "name": "tokenBalance"
              }
            }
          }
        ]
      }
    },
    {
      "name": "tokenConfig",
      "docs": [
        "Token config for treasury."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "flags",
            "type": {
              "defined": {
                "name": "tokenFlagContainer"
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
      "name": "tokenFlagContainer",
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
      "name": "tokenMap",
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
                    "name": "tokenMapEntry"
                  }
                },
                16
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
      "name": "tokenMapEntry",
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
                "name": "tokenConfig"
              }
            }
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
            "docs": [
              "Receiver."
            ],
            "type": "pubkey"
          },
          {
            "name": "nextReceiver",
            "docs": [
              "Next receiver."
            ],
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
      "name": "treasuryVaultConfig",
      "docs": [
        "Treasury vault config account."
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
            "name": "index",
            "type": "u16"
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
            "name": "config",
            "type": "pubkey"
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
            "name": "tokens",
            "type": {
              "defined": {
                "name": "tokenMap"
              }
            }
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "receiverSeed",
      "docs": [
        "Receiver Seed."
      ],
      "type": "bytes",
      "value": "[114, 101, 99, 101, 105, 118, 101, 114]"
    }
  ]
};
