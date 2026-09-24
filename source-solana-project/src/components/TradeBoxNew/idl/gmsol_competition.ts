/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/gmsol_competition.json`.
 */
export type GmsolCompetition = {
  address: '2AxuNr6euZPKQbTwNsLBjzFTZFAevA85F4PW9m9Dv8pc';
  metadata: {
    name: 'gmsolCompetition';
    version: '0.6.0';
    spec: '0.1.0';
    description: 'GMX-Solana is an extension of GMX on the Solana blockchain.';
    repository: 'https://github.com/gmsol-labs/gmx-solana';
  };
  instructions: [
    {
      name: 'closeParticipant';
      docs: ['Close the participant account and recover rent.'];
      discriminator: [192, 162, 92, 5, 148, 191, 207, 151];
      accounts: [
        {
          name: 'trader';
          docs: ['The trader that owns the participant account.'];
          writable: true;
          signer: true;
          relations: ['participant'];
        },
        {
          name: 'competition';
          docs: ['The competition account this participant belongs to.'];
          relations: ['participant'];
        },
        {
          name: 'participant';
          docs: ['The participant PDA to close.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 97, 114, 116, 105, 99, 105, 112, 97, 110, 116];
              },
              {
                kind: 'account';
                path: 'competition';
              },
              {
                kind: 'account';
                path: 'trader';
              },
            ];
          };
        },
      ];
      args: [];
    },
    {
      name: 'createParticipantIdempotent';
      docs: [
        'Create [`Participant`](crate::states::Participant) PDA idempotently.',
      ];
      discriminator: [156, 72, 209, 80, 153, 251, 119, 15];
      accounts: [
        {
          name: 'payer';
          docs: ['Payer that funds the new PDA when it does **not** exist.'];
          writable: true;
          signer: true;
        },
        {
          name: 'competition';
          docs: ['The competition account this participant belongs to.'];
        },
        {
          name: 'participant';
          docs: ['The participant PDA.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 97, 114, 116, 105, 99, 105, 112, 97, 110, 116];
              },
              {
                kind: 'account';
                path: 'competition';
              },
              {
                kind: 'account';
                path: 'trader';
              },
            ];
          };
        },
        {
          name: 'trader';
          docs: ['The trader address.'];
        },
        {
          name: 'systemProgram';
          docs: ['System program.'];
          address: '11111111111111111111111111111111';
        },
      ];
      args: [];
    },
    {
      name: 'initializeCompetition';
      docs: [
        'Initialize the global [`Competition`](crate::states::Competition) PDA.',
      ];
      discriminator: [51, 234, 53, 254, 166, 217, 144, 224];
      accounts: [
        {
          name: 'payer';
          docs: ['Payer and the authority of the competition.'];
          writable: true;
          signer: true;
        },
        {
          name: 'competition';
          docs: ['The global competition PDA.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 111, 109, 112, 101, 116, 105, 116, 105, 111, 110];
              },
              {
                kind: 'account';
                path: 'payer';
              },
              {
                kind: 'arg';
                path: 'startTime';
              },
            ];
          };
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'startTime';
          type: 'i64';
        },
        {
          name: 'endTime';
          type: 'i64';
        },
        {
          name: 'volumeThreshold';
          type: 'u128';
        },
        {
          name: 'extensionDuration';
          type: 'i64';
        },
        {
          name: 'extensionCap';
          type: 'i64';
        },
        {
          name: 'onlyCountIncrease';
          type: 'bool';
        },
        {
          name: 'volumeMergeWindow';
          type: 'i64';
        },
      ];
    },
    {
      name: 'onClosed';
      docs: [
        'Triggered when an order is **closed / cancelled**.',
        'Currently ignored by the competition contract.',
      ];
      discriminator: [205, 52, 56, 138, 35, 157, 126, 10];
      accounts: [
        {
          name: 'authority';
          docs: ['The callback‑authority PDA (must be a signer).'];
          signer: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 97, 108, 108, 98, 97, 99, 107];
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                8,
              ];
            };
          };
        },
        {
          name: 'competition';
        },
        {
          name: 'participant';
        },
        {
          name: 'trader';
          docs: ['The trader public key.'];
        },
        {
          name: 'action';
          docs: ['The action account.'];
        },
      ];
      args: [
        {
          name: 'authorityBump';
          type: 'u8';
        },
        {
          name: 'actionKind';
          type: 'u8';
        },
        {
          name: 'callbackVersion';
          type: 'u8';
        },
        {
          name: 'extraAccountCount';
          type: 'u8';
        },
      ];
    },
    {
      name: 'onCreated';
      docs: [
        'Triggered immediately **after an order is created**.',
        'The competition logic is unaffected, so this is a no‑op kept only',
        'for interface compatibility.',
      ];
      discriminator: [84, 33, 24, 120, 108, 57, 59, 163];
      accounts: [
        {
          name: 'authority';
          docs: ['The callback‑authority PDA (must be a signer).'];
          signer: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 97, 108, 108, 98, 97, 99, 107];
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                8,
              ];
            };
          };
        },
        {
          name: 'competition';
          docs: ['The global competition account.'];
          relations: ['participant'];
        },
        {
          name: 'participant';
          docs: ['The participant PDA (created on demand).'];
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 97, 114, 116, 105, 99, 105, 112, 97, 110, 116];
              },
              {
                kind: 'account';
                path: 'competition';
              },
              {
                kind: 'account';
                path: 'trader';
              },
            ];
          };
        },
        {
          name: 'trader';
          docs: ['The trader public key.'];
          relations: ['participant'];
        },
        {
          name: 'action';
          docs: ['The action account.'];
        },
      ];
      args: [
        {
          name: 'authorityBump';
          type: 'u8';
        },
        {
          name: 'actionKind';
          type: 'u8';
        },
        {
          name: 'callbackVersion';
          type: 'u8';
        },
        {
          name: 'extraAccountCount';
          type: 'u8';
        },
      ];
    },
    {
      name: 'onExecuted';
      docs: [
        'Triggered when an order is **executed**.',
        'Updates the participant statistics and the on‑chain leaderboard.',
      ];
      discriminator: [182, 182, 238, 41, 72, 21, 100, 240];
      accounts: [
        {
          name: 'authority';
          docs: ['The callback‑authority PDA (must be a signer).'];
          signer: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 97, 108, 108, 98, 97, 99, 107];
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                8,
              ];
            };
          };
        },
        {
          name: 'competition';
          docs: ['The global competition account.'];
          writable: true;
        },
        {
          name: 'participant';
          docs: ['The participant PDA (created on demand).'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 97, 114, 116, 105, 99, 105, 112, 97, 110, 116];
              },
              {
                kind: 'account';
                path: 'competition';
              },
              {
                kind: 'account';
                path: 'trader';
              },
            ];
          };
        },
        {
          name: 'trader';
          docs: ['The trader public key.'];
        },
        {
          name: 'action';
          docs: ['The action account.'];
        },
        {
          name: 'position';
        },
        {
          name: 'tradeEvent';
          docs: ['Trade event data.'];
          optional: true;
        },
      ];
      args: [
        {
          name: 'authorityBump';
          type: 'u8';
        },
        {
          name: 'actionKind';
          type: 'u8';
        },
        {
          name: 'callbackVersion';
          type: 'u8';
        },
        {
          name: 'success';
          type: 'bool';
        },
        {
          name: 'extraAccountCount';
          type: 'u8';
        },
      ];
    },
    {
      name: 'onUpdated';
      docs: [
        'Triggered when an order is updated.',
        'Currently ignored by the competition contract.',
      ];
      discriminator: [128, 254, 199, 49, 187, 205, 190, 74];
      accounts: [
        {
          name: 'authority';
          docs: ['The callback‑authority PDA (must be a signer).'];
          signer: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 97, 108, 108, 98, 97, 99, 107];
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                8,
              ];
            };
          };
        },
        {
          name: 'competition';
        },
        {
          name: 'participant';
        },
        {
          name: 'trader';
          docs: ['The trader public key.'];
        },
        {
          name: 'action';
          docs: ['The action account.'];
        },
      ];
      args: [
        {
          name: 'authorityBump';
          type: 'u8';
        },
        {
          name: 'actionKind';
          type: 'u8';
        },
        {
          name: 'callbackVersion';
          type: 'u8';
        },
        {
          name: 'extraAccountCount';
          type: 'u8';
        },
      ];
    },
  ];
  accounts: [
    {
      name: 'competition';
      discriminator: [193, 49, 76, 118, 106, 22, 221, 106];
    },
    {
      name: 'participant';
      discriminator: [32, 142, 108, 79, 247, 179, 54, 6];
    },
    {
      name: 'tradeData';
      discriminator: [226, 22, 163, 52, 243, 223, 187, 74];
    },
  ];
  errors: [
    {
      code: 6000;
      name: 'outsideCompetitionTime';
      msg: 'outside competition time';
    },
    {
      code: 6001;
      name: 'invalidTradeEvent';
      msg: 'invalid trade event';
    },
    {
      code: 6002;
      name: 'invalidActionKind';
      msg: 'invalid action kind';
    },
    {
      code: 6003;
      name: 'invalidTimeRange';
      msg: 'invalid time range';
    },
    {
      code: 6004;
      name: 'invalidTimeExtension';
      msg: 'invalid time extension';
    },
    {
      code: 6005;
      name: 'invalidVolumeThreshold';
      msg: 'invalid volume threshold';
    },
    {
      code: 6006;
      name: 'invalidMaxExtension';
      msg: 'invalid max extension';
    },
    {
      code: 6007;
      name: 'competitionInProgress';
      msg: 'competition is still in progress';
    },
    {
      code: 6008;
      name: 'invalidVolumeMergeWindow';
      msg: 'invalid volume merge window';
    },
  ];
  types: [
    {
      name: 'competition';
      docs: ['The global competition data.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'bump';
            docs: ['Bump seed.'];
            type: 'u8';
          },
          {
            name: 'authority';
            docs: ['The authority of this competition.'];
            type: 'pubkey';
          },
          {
            name: 'startTime';
            docs: ['The competition start timestamp.'];
            type: 'i64';
          },
          {
            name: 'endTime';
            docs: ['The competition end timestamp.'];
            type: 'i64';
          },
          {
            name: 'leaderboard';
            docs: ['The fixed-length leaderboard.'];
            type: {
              vec: {
                defined: {
                  name: 'leaderEntry';
                };
              };
            };
          },
          {
            name: 'volumeThreshold';
            docs: ['Volume threshold in USD.'];
            type: 'u128';
          },
          {
            name: 'extensionDuration';
            docs: ['Time extension in seconds.'];
            type: 'i64';
          },
          {
            name: 'extensionCap';
            docs: ['Maximum time extension in seconds.'];
            type: 'i64';
          },
          {
            name: 'extensionTriggerer';
            docs: ['Address that triggered time extension.'];
            type: {
              option: 'pubkey';
            };
          },
          {
            name: 'onlyCountIncrease';
            docs: ['Whether to only count volume from position increases.'];
            type: 'bool';
          },
          {
            name: 'volumeMergeWindow';
            docs: [
              'Time window in seconds for merging volumes from the same trader.',
            ];
            type: 'i64';
          },
        ];
      };
    },
    {
      name: 'leaderEntry';
      docs: ['A single leaderboard record.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'address';
            docs: ['The trader address.'];
            type: 'pubkey';
          },
          {
            name: 'volume';
            docs: ['The cumulative traded volume.'];
            type: 'u128';
          },
        ];
      };
    },
    {
      name: 'participant';
      docs: ['The per-trader statistics.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'bump';
            docs: ['Bump seed.'];
            type: 'u8';
          },
          {
            name: 'competition';
            docs: ['The competition account this entry belongs to.'];
            type: 'pubkey';
          },
          {
            name: 'trader';
            docs: ['The trader address.'];
            type: 'pubkey';
          },
          {
            name: 'volume';
            docs: ['The cumulative traded volume.'];
            type: 'u128';
          },
          {
            name: 'lastUpdatedAt';
            docs: ['The last update timestamp.'];
            type: 'i64';
          },
          {
            name: 'mergedVolume';
            docs: ['The merged volume within the time window.'];
            type: 'u128';
          },
        ];
      };
    },
    {
      name: 'positionState';
      docs: ['Position State.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'tradeId';
            type: 'u64';
          },
          {
            name: 'increasedAt';
            type: 'i64';
          },
          {
            name: 'updatedAtSlot';
            type: 'u64';
          },
          {
            name: 'decreasedAt';
            type: 'i64';
          },
          {
            name: 'sizeInTokens';
            type: 'u128';
          },
          {
            name: 'collateralAmount';
            type: 'u128';
          },
          {
            name: 'sizeInUsd';
            type: 'u128';
          },
          {
            name: 'borrowingFactor';
            type: 'u128';
          },
          {
            name: 'fundingFeeAmountPerSize';
            type: 'u128';
          },
          {
            name: 'longTokenClaimableFundingAmountPerSize';
            type: 'u128';
          },
          {
            name: 'shortTokenClaimableFundingAmountPerSize';
            type: 'u128';
          },
          {
            name: 'reserved';
            type: {
              array: ['u8', 128];
            };
          },
        ];
      };
    },
    {
      name: 'tradeData';
      docs: ['Trade event data.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'flags';
            type: 'u8';
          },
          {
            name: 'padding0';
            type: {
              array: ['u8', 7];
            };
          },
          {
            name: 'tradeId';
            type: 'u64';
          },
          {
            name: 'authority';
            type: 'pubkey';
          },
          {
            name: 'store';
            type: 'pubkey';
          },
          {
            name: 'marketToken';
            type: 'pubkey';
          },
          {
            name: 'user';
            type: 'pubkey';
          },
          {
            name: 'position';
            type: 'pubkey';
          },
          {
            name: 'order';
            type: 'pubkey';
          },
          {
            name: 'finalOutputToken';
            type: 'pubkey';
          },
          {
            name: 'ts';
            type: 'i64';
          },
          {
            name: 'slot';
            type: 'u64';
          },
          {
            name: 'before';
            type: {
              defined: {
                name: 'positionState';
              };
            };
          },
          {
            name: 'after';
            type: {
              defined: {
                name: 'positionState';
              };
            };
          },
          {
            name: 'transferOut';
            type: {
              defined: {
                name: 'transferOut';
              };
            };
          },
          {
            name: 'padding1';
            type: {
              array: ['u8', 8];
            };
          },
          {
            name: 'prices';
            type: {
              defined: {
                name: 'tradePrices';
              };
            };
          },
          {
            name: 'executionPrice';
            type: 'u128';
          },
          {
            name: 'priceImpactValue';
            type: 'i128';
          },
          {
            name: 'priceImpactDiff';
            type: 'u128';
          },
          {
            name: 'pnl';
            type: {
              defined: {
                name: 'tradePnl';
              };
            };
          },
          {
            name: 'fees';
            type: {
              defined: {
                name: 'tradeFees';
              };
            };
          },
          {
            name: 'outputAmounts';
            type: {
              defined: {
                name: 'tradeOutputAmounts';
              };
            };
          },
        ];
      };
    },
    {
      name: 'tradeFees';
      docs: ['Trade Fees.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'orderFeeForReceiverAmount';
            type: 'u128';
          },
          {
            name: 'orderFeeForPoolAmount';
            type: 'u128';
          },
          {
            name: 'liquidationFeeAmount';
            type: 'u128';
          },
          {
            name: 'liquidationFeeForReceiverAmount';
            type: 'u128';
          },
          {
            name: 'totalBorrowingFeeAmount';
            type: 'u128';
          },
          {
            name: 'borrowingFeeForReceiverAmount';
            type: 'u128';
          },
          {
            name: 'fundingFeeAmount';
            type: 'u128';
          },
          {
            name: 'claimableFundingFeeLongTokenAmount';
            type: 'u128';
          },
          {
            name: 'claimableFundingFeeShortTokenAmount';
            type: 'u128';
          },
        ];
      };
    },
    {
      name: 'tradeOutputAmounts';
      docs: ['Output amounts.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'outputAmount';
            type: 'u128';
          },
          {
            name: 'secondaryOutputAmount';
            type: 'u128';
          },
        ];
      };
    },
    {
      name: 'tradePnl';
      docs: ['Trade PnL.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'pnl';
            type: 'i128';
          },
          {
            name: 'uncappedPnl';
            type: 'i128';
          },
        ];
      };
    },
    {
      name: 'tradePrice';
      docs: ['Price.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'min';
            type: 'u128';
          },
          {
            name: 'max';
            type: 'u128';
          },
        ];
      };
    },
    {
      name: 'tradePrices';
      docs: ['Prices.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'index';
            type: {
              defined: {
                name: 'tradePrice';
              };
            };
          },
          {
            name: 'long';
            type: {
              defined: {
                name: 'tradePrice';
              };
            };
          },
          {
            name: 'short';
            type: {
              defined: {
                name: 'tradePrice';
              };
            };
          },
        ];
      };
    },
    {
      name: 'transferOut';
      docs: ['Transfer Out.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'executed';
            type: 'u8';
          },
          {
            name: 'padding0';
            type: {
              array: ['u8', 7];
            };
          },
          {
            name: 'finalOutputToken';
            type: 'u64';
          },
          {
            name: 'secondaryOutputToken';
            type: 'u64';
          },
          {
            name: 'longToken';
            type: 'u64';
          },
          {
            name: 'shortToken';
            type: 'u64';
          },
          {
            name: 'longTokenForClaimableAccountOfUser';
            type: 'u64';
          },
          {
            name: 'shortTokenForClaimableAccountOfUser';
            type: 'u64';
          },
          {
            name: 'longTokenForClaimableAccountOfHolding';
            type: 'u64';
          },
          {
            name: 'shortTokenForClaimableAccountOfHolding';
            type: 'u64';
          },
        ];
      };
    },
  ];
  constants: [
    {
      name: 'competitionSeed';
      docs: ['The seed for [`Competition`] account.'];
      type: 'bytes';
      value: '[99, 111, 109, 112, 101, 116, 105, 116, 105, 111, 110]';
    },
    {
      name: 'maxLeaderboardLen';
      docs: ['The maximum number of leaderboard entries kept on chain.'];
      type: 'u8';
      value: '5';
    },
    {
      name: 'participantSeed';
      docs: ['The seed for [`Participant`] account.'];
      type: 'bytes';
      value: '[112, 97, 114, 116, 105, 99, 105, 112, 97, 110, 116]';
    },
  ];
};
