/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/gmsol_timelock.json`.
 */
export type GmsolTimelock = {
  address: 'TimeBQ7gQyWyQMD3bTteAdy7hTVDNWSwELdSVZHfSXL';
  metadata: {
    name: 'gmsolTimelock';
    version: '0.6.0';
    spec: '0.1.0';
    description: 'GMX-Solana is an extension of GMX on the Solana blockchain.';
    repository: 'https://github.com/gmsol-labs/gmx-solana';
  };
  instructions: [
    {
      name: 'approveInstruction';
      docs: ['Approve instruction.'];
      discriminator: [165, 74, 223, 204, 102, 65, 199, 112];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['executor'];
        },
        {
          name: 'executor';
          docs: ['Executor.'];
          relations: ['instruction'];
        },
        {
          name: 'instruction';
          docs: ['Instruction to approve.'];
          writable: true;
        },
        {
          name: 'storeProgram';
          docs: ['Store program.'];
          address: 'Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo';
        },
      ];
      args: [
        {
          name: 'role';
          type: 'string';
        },
      ];
    },
    {
      name: 'approveInstructions';
      docs: ['Approve multiple instructions.'];
      discriminator: [106, 131, 218, 58, 251, 191, 49, 87];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['executor'];
        },
        {
          name: 'executor';
          docs: ['Executor.'];
        },
        {
          name: 'storeProgram';
          docs: ['Store program.'];
          address: 'Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo';
        },
      ];
      args: [
        {
          name: 'role';
          type: 'string';
        },
      ];
    },
    {
      name: 'cancelInstruction';
      docs: ['Cancel instruction.'];
      discriminator: [189, 67, 87, 101, 160, 77, 91, 23];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['executor'];
        },
        {
          name: 'executor';
          docs: ['Executor.'];
          relations: ['instruction'];
        },
        {
          name: 'rentReceiver';
          docs: ['Rent receiver.'];
          writable: true;
          relations: ['instruction'];
        },
        {
          name: 'instruction';
          docs: ['Instruction to cancel.'];
          writable: true;
        },
        {
          name: 'storeProgram';
          docs: ['Store program.'];
          address: 'Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo';
        },
      ];
      args: [];
    },
    {
      name: 'cancelInstructions';
      docs: [
        'Cancel multiple instructions that sharing the same `executor` and `rent_receiver`.',
      ];
      discriminator: [255, 161, 134, 99, 236, 50, 174, 218];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['executor'];
        },
        {
          name: 'executor';
          docs: ['Executor.'];
        },
        {
          name: 'rentReceiver';
          docs: ['Rent receiver.'];
          writable: true;
        },
        {
          name: 'storeProgram';
          docs: ['Store program.'];
          address: 'Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo';
        },
      ];
      args: [];
    },
    {
      name: 'createInstructionBuffer';
      docs: ['Create instruction buffer.'];
      discriminator: [114, 27, 38, 228, 192, 186, 50, 67];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          writable: true;
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['executor'];
        },
        {
          name: 'executor';
          docs: ['Expected executor.'];
        },
        {
          name: 'instructionBuffer';
          docs: ['Instruction buffer to create.'];
          writable: true;
          signer: true;
        },
        {
          name: 'instructionProgram';
          docs: ['Instruction Program.'];
        },
        {
          name: 'storeProgram';
          docs: ['Store program.'];
          address: 'Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo';
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'numAccounts';
          type: 'u16';
        },
        {
          name: 'dataLen';
          type: 'u16';
        },
        {
          name: 'data';
          type: 'bytes';
        },
        {
          name: 'signers';
          type: {
            vec: 'u16';
          };
        },
      ];
    },
    {
      name: 'executeInstruction';
      docs: ['Execute instruction.'];
      discriminator: [48, 18, 40, 40, 75, 74, 147, 110];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['timelockConfig', 'executor'];
        },
        {
          name: 'timelockConfig';
          docs: ['Timelock config.'];
        },
        {
          name: 'executor';
          docs: ['Executor.'];
          relations: ['instruction'];
        },
        {
          name: 'wallet';
          docs: ['Executor Wallet.', 'the instruction to close it.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [119, 97, 108, 108, 101, 116];
              },
              {
                kind: 'account';
                path: 'executor';
              },
            ];
          };
        },
        {
          name: 'rentReceiver';
          docs: ['Rent receiver.'];
          writable: true;
          relations: ['instruction'];
        },
        {
          name: 'instruction';
          docs: ['Instruction to execute.'];
          writable: true;
        },
        {
          name: 'storeProgram';
          docs: ['Store program.'];
          address: 'Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo';
        },
      ];
      args: [];
    },
    {
      name: 'increaseDelay';
      docs: ['Increase timelock delay.'];
      discriminator: [91, 163, 172, 194, 193, 133, 174, 25];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          writable: true;
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['timelockConfig'];
        },
        {
          name: 'timelockConfig';
          writable: true;
        },
        {
          name: 'storeProgram';
          docs: ['Store program.'];
          address: 'Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo';
        },
      ];
      args: [
        {
          name: 'delta';
          type: 'u32';
        },
      ];
    },
    {
      name: 'initializeConfig';
      docs: ['Initialize timelock config.'];
      discriminator: [208, 127, 21, 1, 194, 190, 196, 70];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          writable: true;
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          writable: true;
          relations: ['executor'];
        },
        {
          name: 'timelockConfig';
          docs: ['Config.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  116,
                  105,
                  109,
                  101,
                  108,
                  111,
                  99,
                  107,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
            ];
          };
        },
        {
          name: 'executor';
          docs: ['Admin executor.'];
        },
        {
          name: 'wallet';
          docs: ['Admin executor wallet.'];
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [119, 97, 108, 108, 101, 116];
              },
              {
                kind: 'account';
                path: 'executor';
              },
            ];
          };
        },
        {
          name: 'storeProgram';
          docs: ['Store program.'];
          address: 'Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo';
        },
        {
          name: 'systemProgram';
          docs: ['System program.'];
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'delay';
          type: 'u32';
        },
      ];
    },
    {
      name: 'initializeExecutor';
      docs: ['Initialize executor.'];
      discriminator: [176, 40, 133, 151, 198, 251, 10, 91];
      accounts: [
        {
          name: 'payer';
          docs: ['Payer.'];
          writable: true;
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
        },
        {
          name: 'executor';
          docs: ['Executor to initialize.'];
          writable: true;
        },
        {
          name: 'wallet';
          docs: ['Executor wallet.'];
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [119, 97, 108, 108, 101, 116];
              },
              {
                kind: 'account';
                path: 'executor';
              },
            ];
          };
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'role';
          type: 'string';
        },
      ];
    },
    {
      name: 'revokeRole';
      docs: ['Revoke role.'];
      discriminator: [179, 232, 2, 180, 48, 227, 82, 7];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          writable: true;
          relations: ['executor'];
        },
        {
          name: 'executor';
          docs: ['Executor.'];
        },
        {
          name: 'wallet';
          docs: ['Executor Wallet.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [119, 97, 108, 108, 101, 116];
              },
              {
                kind: 'account';
                path: 'executor';
              },
            ];
          };
        },
        {
          name: 'user';
          docs: ['User.'];
        },
        {
          name: 'storeProgram';
          docs: ['Store program.'];
          address: 'Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo';
        },
      ];
      args: [
        {
          name: 'role';
          type: 'string';
        },
      ];
    },
    {
      name: 'setExpectedPriceProvider';
      docs: ['Set expected price provider.'];
      discriminator: [182, 103, 5, 161, 72, 6, 5, 154];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          writable: true;
          relations: ['executor'];
        },
        {
          name: 'tokenMap';
          docs: ['Token map.'];
          writable: true;
        },
        {
          name: 'executor';
          docs: ['Executor.'];
        },
        {
          name: 'wallet';
          docs: ['Executor Wallet.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [119, 97, 108, 108, 101, 116];
              },
              {
                kind: 'account';
                path: 'executor';
              },
            ];
          };
        },
        {
          name: 'token';
          docs: ['Token to update.'];
        },
        {
          name: 'storeProgram';
          docs: ['Store program.'];
          address: 'Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo';
        },
        {
          name: 'systemProgram';
          docs: ['System program.'];
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'newExpectedPriceProvider';
          type: 'u8';
        },
      ];
    },
  ];
  accounts: [
    {
      name: 'executor';
      discriminator: [81, 168, 99, 99, 156, 134, 16, 166];
    },
    {
      name: 'instructionHeader';
      discriminator: [23, 218, 71, 2, 252, 204, 29, 245];
    },
    {
      name: 'store';
      discriminator: [130, 48, 247, 244, 182, 191, 30, 26];
    },
    {
      name: 'timelockConfig';
      discriminator: [189, 87, 27, 18, 189, 173, 47, 197];
    },
  ];
  types: [
    {
      name: 'addresses';
      docs: ['Addresses.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'holding';
            type: 'pubkey';
          },
          {
            name: 'reserved';
            type: {
              array: ['pubkey', 30];
            };
          },
        ];
      };
    },
    {
      name: 'amounts';
      docs: ['Amounts.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'claimableTimeWindow';
            type: 'u64';
          },
          {
            name: 'recentTimeWindow';
            type: 'u64';
          },
          {
            name: 'requestExpiration';
            type: 'u64';
          },
          {
            name: 'oracleMaxAge';
            type: 'u64';
          },
          {
            name: 'oracleMaxTimestampRange';
            type: 'u64';
          },
          {
            name: 'oracleMaxFutureTimestampExcess';
            type: 'u64';
          },
          {
            name: 'adlPricesMaxStaleness';
            type: 'u64';
          },
          {
            name: 'reserved';
            type: {
              array: ['u64', 126];
            };
          },
        ];
      };
    },
    {
      name: 'disabledFeatures';
      docs: ['Disabled Features State.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'map';
            type: {
              defined: {
                name: 'disabledMap';
              };
            };
          },
        ];
      };
    },
    {
      name: 'disabledMap';
      docs: ['Fixed size map generated by the macro.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'data';
            type: {
              array: [
                {
                  defined: {
                    name: 'disabledMapEntry';
                  };
                },
                64,
              ];
            };
          },
          {
            name: 'padding';
            type: {
              array: ['u8', 0];
            };
          },
          {
            name: 'count';
            type: 'u32';
          },
        ];
      };
    },
    {
      name: 'disabledMapEntry';
      docs: ['Entry.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'key';
            type: {
              array: ['u8', 2];
            };
          },
          {
            name: 'value';
            type: 'u8';
          },
        ];
      };
    },
    {
      name: 'executor';
      docs: ['Executor.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'version';
            type: 'u8';
          },
          {
            name: 'bump';
            type: 'u8';
          },
          {
            name: 'walletBump';
            type: 'u8';
          },
          {
            name: 'padding';
            type: {
              array: ['u8', 13];
            };
          },
          {
            name: 'store';
            type: 'pubkey';
          },
          {
            name: 'roleName';
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'reserved';
            type: {
              array: ['u8', 256];
            };
          },
        ];
      };
    },
    {
      name: 'factors';
      docs: ['Factors.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'oracleRefPriceDeviation';
            type: 'u128';
          },
          {
            name: 'orderFeeDiscountForReferredUser';
            type: 'u128';
          },
          {
            name: 'reserved';
            type: {
              array: ['u128', 64];
            };
          },
        ];
      };
    },
    {
      name: 'gtState';
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'decimals';
            type: 'u8';
          },
          {
            name: 'padding0';
            type: {
              array: ['u8', 7];
            };
          },
          {
            name: 'lastMintedAt';
            type: 'i64';
          },
          {
            name: 'totalMinted';
            type: 'u64';
          },
          {
            name: 'growStepAmount';
            docs: ['Grow step amount. It must be immutable.'];
            type: 'u64';
          },
          {
            name: 'growSteps';
            type: 'u64';
          },
          {
            name: 'supply';
            docs: ['Supply of buybackable GT.'];
            type: 'u64';
          },
          {
            name: 'padding1';
            type: {
              array: ['u8', 8];
            };
          },
          {
            name: 'gtVault';
            docs: ['Vault for non-buybackable GT.'];
            type: 'u64';
          },
          {
            name: 'padding2';
            type: {
              array: ['u8', 16];
            };
          },
          {
            name: 'mintingCostGrowFactor';
            type: 'u128';
          },
          {
            name: 'mintingCost';
            type: 'u128';
          },
          {
            name: 'padding3';
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'exchangeTimeWindow';
            type: 'u32';
          },
          {
            name: 'padding4';
            type: {
              array: ['u8', 12];
            };
          },
          {
            name: 'maxRank';
            type: 'u64';
          },
          {
            name: 'ranks';
            type: {
              array: ['u64', 15];
            };
          },
          {
            name: 'orderFeeDiscountFactors';
            type: {
              array: ['u128', 16];
            };
          },
          {
            name: 'referralRewardFactors';
            type: {
              array: ['u128', 16];
            };
          },
          {
            name: 'padding5';
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'reserved';
            type: {
              array: ['u8', 256];
            };
          },
        ];
      };
    },
    {
      name: 'instructionFlagContainer';
      docs: ['Flags container generated by the macro.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'value';
            type: 'u8';
          },
        ];
      };
    },
    {
      name: 'instructionHeader';
      docs: ['Instruction Header.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'version';
            type: 'u8';
          },
          {
            name: 'flags';
            type: {
              defined: {
                name: 'instructionFlagContainer';
              };
            };
          },
          {
            name: 'walletBump';
            type: 'u8';
          },
          {
            name: 'padding0';
            type: {
              array: ['u8', 5];
            };
          },
          {
            name: 'approvedAt';
            docs: ['Approved ts.'];
            type: 'i64';
          },
          {
            name: 'executor';
            docs: ['Executor.'];
            type: 'pubkey';
          },
          {
            name: 'programId';
            docs: ['Program ID.'];
            type: 'pubkey';
          },
          {
            name: 'numAccounts';
            docs: ['Number of accounts.'];
            type: 'u16';
          },
          {
            name: 'dataLen';
            docs: ['Data length.'];
            type: 'u16';
          },
          {
            name: 'padding1';
            type: {
              array: ['u8', 12];
            };
          },
          {
            name: 'rentReceiver';
            type: 'pubkey';
          },
          {
            name: 'approver';
            type: 'pubkey';
          },
          {
            name: 'reserved';
            type: {
              array: ['u8', 64];
            };
          },
        ];
      };
    },
    {
      name: 'members';
      docs: ['Fixed size map generated by the macro.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'data';
            type: {
              array: [
                {
                  defined: {
                    name: 'membersEntry';
                  };
                },
                64,
              ];
            };
          },
          {
            name: 'padding';
            type: {
              array: ['u8', 0];
            };
          },
          {
            name: 'count';
            type: 'u32';
          },
        ];
      };
    },
    {
      name: 'membersEntry';
      docs: ['Entry.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'key';
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'value';
            type: 'u32';
          },
        ];
      };
    },
    {
      name: 'roleMap';
      docs: ['Fixed size map generated by the macro.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'data';
            type: {
              array: [
                {
                  defined: {
                    name: 'roleMapEntry';
                  };
                },
                32,
              ];
            };
          },
          {
            name: 'padding';
            type: {
              array: ['u8', 0];
            };
          },
          {
            name: 'count';
            type: 'u32';
          },
        ];
      };
    },
    {
      name: 'roleMapEntry';
      docs: ['Entry.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'key';
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'value';
            type: {
              defined: {
                name: 'roleMetadata';
              };
            };
          },
        ];
      };
    },
    {
      name: 'roleMetadata';
      docs: ['Role Metadata.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'name';
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'enabled';
            type: 'u8';
          },
          {
            name: 'index';
            type: 'u8';
          },
        ];
      };
    },
    {
      name: 'roleStore';
      docs: ['Roles Store.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'roles';
            type: {
              defined: {
                name: 'roleMap';
              };
            };
          },
          {
            name: 'members';
            type: {
              defined: {
                name: 'members';
              };
            };
          },
        ];
      };
    },
    {
      name: 'store';
      docs: ['Data Store.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'version';
            type: 'u8';
          },
          {
            name: 'bump';
            type: {
              array: ['u8', 1];
            };
          },
          {
            name: 'keySeed';
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'key';
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'padding0';
            type: {
              array: ['u8', 6];
            };
          },
          {
            name: 'role';
            type: {
              defined: {
                name: 'roleStore';
              };
            };
          },
          {
            name: 'authority';
            docs: ['Store authority.'];
            type: 'pubkey';
          },
          {
            name: 'nextAuthority';
            docs: ['Next authority.'];
            type: 'pubkey';
          },
          {
            name: 'tokenMap';
            docs: ['The token map to used.'];
            type: 'pubkey';
          },
          {
            name: 'disabledFeatures';
            docs: ['Disabled features.'];
            type: {
              defined: {
                name: 'disabledFeatures';
              };
            };
          },
          {
            name: 'padding1';
            type: {
              array: ['u8', 4];
            };
          },
          {
            name: 'lastRestartedSlot';
            docs: ['Cached last cluster restart slot.'];
            type: 'u64';
          },
          {
            name: 'treasury';
            docs: ['Treasury Config.'];
            type: {
              defined: {
                name: 'treasury';
              };
            };
          },
          {
            name: 'amount';
            docs: ['Amounts.'];
            type: {
              defined: {
                name: 'amounts';
              };
            };
          },
          {
            name: 'padding2';
            type: {
              array: ['u8', 8];
            };
          },
          {
            name: 'factor';
            docs: ['Factors.'];
            type: {
              defined: {
                name: 'factors';
              };
            };
          },
          {
            name: 'address';
            docs: ['Addresses.'];
            type: {
              defined: {
                name: 'addresses';
              };
            };
          },
          {
            name: 'gt';
            docs: ['GT State.'];
            type: {
              defined: {
                name: 'gtState';
              };
            };
          },
          {
            name: 'reserved';
            type: {
              array: ['u8', 1024];
            };
          },
        ];
      };
    },
    {
      name: 'timelockConfig';
      docs: ['Timelock Config.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'version';
            type: 'u8';
          },
          {
            name: 'bump';
            type: 'u8';
          },
          {
            name: 'padding0';
            type: {
              array: ['u8', 6];
            };
          },
          {
            name: 'delay';
            type: 'u32';
          },
          {
            name: 'padding1';
            type: {
              array: ['u8', 4];
            };
          },
          {
            name: 'store';
            type: 'pubkey';
          },
          {
            name: 'reserved';
            type: {
              array: ['u8', 256];
            };
          },
        ];
      };
    },
    {
      name: 'treasury';
      docs: ['Treasury.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'receiver';
            docs: ['Receiver.'];
            type: 'pubkey';
          },
          {
            name: 'nextReceiver';
            docs: ['Next receiver.'];
            type: 'pubkey';
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
  ];
};
