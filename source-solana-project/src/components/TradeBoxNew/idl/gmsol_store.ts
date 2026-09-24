/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/gmsol_store.json`.
 */
export type GmsolStore = {
  address: 'Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo';
  metadata: {
    name: 'gmsolStore';
    version: '0.6.0';
    spec: '0.1.0';
    description: 'GMX-Solana is an extension of GMX on the Solana blockchain.';
    repository: 'https://github.com/gmsol-labs/gmx-solana';
  };
  docs: ['Instructions definitions of the GMSOL Store Program.'];
  instructions: [
    {
      name: 'acceptReceiver';
      docs: [
        'Accept the transfer of the receiver address of the given store.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](AcceptReceiver).*',
        '',
        '# Errors',
        '- The [`next_receiver`](AcceptReceiver::next_receiver) must be a signer and the current',
        '`next_receiver` of the store.',
        '- The [`store`](AcceptReceiver::store) must be an initialized store account',
        'owned by the store program.',
      ];
      discriminator: [93, 246, 187, 244, 111, 155, 186, 235];
      accounts: [
        {
          name: 'nextReceiver';
          docs: ['The next receiver.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store account whose receiver is being transferred.'];
          writable: true;
        },
      ];
      args: [];
    },
    {
      name: 'acceptReferralCode';
      docs: [
        'Accept referral code.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](AcceptReferralCode)*',
        '',
        '# Errors',
        '- The [`next_owner`](AcceptReferralCode::next_owner) must be a signer.',
        '- The [`store`](AcceptReferralCode::store) must be properly initialized.',
        '- The [`user`](AcceptReferralCode::user) account must be:',
        '- Properly initialized',
        '- Different from the [`receiver_user`](AcceptReferralCode::receiver_user)',
        '- The [`referral_code`](AcceptReferralCode::referral_code) account must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- Correspond to the owner of the `user`',
        '- Have the next owner be the `next_owner`',
        '- The [`receiver_user`](AcceptReferralCode::receiver_user) account must be:',
        '- Properly initialized',
        '- Not have an associated referral code',
        '- Correspond to the `next_owner`',
      ];
      discriminator: [161, 82, 76, 244, 25, 188, 215, 207];
      accounts: [
        {
          name: 'nextOwner';
          signer: true;
        },
        {
          name: 'store';
          relations: ['user', 'referralCode', 'receiverUser'];
        },
        {
          name: 'user';
          docs: ['User Account.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'referralCode';
              },
            ];
          };
        },
        {
          name: 'referralCode';
          docs: ['Referral Code Account.'];
          writable: true;
        },
        {
          name: 'receiverUser';
          docs: ['Receiver.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'nextOwner';
              },
            ];
          };
        },
      ];
      args: [];
    },
    {
      name: 'acceptStoreAuthority';
      docs: [
        'Accept the transfer of the authority (admin) of the given store.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](AcceptStoreAuthority).*',
        '',
        '# Errors',
        '- The [`next_authority`](AcceptStoreAuthority::next_authority) must be a signer and the current',
        '`next_authority` of the store.',
        '- The [`store`](TransferStoreAuthority::store) must be an initialized store account',
        'owned by the store program.',
      ];
      discriminator: [19, 118, 2, 20, 10, 118, 118, 208];
      accounts: [
        {
          name: 'nextAuthority';
          docs: ['The next authority.'];
          signer: true;
          relations: ['store'];
        },
        {
          name: 'store';
          docs: ['The store account whose authority is being transferred.'];
          writable: true;
        },
      ];
      args: [];
    },
    {
      name: 'autoDeleverage';
      docs: [
        'Perform an ADL (Auto-Deleveraging) by keepers.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](PositionCut)*',
        '',
        '# Arguments',
        '- `nonce`: The nonce used to derive the `order` PDA address.',
        '- `recent_timestamp`: A recent blockchain timestamp for validation.',
        '- `execution_fee`: The execution fee claimed to be used by the keeper.',
        '',
        '# Errors',
        '- The [`authority`](PositionCut::authority) must be a signer with the ORDER_KEEPER role.',
        '- The [`owner`](PositionCut::owner) must be the position owner.',
        '- The [`user`](PositionCut::user) must be initialized and corresponding to the `owner`.',
        '- The [`store`](PositionCut::store) must be initialized.',
        '- The [`token_map`](PositionCut::token_map) must be initialized and authorized by the store.',
        '- The [`oracle`](PositionCut::oracle) must be initialized, cleared and store-owned.',
        '- The [`market`](PositionCut::market) must be initialized, enabled, store-owned and match',
        "the position's market. The market must be in ADL state.",
        '- The [`order`](PositionCut::order) must be uninitialized with address matching PDA from',
        'the `store`, `owner`, `nonce` and other expected seeds.',
        '- The [`position`](PositionCut::position) must be initialized, owned by the `owner` and',
        '`store` and eligible for ADL.',
        '- The [`event`](PositionCut::event) must be a valid trade event buffer owned by the `store`',
        'and `authority`.',
        '- The [`long_token`](PositionCut::long_token) and [`short_token`](PositionCut::short_token)',
        'must match those defined in the `market`.',
        '- The [`long_token_escrow`](PositionCut::long_token_escrow) and',
        '[`short_token_escrow`](PositionCut::short_token_escrow) must be valid order-owned escrow',
        'accounts for their respective tokens.',
        '- The [`long_token_vault`](PositionCut::long_token_vault) and',
        '[`short_token_vault`](PositionCut::short_token_vault) must be valid store-owned market',
        'vault accounts for their tokens.',
        '- The [`claimable_long_token_account_for_user`](PositionCut::claimable_long_token_account_for_user)',
        'must be a store-owned, owner-delegated claimable account for long token.',
        '- The [`claimable_short_token_account_for_user`](PositionCut::claimable_short_token_account_for_user)',
        'must be a store-owned, owner-delegated claimable account for short token.',
        '- The [`claimable_pnl_token_account_for_holding`](PositionCut::claimable_pnl_token_account_for_holding)',
        'must be a store-owned, holding-delegated claimable account for PnL token.',
        "- Price feed accounts must be valid and provided in the market's sorted token list order.",
        '- The ADL feature must be enabled in the `store`.',
        '- Oracle prices must be valid and complete.',
        '- Execution must complete successfully.',
      ];
      discriminator: [210, 69, 163, 148, 44, 245, 226, 170];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          writable: true;
          signer: true;
          relations: ['event'];
        },
        {
          name: 'owner';
          docs: ['The owner of the position.'];
          writable: true;
          relations: ['user'];
        },
        {
          name: 'user';
          docs: ['User Account.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
              },
            ];
          };
        },
        {
          name: 'store';
          docs: ['Store.'];
          writable: true;
          relations: ['user', 'tokenMap', 'oracle', 'market', 'event'];
        },
        {
          name: 'tokenMap';
          docs: ['Token map.'];
          relations: ['store'];
        },
        {
          name: 'oracle';
          docs: ['Buffer for oracle prices.'];
          writable: true;
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
        {
          name: 'order';
          docs: ['The order to be created.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [111, 114, 100, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'authority';
              },
              {
                kind: 'arg';
                path: 'nonce';
              },
            ];
          };
        },
        {
          name: 'position';
          writable: true;
        },
        {
          name: 'event';
          docs: ['Trade event buffer.'];
          writable: true;
        },
        {
          name: 'longToken';
          docs: ['Long token.'];
        },
        {
          name: 'shortToken';
          docs: ['Short token.'];
        },
        {
          name: 'longTokenEscrow';
          docs: ['The escrow account for long tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'longToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'shortTokenEscrow';
          docs: ['The escrow account for short tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'shortToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'longTokenVault';
          docs: ['Long token vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'long_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'shortTokenVault';
          docs: ['Short token vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'short_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'claimableLongTokenAccountForUser';
          writable: true;
        },
        {
          name: 'claimableShortTokenAccountForUser';
          writable: true;
        },
        {
          name: 'claimablePnlTokenAccountForHolding';
          writable: true;
        },
        {
          name: 'systemProgram';
          docs: ['Initial collateral token vault.', 'The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['The associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'chainlinkProgram';
          docs: ['Chainlink Program.'];
          optional: true;
          address: 'HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'nonce';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'recentTimestamp';
          type: 'i64';
        },
        {
          name: 'sizeDeltaInUsd';
          type: 'u128';
        },
        {
          name: 'executionFee';
          type: 'u64';
        },
      ];
    },
    {
      name: 'cancelOrderIfNoPosition';
      docs: [
        'Cancel order if the corresponding position does not exist.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](CancelOrderIfNoPosition)*',
        '',
        '# Errors',
        '- The [`authority`](CancelOrderIfNoPosition::authority) must be a signed ORDER_KEEPER',
        'in the store.',
        '- The [`store`](CancelOrderIfNoPosition::authority) must be initialized.',
        '- The [`order`](CancelOrderIfNoPosition::order) must be initialized and owned by the',
        '`store`. It must be in the pending state.',
        '- The [`position`](CancelOrderIfNoPosition::position) must be recorded in the order.',
        'It must be owned by the system program (i.e., considered to be missing).',
      ];
      discriminator: [41, 140, 160, 127, 168, 138, 4, 28];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
        },
        {
          name: 'order';
          docs: ['Order to check.'];
          writable: true;
        },
        {
          name: 'position';
          docs: [
            'Validate that the position does not exist (or is owned by the system program).',
          ];
        },
      ];
      args: [];
    },
    {
      name: 'cancelReferralCodeTransfer';
      docs: [
        'Cancel referral code transfer.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](CancelReferralCodeTransfer)*',
        '',
        '# Errors',
        '- The [`owner`](CancelReferralCodeTransfer::owner) must be a signer.',
        '- The [`store`](CancelReferralCodeTransfer::store) must be properly initialized.',
        '- The [`user`](CancelReferralCodeTransfer::user) account must be:',
        '- Properly initialized',
        '- Correspond to the `owner`',
        '- The [`referral_code`](CancelReferralCodeTransfer::referral_code) account must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- Correspond to the `owner`',
        '- The next owner must not have been the `owner`',
      ];
      discriminator: [161, 31, 77, 170, 104, 11, 96, 19];
      accounts: [
        {
          name: 'owner';
          signer: true;
          relations: ['user'];
        },
        {
          name: 'store';
          relations: ['user', 'referralCode'];
        },
        {
          name: 'user';
          docs: ['User Account.'];
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
              },
            ];
          };
        },
        {
          name: 'referralCode';
          docs: ['Referral Code Account.'];
          writable: true;
        },
      ];
      args: [];
    },
    {
      name: 'checkAdmin';
      docs: [
        'Return whether the signer is the admin of the given store.',
        '',
        'This instruction verifies if the signer has administrator privileges for the given store',
        'and returns a boolean result.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](CheckRole).*',
        '',
        '# Returns',
        'Returns `true` if the signer is the admin, `false` otherwise.',
        '',
        '# Errors',
        '- The [`authority`](CheckRole::authority) must be a signer.',
        '- The [`store`](CheckRole::store) must be an initialized store account owned by',
        'the store program.',
      ];
      discriminator: [207, 152, 134, 45, 235, 115, 54, 186];
      accounts: [
        {
          name: 'authority';
          docs: ['The address to check for the role.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store account in which the role is defined.'];
        },
      ];
      args: [];
      returns: 'bool';
    },
    {
      name: 'checkRole';
      docs: [
        'Check that the authority has the given role in the given store.',
        '',
        'This instruction verifies if the authority has the specified role in the given store',
        'and returns a boolean result.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](CheckRole).*',
        '',
        '# Arguments',
        '- `role`: The name of the role to check for the authority.',
        '',
        '# Returns',
        'Returns `true` if the authority has the role, `false` otherwise.',
        '',
        '# Errors',
        '- The [`authority`](CheckRole::authority) must be a signer.',
        '- The [`store`](CheckRole::store) must be an initialized store account owned by',
        'the store program.',
        "- The `role` must exist and be enabled in the store's role configuration.",
      ];
      discriminator: [142, 221, 97, 79, 34, 70, 95, 203];
      accounts: [
        {
          name: 'authority';
          docs: ['The address to check for the role.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store account in which the role is defined.'];
        },
      ];
      args: [
        {
          name: 'role';
          type: 'string';
        },
      ];
      returns: 'bool';
    },
    {
      name: 'claimFeesFromMarket';
      docs: [
        'Claim fees from the given market.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts.*](ClaimFeesFromMarket)',
        '',
        '# Return',
        '- Returns the claimed amount in base units of the token.',
        '',
        '# Errors',
        '- The [`authority`](ClaimFeesFromMarket::authority) must be a signer and be the designated',
        'fee receiver in the given store.',
        '- The [`store`](ClaimFeesFromMarket::store) must be an initialized [`Store`](crate::states::Store)',
        'account owned by this program.',
        '- The [`market`](ClaimFeesFromMarket::market) must be an initialized [`Market`](crate::states::Market)',
        'account owned by this program and associated with the given store.',
        "- The token being claimed must be one of the market's configured collateral tokens.",
        '- All provided token accounts must match their expected addresses.',
        '- The market must maintain valid balance requirements after the claim.',
      ];
      discriminator: [245, 167, 45, 29, 37, 215, 168, 32];
      accounts: [
        {
          name: 'authority';
          signer: true;
        },
        {
          name: 'store';
          relations: ['market'];
        },
        {
          name: 'market';
          writable: true;
        },
        {
          name: 'tokenMint';
        },
        {
          name: 'vault';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'tokenMint';
              },
            ];
          };
        },
        {
          name: 'target';
          writable: true;
        },
        {
          name: 'tokenProgram';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [];
      returns: 'u64';
    },
    {
      name: 'clearAllPrices';
      docs: [
        'Clear all prices from the given oracle.',
        '',
        'This instruction removes all stored price data from the oracle account and resets it to the',
        'cleared state. This can be useful when needing to reset price data or when decommissioning an',
        'oracle.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](ClearAllPrices)*',
        '',
        '# Errors',
        '- The [`authority`](ClearAllPrices::authority) must be a signer and have the ORACLE_CONTROLLER',
        'role in the given store. It must also be the authority of the oracle.',
        '- The [`store`](ClearAllPrices::store) must be an initialized store account owned by the',
        'store program.',
        '- The [`oracle`](ClearAllPrices::oracle) must be an initialized oracle account owned by',
        'the given store.',
      ];
      discriminator: [168, 114, 138, 123, 105, 56, 252, 151];
      accounts: [
        {
          name: 'authority';
          docs: ['The caller.'];
          signer: true;
          relations: ['oracle'];
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['oracle'];
        },
        {
          name: 'oracle';
          docs: ['Oracle.'];
          writable: true;
        },
      ];
      args: [];
    },
    {
      name: 'closeDeposit';
      docs: [
        'Close a deposit, either by the owner or by keepers.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](CloseDeposit)*',
        '',
        '# Arguments',
        '- `reason`: The reason for closing the deposit.',
        '',
        '# Errors',
        'This instruction will fail if:',
        '- The [`executor`](CloseDeposit::executor) is not a signer or is neither the deposit',
        'owner nor an ORDER_KEEPER in the store.',
        '- The [`store`](CloseDeposit::store) is not properly initialized.',
        "- The [`owner`](CloseDeposit::owner) does not match the deposit's owner.",
        '- The provided token mint accounts do not match those recorded in the `deposit`.',
        '- The [`deposit`](CloseDeposit::deposit) is not initialized, not owned by the store,',
        'or not owned by the specified owner.',
        '- Any escrow account is not owned by the `deposit` or does not match the `deposit` records.',
        '- Any associated token account address is invalid.',
        '- The deposit is not in a cancelled or completed state when closed by a non-owner.',
      ];
      discriminator: [200, 19, 254, 192, 15, 110, 209, 179];
      accounts: [
        {
          name: 'executor';
          docs: ['The executor of this instruction.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store.'];
        },
        {
          name: 'storeWallet';
          docs: ['The store wallet.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  115,
                  116,
                  111,
                  114,
                  101,
                  95,
                  119,
                  97,
                  108,
                  108,
                  101,
                  116,
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
          name: 'owner';
          docs: ['The owner of the deposit.'];
          writable: true;
        },
        {
          name: 'receiver';
          docs: ['The receiver of the deposit.'];
          writable: true;
        },
        {
          name: 'marketToken';
          docs: ['Market token.'];
        },
        {
          name: 'initialLongToken';
          docs: ['Initial long token.'];
          optional: true;
        },
        {
          name: 'initialShortToken';
          docs: ['Initial short token.'];
          optional: true;
        },
        {
          name: 'deposit';
          docs: ['The deposit to close.'];
          writable: true;
        },
        {
          name: 'marketTokenEscrow';
          docs: ['The escrow account for receiving market tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'deposit';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'marketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'initialLongTokenEscrow';
          docs: [
            'The escrow account for receiving initial long token for deposit.',
          ];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'deposit';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'initialLongToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'initialShortTokenEscrow';
          docs: [
            'The escrow account for receiving initial short token for deposit.',
          ];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'deposit';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'initialShortToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'marketTokenAta';
          docs: ['The ATA for market token of the receiver.'];
          writable: true;
        },
        {
          name: 'initialLongTokenAta';
          docs: ['The ATA for initial long token of the owner.'];
          writable: true;
          optional: true;
        },
        {
          name: 'initialShortTokenAta';
          docs: ['The ATA for initial short token of the owner.'];
          writable: true;
          optional: true;
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['The associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'reason';
          type: 'string';
        },
      ];
    },
    {
      name: 'closeEmptyClaimableAccount';
      docs: [
        'Close an empty claimable account.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts.*](CloseEmptyClaimableAccount)',
        '',
        '# Arguments',
        '- `timestamp`: The timestamp for which the claimable account was created.',
        '',
        '# Errors',
        '- The [`authority`](CloseEmptyClaimableAccount::authority) must be a signer and have ORDER_KEEPER',
        'permissions in the store.',
        '- The [`store`](CloseEmptyClaimableAccount::store) must be initialized.',
        '- The [`account`](CloseEmptyClaimableAccount::account) must be a PDA derived from',
        'the claimable timestamp and other expected seeds.',
        '- The [`account`](CloseEmptyClaimableAccount::account) must be initialized and owned by the store.',
        '- The balance of the [`account`](CloseEmptyClaimableAccount::account) must be zero.',
      ];
      discriminator: [160, 114, 144, 216, 133, 237, 255, 158];
      accounts: [
        {
          name: 'authority';
          docs: ['The caller.'];
          writable: true;
          signer: true;
        },
        {
          name: 'store';
        },
        {
          name: 'mint';
        },
        {
          name: 'owner';
        },
        {
          name: 'account';
          writable: true;
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
      ];
      args: [
        {
          name: 'timestamp';
          type: 'i64';
        },
      ];
    },
    {
      name: 'closeGlvDeposit';
      docs: [
        'Close GLV deposit.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](CloseGlvDeposit)*',
        '',
        '# Arguments',
        '- `reason`: The reason for closing the GLV deposit.',
        '',
        '# Errors',
        '- The [`executor`](CloseGlvDeposit::executor) must be a signer, and must be',
        'either the owner of the GLV deposit or a `ORDER_KEEPER` in the store',
        '- The [`store`](CloseGlvDeposit::store) must be properly initialized',
        '- The [`owner`](CloseGlvDeposit::owner) must be the owner of the GLV deposit',
        '- The [`glv_deposit`](CloseGlvDeposit::glv_deposit) must be:',
        '- Properly initialized',
        '- Owned by the `owner` and `store`',
        '- In cancelled or executed state if the `executor` is not the `owner`',
        '- Token mint account requirements:',
        '- All tokens must be valid and recorded in the [`glv_deposit`](CloseGlvDeposit::glv_deposit)',
        '- [`initial_long_token`](CloseGlvDeposit::initial_long_token) must be provided if initial long amount > 0',
        '- [`initial_short_token`](CloseGlvDeposit::initial_short_token) must be provided if initial short amount > 0',
        '- Escrow account requirements:',
        '- Must correspond to their respective tokens',
        '- Must be owned by the [`glv_deposit`](CloseGlvDeposit::glv_deposit)',
        '- Must be recorded in the [`glv_deposit`](CloseGlvDeposit::glv_deposit)',
        '- The addresses of the ATAs must be valid associated token addresses derived from the respective tokens and `owner`',
        '- All token programs must match their corresponding token accounts',
      ];
      discriminator: [23, 131, 155, 5, 79, 73, 74, 247];
      accounts: [
        {
          name: 'executor';
          docs: ['The executor of this instruction.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store.'];
        },
        {
          name: 'storeWallet';
          docs: ['The store wallet.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  115,
                  116,
                  111,
                  114,
                  101,
                  95,
                  119,
                  97,
                  108,
                  108,
                  101,
                  116,
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
          name: 'owner';
          docs: ['The owner of the deposit.'];
          writable: true;
        },
        {
          name: 'receiver';
          docs: ['The receiver of the deposit.'];
          writable: true;
        },
        {
          name: 'glvDeposit';
          docs: ['The GLV deposit to close.'];
          writable: true;
        },
        {
          name: 'marketToken';
          docs: ['Market token.'];
        },
        {
          name: 'initialLongToken';
          docs: ['Initial long token.'];
          optional: true;
        },
        {
          name: 'initialShortToken';
          docs: ['Initial short token.'];
          optional: true;
        },
        {
          name: 'glvToken';
          docs: ['GLV token.'];
        },
        {
          name: 'marketTokenEscrow';
          docs: ['The escrow account for market tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvDeposit';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'marketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'initialLongTokenEscrow';
          docs: [
            'The escrow account for receiving initial long token for deposit.',
          ];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvDeposit';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'initialLongToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'initialShortTokenEscrow';
          docs: [
            'The escrow account for receiving initial short token for deposit.',
          ];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvDeposit';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'initialShortToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'glvTokenEscrow';
          docs: ['The escrow account for GLV tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvDeposit';
              },
              {
                kind: 'account';
                path: 'glvTokenProgram';
              },
              {
                kind: 'account';
                path: 'glvToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'marketTokenAta';
          docs: ['The ATA for market token of the owner.'];
          writable: true;
        },
        {
          name: 'initialLongTokenAta';
          docs: ['The ATA for initial long token of the owner.'];
          writable: true;
          optional: true;
        },
        {
          name: 'initialShortTokenAta';
          docs: ['The ATA for initial short token of the owner.'];
          writable: true;
          optional: true;
        },
        {
          name: 'glvTokenAta';
          docs: ['The ATA for GLV token of the receiver.'];
          writable: true;
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'glvTokenProgram';
          docs: ['Token program for GLV token.'];
          address: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['The associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'reason';
          type: 'string';
        },
      ];
    },
    {
      name: 'closeGlvShift';
      docs: [
        'Close a GLV shift.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](CloseGlvShift)*',
        '',
        '# Arguments',
        '- `reason`: The reason for closing the GLV shift.',
        '',
        '# Errors',
        '- The [`authority`](CloseGlvShift::authority) must be:',
        '- A signer',
        '- A `ORDER_KEEPER` in the `store`',
        '- The [`funder`](CloseGlvShift::funder) must be the funder of the [`glv`](CloseGlvShift::glv).',
        '- The [`store`](CloseGlvShift::store) must be properly initialized.',
        '- The [`glv`](CloseGlvShift::glv) must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- The expected GLV of the GLV shift',
        '- The [`glv_shift`](CloseGlvShift::glv_shift) must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- Token requirements:',
        '- [`from_market_token`](CloseGlvShift::from_market_token) must be:',
        '- Recorded in the GLV shift',
        '- [`to_market_token`](CloseGlvShift::to_market_token) must be:',
        '- Recorded in the GLV shift',
      ];
      discriminator: [90, 31, 241, 89, 138, 184, 164, 186];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          writable: true;
          signer: true;
        },
        {
          name: 'funder';
          docs: ['Funder of the GLV shift.'];
          writable: true;
        },
        {
          name: 'store';
          docs: ['The store.'];
          relations: ['glv'];
        },
        {
          name: 'storeWallet';
          docs: ['The store wallet.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  115,
                  116,
                  111,
                  114,
                  101,
                  95,
                  119,
                  97,
                  108,
                  108,
                  101,
                  116,
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
          name: 'glv';
          docs: ['GLV.'];
        },
        {
          name: 'glvShift';
          docs: ['The GLV shift to close.'];
          writable: true;
        },
        {
          name: 'fromMarketToken';
          docs: ['From Market token.'];
        },
        {
          name: 'toMarketToken';
          docs: ['To Market token.'];
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['The associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'reason';
          type: 'string';
        },
      ];
    },
    {
      name: 'closeGlvWithdrawal';
      docs: [
        'Close GLV withdrawal.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](CloseGlvWithdrawal)*',
        '',
        '# Arguments',
        '- `reason`: The reason for closing the GLV withdrawal.',
        '',
        '# Errors',
        '- The [`executor`](CloseGlvWithdrawal::executor) must be:',
        '- A signer',
        '- Either:',
        '- The owner of the [`glv_withdrawal`](CloseGlvWithdrawal::glv_withdrawal)',
        '- A `ORDER_KEEPER` in the `store`',
        '- The [`store`](CloseGlvWithdrawal::store) must be properly initialized',
        '- The [`owner`](CloseGlvWithdrawal::owner) must be the owner of the [`glv_withdrawal`](CloseGlvWithdrawal::glv_withdrawal)',
        '- The [`glv_withdrawal`](CloseGlvWithdrawal::glv_withdrawal) must be:',
        '- Properly initialized',
        '- Owned by the `owner`',
        '- Owned by the `store`',
        '- Token requirements:',
        '- All tokens must be valid and recorded in the [`glv_withdrawal`](CloseGlvWithdrawal::glv_withdrawal)',
        '- Escrow requirements:',
        '- Must correspond to their respective tokens',
        '- Must be owned by the [`glv_withdrawal`](CloseGlvWithdrawal::glv_withdrawal)',
        '- Must be recorded in the [`glv_withdrawal`](CloseGlvWithdrawal::glv_withdrawal)',
        '- The addresses of the ATAs must be valid associated token addresses derived from the respective tokens and `owner`',
        '- All token programs must match their corresponding token accounts',
        '- If the `executor` is not the `owner`, the [`glv_withdrawal`](CloseGlvWithdrawal::glv_withdrawal) must be either cancelled or executed.',
      ];
      discriminator: [14, 209, 38, 49, 97, 42, 179, 212];
      accounts: [
        {
          name: 'executor';
          docs: ['The executor of this instruction.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store.'];
        },
        {
          name: 'storeWallet';
          docs: ['The store wallet.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  115,
                  116,
                  111,
                  114,
                  101,
                  95,
                  119,
                  97,
                  108,
                  108,
                  101,
                  116,
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
          name: 'owner';
          docs: ['The owner of the deposit.'];
          writable: true;
        },
        {
          name: 'receiver';
          docs: ['The receiver of the deposit.'];
          writable: true;
        },
        {
          name: 'glvWithdrawal';
          docs: ['The GLV withdrawal to close.'];
          writable: true;
        },
        {
          name: 'marketToken';
          docs: ['Market token.'];
        },
        {
          name: 'finalLongToken';
          docs: ['Final long token.'];
        },
        {
          name: 'finalShortToken';
          docs: ['Final short token.'];
        },
        {
          name: 'glvToken';
          docs: ['GLV token.'];
        },
        {
          name: 'marketTokenEscrow';
          docs: ['The escrow account for market tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvWithdrawal';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'marketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'finalLongTokenEscrow';
          docs: [
            'The escrow account for receiving initial long token for deposit.',
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvWithdrawal';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'finalLongToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'finalShortTokenEscrow';
          docs: [
            'The escrow account for receiving final short token for deposit.',
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvWithdrawal';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'finalShortToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'marketTokenAta';
          docs: ['The ATA for market token of the owner.'];
          writable: true;
        },
        {
          name: 'finalLongTokenAta';
          docs: ['The ATA for final long token of the receiver.'];
          writable: true;
        },
        {
          name: 'finalShortTokenAta';
          docs: ['The ATA for final short token of the receiver.'];
          writable: true;
        },
        {
          name: 'glvTokenEscrow';
          docs: ['The escrow account for GLV tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvWithdrawal';
              },
              {
                kind: 'account';
                path: 'glvTokenProgram';
              },
              {
                kind: 'account';
                path: 'glvToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'glvTokenAta';
          docs: ['The ATA for GLV token of the owner.'];
          writable: true;
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'glvTokenProgram';
          docs: ['Token program for GLV token.'];
          address: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['The associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'reason';
          type: 'string';
        },
      ];
    },
    {
      name: 'closeGtExchange';
      docs: [
        'Close a confirmed GT exchange.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](CloseGtExchange)*',
        '',
        '# Errors',
        '- The [`authority`](CloseGtExchange::authority) must be a signer and have the GT_CONTROLLER role in the `store`.',
        '- The [`store`](CloseGtExchange::store) must be properly initialized with an initialized GT state.',
        '- The [`vault`](CloseGtExchange::vault) must be properly initialized, owned by the `store`,',
        'and confirmed.',
        '- The [`exchange`](CloseGtExchange::exchange) must be properly initialized and owned by both',
        'the `owner` and `vault`.',
      ];
      discriminator: [180, 247, 24, 67, 219, 21, 83, 148];
      accounts: [
        {
          name: 'authority';
          signer: true;
        },
        {
          name: 'store';
          relations: ['vault', 'exchange'];
        },
        {
          name: 'owner';
          writable: true;
          relations: ['exchange'];
        },
        {
          name: 'vault';
          writable: true;
          relations: ['exchange'];
        },
        {
          name: 'exchange';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [103, 116, 95, 101, 120, 99, 104, 97, 110, 103, 101];
              },
              {
                kind: 'account';
                path: 'vault';
              },
              {
                kind: 'account';
                path: 'owner';
              },
            ];
          };
        },
      ];
      args: [];
    },
    {
      name: 'closeMarketConfigBuffer';
      docs: [
        'Close the given market config buffer account and reclaim its rent.',
        '',
        'This instruction allows the authority to close their market config buffer account',
        'and reclaim the rent.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts.*](CloseMarketConfigBuffer)',
        '',
        '# Errors',
        '- The [`authority`](CloseMarketConfigBuffer::authority) must be a signer',
        'and the owner of the `buffer` account.',
        '- The [`buffer`](CloseMarketConfigBuffer::buffer) must be an initialized',
        'market config buffer account.',
      ];
      discriminator: [115, 231, 168, 106, 130, 45, 95, 247];
      accounts: [
        {
          name: 'authority';
          docs: ['The authority.'];
          writable: true;
          signer: true;
          relations: ['buffer'];
        },
        {
          name: 'buffer';
          docs: ['Buffer.'];
          writable: true;
        },
        {
          name: 'receiver';
          docs: ['Receiver.'];
          writable: true;
        },
      ];
      args: [];
    },
    {
      name: 'closeOrder';
      docs: [
        'Close an order, either by the owner or by keepers.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](CloseOrder)*',
        '',
        '# Arguments',
        '- `reason`: The reason for the close.',
        '',
        '# Errors',
        '- The [`executor`](CloseOrder::executor) must be a signer and either the owner',
        'of the `order` or a ORDER_KEEPER in the store.',
        '- The [`store`](CloseOrder::store) must be initialized.',
        '- The [`owner`](CloseOrder::owner) must be the owner of the `order`.',
        '- The [`user`](CloseOrder::user) must be initialized and correspond to the `owner`.',
        '- The [`referrer_user`](CloseOrder::referrer_user) must be present if the `owner` has a',
        'referrer, and it must be initialized and correspond to the referrer of the `owner`.',
        '- The [`order`](CloseOrder::order) must be initialized and owned by the `store` and the',
        '`owner`.',
        '- The tokens must be those recorded in the `order`.',
        '- The escrow accounts must be owned and recorded in the `order`.',
        '- The addresses of the ATAs must be valid.',
        '- The `order` must be cancelled or completed if the `executor` is not the owner.',
        '- The feature must be enabled for closing the given kind of `order`.',
      ];
      discriminator: [90, 103, 209, 28, 7, 63, 168, 4];
      accounts: [
        {
          name: 'executor';
          docs: ['The executor of this instruction.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store.'];
          writable: true;
          relations: ['user', 'referrerUser'];
        },
        {
          name: 'storeWallet';
          docs: ['The store wallet.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  115,
                  116,
                  111,
                  114,
                  101,
                  95,
                  119,
                  97,
                  108,
                  108,
                  101,
                  116,
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
          name: 'owner';
          docs: ['The owner of the order.'];
          writable: true;
          relations: ['user'];
        },
        {
          name: 'receiver';
          docs: ['The receiver of the order.'];
          writable: true;
        },
        {
          name: 'rentReceiver';
          docs: ['The rent receiver of the order.'];
          writable: true;
        },
        {
          name: 'user';
          docs: ['User Account.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
              },
            ];
          };
        },
        {
          name: 'referrerUser';
          docs: ['Referrer User Account.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'user';
              },
            ];
          };
        },
        {
          name: 'order';
          docs: ['Order to close.'];
          writable: true;
        },
        {
          name: 'initialCollateralToken';
          docs: ['Initial collateral token.'];
          optional: true;
        },
        {
          name: 'finalOutputToken';
          docs: ['Final output token.'];
          optional: true;
        },
        {
          name: 'longToken';
          docs: ['Long token.'];
          optional: true;
        },
        {
          name: 'shortToken';
          docs: ['Short token.'];
          optional: true;
        },
        {
          name: 'initialCollateralTokenEscrow';
          docs: ['The escrow account for initial collateral tokens.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'initialCollateralToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'finalOutputTokenEscrow';
          docs: ['The escrow account for final output tokens.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'finalOutputToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'longTokenEscrow';
          docs: ['The escrow account for long tokens.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'longToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'shortTokenEscrow';
          docs: ['The escrow account for short tokens.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'shortToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'initialCollateralTokenAta';
          docs: ['The ATA for initial collateral token of the owner.'];
          writable: true;
          optional: true;
        },
        {
          name: 'finalOutputTokenAta';
          docs: ['The ATA for final output token of the receiver.'];
          writable: true;
          optional: true;
        },
        {
          name: 'longTokenAta';
          docs: ['The ATA for long token of the receiver.'];
          writable: true;
          optional: true;
        },
        {
          name: 'shortTokenAta';
          docs: ['The ATA for initial collateral token of the receiver.'];
          writable: true;
          optional: true;
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['The associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'reason';
          type: 'string';
        },
      ];
    },
    {
      name: 'closeOrderV2';
      docs: [
        'Close an order, either by the owner or by keepers.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](CloseOrderV2)*',
        '',
        '# Arguments',
        '- `reason`: The reason for the close.',
        '',
        '# Errors',
        '- The [`executor`](CloseOrderV2::executor) must be a signer and either the owner',
        'of the `order` or a ORDER_KEEPER in the store.',
        '- The [`store`](CloseOrderV2::store) must be initialized.',
        '- The [`owner`](CloseOrderV2::owner) must be the owner of the `order`.',
        '- The [`user`](CloseOrderV2::user) must be initialized and correspond to the `owner`.',
        '- The [`referrer_user`](CloseOrderV2::referrer_user) must be present if the `owner` has a',
        'referrer, and it must be initialized and correspond to the referrer of the `owner`.',
        '- The [`order`](CloseOrderV2::order) must be initialized and owned by the `store` and the',
        '`owner`.',
        '- The tokens must be those recorded in the `order`.',
        '- The escrow accounts must be owned and recorded in the `order`.',
        '- The addresses of the ATAs must be valid.',
        '- The `order` must be cancelled or completed if the `executor` is not the owner.',
        '- The feature must be enabled for closing the given kind of `order`.',
        '- The accounts related to callback must be provided if',
        '[`callback_authority`](CloseOrderV2::callback_authority) is provided.',
      ];
      discriminator: [213, 217, 98, 100, 225, 205, 76, 184];
      accounts: [
        {
          name: 'executor';
          docs: ['The executor of this instruction.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store.'];
          writable: true;
          relations: ['user', 'referrerUser'];
        },
        {
          name: 'storeWallet';
          docs: ['The store wallet.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  115,
                  116,
                  111,
                  114,
                  101,
                  95,
                  119,
                  97,
                  108,
                  108,
                  101,
                  116,
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
          name: 'owner';
          docs: ['The owner of the order.'];
          writable: true;
          relations: ['user'];
        },
        {
          name: 'receiver';
          docs: ['The receiver of the order.'];
          writable: true;
        },
        {
          name: 'rentReceiver';
          docs: ['The rent receiver of the order.'];
          writable: true;
        },
        {
          name: 'user';
          docs: ['User Account.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
              },
            ];
          };
        },
        {
          name: 'referrerUser';
          docs: ['Referrer User Account.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'user';
              },
            ];
          };
        },
        {
          name: 'order';
          docs: ['Order to close.'];
          writable: true;
        },
        {
          name: 'initialCollateralToken';
          docs: ['Initial collateral token.'];
          optional: true;
        },
        {
          name: 'finalOutputToken';
          docs: ['Final output token.'];
          optional: true;
        },
        {
          name: 'longToken';
          docs: ['Long token.'];
          optional: true;
        },
        {
          name: 'shortToken';
          docs: ['Short token.'];
          optional: true;
        },
        {
          name: 'initialCollateralTokenEscrow';
          docs: ['The escrow account for initial collateral tokens.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'initialCollateralToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'finalOutputTokenEscrow';
          docs: ['The escrow account for final output tokens.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'finalOutputToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'longTokenEscrow';
          docs: ['The escrow account for long tokens.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'longToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'shortTokenEscrow';
          docs: ['The escrow account for short tokens.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'shortToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'initialCollateralTokenAta';
          docs: ['The ATA for initial collateral token of the owner.'];
          writable: true;
          optional: true;
        },
        {
          name: 'finalOutputTokenAta';
          docs: ['The ATA for final output token of the receiver.'];
          writable: true;
          optional: true;
        },
        {
          name: 'longTokenAta';
          docs: ['The ATA for long token of the receiver.'];
          writable: true;
          optional: true;
        },
        {
          name: 'shortTokenAta';
          docs: ['The ATA for initial collateral token of the receiver.'];
          writable: true;
          optional: true;
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['The associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'callbackAuthority';
          docs: ['Callback authority.'];
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 97, 108, 108, 98, 97, 99, 107];
              },
            ];
          };
        },
        {
          name: 'callbackProgram';
          docs: ['Callback program.'];
          optional: true;
        },
        {
          name: 'callbackSharedDataAccount';
          docs: ['Config account for callback.'];
          writable: true;
          optional: true;
        },
        {
          name: 'callbackPartitionedDataAccount';
          docs: ['Action stats account for callback.'];
          writable: true;
          optional: true;
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'reason';
          type: 'string';
        },
      ];
    },
    {
      name: 'closeShift';
      docs: [
        'Close a shift, either by the owner or by keepers.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](CloseShift)*',
        '',
        '# Arguments',
        '- `reason`: The reason for closing the shift.',
        '',
        '# Errors',
        '- The [`executor`](CloseShift::executor) must be a signer, and either the owner or have',
        'the ORDER_KEEPER role.',
        '- The [`store`](CloseShift::store) must be initialized.',
        '- The [`owner`](CloseShift::owner) must be the owner of the shift.',
        '- The [`shift`](CloseShift::shift) must be initialized and owned by both the `store` and',
        '`owner`.',
        '- The [`from_market_token`](CloseShift::from_market_token) and',
        '[`to_market_token`](CloseShift::to_market_token) must be valid and match those recorded',
        'in the [`shift`](CloseShift::shift).',
        '- The [`from_market_token_escrow`](CloseShift::from_market_token_escrow) and',
        '[`to_market_token_escrow`](CloseShift::to_market_token_escrow) must be valid escrow',
        'accounts owned by the `shift` and match those recorded in the [`shift`](CloseShift::shift).',
        '- The address of the [`from_market_token_ata`](CloseShift::from_market_token_ata) must match',
        'the derived associated token account address for the `from_market_token` and `owner`.',
        '- The address of the [`to_market_token_ata`](CloseShift::to_market_token_ata) must match',
        'the derived associated token account address for the `to_market_token` and `owner`.',
        '- If the `executor` is not the `owner`, the `shift` must be in either cancelled or completed',
        'state.',
      ];
      discriminator: [153, 180, 40, 133, 195, 210, 196, 99];
      accounts: [
        {
          name: 'executor';
          docs: ['The executor of this instruction.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store.'];
        },
        {
          name: 'storeWallet';
          docs: ['The store wallet.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  115,
                  116,
                  111,
                  114,
                  101,
                  95,
                  119,
                  97,
                  108,
                  108,
                  101,
                  116,
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
          name: 'owner';
          docs: ['The owner of the shift.'];
          writable: true;
        },
        {
          name: 'receiver';
          docs: ['The receiver of the shift.'];
          writable: true;
        },
        {
          name: 'shift';
          docs: ['The shift to close.'];
          writable: true;
        },
        {
          name: 'fromMarketToken';
          docs: ['From market token.'];
        },
        {
          name: 'toMarketToken';
          docs: ['To market token.'];
        },
        {
          name: 'fromMarketTokenEscrow';
          docs: ['The escrow account for the from market tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'shift';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'fromMarketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'toMarketTokenEscrow';
          docs: ['The escrow account for the to market tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'shift';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'toMarketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'fromMarketTokenAta';
          docs: ['The ATA for from market token of the owner.'];
          writable: true;
        },
        {
          name: 'toMarketTokenAta';
          docs: ['The ATA for to market token of the receiver.'];
          writable: true;
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['The associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'reason';
          type: 'string';
        },
      ];
    },
    {
      name: 'closeWithdrawal';
      docs: [
        'Close a withdrawal, either by the owner or by keepers.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](CloseWithdrawal)*',
        '',
        '# Arguments',
        '- `reason`: The reason for closing the withdrawal.',
        '',
        '# Errors',
        'This instruction will fail if:',
        '- The [`executor`](CloseWithdrawal::executor) is not a signer or is neither the withdrawal',
        'owner nor an ORDER_KEEPER in the store.',
        '- The [`store`](CloseWithdrawal::store) is not properly initialized.',
        '- The [`owner`](CloseWithdrawal::owner) does not match the withdrawal owner.',
        '- The token mint accounts do not match those recorded in the `withdrawal`.',
        '- The [`withdrawal`](CloseWithdrawal::withdrawal) is not initialized, not owned by the store,',
        'or not owned by the specified `owner`.',
        '- Any required escrow accounts are not properly initialized or not owned by the `withdrawal`.',
        '- Any associated token accounts have invalid addresses.',
        '- The withdrawal is not in a cancelled or completed state when the executor is not the owner',
      ];
      discriminator: [7, 60, 160, 163, 23, 241, 178, 246];
      accounts: [
        {
          name: 'executor';
          docs: ['The executor of this instruction.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store.'];
        },
        {
          name: 'storeWallet';
          docs: ['The store wallet.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  115,
                  116,
                  111,
                  114,
                  101,
                  95,
                  119,
                  97,
                  108,
                  108,
                  101,
                  116,
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
          name: 'owner';
          docs: ['The owner of the withdrawal.'];
          writable: true;
        },
        {
          name: 'receiver';
          docs: ['The receiver of the withdrawal.'];
          writable: true;
        },
        {
          name: 'marketToken';
          docs: ['Market token.'];
        },
        {
          name: 'finalLongToken';
          docs: ['Final long token.'];
        },
        {
          name: 'finalShortToken';
          docs: ['Final short token.'];
        },
        {
          name: 'withdrawal';
          docs: ['The withdrawal to close.'];
          writable: true;
        },
        {
          name: 'marketTokenEscrow';
          docs: ['The escrow account for receiving market tokens to burn.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'withdrawal';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'marketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'finalLongTokenEscrow';
          docs: [
            'The escrow account for receiving withdrawn final long tokens.',
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'withdrawal';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'finalLongToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'finalShortTokenEscrow';
          docs: [
            'The escrow account for receiving withdrawn final short tokens.',
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'withdrawal';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'finalShortToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'marketTokenAta';
          docs: ['The ATA for market token of the owner.'];
          writable: true;
        },
        {
          name: 'finalLongTokenAta';
          docs: ['The ATA for final long token of the receiver.'];
          writable: true;
        },
        {
          name: 'finalShortTokenAta';
          docs: ['The ATA for final short token of the receiver.'];
          writable: true;
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['The associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'reason';
          type: 'string';
        },
      ];
    },
    {
      name: 'confirmGtExchangeVault';
      docs: [
        'Confirm GT exchange vault.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](ConfirmGtExchangeVault)*',
        '',
        '# Errors',
        '- The [`authority`](ConfirmGtExchangeVault::authority) must be a signer and have the GT_CONTROLLER role in the `store`.',
        '- The [`store`](ConfirmGtExchangeVault::store) must be properly initialized.',
        '- The GT state of the `store` must be initialized.',
        '- The [`vault`](ConfirmGtExchangeVault::vault) must be validly initialized and owned by',
        'the `store`.',
        '- The `vault` must be in a confirmable state (deposit window has passed but not yet confirmed).',
      ];
      discriminator: [128, 248, 235, 107, 86, 76, 2, 170];
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
          relations: ['vault'];
        },
        {
          name: 'vault';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
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
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'vault';
              },
              {
                kind: 'account';
                path: 'vault';
              },
            ];
          };
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [];
    },
    {
      name: 'confirmGtExchangeVaultV2';
      docs: [
        'Confirm GT exchange vault.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](ConfirmGtExchangeVault)*',
        '',
        '# Errors',
        '- The [`authority`](ConfirmGtExchangeVault::authority) must be a signer and have the GT_CONTROLLER role in the `store`.',
        '- The [`store`](ConfirmGtExchangeVault::store) must be properly initialized.',
        '- The GT state of the `store` must be initialized.',
        '- The [`vault`](ConfirmGtExchangeVault::vault) must be validly initialized and owned by',
        'the `store`.',
        '- The `vault` must be in a confirmable state (deposit window has passed but not yet confirmed).',
      ];
      discriminator: [248, 171, 118, 202, 159, 186, 236, 43];
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
          relations: ['vault'];
        },
        {
          name: 'vault';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
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
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'vault';
              },
              {
                kind: 'account';
                path: 'vault';
              },
            ];
          };
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'buybackValue';
          type: 'u128';
        },
        {
          name: 'buybackPrice';
          type: {
            option: 'u128';
          };
        },
      ];
    },
    {
      name: 'createDeposit';
      docs: [
        'Create a deposit by the owner.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](CreateDeposit)*',
        '',
        '# Arguments',
        '- `nonce`: Nonce bytes used to derive the deposit account address.',
        '- `params`: Parameters specifying the deposit details.',
        '',
        '# Errors',
        'This instruction will fail if:',
        '- The [`owner`](CreateDeposit::owner) is not a signer or has insufficient balance',
        'for the execution fee and rent.',
        '- The [`store`](CreateDeposit::store) is not properly initialized.',
        '- The [`market`](CreateDeposit::market) is not initialized, not owned by the store,',
        'or is disabled.',
        '- The [`deposit`](CreateDeposit::deposit) account is already initialized or is not',
        'a valid PDA derived from the provided nonce and other expected seeds.',
        '- The [`market_token`](CreateDeposit::market_token) is not the market token of `market`.',
        '- Any required escrow account is not properly initialized or owned by the `deposit`.',
        '- Any source account has insufficient balance, does not match the initial tokens, or the',
        '`owner` does not have the permission to transfer the tokens.',
        '- The remaining accounts do not form valid swap paths or reference disabled markets.',
      ];
      discriminator: [157, 30, 11, 129, 16, 166, 115, 75];
      accounts: [
        {
          name: 'owner';
          docs: ['The owner of the deposit.'];
          writable: true;
          signer: true;
        },
        {
          name: 'receiver';
          docs: ['The receiver of the output funds.'];
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['market'];
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
        {
          name: 'deposit';
          docs: ['The deposit to be created.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [100, 101, 112, 111, 115, 105, 116];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
              },
              {
                kind: 'arg';
                path: 'nonce';
              },
            ];
          };
        },
        {
          name: 'marketToken';
          docs: ['Market token.'];
        },
        {
          name: 'initialLongToken';
          docs: ['Initial long token.'];
          optional: true;
        },
        {
          name: 'initialShortToken';
          docs: ['initial short token.'];
          optional: true;
        },
        {
          name: 'marketTokenEscrow';
          docs: ['The escrow account for receiving market tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'deposit';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'marketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'initialLongTokenEscrow';
          docs: [
            'The escrow account for receiving initial long token for deposit.',
          ];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'deposit';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'initialLongToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'initialShortTokenEscrow';
          docs: [
            'The escrow account for receiving initial short token for deposit.',
          ];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'deposit';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'initialShortToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'marketTokenAta';
          docs: ['The ATA of the owner for receiving market tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'receiver';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'marketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'initialLongTokenSource';
          docs: ['The source initial long token account.'];
          writable: true;
          optional: true;
        },
        {
          name: 'initialShortTokenSource';
          docs: ['The source initial short token account.'];
          writable: true;
          optional: true;
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['The associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
      ];
      args: [
        {
          name: 'nonce';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'params';
          type: {
            defined: {
              name: 'createDepositParams';
            };
          };
        },
      ];
    },
    {
      name: 'createGlvDeposit';
      docs: [
        'Create GLV deposit.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](CreateGlvDeposit)*',
        '',
        '# Arguments',
        '- `nonce`: A 32-byte used to derive the address of the GLV deposit.',
        '- `params`: The parameters for creating the GLV deposit.',
        '',
        '# Errors',
        '- The [`owner`](CreateGlvDeposit::owner) must be a signer and have sufficient balance',
        'for the execution fee and rent.',
        '- The [`store`](CreateGlvDeposit::store) must be properly initialized.',
        '- The [`market`](CreateGlvDeposit::market) must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- Listed in the [`glv`](CreateGlvDeposit::glv)',
        '- The [`glv`](CreateGlvDeposit::glv) must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- The [`glv_deposit`](CreateGlvDeposit::glv_deposit) must be:',
        '- Uninitialized',
        '- Address must be PDA derived from the SEED of [`GlvDeposit`](states::GlvDeposit),',
        '[`store`](CreateGlvDeposit::store), [`owner`](CreateGlvDeposit::owner) and `nonce`',
        '- The [`glv_token`](CreateGlvDeposit::glv_token) must be:',
        '- Properly initialized',
        '- Correspond to the provided [`glv`](CreateGlvDeposit::glv)',
        '- The [`market_token`](CreateGlvDeposit::market_token) must be:',
        '- Properly initialized',
        '- Correspond to the provided [`market`](CreateGlvDeposit::market)',
        '- Token mint account requirements:',
        '- [`initial_long_token`](CreateGlvDeposit::initial_long_token) must be provided if initial long amount > 0',
        '- [`initial_short_token`](CreateGlvDeposit::initial_short_token) must be provided if initial short amount > 0',
        '- Escrow account requirements:',
        '- [`glv_token_escrow`](CreateGlvDeposit::glv_token_escrow) must be:',
        '- Owned by the [`glv_deposit`](CreateGlvDeposit::glv_deposit)',
        '- Other escrow accounts must be:',
        '- Provided for any non-zero initial token amounts',
        '- Owned by the [`glv_deposit`](CreateGlvDeposit::glv_deposit)',
        '- Source token account requirements:',
        '- Must be provided for any non-zero initial token amounts',
        '- Must have sufficient balance',
        '- Must have the `owner` as its authority',
        '- All token programs must match their corresponding token accounts',
      ];
      discriminator: [170, 67, 137, 159, 159, 116, 48, 86];
      accounts: [
        {
          name: 'owner';
          docs: ['The owner of the deposit.'];
          writable: true;
          signer: true;
        },
        {
          name: 'receiver';
          docs: ['The receiver of the output funds.'];
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['market', 'glv'];
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
        {
          name: 'glv';
          docs: ['GLV.'];
        },
        {
          name: 'glvDeposit';
          docs: ['GLV deposit.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [103, 108, 118, 95, 100, 101, 112, 111, 115, 105, 116];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
              },
              {
                kind: 'arg';
                path: 'nonce';
              },
            ];
          };
        },
        {
          name: 'glvToken';
          docs: ['GLV Token.'];
        },
        {
          name: 'marketToken';
          docs: ['Market token.'];
        },
        {
          name: 'initialLongToken';
          docs: ['Initial long token.'];
          optional: true;
        },
        {
          name: 'initialShortToken';
          docs: ['initial short token.'];
          optional: true;
        },
        {
          name: 'marketTokenSource';
          docs: ['The source market token account.'];
          writable: true;
          optional: true;
        },
        {
          name: 'initialLongTokenSource';
          docs: ['The source initial long token account.'];
          writable: true;
          optional: true;
        },
        {
          name: 'initialShortTokenSource';
          docs: ['The source initial short token account.'];
          writable: true;
          optional: true;
        },
        {
          name: 'glvTokenEscrow';
          docs: ['The escrow account for GLV tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvDeposit';
              },
              {
                kind: 'account';
                path: 'glvTokenProgram';
              },
              {
                kind: 'account';
                path: 'glvToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'marketTokenEscrow';
          docs: ['The escrow account for market tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvDeposit';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'marketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'initialLongTokenEscrow';
          docs: ['The escrow account for initial long tokens.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvDeposit';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'initialLongToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'initialShortTokenEscrow';
          docs: ['The escrow account for initial short tokens.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvDeposit';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'initialShortToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'glvTokenProgram';
          docs: ['The token program for GLV token.'];
          address: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['The associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
      ];
      args: [
        {
          name: 'nonce';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'params';
          type: {
            defined: {
              name: 'createGlvDepositParams';
            };
          };
        },
      ];
    },
    {
      name: 'createGlvShift';
      docs: [
        'Create GLV shift.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](CreateGlvShift)*',
        '',
        '# Arguments',
        '- `nonce`: A 32-byte used to derive the address of the GLV shift.',
        '- `params`: The parameters for creating the GLV shift.',
        '',
        '# Errors',
        '- The [`authority`](CreateGlvShift::authority) must be:',
        '- A signer',
        '- A `ORDER_KEEPER` in the `store`',
        '- The [`store`](CreateGlvShift::store) must be properly initialized',
        '- The [`glv`](CreateGlvShift::glv) must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- Market requirements:',
        '- [`from_market`](CreateGlvShift::from_market) must be:',
        '- Enabled',
        '- Owned by the `store`',
        '- One of the markets in the [`glv`](CreateGlvShift::glv)',
        '- [`to_market`](CreateGlvShift::to_market) must be:',
        '- Enabled',
        '- Owned by the `store`',
        '- One of the markets in the [`glv`](CreateGlvShift::glv)',
        '- Different from `from_market`',
        '- The [`glv_shift`](CreateGlvShift::glv_shift) must be:',
        '- Uninitialized',
        '- PDA derived from the SEED of [`GlvShift`](states::GlvShift), `store`, `glv`, and `nonce`',
        '- Token requirements:',
        '- [`from_market_token`](CreateGlvShift::from_market_token) must be:',
        '- Properly initialized',
        '- The market token of `from_market`',
        '- [`to_market_token`](CreateGlvShift::to_market_token) must be:',
        '- Properly initialized',
        '- The market token of `to_market`',
        '- Vault requirements:',
        '- [`from_market_token_vault`](CreateGlvShift::from_market_token_vault) must be:',
        '- The market token vault for `from_market_token` in the [`glv`](CreateGlvShift::glv)',
        '- Owned by the [`glv`](CreateGlvShift::glv)',
        '- [`to_market_token_vault`](CreateGlvShift::to_market_token_vault) must be:',
        '- The market token vault for `to_market_token` in the [`glv`](CreateGlvShift::glv)',
        '- Owned by the [`glv`](CreateGlvShift::glv)',
      ];
      discriminator: [242, 58, 88, 205, 167, 198, 75, 253];
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
          relations: ['glv', 'fromMarket', 'toMarket'];
        },
        {
          name: 'glv';
          docs: ['GLV.'];
          writable: true;
        },
        {
          name: 'fromMarket';
          docs: ['From market.'];
          writable: true;
        },
        {
          name: 'toMarket';
          docs: ['To market.'];
          writable: true;
        },
        {
          name: 'glvShift';
          docs: ['GLV shift.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [115, 104, 105, 102, 116];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'authority';
              },
              {
                kind: 'arg';
                path: 'nonce';
              },
            ];
          };
        },
        {
          name: 'fromMarketToken';
          docs: ['From market token.'];
        },
        {
          name: 'toMarketToken';
          docs: ['To market token.'];
        },
        {
          name: 'fromMarketTokenVault';
          docs: ['Vault for from market tokens.'];
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glv';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'fromMarketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'toMarketTokenVault';
          docs: ['Vault for to market tokens.'];
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glv';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'toMarketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['The associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
      ];
      args: [
        {
          name: 'nonce';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'params';
          type: {
            defined: {
              name: 'createShiftParams';
            };
          };
        },
      ];
    },
    {
      name: 'createGlvWithdrawal';
      docs: [
        'Create GLV withdrawal.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](CreateGlvWithdrawal)*',
        '',
        '# Arguments',
        '- `nonce`: A 32-byte used to derive the address of the GLV withdrawal.',
        '- `params`: The parameters for creating the GLV withdrawal.',
        '',
        '# Errors',
        '- The [`owner`](CreateGlvWithdrawal::owner) must be a signer and have sufficient balance',
        'for the execution fee and rent.',
        '- The [`store`](CreateGlvWithdrawal::store) must be properly initialized.',
        '- The [`market`](CreateGlvWithdrawal::market) must be:',
        '- Properly initialized',
        '- Enabled',
        '- Owned by the `store`',
        '- One of the markets in the [`glv`](CreateGlvWithdrawal::glv)',
        '- The [`glv`](CreateGlvWithdrawal::glv) must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- The [`glv_withdrawal`](CreateGlvWithdrawal::glv_withdrawal) must be:',
        '- Uninitialized',
        '- A PDA derived from:',
        '- the SEED of [`GlvWithdrawal`](states::GlvWithdrawal)',
        '- [`store`](CreateGlvWithdrawal::store)',
        '- [`owner`](CreateGlvWithdrawal::owner)',
        '- `nonce`',
        '- Token requirements:',
        '- [`glv_token`](CreateGlvWithdrawal::glv_token) must be:',
        '- Properly initialized',
        '- The GLV token of the [`glv`](CreateGlvWithdrawal::glv)',
        '- [`market_token`](CreateGlvWithdrawal::market_token) must be:',
        '- Properly initialized',
        '- The market token of the [`market`](CreateGlvWithdrawal::market)',
        '- All other tokens must be properly initialized',
        '- Source requirements:',
        '- [`glv_token_source`](CreateGlvWithdrawal::glv_token_source) must be:',
        '- Properly initialized',
        '- A GLV token account',
        '- Have sufficient balance',
        '- Have the `owner` as its authority',
        '- Escrow requirements:',
        '- Must correspond to their respective tokens',
        '- Must be owned by the [`glv_withdrawal`](CreateGlvWithdrawal::glv_withdrawal)',
        '- All token programs must match their corresponding token accounts',
      ];
      discriminator: [25, 224, 16, 45, 95, 39, 208, 35];
      accounts: [
        {
          name: 'owner';
          docs: ['Owner.'];
          writable: true;
          signer: true;
        },
        {
          name: 'receiver';
          docs: ['The receiver of the output funds.'];
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['market', 'glv'];
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
        {
          name: 'glv';
          docs: ['GLV.'];
        },
        {
          name: 'glvWithdrawal';
          docs: ['GLV withdrawal.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  103,
                  108,
                  118,
                  95,
                  119,
                  105,
                  116,
                  104,
                  100,
                  114,
                  97,
                  119,
                  97,
                  108,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
              },
              {
                kind: 'arg';
                path: 'nonce';
              },
            ];
          };
        },
        {
          name: 'glvToken';
          docs: ['GLV Token.'];
        },
        {
          name: 'marketToken';
          docs: ['Market token.'];
        },
        {
          name: 'finalLongToken';
          docs: ['Final long token.'];
        },
        {
          name: 'finalShortToken';
          docs: ['Final short token.'];
        },
        {
          name: 'glvTokenSource';
          docs: ['The source GLV token account.'];
          writable: true;
        },
        {
          name: 'glvTokenEscrow';
          docs: ['The escrow account for GLV tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvWithdrawal';
              },
              {
                kind: 'account';
                path: 'glvTokenProgram';
              },
              {
                kind: 'account';
                path: 'glvToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'marketTokenEscrow';
          docs: ['The escrow account for market tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvWithdrawal';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'marketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'finalLongTokenEscrow';
          docs: ['The escrow account for long tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvWithdrawal';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'finalLongToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'finalShortTokenEscrow';
          docs: ['The escrow account for short tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvWithdrawal';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'finalShortToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'glvTokenProgram';
          docs: ['The token program for GLV token.'];
          address: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['The associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
      ];
      args: [
        {
          name: 'nonce';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'params';
          type: {
            defined: {
              name: 'createGlvWithdrawalParams';
            };
          };
        },
      ];
    },
    {
      name: 'createOrder';
      docs: [
        'Create an order by the owner.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](CreateOrder)*',
        '',
        '# Arguments',
        '- `nonce`: Nonce bytes used to derive the address for the order.',
        '- `params`: Order Parameters specifying the market, order kind, and other details.',
        '',
        '# Errors',
        'This instruction will fail if:',
        '- The [`owner`](CreateOrder::owner) is not a signer or has insufficient balance for the',
        'execution fee and rent.',
        '- The [`store`](CreateOrder::store) is not properly initialized.',
        '- The [`market`](CreateOrder::market) is not initialized, is disabled, or not owned by',
        'the `store`.',
        '- The [`user`](CreateOrder::user) is not initialized or does not correspond to the owner.',
        'The address must be a valid PDA derived from the `owner` and expected seeds.',
        '- The [`order`](CreateOrder::order) is not uninitialized or the address is not a valid',
        'PDA derived from the `owner`, `nonce` and expected seeds.',
        '- For increase/decrease orders:',
        '- The [`position`](CreateOrder::position) is missing, not validly initialized, or not',
        'owned by both the `owner` and `store`.',
        '- The [`long_token`](CreateOrder::long_token) or [`short_token`](CreateOrder::short_token)',
        'are missing, or do not match the those defined in the [`market`](CreateOrder::market).',
        '- The [`long_token_escrow`](CreateOrder::long_token_escrow) or',
        '[`short_token_escrow`](CreateOrder::short_token_escrow) are missing, not valid',
        'escrow accounts for `long_token` or `short_token` respectively, or not owned by the `order`.',
        '- For increase/swap orders:',
        '- The [`initial_collateral_token`](CreateOrder::initial_collateral_token) is missing',
        'or invalid.',
        '- The [`initial_collateral_token_escrow`](CreateOrder::initial_collateral_token_escrow)',
        'is missing, not a valid escrow account for `initial_collateral_token`, or not owned by',
        'the `order`.',
        '- The [`initial_collateral_token_source`](CreateOrder::initial_collateral_token_source)',
        'is missing or not a valid source account with `owner` as the authority.',
        '- For decrease/swap orders:',
        '- The [`final_output_token`](CreateOrder::final_output_token) is invalid.',
        '- The [`final_output_token_escrow`](CreateOrder::final_output_token_escrow) is missing,',
        'not a valid escrow account for `final_output_token`, or not owned by the `order`.',
        '- The feature for creating this kind of order is not enabled.',
        '- The remaining market accounts do not match the swap parameters, not all enabled or owned',
        'by the `store`.',
        '',
        '# Notes',
        '- Unlike [`create_order_v2`], this instruction cannot emit a CPI Event due to the lack of required accounts for CPI.',
        'As a result, it does not guarantee that an order will always have a corresponding `OrderUpdated` event.',
      ];
      discriminator: [141, 54, 37, 207, 237, 210, 250, 215];
      accounts: [
        {
          name: 'owner';
          docs: ['The owner of the order to be created.'];
          writable: true;
          signer: true;
          relations: ['user', 'position'];
        },
        {
          name: 'receiver';
          docs: ['The receiver of the output funds.'];
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['market', 'user', 'position'];
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
        {
          name: 'user';
          docs: ['User Account.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
              },
            ];
          };
        },
        {
          name: 'order';
          docs: ['The order to be created.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [111, 114, 100, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
              },
              {
                kind: 'arg';
                path: 'nonce';
              },
            ];
          };
        },
        {
          name: 'position';
          docs: ['The related position.'];
          writable: true;
          optional: true;
        },
        {
          name: 'initialCollateralToken';
          docs: [
            'Initial collateral token / swap in token.',
            'Only required by increase and swap orders.',
          ];
          optional: true;
        },
        {
          name: 'finalOutputToken';
          docs: [
            'Final output token.',
            'Used as collateral token / swap out token for increase and swap orders;',
            'and used as final output token for decrease orders.',
            '',
            'For the case of increase or swap orders, it will be checked to be a valid',
            'collateral / swap out token.',
          ];
        },
        {
          name: 'longToken';
          docs: ['Long token of the market.'];
          optional: true;
        },
        {
          name: 'shortToken';
          docs: ['Short token of the market.'];
          optional: true;
        },
        {
          name: 'initialCollateralTokenEscrow';
          docs: [
            'Initial collateral token escrow account.',
            'Only required by increase and swap orders.',
          ];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'initialCollateralToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'finalOutputTokenEscrow';
          docs: [
            'Final output token escrow account.',
            'Only required by decrease and swap orders.',
          ];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'finalOutputToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'longTokenEscrow';
          docs: [
            'Long token escrow.',
            'Only required by increase and decrease orders.',
          ];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'longToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'shortTokenEscrow';
          docs: [
            'Short token escrow.',
            'Only required by increase and decrease orders.',
          ];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'shortToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'initialCollateralTokenSource';
          docs: [
            'The source initial token account.',
            'Only required by increase and swap orders.',
          ];
          writable: true;
          optional: true;
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['The associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
      ];
      args: [
        {
          name: 'nonce';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'params';
          type: {
            defined: {
              name: 'createOrderParams';
            };
          };
        },
      ];
    },
    {
      name: 'createOrderV2';
      docs: [
        'Create an order by the owner.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](CreateOrderV2)*',
        '',
        '# Arguments',
        '- `nonce`: Nonce bytes used to derive the address for the order.',
        '- `params`: Order Parameters specifying the market, order kind, and other details.',
        '',
        '# Errors',
        'This instruction will fail if:',
        '- The [`owner`](CreateOrderV2::owner) is not a signer or has insufficient balance for the',
        'execution fee and rent.',
        '- The [`store`](CreateOrderV2::store) is not properly initialized.',
        '- The [`market`](CreateOrderV2::market) is not initialized, is disabled, or not owned by',
        'the `store`.',
        '- The [`user`](CreateOrderV2::user) is not initialized or does not correspond to the owner.',
        'The address must be a valid PDA derived from the `owner` and expected seeds.',
        '- The [`order`](CreateOrderV2::order) is not uninitialized or the address is not a valid',
        'PDA derived from the `owner`, `nonce` and expected seeds.',
        '- For increase/decrease orders:',
        '- The [`position`](CreateOrderV2::position) is missing, not validly initialized, or not',
        'owned by both the `owner` and `store`.',
        '- The [`long_token`](CreateOrderV2::long_token) or [`short_token`](CreateOrderV2::short_token)',
        'are missing, or do not match the those defined in the [`market`](CreateOrderV2::market).',
        '- The [`long_token_escrow`](CreateOrderV2::long_token_escrow) or',
        '[`short_token_escrow`](CreateOrderV2::short_token_escrow) are missing, not valid',
        'escrow accounts for `long_token` or `short_token` respectively, or not owned by the `order`.',
        '- For increase/swap orders:',
        '- The [`initial_collateral_token`](CreateOrderV2::initial_collateral_token) is missing',
        'or invalid.',
        '- The [`initial_collateral_token_escrow`](CreateOrderV2::initial_collateral_token_escrow)',
        'is missing, not a valid escrow account for `initial_collateral_token`, or not owned by',
        'the `order`.',
        '- The [`initial_collateral_token_source`](CreateOrderV2::initial_collateral_token_source)',
        'is missing or not a valid source account with `owner` as the authority.',
        '- For decrease/swap orders:',
        '- The [`final_output_token`](CreateOrderV2::final_output_token) is invalid.',
        '- The [`final_output_token_escrow`](CreateOrderV2::final_output_token_escrow) is missing,',
        'not a valid escrow account for `final_output_token`, or not owned by the `order`.',
        '- The feature for creating this kind of order is not enabled.',
        '- The remaining market accounts do not match the swap parameters, not all enabled or owned',
        'by the `store`.',
        '- The accounts related to callback must be provided if',
        '[`callback_authority`](CreateOrderV2::callback_authority) is provided.',
      ];
      discriminator: [200, 157, 3, 182, 3, 164, 162, 240];
      accounts: [
        {
          name: 'owner';
          docs: ['The owner of the order to be created.'];
          writable: true;
          signer: true;
          relations: ['user', 'position'];
        },
        {
          name: 'receiver';
          docs: ['The receiver of the output funds.'];
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['market', 'user', 'position'];
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
        {
          name: 'user';
          docs: ['User Account.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
              },
            ];
          };
        },
        {
          name: 'order';
          docs: ['The order to be created.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [111, 114, 100, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
              },
              {
                kind: 'arg';
                path: 'nonce';
              },
            ];
          };
        },
        {
          name: 'position';
          docs: ['The related position.'];
          writable: true;
          optional: true;
        },
        {
          name: 'initialCollateralToken';
          docs: [
            'Initial collateral token / swap in token.',
            'Only required by increase and swap orders.',
          ];
          optional: true;
        },
        {
          name: 'finalOutputToken';
          docs: [
            'Final output token.',
            'Used as collateral token / swap out token for increase and swap orders;',
            'and used as final output token for decrease orders.',
            '',
            'For the case of increase or swap orders, it will be checked to be a valid',
            'collateral / swap out token.',
          ];
        },
        {
          name: 'longToken';
          docs: ['Long token of the market.'];
          optional: true;
        },
        {
          name: 'shortToken';
          docs: ['Short token of the market.'];
          optional: true;
        },
        {
          name: 'initialCollateralTokenEscrow';
          docs: [
            'Initial collateral token escrow account.',
            'Only required by increase and swap orders.',
          ];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'initialCollateralToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'finalOutputTokenEscrow';
          docs: [
            'Final output token escrow account.',
            'Only required by decrease and swap orders.',
          ];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'finalOutputToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'longTokenEscrow';
          docs: [
            'Long token escrow.',
            'Only required by increase and decrease orders.',
          ];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'longToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'shortTokenEscrow';
          docs: [
            'Short token escrow.',
            'Only required by increase and decrease orders.',
          ];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'shortToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'initialCollateralTokenSource';
          docs: [
            'The source initial token account.',
            'Only required by increase and swap orders.',
          ];
          writable: true;
          optional: true;
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['The associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'callbackAuthority';
          docs: ['Callback authority.'];
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 97, 108, 108, 98, 97, 99, 107];
              },
            ];
          };
        },
        {
          name: 'callbackProgram';
          docs: ['Callback program.'];
          optional: true;
        },
        {
          name: 'callbackSharedDataAccount';
          docs: ['Config account for callback.'];
          writable: true;
          optional: true;
        },
        {
          name: 'callbackPartitionedDataAccount';
          docs: ['Action stats account for callback.'];
          writable: true;
          optional: true;
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'nonce';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'params';
          type: {
            defined: {
              name: 'createOrderParams';
            };
          };
        },
        {
          name: 'callbackVersion';
          type: {
            option: 'u8';
          };
        },
      ];
    },
    {
      name: 'createShift';
      docs: [
        'Create a shift by the owner.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](CreateShift)*',
        '',
        '# Arguments',
        "- `nonce`: The nonce used to derive the shift's PDA address.",
        '- `params`: The parameters for creating the shift.',
        '',
        '# Errors',
        '- The [`owner`](CreateShift::owner) must be a signer and have sufficient balance for the',
        'execution fee and rent.',
        '- The [`store`](CreateShift::store) must be initialized.',
        '- The [`from_market`](CreateShift::from_market) must be initialized, enabled',
        'and store-owned.',
        '- The [`to_market`](CreateShift::to_market) must be initialized, enabled',
        'and store-owned.',
        '- The [`from_market`](CreateShift::from_market) must be shiftable to the',
        '[`to_market`](CreateShift::to_market).',
        '- The [`shift`](CreateShift::shift) must be uninitialized. Its address must',
        'match the PDA derived from the expected seeds.',
        '- The [`from_market_token`](CreateShift::from_market_token) must be the market',
        'token of the [`from_market`](CreateShift::from_market).',
        '- The [`to_market_token`](CreateShift::to_market_token) must be the market',
        'token of the [`to_market`](CreateShift::to_market).',
        '- The [`from_market_token_escrow`](CreateShift::from_market_token_escrow) must',
        'be a valid shift-owned escrow account for the',
        '[`from_market_token`](CreateShift::from_market_token).',
        '- The [`to_market_token_escrow`](CreateShift::to_market_token_escrow) must be',
        'a valid shift-owned escrow account for the',
        '[`to_market_token`](CreateShift::to_market_token).',
        '- The [`from_market_token_source`](CreateShift::from_market_token_source) must',
        'be a token account for [`from_market_token`](CreateShift::from_market_token)',
        'with `owner` as authority.',
        '- The [`to_market_token_ata`](CreateShift::to_market_token_ata) must be a valid',
        'associated token account for [`to_market_token`](CreateShift::to_market_token)',
        'owned by `owner`.',
      ];
      discriminator: [43, 133, 161, 94, 253, 249, 13, 184];
      accounts: [
        {
          name: 'owner';
          docs: ['The owner.'];
          writable: true;
          signer: true;
        },
        {
          name: 'receiver';
          docs: ['The receiver of the output funds.'];
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['fromMarket', 'toMarket'];
        },
        {
          name: 'fromMarket';
          docs: ['From market.'];
          writable: true;
        },
        {
          name: 'toMarket';
          docs: ['To market.'];
        },
        {
          name: 'shift';
          docs: ['Shift.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [115, 104, 105, 102, 116];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
              },
              {
                kind: 'arg';
                path: 'nonce';
              },
            ];
          };
        },
        {
          name: 'fromMarketToken';
          docs: ['From market token.'];
        },
        {
          name: 'toMarketToken';
          docs: ['To market token.'];
        },
        {
          name: 'fromMarketTokenEscrow';
          docs: ['The escrow account for the from market tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'shift';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'fromMarketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'toMarketTokenEscrow';
          docs: ['The escrow account for the to market tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'shift';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'toMarketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'fromMarketTokenSource';
          docs: ['The source from market token account.'];
          writable: true;
        },
        {
          name: 'toMarketTokenAta';
          docs: ['The ATA for receiving to market tokens.'];
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'receiver';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'toMarketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['The associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
      ];
      args: [
        {
          name: 'nonce';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'params';
          type: {
            defined: {
              name: 'createShiftParams';
            };
          };
        },
      ];
    },
    {
      name: 'createWithdrawal';
      docs: [
        'Create a withdrawal by the owner.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](CreateWithdrawal)*',
        '',
        '# Arguments',
        '- `nonce`: Nonce bytes used to derive the address for the withdrawal.',
        '- `params`: Withdrawal Parameters containing the withdrawal configuration.',
        '',
        '# Errors',
        'This instruction will fail if:',
        '- The [`owner`](CreateWithdrawal::owner) is not a signer or has insufficient balance',
        'for the execution fee and rent.',
        '- The [`store`](CreateWithdrawal::store) is not properly initialized.',
        '- The [`market`](CreateWithdrawal::market) is not initialized, is disabled, or not owned',
        'by the store.',
        '- The [`withdrawal`](CreateWithdrawal::withdrawal) is already initialized or is not a valid',
        'PDA derived from the provided `nonce` and expected seeds.',
        '- The [`market_token`](CreateWithdrawal::market_token) does not match the market token',
        'of the specified market.',
        '- Any required escrow accounts are not properly initialized or not owned by the `withdrawal`.',
        '- The source market token account has insufficient balance, or the `owner` does not have the',
        'permission to transfer the tokens.',
        '- Any market accounts in the remaining accounts are disabled, not owned by the store,',
        'or do not form valid swap paths.',
      ];
      discriminator: [247, 103, 160, 95, 42, 161, 108, 91];
      accounts: [
        {
          name: 'owner';
          docs: ['The owner.'];
          writable: true;
          signer: true;
        },
        {
          name: 'receiver';
          docs: ['The receiver of the output funds.'];
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['market'];
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
        {
          name: 'withdrawal';
          docs: ['The withdrawal to be created.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [119, 105, 116, 104, 100, 114, 97, 119, 97, 108];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
              },
              {
                kind: 'arg';
                path: 'nonce';
              },
            ];
          };
        },
        {
          name: 'marketToken';
          docs: ['Market token.'];
        },
        {
          name: 'finalLongToken';
          docs: ['Final long token.'];
        },
        {
          name: 'finalShortToken';
          docs: ['Final short token.'];
        },
        {
          name: 'marketTokenEscrow';
          docs: ['The escrow account for receiving market tokens to burn.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'withdrawal';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'marketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'finalLongTokenEscrow';
          docs: [
            'The escrow account for receiving withdrawn final long tokens.',
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'withdrawal';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'finalLongToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'finalShortTokenEscrow';
          docs: [
            'The escrow account for receiving withdrawn final short tokens.',
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'withdrawal';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'finalShortToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'marketTokenSource';
          docs: ['The source market token account.'];
          writable: true;
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['The associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
      ];
      args: [
        {
          name: 'nonce';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'params';
          type: {
            defined: {
              name: 'createWithdrawalParams';
            };
          };
        },
      ];
    },
    {
      name: 'disableRole';
      docs: [
        'Disable an existing role for the given store.',
        '',
        "This instruction disables an existing role in the store's role configuration.",
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](DisableRole).*',
        '',
        '# Arguments',
        '- `role`: The name of the role to be disabled.',
        '',
        '# Errors',
        '- The [`authority`](DisableRole::authority) must be a signer and be the `ADMIN` of the store.',
        '- The [`store`](DisableRole::store) must be an initialized store account owned by the store program.',
        '- The `role` must be enabled.',
      ];
      discriminator: [211, 224, 245, 96, 179, 213, 176, 26];
      accounts: [
        {
          name: 'authority';
          docs: ['The caller of this instruction.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store account for which the role is to be disabled.'];
          writable: true;
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
      name: 'enableRole';
      docs: [
        'Insert or enable a role for the given store.',
        '',
        "This instruction adds a new role or enables an existing disabled role in the store's role configuration.",
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](EnableRole).*',
        '',
        '# Arguments',
        '- `role`: The name of the role to be added/enabled. The length cannot exceed',
        '[`MAX_ROLE_NAME_LEN`](states::roles::MAX_ROLE_NAME_LEN).',
        '',
        '# Errors',
        '- The [`authority`](EnableRole::authority) must be a signer and be the `ADMIN` of the store.',
        '- The [`store`](EnableRole::store) must be an initialized store account owned by the store program.',
        '- The `role` name length must not exceed [`MAX_ROLE_NAME_LEN`](states::roles::MAX_ROLE_NAME_LEN).',
        '- The `role` must not be already enabled.',
      ];
      discriminator: [154, 1, 249, 148, 155, 80, 118, 115];
      accounts: [
        {
          name: 'authority';
          docs: ['The caller of this instruction.'];
          signer: true;
        },
        {
          name: 'store';
          docs: [
            'The store account for which the role is to be added/enabled.',
          ];
          writable: true;
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
      name: 'executeDecreaseOrder';
      docs: [
        'Execute a decrease order by keepers.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](ExecuteDecreaseOrder)*',
        '',
        '# Arguments',
        '- `recent_timestamp`: A timestamp that must be within a recent time window.',
        '- `execution_fee`: The execution fee claimed to be used by the keeper.',
        '- `throw_on_execution_error`: If true, throws an error if order execution fails. If false,',
        'silently cancels the order on execution failure.',
        '',
        '# Errors',
        '- The [`authority`](ExecuteDecreaseOrder::authority) must be a signer with the ORDER_KEEPER',
        'role in the `store`.',
        '- The [`store`](ExecuteDecreaseOrder::store) must be initialized.',
        '- The [`token_map`](ExecuteDecreaseOrder::token_map) must be initialized and authorized',
        'by the `store`.',
        '- The [`oracle`](ExecuteDecreaseOrder::oracle) must be initialized, cleared and owned',
        'by the `store`.',
        '- The [`market`](ExecuteDecreaseOrder::market) must be initialized, enabled and owned',
        'by the `store`.',
        '- The [`owner`](ExecuteDecreaseOrder::owner) must be the owner of the `order`.',
        '- The [`user`](ExecuteDecreaseOrder::user) must be initialized and associated with',
        'the `owner`.',
        '- The [`order`](ExecuteDecreaseOrder::order) must be:',
        '- Initialized and owned by both the `store` and `owner`',
        '- Associated with the provided `market`',
        '- In the pending state',
        '- The [`position`](ExecuteDecreaseOrder::position) must exist and be validly owned',
        'by the `owner` and `store`. It must match the `order`.',
        '- The [`event`](ExecuteDecreaseOrder::event) must be a valid trade event buffer',
        'owned by both the `store` and `authority`.',
        '- The tokens must match those recorded in the `order`.',
        '- All escrow accounts must be valid, recorded in the `order` and owned by the `order`.',
        '- All vault accounts must be valid market vault accounts and owned by the `store`.',
        '- All claimable token accounts must be valid and properly delegated to their owners.',
        '- The remaining accounts must be valid. See the documentation for the accounts for more',
        'details.',
        '- The feature for executing decrease orders must be enabled in the `store`.',
        '- If `throw_on_execution_error` is true, any execution failure will throw an error.',
      ];
      discriminator: [41, 200, 147, 14, 250, 225, 79, 134];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
          relations: ['event'];
        },
        {
          name: 'store';
          docs: ['Store.'];
          writable: true;
          relations: ['tokenMap', 'oracle', 'market', 'user', 'event'];
        },
        {
          name: 'tokenMap';
          docs: ['Token Map.'];
          relations: ['store'];
        },
        {
          name: 'oracle';
          docs: ['Oracle buffer to use.'];
          writable: true;
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
        {
          name: 'owner';
          docs: ['The owner of the order.'];
          writable: true;
          relations: ['user'];
        },
        {
          name: 'user';
          docs: ['User Account.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
              },
            ];
          };
        },
        {
          name: 'order';
          docs: ['Order to execute.'];
          writable: true;
        },
        {
          name: 'position';
          writable: true;
        },
        {
          name: 'event';
          docs: ['Trade event buffer.'];
          writable: true;
        },
        {
          name: 'finalOutputToken';
          docs: ['Final output token.'];
        },
        {
          name: 'longToken';
          docs: ['Long token.'];
        },
        {
          name: 'shortToken';
          docs: ['Short token.'];
        },
        {
          name: 'finalOutputTokenEscrow';
          docs: ['The escrow account for final output tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'finalOutputToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'longTokenEscrow';
          docs: ['The escrow account for long tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'longToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'shortTokenEscrow';
          docs: ['The escrow account for short tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'shortToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'finalOutputTokenVault';
          docs: ['Final output token vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'final_output_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'longTokenVault';
          docs: ['Long token vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'long_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'shortTokenVault';
          docs: ['Short token vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'short_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'claimableLongTokenAccountForUser';
          writable: true;
        },
        {
          name: 'claimableShortTokenAccountForUser';
          writable: true;
        },
        {
          name: 'claimablePnlTokenAccountForHolding';
          writable: true;
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'chainlinkProgram';
          docs: ['Chainlink Program.'];
          optional: true;
          address: 'HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'recentTimestamp';
          type: 'i64';
        },
        {
          name: 'executionFee';
          type: 'u64';
        },
        {
          name: 'throwOnExecutionError';
          type: 'bool';
        },
      ];
    },
    {
      name: 'executeDecreaseOrderV2';
      docs: [
        'Execute a decrease order by keepers.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](ExecuteDecreaseOrderV2)*',
        '',
        '# Arguments',
        '- `recent_timestamp`: A timestamp that must be within a recent time window.',
        '- `execution_fee`: The execution fee claimed to be used by the keeper.',
        '- `throw_on_execution_error`: If true, throws an error if order execution fails. If false,',
        'silently cancels the order on execution failure.',
        '',
        '# Errors',
        '- The [`authority`](ExecuteDecreaseOrderV2::authority) must be a signer with the ORDER_KEEPER',
        'role in the `store`.',
        '- The [`store`](ExecuteDecreaseOrderV2::store) must be initialized.',
        '- The [`token_map`](ExecuteDecreaseOrderV2::token_map) must be initialized and authorized',
        'by the `store`.',
        '- The [`oracle`](ExecuteDecreaseOrderV2::oracle) must be initialized, cleared and owned',
        'by the `store`.',
        '- The [`market`](ExecuteDecreaseOrderV2::market) must be initialized, enabled and owned',
        'by the `store`.',
        '- The [`owner`](ExecuteDecreaseOrderV2::owner) must be the owner of the `order`.',
        '- The [`user`](ExecuteDecreaseOrderV2::user) must be initialized and associated with',
        'the `owner`.',
        '- The [`order`](ExecuteDecreaseOrderV2::order) must be:',
        '- Initialized and owned by both the `store` and `owner`',
        '- Associated with the provided `market`',
        '- In the pending state',
        '- The [`position`](ExecuteDecreaseOrderV2::position) must exist and be validly owned',
        'by the `owner` and `store`. It must match the `order`.',
        '- The [`event`](ExecuteDecreaseOrderV2::event) must be a valid trade event buffer',
        'owned by both the `store` and `authority`.',
        '- The tokens must match those recorded in the `order`.',
        '- All escrow accounts must be valid, recorded in the `order` and owned by the `order`.',
        '- All vault accounts must be valid market vault accounts and owned by the `store`.',
        '- All claimable token accounts must be valid and properly delegated to their owners.',
        '- The remaining accounts must be valid. See the documentation for the accounts for more',
        'details.',
        '- The feature for executing decrease orders must be enabled in the `store`.',
        '- If `throw_on_execution_error` is true, any execution failure will throw an error.',
      ];
      discriminator: [16, 101, 14, 160, 190, 1, 228, 133];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
          relations: ['event'];
        },
        {
          name: 'store';
          docs: ['Store.'];
          writable: true;
          relations: ['tokenMap', 'oracle', 'market', 'user', 'event'];
        },
        {
          name: 'tokenMap';
          docs: ['Token Map.'];
          relations: ['store'];
        },
        {
          name: 'oracle';
          docs: ['Oracle buffer to use.'];
          writable: true;
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
        {
          name: 'owner';
          docs: ['The owner of the order.'];
          writable: true;
          relations: ['user'];
        },
        {
          name: 'user';
          docs: ['User Account.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
              },
            ];
          };
        },
        {
          name: 'order';
          docs: ['Order to execute.'];
          writable: true;
        },
        {
          name: 'position';
          writable: true;
        },
        {
          name: 'event';
          docs: ['Trade event buffer.'];
          writable: true;
        },
        {
          name: 'finalOutputToken';
          docs: ['Final output token.'];
        },
        {
          name: 'longToken';
          docs: ['Long token.'];
        },
        {
          name: 'shortToken';
          docs: ['Short token.'];
        },
        {
          name: 'finalOutputTokenEscrow';
          docs: ['The escrow account for final output tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'finalOutputToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'longTokenEscrow';
          docs: ['The escrow account for long tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'longToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'shortTokenEscrow';
          docs: ['The escrow account for short tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'shortToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'finalOutputTokenVault';
          docs: ['Final output token vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'final_output_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'longTokenVault';
          docs: ['Long token vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'long_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'shortTokenVault';
          docs: ['Short token vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'short_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'claimableLongTokenAccountForUser';
          writable: true;
        },
        {
          name: 'claimableShortTokenAccountForUser';
          writable: true;
        },
        {
          name: 'claimablePnlTokenAccountForHolding';
          writable: true;
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'callbackAuthority';
          docs: ['Callback authority.'];
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 97, 108, 108, 98, 97, 99, 107];
              },
            ];
          };
        },
        {
          name: 'callbackProgram';
          docs: ['Callback program.'];
          optional: true;
        },
        {
          name: 'callbackSharedDataAccount';
          docs: ['Config account for callback.'];
          writable: true;
          optional: true;
        },
        {
          name: 'callbackPartitionedDataAccount';
          docs: ['Action stats account for callback.'];
          writable: true;
          optional: true;
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'recentTimestamp';
          type: 'i64';
        },
        {
          name: 'executionFee';
          type: 'u64';
        },
        {
          name: 'throwOnExecutionError';
          type: 'bool';
        },
      ];
    },
    {
      name: 'executeDeposit';
      docs: [
        'Execute a deposit by keepers.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](ExecuteDeposit)*',
        '',
        '# Arguments',
        '- `execution_fee`: The execution fee claimed to be used by the keeper.',
        '- `throw_on_execution_error`: If true, throws an error if execution fails. If false,',
        'the deposit will be cancelled instead.',
        '',
        '# Errors',
        'This instruction will fail if:',
        '- The [`authority`](ExecuteDeposit::authority) is not a signer or is not an ORDER_KEEPER',
        'in the store.',
        '- The [`store`](ExecuteDeposit::store) is not properly initialized.',
        '- The [`token_map`](ExecuteDeposit::token_map) is not initialized or not authorized by',
        'the store.',
        '- The [`oracle`](ExecuteDeposit::oracle) is not initialized, cleared and owned by the',
        'store.',
        '- The [`market`](ExecuteDeposit::market) is not initialized, is disabled, not owned by',
        'the store, or does not match the market recorded in the `deposit`.',
        '- The [`deposit`](ExecuteDeposit::deposit) is not initialized, not owned by the store,',
        'or not in the pending state.',
        '- Any token mint accounts do not match those recorded in the `deposit`.',
        '- Any escrow accounts are not properly owned or not recorded in the `deposit`.',
        '- Any vault accounts are not valid market vaults or do not correspond to the initial tokens.',
        '- Any feed accounts in the remaining accounts are invalid or do not match the swap parameters.',
        '- Any market accounts in the remaining accounts are disabled, not owned by the store,',
        'or do not match the swap parameters.',
        '- Any oracle prices from the feed accounts are incomplete or invalid.',
        '- The execution fails and `throw_on_execution_error` is set to `true`.',
      ];
      discriminator: [247, 103, 46, 184, 88, 188, 56, 46];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['tokenMap', 'oracle', 'market'];
        },
        {
          name: 'tokenMap';
          docs: ['Token Map.'];
          relations: ['store'];
        },
        {
          name: 'oracle';
          docs: ['Oracle buffer to use.'];
          writable: true;
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
        {
          name: 'deposit';
          docs: ['The deposit to execute.'];
          writable: true;
        },
        {
          name: 'marketToken';
          docs: ['Market token mint.'];
          writable: true;
        },
        {
          name: 'initialLongToken';
          docs: ['Initial long token.'];
          optional: true;
        },
        {
          name: 'initialShortToken';
          docs: ['Initial short token.'];
          optional: true;
        },
        {
          name: 'marketTokenEscrow';
          docs: ['The escrow account for receiving market tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'deposit';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'marketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'initialLongTokenEscrow';
          docs: [
            'The escrow account for receiving initial long token for deposit.',
          ];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'deposit';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'initialLongToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'initialShortTokenEscrow';
          docs: [
            'The escrow account for receiving initial short token for deposit.',
          ];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'deposit';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'initialShortToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'initialLongTokenVault';
          docs: ['Initial long token vault.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'initial_long_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'initialShortTokenVault';
          docs: ['Initial short token vault.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'initial_short_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'chainlinkProgram';
          docs: ['Chainlink Program.'];
          optional: true;
          address: 'HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'executionFee';
          type: 'u64';
        },
        {
          name: 'throwOnExecutionError';
          type: 'bool';
        },
      ];
    },
    {
      name: 'executeGlvDeposit';
      docs: [
        'Execute GLV deposit.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](ExecuteGlvDeposit)*',
        '',
        '# Arguments',
        '- `execution_lamports`: The execution fee claimed to be used by the keeper.',
        '- `throw_on_execution_error`: Whether to throw an error if the execution fails.',
        '',
        '# Errors',
        '- The [`authority`](ExecuteGlvDeposit::authority) must be a signer and have `ORDER_KEEPER` role in the `store`',
        '- The [`store`](ExecuteGlvDeposit::store) must be properly initialized',
        '- The [`token_map`](ExecuteGlvDeposit::token_map) must be:',
        '- Properly initialized',
        '- Authorized by the `store`',
        '- The [`oracle`](ExecuteGlvDeposit::oracle) must be:',
        '- Cleared',
        '- Owned by the `store`',
        '- The [`glv`](ExecuteGlvDeposit::glv) must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- Match the expected GLV of the deposit',
        '- The [`market`](ExecuteGlvDeposit::market) must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- Match the expected market of the deposit',
        '- Must be enabled and listed in the [`glv`](ExecuteGlvDeposit::glv)',
        '- The [`glv_deposit`](ExecuteGlvDeposit::glv_deposit) must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- In pending state',
        '- Token requirements:',
        '- All tokens must be valid and recorded in the [`glv_deposit`](ExecuteGlvDeposit::glv_deposit)',
        '- [`glv_token`](ExecuteGlvDeposit::glv_token) must be the GLV token of the [`glv`](ExecuteGlvDeposit::glv)',
        '- [`market_token`](ExecuteGlvDeposit::market_token) must be the market token of the [`market`](ExecuteGlvDeposit::market)',
        '- Vault requirements:',
        '- [`initial_long_token_vault`](ExecuteGlvDeposit::initial_long_token_vault) must be:',
        '- The market vault for the initial long token',
        '- Owned by the `store`',
        '- [`initial_short_token_vault`](ExecuteGlvDeposit::initial_short_token_vault) must be:',
        '- The market vault for the initial short token',
        '- Owned by the `store`',
        '- [`market_token_vault`](ExecuteGlvDeposit::market_token_vault) must be:',
        '- The market token vault in the [`glv`](ExecuteGlvDeposit::glv)',
        '- Owned by the [`glv`](ExecuteGlvDeposit::glv)',
        '- Escrow requirements:',
        '- Must correspond to their respective tokens',
        '- Must be owned by the [`glv_deposit`](ExecuteGlvDeposit::glv_deposit)',
        '- Must be recorded in the [`glv_deposit`](ExecuteGlvDeposit::glv_deposit)',
        '- All token programs must match their corresponding token accounts',
        '- All remaining accounts must be valid per [`ExecuteGlvDeposit`] documentation',
        '- Returns error if execution fails and `throw_on_execution_error` is `true`',
      ];
      discriminator: [18, 81, 214, 21, 82, 232, 148, 177];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['tokenMap', 'oracle', 'glv', 'market'];
        },
        {
          name: 'tokenMap';
          docs: ['Token Map.'];
          relations: ['store'];
        },
        {
          name: 'oracle';
          docs: ['Oracle buffer to use.'];
          writable: true;
        },
        {
          name: 'glv';
          docs: ['GLV account.'];
          writable: true;
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
        {
          name: 'glvDeposit';
          docs: ['The GLV deposit to execute.'];
          writable: true;
        },
        {
          name: 'glvToken';
          docs: ['GLV token mint.'];
          writable: true;
        },
        {
          name: 'marketToken';
          docs: ['Market token mint.'];
          writable: true;
        },
        {
          name: 'initialLongToken';
          docs: ['Initial long token.'];
          optional: true;
        },
        {
          name: 'initialShortToken';
          docs: ['Initial short token.'];
          optional: true;
        },
        {
          name: 'glvTokenEscrow';
          docs: ['The escrow account for GLV tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvDeposit';
              },
              {
                kind: 'account';
                path: 'glvTokenProgram';
              },
              {
                kind: 'account';
                path: 'glvToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'marketTokenEscrow';
          docs: ['The escrow account for market tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvDeposit';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'marketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'initialLongTokenEscrow';
          docs: [
            'The escrow account for receiving initial long token for deposit.',
          ];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvDeposit';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'initialLongToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'initialShortTokenEscrow';
          docs: [
            'The escrow account for receiving initial short token for deposit.',
          ];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvDeposit';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'initialShortToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'initialLongTokenVault';
          docs: ['Initial long token vault.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'initial_long_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'initialShortTokenVault';
          docs: ['Initial short token vault.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'initial_short_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'marketTokenVault';
          docs: ['Market token vault for the GLV.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glv';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'marketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'glvTokenProgram';
          docs: ['The token program for GLV token.'];
          address: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'chainlinkProgram';
          docs: ['Chainlink Program.'];
          optional: true;
          address: 'HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'executionLamports';
          type: 'u64';
        },
        {
          name: 'throwOnExecutionError';
          type: 'bool';
        },
      ];
    },
    {
      name: 'executeGlvShift';
      docs: [
        'Execute GLV shift.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](ExecuteGlvShift)*',
        '',
        '# Arguments',
        '- `execution_lamports`: The execution fee claimed to be used by the keeper.',
        '- `throw_on_execution_error`: Whether to throw an error if execution fails.',
        '',
        '# Errors',
        '- The [`authority`](ExecuteGlvShift::authority) must be:',
        '- A signer',
        '- A `ORDER_KEEPER` in the `store`',
        '- The [`store`](ExecuteGlvShift::store) must be properly initialized',
        '- The [`token_map`](ExecuteGlvShift::token_map) must be:',
        '- Properly initialized',
        '- Authorized by the `store`',
        '- The [`oracle`](ExecuteGlvShift::oracle) must be:',
        '- Cleared',
        '- Owned by the `store`',
        '- The [`glv`](ExecuteGlvShift::glv) must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- The expected GLV of the GLV shift',
        '- The [`from_market`](ExecuteGlvShift::from_market) must be:',
        '- Enabled',
        '- Owned by the `store`',
        '- One of the markets in the [`glv`](ExecuteGlvShift::glv)',
        '- The [`to_market`](ExecuteGlvShift::to_market) must be:',
        '- Enabled',
        '- Owned by the `store`',
        '- One of the markets in the [`glv`](ExecuteGlvShift::glv)',
        '- The [`glv_shift`](ExecuteGlvShift::glv_shift) must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- Token requirements:',
        '- [`from_market_token`](ExecuteGlvShift::from_market_token) must be:',
        '- The market token of `from_market`',
        '- Recorded in the GLV shift',
        '- [`to_market_token`](ExecuteGlvShift::to_market_token) must be:',
        '- The market token of `to_market`',
        '- Recorded in the GLV shift',
        '- Vault requirements:',
        '- [`from_market_token_glv_vault`](ExecuteGlvShift::from_market_token_glv_vault) must be:',
        '- The escrow account for `from_market_token` in the GLV',
        '- Owned by the [`glv`](ExecuteGlvShift::glv)',
        '- [`to_market_token_glv_vault`](ExecuteGlvShift::to_market_token_glv_vault) must be:',
        '- The escrow account for `to_market_token` in the GLV',
        '- Owned by the [`glv`](ExecuteGlvShift::glv)',
        '- [`from_market_token_vault`](ExecuteGlvShift::from_market_token_vault) must be:',
        '- The market vault for `from_market_token`',
        '- Owned by the `store`',
        '- Token programs must match the tokens and token accounts',
        '- The remaining accounts must be valid (see [`ExecuteGlvShift`] docs)',
        '- Returns error if execution fails and `throw_on_execution_error` is `true`',
      ];
      discriminator: [209, 190, 175, 51, 144, 98, 45, 201];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['tokenMap', 'oracle', 'glv', 'fromMarket', 'toMarket'];
        },
        {
          name: 'tokenMap';
          docs: ['Token Map.'];
          relations: ['store'];
        },
        {
          name: 'oracle';
          docs: ['Oracle buffer to use.'];
          writable: true;
        },
        {
          name: 'glv';
          docs: ['GLV account.'];
          writable: true;
        },
        {
          name: 'fromMarket';
          docs: ['From Market.'];
          writable: true;
        },
        {
          name: 'toMarket';
          docs: ['To Market.'];
          writable: true;
        },
        {
          name: 'glvShift';
          docs: ['The GLV shift to close.'];
          writable: true;
        },
        {
          name: 'fromMarketToken';
          docs: ['From Market token.'];
          writable: true;
        },
        {
          name: 'toMarketToken';
          docs: ['To Market token.'];
          writable: true;
        },
        {
          name: 'fromMarketTokenGlvVault';
          docs: ['The escrow account for from market tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glv';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'fromMarketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'toMarketTokenGlvVault';
          docs: ['The escrow account for to market tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glv';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'toMarketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'fromMarketTokenVault';
          docs: ['From market token vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'from_market_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'chainlinkProgram';
          docs: ['Chainlink Program.'];
          optional: true;
          address: 'HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'executionLamports';
          type: 'u64';
        },
        {
          name: 'throwOnExecutionError';
          type: 'bool';
        },
      ];
    },
    {
      name: 'executeGlvWithdrawal';
      docs: [
        'Execute GLV withdrawal.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](ExecuteGlvWithdrawal)*',
        '',
        '# Arguments',
        '- `execution_lamports`: The execution fee claimed to be used by the keeper.',
        '- `throw_on_execution_error`: Whether to throw an error if the execution fails.',
        '',
        '# Errors',
        '- The [`authority`](ExecuteGlvWithdrawal::authority) must be:',
        '- A signer',
        '- A `ORDER_KEEPER` in the `store`',
        '- The [`store`](ExecuteGlvWithdrawal::store) must be properly initialized',
        '- The [`token_map`](ExecuteGlvWithdrawal::token_map) must be:',
        '- Properly initialized',
        '- Authorized by the `store`',
        '- The [`oracle`](ExecuteGlvWithdrawal::oracle) must be:',
        '- Cleared',
        '- Owned by the `store`',
        '- The [`glv`](ExecuteGlvWithdrawal::glv) must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- The expected GLV of the withdrawal',
        '- The [`market`](ExecuteGlvWithdrawal::market) must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- The expected market of the withdrawal',
        '- Must be enabled and listed in the [`glv`](ExecuteGlvWithdrawal::glv)',
        '- The [`glv_withdrawal`](ExecuteGlvWithdrawal::glv_withdrawal) must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- In pending state',
        '- Token requirements:',
        '- All tokens must be valid and recorded in the withdrawal',
        '- [`glv_token`](ExecuteGlvWithdrawal::glv_token) must be the GLV token of the GLV',
        '- [`market_token`](ExecuteGlvWithdrawal::market_token) must be the market token of the market',
        '- Escrow requirements:',
        '- Escrow accounts must correspond to their tokens',
        '- Escrow accounts must be owned by the [`glv_withdrawal`](ExecuteGlvWithdrawal::glv_withdrawal)',
        '- Escrow accounts must be recorded in the [`glv_withdrawal`](ExecuteGlvWithdrawal::glv_withdrawal)',
        '- Vault requirements:',
        '- [`market_token_withdrawal_vault`](ExecuteGlvWithdrawal::market_token_withdrawal_vault) must be the market vault for market token, owned by the `store`',
        '- [`final_long_token_vault`](ExecuteGlvWithdrawal::final_long_token_vault) must be the market vault for final long token, owned by the `store`',
        '- [`final_short_token_vault`](ExecuteGlvWithdrawal::final_short_token_vault) must be the market vault for final short token, owned by the `store`',
        "- [`market_token_vault`](ExecuteGlvWithdrawal::market_token_vault) must be the GLV's market token vault, owned by the [`glv`](ExecuteGlvWithdrawal::glv)",
        '- All token programs must match their corresponding token accounts',
        '- All remaining accounts must be valid per [`ExecuteGlvWithdrawal`] documentation',
        '- Returns error if execution fails and `throw_on_execution_error` is `true`',
      ];
      discriminator: [161, 145, 255, 200, 224, 8, 183, 135];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['tokenMap', 'oracle', 'glv', 'market'];
        },
        {
          name: 'tokenMap';
          docs: ['Token Map.'];
          relations: ['store'];
        },
        {
          name: 'oracle';
          docs: ['Oracle buffer to use.'];
          writable: true;
        },
        {
          name: 'glv';
          docs: ['GLV account.'];
          writable: true;
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
        {
          name: 'glvWithdrawal';
          docs: ['The GLV withdrawal to execute.'];
          writable: true;
        },
        {
          name: 'glvToken';
          docs: ['GLV token mint.'];
          writable: true;
        },
        {
          name: 'marketToken';
          docs: ['Market token mint.'];
          writable: true;
        },
        {
          name: 'finalLongToken';
          docs: ['Final long token.'];
        },
        {
          name: 'finalShortToken';
          docs: ['Final short token.'];
        },
        {
          name: 'glvTokenEscrow';
          docs: ['The escrow account for GLV tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvWithdrawal';
              },
              {
                kind: 'account';
                path: 'glvTokenProgram';
              },
              {
                kind: 'account';
                path: 'glvToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'marketTokenEscrow';
          docs: ['The escrow account for market tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvWithdrawal';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'marketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'finalLongTokenEscrow';
          docs: [
            'The escrow account for receiving final long token for withdrawal.',
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvWithdrawal';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'finalLongToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'finalShortTokenEscrow';
          docs: [
            'The escrow account for receiving final short token for withdrawal.',
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glvWithdrawal';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'finalShortToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'marketTokenWithdrawalVault';
          docs: ['Market token withdrawal vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'market_token_withdrawal_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'finalLongTokenVault';
          docs: ['Final long token vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'final_long_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'finalShortTokenVault';
          docs: ['Final short token vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'final_short_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'marketTokenVault';
          docs: ['Market token vault for the GLV.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glv';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'marketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'glvTokenProgram';
          docs: ['The token program for GLV token.'];
          address: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'chainlinkProgram';
          docs: ['Chainlink Program.'];
          optional: true;
          address: 'HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'executionLamports';
          type: 'u64';
        },
        {
          name: 'throwOnExecutionError';
          type: 'bool';
        },
      ];
    },
    {
      name: 'executeIncreaseOrSwapOrder';
      docs: [
        'Execute an increase/swap order by keepers.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](ExecuteIncreaseOrSwapOrder)*',
        '',
        '# Arguments',
        '- `recent_timestamp`: A recent timestamp used for deriving the claimable accounts.',
        '- `execution_fee`: The execution fee claimed to be used the keeper.',
        '- `throw_on_execution_error`: If true, throws an error if order execution fails. If false,',
        'silently cancels the order on execution failure.',
        '',
        '# Errors',
        '- The [`authority`](ExecuteIncreaseOrSwapOrder::authority) must be a signer and have the',
        'ORDER_KEEPER role in the `store`.',
        '- The [`store`](ExecuteIncreaseOrSwapOrder::store) must be initialized.',
        '- The [`token_map`](ExecuteIncreaseOrSwapOrder::token_map) must be initialized and authorized',
        'by the `store`.',
        '- The [`oracle`](ExecuteIncreaseOrSwapOrder::oracle) must be initialized, cleared and owned',
        'by the `store`.',
        '- The [`market`](ExecuteIncreaseOrSwapOrder::market) must be initialized, enabled and owned',
        'by the `store`. It must also be associated with the `order`.',
        '- The [`owner`](ExecuteIncreaseOrSwapOrder::owner) must be the owner of the `order`.',
        '- The [`user`](ExecuteIncreaseOrSwapOrder::user) must be initialized and associated with',
        'the `owner`.',
        '- The [`order`](ExecuteIncreaseOrSwapOrder::order) must be:',
        '- Initialized and owned by both the `store` and `owner`',
        '- Associated with the provided `market`',
        '- In a pending state',
        '- For increase orders:',
        '- The [`initial_collateral_token`](ExecuteIncreaseOrSwapOrder::initial_collateral_token)',
        'must be valid.',
        '- The [`position`](ExecuteIncreaseOrSwapOrder::position) must exist and be owned by the',
        '`owner` and `store`. It must match the `order`.',
        '- The [`event`](ExecuteIncreaseOrSwapOrder::event) must be a valid trade event buffer owned',
        'by both the `store` and `authority`.',
        '- The [`long_token`](ExecuteIncreaseOrSwapOrder::long_token) and [`short_token`](ExecuteIncreaseOrSwapOrder::short_token)',
        'must match those defined in the `market`.',
        '- The corresponding token escrow and vault accounts must be valid, recorded in the `order`',
        'and owned by the `order`.',
        '- For swap orders:',
        '- The [`initial_collateral_token`](ExecuteIncreaseOrSwapOrder::initial_collateral_token)',
        'must be valid.',
        '- The [`final_output_token`](ExecuteIncreaseOrSwapOrder::final_output_token) must be valid.',
        '- The corresponding escrow and vault accounts must be valid, recorded in the `order` and',
        'owned by the `order`.',
        '- The remaining accounts must be valid. See the documentation for the accounts for more',
        'details.',
        '- The feature for executing this order type must be enabled in the `store`.',
        '- If `throw_on_execution_error` is true, any execution failure will throw an error',
      ];
      discriminator: [231, 30, 166, 1, 233, 69, 152, 133];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
          relations: ['event'];
        },
        {
          name: 'store';
          docs: ['Store.'];
          writable: true;
          relations: ['tokenMap', 'oracle', 'market', 'user', 'event'];
        },
        {
          name: 'tokenMap';
          docs: ['Token Map.'];
          relations: ['store'];
        },
        {
          name: 'oracle';
          docs: ['Oracle buffer to use.'];
          writable: true;
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
        {
          name: 'owner';
          docs: ['The owner of the order.'];
          writable: true;
          relations: ['user'];
        },
        {
          name: 'user';
          docs: ['User Account.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
              },
            ];
          };
        },
        {
          name: 'order';
          docs: ['Order to execute.'];
          writable: true;
        },
        {
          name: 'position';
          writable: true;
          optional: true;
        },
        {
          name: 'event';
          docs: ['Trade event buffer.'];
          writable: true;
          optional: true;
        },
        {
          name: 'initialCollateralToken';
          docs: ['Initial collateral token.'];
          optional: true;
        },
        {
          name: 'finalOutputToken';
          docs: ['Final output token.'];
          optional: true;
        },
        {
          name: 'longToken';
          docs: ['Long token.'];
          optional: true;
        },
        {
          name: 'shortToken';
          docs: ['Short token.'];
          optional: true;
        },
        {
          name: 'initialCollateralTokenEscrow';
          docs: ['The escrow account for initial collateral tokens.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'initialCollateralToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'finalOutputTokenEscrow';
          docs: ['The escrow account for final output tokens.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'finalOutputToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'longTokenEscrow';
          docs: ['The escrow account for long tokens.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'longToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'shortTokenEscrow';
          docs: ['The escrow account for short tokens.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'shortToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'initialCollateralTokenVault';
          docs: ['Initial collateral token vault.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'initial_collateral_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'finalOutputTokenVault';
          docs: ['Final output token vault.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'final_output_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'longTokenVault';
          docs: ['Long token vault.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'long_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'shortTokenVault';
          docs: ['Short token vault.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'short_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'chainlinkProgram';
          docs: ['Chainlink Program.'];
          optional: true;
          address: 'HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'recentTimestamp';
          type: 'i64';
        },
        {
          name: 'executionFee';
          type: 'u64';
        },
        {
          name: 'throwOnExecutionError';
          type: 'bool';
        },
      ];
    },
    {
      name: 'executeIncreaseOrSwapOrderV2';
      docs: [
        'Execute an increase/swap order by keepers.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](ExecuteIncreaseOrSwapOrderV2)*',
        '',
        '# Arguments',
        '- `recent_timestamp`: A recent timestamp used for deriving the claimable accounts.',
        '- `execution_fee`: The execution fee claimed to be used the keeper.',
        '- `throw_on_execution_error`: If true, throws an error if order execution fails. If false,',
        'silently cancels the order on execution failure.',
        '',
        '# Errors',
        '- The [`authority`](ExecuteIncreaseOrSwapOrderV2::authority) must be a signer and have the',
        'ORDER_KEEPER role in the `store`.',
        '- The [`store`](ExecuteIncreaseOrSwapOrderV2::store) must be initialized.',
        '- The [`token_map`](ExecuteIncreaseOrSwapOrderV2::token_map) must be initialized and authorized',
        'by the `store`.',
        '- The [`oracle`](ExecuteIncreaseOrSwapOrderV2::oracle) must be initialized, cleared and owned',
        'by the `store`.',
        '- The [`market`](ExecuteIncreaseOrSwapOrderV2::market) must be initialized, enabled and owned',
        'by the `store`. It must also be associated with the `order`.',
        '- The [`owner`](ExecuteIncreaseOrSwapOrderV2::owner) must be the owner of the `order`.',
        '- The [`user`](ExecuteIncreaseOrSwapOrderV2::user) must be initialized and associated with',
        'the `owner`.',
        '- The [`order`](ExecuteIncreaseOrSwapOrderV2::order) must be:',
        '- Initialized and owned by both the `store` and `owner`',
        '- Associated with the provided `market`',
        '- In a pending state',
        '- For increase orders:',
        '- The [`initial_collateral_token`](ExecuteIncreaseOrSwapOrderV2::initial_collateral_token)',
        'must be valid.',
        '- The [`position`](ExecuteIncreaseOrSwapOrderV2::position) must exist and be owned by the',
        '`owner` and `store`. It must match the `order`.',
        '- The [`event`](ExecuteIncreaseOrSwapOrderV2::event) must be a valid trade event buffer owned',
        'by both the `store` and `authority`.',
        '- The [`long_token`](ExecuteIncreaseOrSwapOrderV2::long_token) and [`short_token`](ExecuteIncreaseOrSwapOrderV2::short_token)',
        'must match those defined in the `market`.',
        '- The corresponding token escrow and vault accounts must be valid, recorded in the `order`',
        'and owned by the `order`.',
        '- For swap orders:',
        '- The [`initial_collateral_token`](ExecuteIncreaseOrSwapOrderV2::initial_collateral_token)',
        'must be valid.',
        '- The [`final_output_token`](ExecuteIncreaseOrSwapOrderV2::final_output_token) must be valid.',
        '- The corresponding escrow and vault accounts must be valid, recorded in the `order` and',
        'owned by the `order`.',
        '- The remaining accounts must be valid. See the documentation for the accounts for more',
        'details.',
        '- The feature for executing this order type must be enabled in the `store`.',
        '- If `throw_on_execution_error` is true, any execution failure will throw an error',
      ];
      discriminator: [159, 126, 194, 5, 92, 107, 199, 183];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
          relations: ['event'];
        },
        {
          name: 'store';
          docs: ['Store.'];
          writable: true;
          relations: ['tokenMap', 'oracle', 'market', 'user', 'event'];
        },
        {
          name: 'tokenMap';
          docs: ['Token Map.'];
          relations: ['store'];
        },
        {
          name: 'oracle';
          docs: ['Oracle buffer to use.'];
          writable: true;
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
        {
          name: 'owner';
          docs: ['The owner of the order.'];
          writable: true;
          relations: ['user'];
        },
        {
          name: 'user';
          docs: ['User Account.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
              },
            ];
          };
        },
        {
          name: 'order';
          docs: ['Order to execute.'];
          writable: true;
        },
        {
          name: 'position';
          writable: true;
          optional: true;
        },
        {
          name: 'event';
          docs: ['Trade event buffer.'];
          writable: true;
          optional: true;
        },
        {
          name: 'initialCollateralToken';
          docs: ['Initial collateral token.'];
          optional: true;
        },
        {
          name: 'finalOutputToken';
          docs: ['Final output token.'];
          optional: true;
        },
        {
          name: 'longToken';
          docs: ['Long token.'];
          optional: true;
        },
        {
          name: 'shortToken';
          docs: ['Short token.'];
          optional: true;
        },
        {
          name: 'initialCollateralTokenEscrow';
          docs: ['The escrow account for initial collateral tokens.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'initialCollateralToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'finalOutputTokenEscrow';
          docs: ['The escrow account for final output tokens.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'finalOutputToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'longTokenEscrow';
          docs: ['The escrow account for long tokens.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'longToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'shortTokenEscrow';
          docs: ['The escrow account for short tokens.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'shortToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'initialCollateralTokenVault';
          docs: ['Initial collateral token vault.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'initial_collateral_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'finalOutputTokenVault';
          docs: ['Final output token vault.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'final_output_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'longTokenVault';
          docs: ['Long token vault.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'long_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'shortTokenVault';
          docs: ['Short token vault.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'short_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'callbackAuthority';
          docs: ['Callback authority.'];
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 97, 108, 108, 98, 97, 99, 107];
              },
            ];
          };
        },
        {
          name: 'callbackProgram';
          docs: ['Callback program.'];
          optional: true;
        },
        {
          name: 'callbackSharedDataAccount';
          docs: ['Config account for callback.'];
          writable: true;
          optional: true;
        },
        {
          name: 'callbackPartitionedDataAccount';
          docs: ['Action stats account for callback.'];
          writable: true;
          optional: true;
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'recentTimestamp';
          type: 'i64';
        },
        {
          name: 'executionFee';
          type: 'u64';
        },
        {
          name: 'throwOnExecutionError';
          type: 'bool';
        },
      ];
    },
    {
      name: 'executeShift';
      docs: [
        'Execute a shift by keepers.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](ExecuteShift)*',
        '',
        '# Arguments',
        '- `execution_lamports`: The execution fee in lamports claimed to be used by the keeper.',
        '- `throw_on_execution_error`: Whether to throw an error if the execution fails.',
        '',
        '# Errors',
        '- The [`authority`](ExecuteShift::authority) must be a signer and have the ORDER_KEEPER role',
        'in the store.',
        '- The [`store`](ExecuteShift::store) must be initialized.',
        '- The [`token_map`](ExecuteShift::token_map) must be initialized and authorized by the store.',
        '- The [`oracle`](ExecuteShift::oracle) must be initialized, cleared and store-owned.',
        '- The [`from_market`](ExecuteShift::from_market) must be initialized, enabled and store-owned.',
        'It must be the from market of the [`shift`](ExecuteShift::shift).',
        '- The [`to_market`](ExecuteShift::to_market) must be initialized, enabled and store-owned.',
        'It must be the to market of the [`shift`](ExecuteShift::shift).',
        '- The [`from_market`](ExecuteShift::from_market) must be shiftable to the',
        '[`to_market`](ExecuteShift::to_market).',
        '- The [`shift`](ExecuteShift::shift) must be initialized, store-owned and in the pending state.',
        '- The [`from_market_token`](ExecuteShift::from_market_token) must be the market token of the',
        '[`from_market`](ExecuteShift::from_market).',
        '- The [`to_market_token`](ExecuteShift::to_market_token) must be the market token of the',
        '[`to_market`](ExecuteShift::to_market).',
        '- The [`from_market_token_escrow`](ExecuteShift::from_market_token_escrow) must be a valid',
        'shift-owned escrow account for the [`from_market_token`](ExecuteShift::from_market_token)',
        'and recorded in the [`shift`](ExecuteShift::shift).',
        '- The [`to_market_token_escrow`](ExecuteShift::to_market_token_escrow) must be a valid',
        'shift-owned escrow account for the [`to_market_token`](ExecuteShift::to_market_token)',
        'and recorded in the [`shift`](ExecuteShift::shift).',
        '- The [`from_market_token_vault`](ExecuteShift::from_market_token_vault) must be the market',
        'vault for the [`from_market_token`](ExecuteShift::from_market_token) and store-owned.',
        '- The feed accounts must be valid and provided in the same order as the unique sorted list',
        'of tokens in the `from_market` and `to_market`.',
        '- The oracle prices from the feed accounts must be complete and valid.',
        '- If `throw_on_execution_error` is `true`, returns an error if execution fails.',
      ];
      discriminator: [46, 112, 104, 8, 96, 157, 222, 253];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['tokenMap', 'oracle', 'fromMarket', 'toMarket'];
        },
        {
          name: 'tokenMap';
          docs: ['Token map.'];
          relations: ['store'];
        },
        {
          name: 'oracle';
          docs: ['Oracle buffer to use.'];
          writable: true;
        },
        {
          name: 'fromMarket';
          docs: ['From market.'];
          writable: true;
        },
        {
          name: 'toMarket';
          docs: ['To market.'];
          writable: true;
        },
        {
          name: 'shift';
          docs: ['The shift to execute.'];
          writable: true;
        },
        {
          name: 'fromMarketToken';
          docs: ['From market token.'];
          writable: true;
        },
        {
          name: 'toMarketToken';
          docs: ['To market token.'];
          writable: true;
        },
        {
          name: 'fromMarketTokenEscrow';
          docs: ['The escrow account for from market tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'shift';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'fromMarketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'toMarketTokenEscrow';
          docs: ['The escrow account for to market tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'shift';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'toMarketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'fromMarketTokenVault';
          docs: ['From market token vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'from_market_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'chainlinkProgram';
          docs: ['Chainlink Program.'];
          optional: true;
          address: 'HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'executionLamports';
          type: 'u64';
        },
        {
          name: 'throwOnExecutionError';
          type: 'bool';
        },
      ];
    },
    {
      name: 'executeWithdrawal';
      docs: [
        'Execute a withdrawal by keepers.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](ExecuteWithdrawal)*',
        '',
        '# Arguments',
        '- `execution_fee`: The execution fee to be paid to the keeper for executing the withdrawal.',
        '- `throw_on_execution_error`: If true, throws an error if execution fails. If false, the',
        'withdrawal will be cancelled instead.',
        '',
        '# Errors',
        'This instruction will fail if:',
        '- The [`authority`](ExecuteWithdrawal::authority) is not a signer or is not an ORDER_KEEPER',
        'in the store.',
        '- The [`store`](ExecuteWithdrawal::store) is not properly initialized.',
        '- The [`token_map`](ExecuteWithdrawal::token_map) is not initialized or not authorized by',
        'the store.',
        '- The [`oracle`](ExecuteWithdrawal::oracle) is not initialized, cleared and owned by the',
        'store.',
        '- The [`market`](ExecuteWithdrawal::market) is not initialized, is disabled, not owned by',
        'the store, or does not match the market recorded in the `withdrawal`.',
        '- The [`withdrawal`](ExecuteWithdrawal::withdrawal) is not initialized, not owned by the',
        'store, or not in the pending state.',
        '- Any token mint accounts do not match those recorded in the `withdrawal`.',
        '- Any escrow accounts are not properly initialized or not owned by the `withdrawal`.',
        '- Any vault accounts are not valid market vaults or do not correspond to the final tokens.',
        '- Any feed accounts in the remaining accounts are invalid or do not match the swap parameters.',
        '- Any market accounts in the remaining accounts are disabled, not owned by the store, or do',
        'not match the swap parameters.',
        '- Any oracle prices from the feed accounts are incomplete or invalid.',
        '- The execution fails and `throw_on_execution_error` is set to true.',
      ];
      discriminator: [113, 121, 203, 232, 137, 139, 248, 249];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['tokenMap', 'oracle', 'market'];
        },
        {
          name: 'tokenMap';
          docs: ['Token map.'];
          relations: ['store'];
        },
        {
          name: 'oracle';
          docs: ['Oracle buffer to use.'];
          writable: true;
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
        {
          name: 'withdrawal';
          docs: ['The withdrawal to execute.'];
          writable: true;
        },
        {
          name: 'marketToken';
          docs: ['Market token.'];
          writable: true;
        },
        {
          name: 'finalLongToken';
          docs: ['Final long token.'];
        },
        {
          name: 'finalShortToken';
          docs: ['Final short token.'];
        },
        {
          name: 'marketTokenEscrow';
          docs: ['The escrow account for receiving market tokens to burn.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'withdrawal';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'marketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'finalLongTokenEscrow';
          docs: [
            'The escrow account for receiving withdrawn final long tokens.',
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'withdrawal';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'finalLongToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'finalShortTokenEscrow';
          docs: [
            'The escrow account for receiving withdrawn final short tokens.',
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'withdrawal';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'finalShortToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'marketTokenVault';
          docs: ['Market token vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'market_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'finalLongTokenVault';
          docs: ['Final long token vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'final_long_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'finalShortTokenVault';
          docs: ['Final short token vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'final_short_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'chainlinkProgram';
          docs: ['Chainlink Program.'];
          optional: true;
          address: 'HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'executionFee';
          type: 'u64';
        },
        {
          name: 'throwOnExecutionError';
          type: 'bool';
        },
      ];
    },
    {
      name: 'getMarketStatus';
      docs: [
        'Calculate the current market status.',
        '',
        'This instruction calculates and returns the current status of a market, including metrics like',
        'pool value, PnL, and other key indicators. The calculation can be configured to maximize or',
        'minimize certain values based on the provided flags.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts.*](ReadMarket)',
        '',
        '# Arguments',
        '- `prices`: The current unit prices of tokens in the market, used for calculations.',
        '- `maximize_pnl`: If true, uses the maximum possible PnL values in calculations.',
        'If false, uses minimum PnL values.',
        '- `maximize_pool_value`: If true, uses the maximum possible pool value in calculations.',
        'If false, uses minimum pool value.',
        '',
        '# Errors',
        '- The [`market`](ReadMarket::market) account must be properly initialized.',
        '- The provided prices must be non-zero.',
        '- Any calculation errors.',
      ];
      discriminator: [51, 68, 212, 8, 4, 23, 221, 91];
      accounts: [
        {
          name: 'market';
          docs: ['Market.'];
        },
      ];
      args: [
        {
          name: 'prices';
          type: {
            defined: {
              name: 'prices';
              generics: [
                {
                  kind: 'type';
                  type: 'u128';
                },
              ];
            };
          };
        },
        {
          name: 'maximizePnl';
          type: 'bool';
        },
        {
          name: 'maximizePoolValue';
          type: 'bool';
        },
      ];
      returns: {
        defined: {
          name: 'marketStatus';
        };
      };
    },
    {
      name: 'getMarketTokenPrice';
      docs: [
        'Get the current market token price based on the provided token prices and PnL factor.',
        '',
        'This instruction calculates and returns the current price of the market token, taking into',
        'account the provided token prices and PnL factor. The calculation can be configured to',
        'maximize certain values based on the provided flag.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts.*](ReadMarketWithToken)',
        '',
        '# Arguments',
        '- `prices`: The current unit prices of tokens in the market, used for calculations.',
        '- `pnl_factor`: The PnL factor key to use for price calculations, must be a valid',
        '[`PnlFactorKind`](gmsol_model::PnlFactorKind).',
        '- `maximize`: If true, uses the maximum possible values in calculations.',
        'If false, uses minimum values.',
        '',
        '# Errors',
        '- The [`market`](ReadMarketWithToken::market) must be an initialized market account.',
        '- The provided prices must be non-zero.',
        '- The `pnl_factor` must be a valid [`PnlFactorKind`](gmsol_model::PnlFactorKind).',
        '- Any calculation errors.',
      ];
      discriminator: [60, 217, 40, 2, 12, 236, 254, 199];
      accounts: [
        {
          name: 'market';
          docs: ['Market.'];
        },
        {
          name: 'marketToken';
          docs: ['Market token.'];
        },
      ];
      args: [
        {
          name: 'prices';
          type: {
            defined: {
              name: 'prices';
              generics: [
                {
                  kind: 'type';
                  type: 'u128';
                },
              ];
            };
          };
        },
        {
          name: 'pnlFactor';
          type: 'string';
        },
        {
          name: 'maximize';
          type: 'bool';
        },
      ];
      returns: 'u128';
    },
    {
      name: 'grantRole';
      docs: [
        'Grant a role to the given user in the given store.',
        '',
        "This instruction grants a role to a user in the store's role configuration. If the user already",
        'has the role, this instruction has no effect.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](GrantRole).*',
        '',
        '# Arguments',
        '- `user`: The address of the user to whom the role should be granted.',
        '- `role`: The name of the role to be granted. Must be an enabled role in the store.',
        '',
        '# Errors',
        '- The [`authority`](GrantRole::authority) must be a signer and be the `ADMIN` of the store.',
        '- The [`store`](GrantRole::store) must be an initialized store account owned by the store program.',
        "- The `role` must exist and be enabled in the store's role table.",
      ];
      discriminator: [218, 234, 128, 15, 82, 33, 236, 253];
      accounts: [
        {
          name: 'authority';
          docs: ['The caller of this instruction.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store account to which the new role is to be granted.'];
          writable: true;
        },
      ];
      args: [
        {
          name: 'user';
          type: 'pubkey';
        },
        {
          name: 'role';
          type: 'string';
        },
      ];
    },
    {
      name: 'gtSetExchangeTimeWindow';
      docs: [
        'Set GT exchange time window (in seconds).',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](ConfigureGt)*',
        '',
        '# Arguments',
        '- `window`: The time window in seconds for one GT exchange period.',
        '',
        '# Errors',
        '- The [`authority`](ConfigureGt::authority) must be a signer and have the GT_CONTROLLER role in the `store`.',
        '- The [`store`](ConfigureGt::store) must be properly initialized.',
        '- The GT state of the `store` must be initialized.',
        '- The `window` must be greater than 0 seconds to ensure a valid exchange period.',
      ];
      discriminator: [148, 155, 45, 52, 154, 67, 248, 129];
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
        },
      ];
      args: [
        {
          name: 'window';
          type: 'u32';
        },
      ];
    },
    {
      name: 'gtSetOrderFeeDiscountFactors';
      docs: [
        'Set order fee discount factors.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](ConfigureGt)*',
        '',
        '# Arguments',
        '- `factors`: The order fee discount factors for each user rank.',
        '',
        '# Errors',
        '- The [`authority`](ConfigureGt::authority) must be a signer and have the MARKET_KEEPER role in the `store`.',
        '- The [`store`](ConfigureGt::store) must be initialized.',
        '- The GT state of the `store` must be initialized.',
        '- The number of `factors` must match the number of ranks defined in GT state.',
        '- Each factor must be less than or equal to [`MARKET_USD_UNIT`](crate::constants::MARKET_USD_UNIT)(i.e., 100%).',
      ];
      discriminator: [234, 198, 196, 44, 93, 2, 1, 150];
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
        },
      ];
      args: [
        {
          name: 'factors';
          type: {
            vec: 'u128';
          };
        },
      ];
    },
    {
      name: 'gtSetReferralRewardFactors';
      docs: [
        'Set referral reward factors.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](ConfigureGt)*',
        '',
        '# Arguments',
        '- `factors`: The referral reward factors for each user rank.',
        '',
        '# Errors',
        '- The [`authority`](ConfigureGt::authority) must be a signer and a',
        'GT_CONTROLLER in the store.',
        '- The [`store`](ConfigureGt::store) must be initialized.',
        '- The GT state of the `store` must be initialized.',
        '- The number of `factors` must match the number of ranks defined in GT state.',
        '- Each factor must be less than or equal to [`MARKET_USD_UNIT`](crate::constants::MARKET_USD_UNIT)(i.e., 100%).',
      ];
      discriminator: [165, 230, 7, 217, 91, 156, 185, 64];
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
        },
      ];
      args: [
        {
          name: 'factors';
          type: {
            vec: 'u128';
          };
        },
      ];
    },
    {
      name: 'hasAdmin';
      docs: [
        'Return whether the given address is the administrator of the given store.',
        '',
        'This instruction checks if the provided address has administrator privileges for the given store',
        'and returns a boolean result.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](HasRole).*',
        '',
        '# Arguments',
        '- `authority`: The address to check for administrator privileges.',
        '',
        '# Returns',
        'Returns `true` if the address is the administrator, `false` otherwise.',
        '',
        '# Errors',
        '- The [`store`](HasRole::store) must be an initialized store account owned by',
        'the store program.',
      ];
      discriminator: [254, 220, 34, 140, 38, 82, 235, 42];
      accounts: [
        {
          name: 'store';
          docs: ['The store account in which the role is defined.'];
        },
      ];
      args: [
        {
          name: 'authority';
          type: 'pubkey';
        },
      ];
      returns: 'bool';
    },
    {
      name: 'hasRole';
      docs: [
        'Return whether the given address has the given role in the given store.',
        '',
        'This instruction checks if the provided address has the specified role in the given store',
        'and returns a boolean result.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](HasRole).*',
        '',
        '# Arguments',
        '- `authority`: The address to check for role membership.',
        '- `role`: The name of the role to check for the authority.',
        '',
        '# Returns',
        'Returns `true` if the address has the specified role, `false` otherwise.',
        '',
        '# Errors',
        '- The [`store`](HasRole::store) must be an initialized store account owned by',
        'the store program.',
        "- The `role` must exist and be enabled in the store's role configuration.",
      ];
      discriminator: [218, 136, 44, 87, 142, 247, 141, 195];
      accounts: [
        {
          name: 'store';
          docs: ['The store account in which the role is defined.'];
        },
      ];
      args: [
        {
          name: 'authority';
          type: 'pubkey';
        },
        {
          name: 'role';
          type: 'string';
        },
      ];
      returns: 'bool';
    },
    {
      name: 'initialize';
      docs: [
        'Create a new [`Store`](states::Store) account.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](Initialize).*',
        '',
        '# Arguments',
        "- `key`: The name of the store, used as a seed to derive the store account's address.",
        'The length must not exceed [`MAX_LEN`](states::Store::MAX_LEN).',
        '',
        '# Errors',
        '- The `key` must be empty unless the `multi-store` feature is enabled',
        '- The [`payer`](Initialize::payer) must be a signer',
        '- The [`authority`](Initialize::authority) must be as signer if it is provided.',
        '- The [`receiver`](Initialize::receiver) must be as signer if it is provided.',
        '- The [`holding`](Initialize::holding) must be as signer if it is provided.',
        '- The [`store`](Initialize::store) must not be initialized',
        '- The [`store`](Initialize::store) address must match the PDA derived from',
        'the seed of [`Store`](states::Store) and the SHA-256 hash of `key`',
      ];
      discriminator: [175, 175, 109, 31, 13, 152, 155, 237];
      accounts: [
        {
          name: 'payer';
          docs: ['The payer for the rent-exempt fee of the [`Store`] Account.'];
          writable: true;
          signer: true;
        },
        {
          name: 'authority';
          docs: [
            'The authority of the the [`Store`] account.',
            '',
            'If it is not specified, the `payer` will be set as the authority of this [`Store`] Account.',
          ];
          signer: true;
          optional: true;
        },
        {
          name: 'receiver';
          docs: [
            'The receiver address of the the [`Store`] account.',
            '',
            'Defaults to the authority address.',
          ];
          signer: true;
          optional: true;
        },
        {
          name: 'holding';
          docs: [
            'The holding address.',
            '',
            'Defaults to the authority address.',
          ];
          signer: true;
          optional: true;
        },
        {
          name: 'store';
          docs: [
            'The account to be used for creating the [`Store`] Account.',
            'Its address is a PDA derived from a constant [`SEED`](Store::SEED)',
            'and a hashed key as the seeds.',
          ];
          writable: true;
        },
        {
          name: 'systemProgram';
          docs: ['The [`System`] program.'];
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'key';
          type: 'string';
        },
      ];
    },
    {
      name: 'initializeCallbackAuthority';
      docs: [
        'Initialize the [`CallbackAuthority`](crate::states::callback::CallbackAuthority) account.',
      ];
      discriminator: [110, 241, 211, 153, 40, 189, 45, 180];
      accounts: [
        {
          name: 'payer';
          docs: ['Payer.'];
          writable: true;
          signer: true;
        },
        {
          name: 'callbackAuthority';
          docs: ['The callback authority account.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 97, 108, 108, 98, 97, 99, 107];
              },
            ];
          };
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
      name: 'initializeGlv';
      docs: [
        'Initialize a GLV token and the corresponding GLV account.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](InitializeGlv)*',
        '',
        '# Arguments',
        '- `index`: The index of the GLV. Used to derive the GLV token address.',
        '- `length`: The number of markets to include in the GLV.',
        '',
        '# Errors',
        '- The [`authority`](InitializeGlv::authority) must be a signer and have',
        'MARKET_KEEPER role in the store.',
        '- The [`store`](InitializeGlv::store) must be properly initialized.',
        '- The [`glv_token`](InitializeGlv::glv_token) must be:',
        '- Uninitialized',
        '- Address must be PDA derived from [`GLV_TOKEN_SEED`](crate::states::Glv::GLV_TOKEN_SEED),',
        '[`store`] and `index`',
        '- The [`glv`](InitializeGlv::glv) must be:',
        '- Uninitialized',
        '- Address must be PDA derived from the SEED of [`Glv`](states::Glv) and the address of the',
        '[`glv_token`](InitializeGlv::glv_token)',
        '- The remaining required accounts are documented in [`InitializeGlv`].',
        '- The `length` must be:',
        '- Greater than 0',
        '- Less than or equal to [`Glv::MAX_ALLOWED_NUMBER_OF_MARKETS`](crate::states::Glv::MAX_ALLOWED_NUMBER_OF_MARKETS)',
      ];
      discriminator: [175, 40, 40, 75, 146, 192, 27, 112];
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
        },
        {
          name: 'glvToken';
          docs: ['Glv token.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [103, 108, 118, 95, 116, 111, 107, 101, 110];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'arg';
                path: 'index';
              },
            ];
          };
        },
        {
          name: 'glv';
          docs: ['Glv account.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [103, 108, 118];
              },
              {
                kind: 'account';
                path: 'glvToken';
              },
            ];
          };
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          address: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
        },
        {
          name: 'marketTokenProgram';
        },
        {
          name: 'associatedTokenProgram';
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
      ];
      args: [
        {
          name: 'index';
          type: 'u16';
        },
        {
          name: 'length';
          type: 'u16';
        },
      ];
    },
    {
      name: 'initializeGt';
      docs: [
        'Initialize GT Mint.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](InitializeGt)*',
        '',
        '# Arguments',
        '- `decimals`: The number of decimal places for the GT token.',
        '- `initial_minting_cost`: The initial cost for minting GT.',
        '- `grow_factor`: The multiplier that increases minting cost for each step.',
        '- `grow_step`: The step size (in GT amount) for minting cost increase.',
        '- `ranks`: Array of GT token thresholds that define user rank boundaries.',
        '',
        '# Errors',
        '- The [`authority`](InitializeGt::authority) must be a signer and have the MARKET_KEEPER role in the `store`.',
        '- The [`store`](InitializeGt::store) must be properly initialized.',
        '- The GT state must not already be initialized.',
        '- The arguments must be valid. See `init` method of [`GtState`](states::gt::GtState) for detailed validation logic.',
      ];
      discriminator: [208, 0, 173, 158, 133, 227, 247, 47];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority'];
          writable: true;
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          writable: true;
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'decimals';
          type: 'u8';
        },
        {
          name: 'initialMintingCost';
          type: 'u128';
        },
        {
          name: 'growFactor';
          type: 'u128';
        },
        {
          name: 'growStep';
          type: 'u64';
        },
        {
          name: 'ranks';
          type: {
            vec: 'u64';
          };
        },
      ];
    },
    {
      name: 'initializeMarket';
      docs: [
        'Initialize a [`Market`](states::Market) account.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts.*](InitializeMarket)',
        '',
        '# Arguments',
        '- `index_token_mint`: The address of the index token.',
        '- `name`: The name of the market.',
        '- `enable`: Whether to enable the market after initialization.',
        '',
        '# Errors',
        '- The [`authority`](InitializeMarket::authority) must be a signer and have the MARKET_KEEPER role',
        'in the store.',
        '- The [`store`](InitializeMarket::store) must be initialized.',
        '- The [`market_token_mint`](InitializeMarket::market_token_mint) must be uninitialized',
        'and a PDA derived from the expected seeds.',
        '- The [`market`](InitializeMarket::market) must be uninitialized and a PDA derived from',
        'the expected seeds (see the documentation for [`market`](InitializeMarket::market) for details).',
        '- The [`token_map`](InitializeMarket::token_map) must be initialized and must be owned and',
        'authorized by the `store`.',
        '- The [`long_token_vault`](InitializeMarket::long_token_vault) and',
        '[`short_token_vault`](InitializeMarket::short_token_vault) must be initialized',
        'and valid market vault accounts of the store for their respective tokens.',
        '- The long and short token mints must be valid Mint accounts.',
      ];
      discriminator: [35, 35, 189, 193, 155, 48, 170, 203];
      accounts: [
        {
          name: 'authority';
          docs: ['The address authorized to execute this instruction.'];
          writable: true;
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store account.'];
          relations: ['tokenMap'];
        },
        {
          name: 'marketTokenMint';
          docs: ['Market token mint.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  109,
                  105,
                  110,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'arg';
                path: 'indexTokenMint';
              },
              {
                kind: 'account';
                path: 'longTokenMint';
              },
              {
                kind: 'account';
                path: 'shortTokenMint';
              },
            ];
          };
        },
        {
          name: 'longTokenMint';
          docs: ['Long token.'];
        },
        {
          name: 'shortTokenMint';
          docs: ['Short token.'];
        },
        {
          name: 'market';
          docs: ['The market account.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [109, 97, 114, 107, 101, 116];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'marketTokenMint';
              },
            ];
          };
        },
        {
          name: 'tokenMap';
          docs: ['The token map account.'];
          relations: ['store'];
        },
        {
          name: 'longTokenVault';
          docs: ['Long token vault must exist.'];
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'longTokenMint';
              },
            ];
          };
        },
        {
          name: 'shortTokenVault';
          docs: ['Short token vault must exist.'];
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'shortTokenMint';
              },
            ];
          };
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
      ];
      args: [
        {
          name: 'indexTokenMint';
          type: 'pubkey';
        },
        {
          name: 'name';
          type: 'string';
        },
        {
          name: 'enable';
          type: 'bool';
        },
      ];
    },
    {
      name: 'initializeMarketConfigBuffer';
      docs: [
        'Initialize a market config buffer account.',
        '',
        'This instruction creates a new market config buffer account that can be used to stage market',
        'configuration changes before applying them. The buffer has an expiration time after which',
        'it cannot be used.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts.*](InitializeMarketConfigBuffer)',
        '',
        '# Arguments',
        '- `expire_after_secs`: The number of seconds after which this buffer account will expire.',
        'Once expired, the buffer can no longer be used and must be closed.',
        '',
        '# Errors',
        '- The [`authority`](InitializeMarketConfigBuffer::authority) must be a signer and will be',
        'set as the owner of the buffer account.',
        '- The [`store`](InitializeMarketConfigBuffer::store) must be an initialized store account',
        'owned by the program.',
        '- The [`buffer`](InitializeMarketConfigBuffer::buffer) must be an uninitialized account',
        'that will store the market configuration data.',
        '- The expiration time must be greater than zero.',
      ];
      discriminator: [146, 13, 232, 205, 56, 48, 11, 48];
      accounts: [
        {
          name: 'authority';
          docs: ['The caller.'];
          writable: true;
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
        },
        {
          name: 'buffer';
          docs: ['Buffer account to create.'];
          writable: true;
          signer: true;
        },
        {
          name: 'systemProgram';
          docs: ['System Program.'];
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'expireAfterSecs';
          type: 'u32';
        },
      ];
    },
    {
      name: 'initializeMarketVault';
      docs: [
        'Initialize a new market vault for a specific token.',
        '',
        'This instruction creates a new vault account that will be used to store tokens for a market.',
        'The vault is a PDA (Program Derived Address) account that can only be controlled by this program.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts.*](InitializeMarketVault)',
        '',
        '# Errors',
        '- The [`authority`](InitializeMarketVault::authority) must be a signer and have MARKET_KEEPER',
        'permissions in the store.',
        '- The [`store`](InitializeMarketVault::store) must be an initialized store account.',
        '- The [`vault`](InitializeMarketVault::vault) must be an uninitialized account and its address',
        'must match the PDA derived from the expected seeds.',
      ];
      discriminator: [25, 102, 203, 119, 151, 20, 143, 222];
      accounts: [
        {
          name: 'authority';
          docs: ['The caller.'];
          writable: true;
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
        },
        {
          name: 'mint';
          docs: ['Token mint.'];
        },
        {
          name: 'vault';
          docs: ['The vault to create.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'mint';
              },
            ];
          };
        },
        {
          name: 'systemProgram';
          docs: ['System Program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          docs: ['Token Program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
      ];
      args: [];
    },
    {
      name: 'initializeOracle';
      docs: [
        'Initialize a new oracle account for the given store.',
        '',
        'This instruction creates a new oracle account that will be owned by the store. The oracle',
        "account is used to store price data for tokens configured in the store's token map.",
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](InitializeOracle)*',
        '',
        '# Errors',
        '- The [`store`](InitializeOracle::store) must be an initialized [`Store`](states::Store)',
        'account owned by the store program.',
        '- The [`oracle`](InitializeOracle::oracle) account must be uninitialized.',
      ];
      discriminator: [144, 223, 131, 120, 196, 253, 181, 99];
      accounts: [
        {
          name: 'payer';
          docs: ['The payer.'];
          signer: true;
        },
        {
          name: 'authority';
          docs: ['The authority of the oracle.'];
        },
        {
          name: 'store';
          docs: [
            'The store account that will be the owner of the oracle account.',
          ];
        },
        {
          name: 'oracle';
          docs: ['The new oracle account.'];
          writable: true;
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
      ];
      args: [];
    },
    {
      name: 'initializePriceFeed';
      docs: [
        'Initialize a custom price feed account.',
        '',
        'Creates a new price feed account that can be used to provide custom price data for a token.',
        'The price feed is owned by the store and can only be updated by ORDER_KEEPERs.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](InitializePriceFeed)*',
        '',
        '# Arguments',
        '- `index`: The oracle index this price feed will be associated with.',
        '- `provider`: The price provider kind index that will be used for this feed. Must be a valid',
        'index from [`PriceProviderKind`] that supports custom price feeds.',
        '- `token`: The mint address of the token this price feed will provide prices for.',
        '- `feed_id`: The feed ID defined by the price provider.',
        '',
        '# Errors',
        '- The [`authority`](InitializePriceFeed::authority) must be a signer and have the PRICE_KEEPER',
        'role in the store.',
        '- The [`store`](InitializePriceFeed::store) must be an initialized store account owned by',
        'the store program.',
        '- The [`price_feed`](InitializePriceFeed::price_feed) must be uninitialized and its address',
        'must match the PDA derived from the `store`, `index`, `feed_id`, and other expected seeds.',
        '- The `provider` index must correspond to a valid [`PriceProviderKind`] that supports',
        'custom price feeds.',
      ];
      discriminator: [68, 180, 81, 20, 102, 213, 145, 233];
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
        },
        {
          name: 'priceFeed';
          docs: ['Price feed.'];
          writable: true;
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'index';
          type: 'u16';
        },
        {
          name: 'provider';
          type: 'u8';
        },
        {
          name: 'token';
          type: 'pubkey';
        },
        {
          name: 'feedId';
          type: 'pubkey';
        },
      ];
    },
    {
      name: 'initializeReferralCode';
      docs: [
        'Initialize referral code.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](InitializeReferralCode)*',
        '',
        '# Arguments',
        '- `code`: The referral code to initialize and associate with the user.',
        '',
        '# Errors',
        '- The [`owner`](InitializeReferralCode::owner) must be a signer.',
        '- The [`store`](InitializeReferralCode::store) must be properly initialized.',
        '- The [`referral_code`](InitializeReferralCode::referral_code) account must be uninitialized.',
        '- The [`user`](InitializeReferralCode::user) account must be:',
        '- Properly initialized',
        '- Correspond to the `owner`',
        '- Not already have an associated referral code',
        '- The provided `code` must not already be in use by another user.',
      ];
      discriminator: [79, 123, 26, 247, 241, 74, 176, 20];
      accounts: [
        {
          name: 'owner';
          docs: ['Owner.'];
          writable: true;
          signer: true;
          relations: ['user'];
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['user'];
        },
        {
          name: 'referralCode';
          docs: ['Referral Code Account.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  114,
                  101,
                  102,
                  101,
                  114,
                  114,
                  97,
                  108,
                  95,
                  99,
                  111,
                  100,
                  101,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'arg';
                path: 'code';
              },
            ];
          };
        },
        {
          name: 'user';
          docs: ['User Account.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
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
          name: 'code';
          type: {
            array: ['u8', 8];
          };
        },
      ];
    },
    {
      name: 'initializeTokenMap';
      docs: [
        'Initialize a new token map account with its store set to [`store`](InitializeTokenMap::store).',
        '',
        'Anyone can initialize a token map account without any permissions, but after initialization, only',
        'addresses authorized by the store can modify this token map (i.e. have the `MARKET_KEEPER` role).',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](InitializeTokenMap)*',
        '',
        '# Errors',
        '- The [`payer`](InitializeTokenMap::payer) must be a signer.',
        '- The [`store`](InitializeTokenMap::store) must be an initialized [`Store`](states::Store)',
        'account owned by the store program.',
        '- The [`token_map`](InitializeTokenMap::token_map) must be an uninitialized account.',
      ];
      discriminator: [28, 80, 213, 31, 142, 225, 116, 117];
      accounts: [
        {
          name: 'payer';
          docs: ['The payer.'];
          writable: true;
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store account for the token map.'];
        },
        {
          name: 'tokenMap';
          docs: ['The token map account to be initialized.'];
          writable: true;
          signer: true;
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
      ];
      args: [];
    },
    {
      name: 'insertAddress';
      docs: [
        "Insert an address value into the store's global configuration.",
        '',
        "This instruction allows a CONFIG_KEEPER to set or update an address value in the store's",
        'configuration. The key must be one of the predefined address keys.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](InsertConfig).*',
        '',
        '# Arguments',
        '- `key`: The configuration key to update. Must be a valid address key defined in',
        '[`AddressKey`](crate::states::AddressKey).',
        '- `address`: The address value to store for this configuration key.',
        '',
        '# Errors',
        '- The [`authority`](InsertConfig::authority) must be a signer and have the CONFIG_KEEPER role',
        'in the store.',
        '- The provided `key` must be defined in [`AddressKey`](crate::states::AddressKey).',
        '- The store must be initialized and owned by this program.',
      ];
      discriminator: [119, 10, 254, 2, 233, 216, 218, 152];
      accounts: [
        {
          name: 'authority';
          docs: ['Caller.'];
          writable: true;
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          writable: true;
        },
      ];
      args: [
        {
          name: 'key';
          type: 'string';
        },
        {
          name: 'address';
          type: 'pubkey';
        },
      ];
    },
    {
      name: 'insertAmount';
      docs: [
        "Insert an amount value into the store's global configuration.",
        '',
        "This instruction allows a CONFIG_KEEPER to set or update an amount value in the store's",
        'configuration. The key must be one of the predefined amount keys.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](InsertConfig).*',
        '',
        '# Arguments',
        '- `key`: The configuration key to update. Must be a valid amount key defined in',
        '[`AmountKey`](crate::states::AmountKey).',
        '- `amount`: The amount value to store for this configuration key.',
        '',
        '# Errors',
        '- The [`authority`](InsertConfig::authority) must be a signer and have the CONFIG_KEEPER role',
        'in the store.',
        '- The provided `key` must be defined in [`AmountKey`](crate::states::AmountKey).',
        '- The store must be initialized and owned by this program.',
      ];
      discriminator: [56, 254, 136, 216, 68, 134, 2, 144];
      accounts: [
        {
          name: 'authority';
          docs: ['Caller.'];
          writable: true;
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          writable: true;
        },
      ];
      args: [
        {
          name: 'key';
          type: 'string';
        },
        {
          name: 'amount';
          type: 'u64';
        },
      ];
    },
    {
      name: 'insertFactor';
      docs: [
        "Insert a factor value into the store's global configuration.",
        "This instruction allows a CONFIG_KEEPER to set or update a factor value in the store's",
        'configuration. The key must be one of the predefined factor keys.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](InsertConfig).*',
        '',
        '# Arguments',
        '- `key`: The configuration key to update. Must be a valid factor key defined in',
        '[`FactorKey`](crate::states::FactorKey).',
        '- `factor`: The factor value to store for this configuration key.',
        '',
        '# Errors',
        '- The [`authority`](InsertConfig::authority) must be a signer and have the CONFIG_KEEPER role',
        'in the store.',
        '- The provided `key` must be defined in [`FactorKey`](crate::states::FactorKey).',
        '- The store must be initialized and owned by this program.',
      ];
      discriminator: [56, 41, 238, 140, 172, 21, 108, 230];
      accounts: [
        {
          name: 'authority';
          docs: ['Caller.'];
          writable: true;
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          writable: true;
        },
      ];
      args: [
        {
          name: 'key';
          type: 'string';
        },
        {
          name: 'factor';
          type: 'u128';
        },
      ];
    },
    {
      name: 'insertGlvMarket';
      docs: [
        'Insert a new market to the GLV.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](InsertGlvMarket)*',
        '',
        '# Errors',
        '- The [`authority`](InsertGlvMarket::authority) must be:',
        '- A signer',
        '- Have MARKET_KEEPER role in the `store`',
        '- The [`store`](InsertGlvMarket::store) must be properly initialized.',
        '- The [`glv`](InsertGlvMarket::glv) must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- The [`market_token`](InsertGlvMarket::market_token) must be:',
        '- A initialized SPL Token / Token-2022 mint',
        '- Have `store` as its mint authority',
        '- Not already contains in the given GLV',
        '- The [`market`](InsertGlvMarket::market) must be:',
        '- A initialized market account owned by the `store`',
        '- Must have `market_token` as its market token',
        '- Must have the same long token and short token as the GLV',
        '- Must be enabled',
        '- The [`vault`](InsertGlvMarket::vault) must be either:',
        '- The ATA of `market_token` owned by `glv`, or',
        '- Uninitialized ATA account of `market_token` owned by `glv`',
      ];
      discriminator: [31, 15, 125, 218, 90, 89, 81, 75];
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
          relations: ['glv', 'market'];
        },
        {
          name: 'glv';
          docs: ['GLV to modify.'];
          writable: true;
        },
        {
          name: 'marketToken';
          docs: ['Market token.'];
        },
        {
          name: 'market';
          docs: ['Market.'];
        },
        {
          name: 'vault';
          docs: ['Vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glv';
              },
              {
                kind: 'account';
                path: 'tokenProgram';
              },
              {
                kind: 'account';
                path: 'marketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'systemProgram';
          docs: ['System program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          docs: ['Token program for market token.'];
        },
        {
          name: 'associatedTokenProgram';
          docs: ['Associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
      ];
      args: [];
    },
    {
      name: 'insertOrderFeeDiscountForReferredUser';
      docs: [
        'Insert order fee discount for referred user factor to the global config.',
        '',
        'This instruction allows a MARKET_KEEPER to set or update the GT minting cost referred',
        "discount factor in the store's configuration. This factor determines the discount",
        'applied to GT minting costs for referred users.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](InsertConfig).*',
        '',
        '# Arguments',
        '- `factor`: The discount factor value to set.',
        '',
        '# Errors',
        '- The [`authority`](InsertConfig::authority) must be a signer and have the',
        'MARKET_KEEPER role in the store.',
        '- The store must be initialized and owned by this program.',
        '',
        '# Notes',
        '- While [`insert_factor`] can also modify this value, it requires CONFIG_KEEPER',
        'permissions instead of MARKET_KEEPER permissions required by this instruction.',
        '- The factor is stored under the [`FactorKey::OrderFeeDiscountForReferredUser`] key.',
      ];
      discriminator: [54, 88, 208, 238, 242, 83, 99, 66];
      accounts: [
        {
          name: 'authority';
          docs: ['Caller.'];
          writable: true;
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          writable: true;
        },
      ];
      args: [
        {
          name: 'factor';
          type: 'u128';
        },
      ];
    },
    {
      name: 'isTokenConfigEnabled';
      docs: [
        'Return whether the token config is enabled.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts*](ReadTokenMap).',
        '',
        '# Arguments',
        '- `token`: The address of the token to query for.',
        '',
        '# Errors',
        '- The [`token_map`](ReadTokenMap::token_map) must be an initialized token map account',
        'owned by the `store`.',
        '- The given `token` must exist in the token map.',
        '',
        '# Returns',
        'Returns `true` if the token config is enabled, `false` otherwise.',
      ];
      discriminator: [150, 121, 104, 152, 174, 109, 137, 136];
      accounts: [
        {
          name: 'tokenMap';
          docs: ['Token map.'];
        },
      ];
      args: [
        {
          name: 'token';
          type: 'pubkey';
        },
      ];
      returns: 'bool';
    },
    {
      name: 'liquidate';
      docs: [
        'Perform a liquidation by keepers.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](PositionCut)*',
        '',
        '# Arguments',
        '- `nonce`: The nonce used to derive the `order` PDA address.',
        '- `recent_timestamp`: A recent timestamp that must be within the valid time window.',
        '- `execution_fee`: The execution fee claimed to be used by the keeper.',
        '',
        '# Errors',
        '- The [`authority`](PositionCut::authority) must be a signer with the ORDER_KEEPER',
        'role in the `store`.',
        '- The [`owner`](PositionCut::owner) must be the owner of the position being liquidated.',
        '- The [`user`](PositionCut::user) must be an initialized user account corresponding to the',
        '`owner`.',
        '- The [`store`](PositionCut::store) must be initialized.',
        '- The [`token_map`](PositionCut::token_map) must be initialized and authorized by the',
        '`store`.',
        '- The [`oracle`](PositionCut::oracle) must be initialized, cleared and owned by the `store`.',
        '- The [`market`](PositionCut::market) must be:',
        '- Initialized and enabled',
        '- Owned by the `store`',
        '- Associated with the position being liquidated',
        '- The [`order`](PositionCut::order) must be:',
        '- Uninitialized',
        '- Have an address matching the PDA derived from the `store`, `owner`, provided',
        '`nonce` and other expected seeds',
        '- The [`position`](PositionCut::position) must be:',
        '- Validly initialized',
        '- Owned by both the `owner` and `store`',
        '- In a liquidatable state',
        '- The [`event`](PositionCut::event) must be a valid trade event buffer owned by both the',
        '`store` and `authority`.',
        '- The [`long_token`](PositionCut::long_token) and [`short_token`](PositionCut::short_token)',
        'must match those defined in the `market`.',
        '- Token escrow accounts must be:',
        '- Valid for their respective tokens',
        '- Owned by the `order`',
        '- Market vault accounts must be:',
        '- Valid market vault accounts for their respective tokens',
        '- Owned by the `store`',
        '- Claimable token accounts must be:',
        '- Valid for their respective tokens',
        '- Owned by the `store`',
        '- Properly delegated to their owners',
        '- Price feed accounts must be:',
        '- Valid and complete',
        "- Provided in order matching the market's sorted token list",
        '- The liquidation feature must be enabled in the `store`.',
        '- Oracle prices must be valid and complete.',
      ];
      discriminator: [223, 179, 226, 125, 48, 46, 39, 74];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          writable: true;
          signer: true;
          relations: ['event'];
        },
        {
          name: 'owner';
          docs: ['The owner of the position.'];
          writable: true;
          relations: ['user'];
        },
        {
          name: 'user';
          docs: ['User Account.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
              },
            ];
          };
        },
        {
          name: 'store';
          docs: ['Store.'];
          writable: true;
          relations: ['user', 'tokenMap', 'oracle', 'market', 'event'];
        },
        {
          name: 'tokenMap';
          docs: ['Token map.'];
          relations: ['store'];
        },
        {
          name: 'oracle';
          docs: ['Buffer for oracle prices.'];
          writable: true;
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
        {
          name: 'order';
          docs: ['The order to be created.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [111, 114, 100, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'authority';
              },
              {
                kind: 'arg';
                path: 'nonce';
              },
            ];
          };
        },
        {
          name: 'position';
          writable: true;
        },
        {
          name: 'event';
          docs: ['Trade event buffer.'];
          writable: true;
        },
        {
          name: 'longToken';
          docs: ['Long token.'];
        },
        {
          name: 'shortToken';
          docs: ['Short token.'];
        },
        {
          name: 'longTokenEscrow';
          docs: ['The escrow account for long tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'longToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'shortTokenEscrow';
          docs: ['The escrow account for short tokens.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'order';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'shortToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'longTokenVault';
          docs: ['Long token vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'long_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'shortTokenVault';
          docs: ['Short token vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'short_token_vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'claimableLongTokenAccountForUser';
          writable: true;
        },
        {
          name: 'claimableShortTokenAccountForUser';
          writable: true;
        },
        {
          name: 'claimablePnlTokenAccountForHolding';
          writable: true;
        },
        {
          name: 'systemProgram';
          docs: ['Initial collateral token vault.', 'The system program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          docs: ['The token program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          docs: ['The associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'chainlinkProgram';
          docs: ['Chainlink Program.'];
          optional: true;
          address: 'HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'nonce';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'recentTimestamp';
          type: 'i64';
        },
        {
          name: 'executionFee';
          type: 'u64';
        },
      ];
    },
    {
      name: 'marketTransferIn';
      docs: [
        'Transfer tokens into the market and record the amounts in its balance.',
        '',
        'This instruction allows a MARKET_KEEPER to transfer tokens from a source account into one of',
        "the market vault accounts, updating the market's internal balance tracking.",
        '',
        '# Accounts',
        '[*See the documentation for the accounts.*](MarketTransferIn)',
        '',
        '# Arguments',
        '- `amount`: The amount of tokens to transfer into the market vault.',
        '',
        '# Errors',
        '- The [`authority`](MarketTransferIn::authority) must be a signer and have the MARKET_KEEPER',
        'role in the store.',
        '- The [`store`](MarketTransferIn::store) must be an initialized store account owned by this program.',
        '- The [`from_authority`](MarketTransferIn::from_authority) must be a signer and have the',
        'permission to transfer.',
        '- The [`market`](MarketTransferIn::market) must be an initialized market account owned by the store.',
        '- The [`from`](MarketTransferIn::from) must be an initialized token account and cannot be the',
        'same as the destination vault.',
        '- The [`vault`](MarketTransferIn::vault) must be an initialized and valid market vault token',
        'account owned by the store. It must have the same mint as the `from` token account.',
        "- The market must be enabled and the token being transferred must be one of the market's",
        'configured pool tokens (long token or short token).',
        '- The source token account must have sufficient balance for the transfer amount.',
      ];
      discriminator: [177, 41, 34, 195, 160, 64, 216, 147];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['market'];
        },
        {
          name: 'fromAuthority';
          docs: ['The authority of the source account.'];
          signer: true;
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
        {
          name: 'from';
          docs: ['The source account.'];
          writable: true;
        },
        {
          name: 'vault';
          docs: ['The market vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'vault.mint';
                account: 'tokenAccount';
              },
            ];
          };
        },
        {
          name: 'tokenProgram';
          docs: ['Token Program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'amount';
          type: 'u64';
        },
      ];
    },
    {
      name: 'migrateReferralCode';
      discriminator: [32, 248, 199, 115, 236, 124, 65, 140];
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
        },
        {
          name: 'system';
          docs: ['System program.'];
          address: '11111111111111111111111111111111';
        },
      ];
      args: [];
    },
    {
      name: 'prepareAssociatedTokenAccount';
      docs: [
        'Prepare an associated token account.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](PrepareAssociatedTokenAccount)*',
        '',
        '# Errors',
        '- The [`payer`](PrepareAssociatedTokenAccount::payer) must be a signer.',
        '- The [`mint`](PrepareAssociatedTokenAccount::mint) must be a [`Mint`](anchor_spl::token_interface::Mint)',
        'account that is owned by the given token program.',
        '- The [`account`](PrepareAssociatedTokenAccount::account) must be an associated token account',
        'with:',
        '- mint = [`mint`](PrepareAssociatedTokenAccount::mint)',
        '- owner = [`owner`](PrepareAssociatedTokenAccount::owner)',
        '- It can be uninitialized.',
      ];
      discriminator: [28, 102, 183, 89, 155, 198, 28, 0];
      accounts: [
        {
          name: 'payer';
          docs: ['The payer.'];
          writable: true;
          signer: true;
        },
        {
          name: 'owner';
        },
        {
          name: 'mint';
          docs: ['The mint account for the token account.'];
        },
        {
          name: 'account';
          docs: ['The token account to prepare.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'owner';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'mint';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'systemProgram';
          docs: ['The [`System`] program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          docs: ['The [`Token`] program.'];
        },
        {
          name: 'associatedTokenProgram';
          docs: ['The [`AssociatedToken`] program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
      ];
      args: [];
    },
    {
      name: 'prepareGtExchangeVault';
      docs: [
        'Prepare a GT exchange vault.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](PrepareGtExchangeVault)*',
        '',
        '# Arguments',
        '- `time_window_index`: The index of the current time window.',
        '- `time_window`: The current GT exchange time window in seconds.',
        '',
        '# Errors',
        '- The [`payer`](PrepareGtExchangeVault::payer) must be a signer.',
        '- The [`store`](PrepareGtExchangeVault::store) must be properly initialized.',
        '- The GT state of the `store` must be initialized.',
        '- The [`vault`](PrepareGtExchangeVault::vault) must be either:',
        '- Uninitialized, or',
        '- Properly initialized, owned by the `store`, and have matching `time_window_index`',
        'and `time_window` values',
        '- The provided `time_window_index` must match the current time window index.',
      ];
      discriminator: [18, 155, 190, 88, 59, 109, 0, 253];
      accounts: [
        {
          name: 'payer';
          writable: true;
          signer: true;
        },
        {
          name: 'store';
        },
        {
          name: 'vault';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
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
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'arg';
                path: 'timeWindowIndex';
              },
              {
                kind: 'account';
                path: 'store';
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
          name: 'timeWindowIndex';
          type: 'i64';
        },
      ];
    },
    {
      name: 'preparePosition';
      docs: [
        'Prepare the position account for orders.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](PreparePosition)*',
        '',
        '# Arguments',
        '- `params`: Order Parameters.',
        '',
        '# Errors',
        'This instruction will fail if:',
        '- The [`owner`](PreparePosition::owner) is not a signer or has insufficient balance for the',
        'rent.',
        '- The [`store`](PreparePosition::store) is not properly initialized.',
        '- The [`market`](PreparePosition::market) is not initialized, is disabled, or not owned by',
        'the `store`.',
        '- The [`position`](PreparePosition::position) address is not a valid PDA derived from the',
        '`owner` and expected seeds.',
        '- The position account is neither uninitialized nor validly initialized with `store` as the',
        'store and `owner` as the owner.',
      ];
      discriminator: [178, 215, 55, 90, 137, 15, 108, 15];
      accounts: [
        {
          name: 'owner';
          docs: ['The owner of the order to be created.'];
          writable: true;
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['market'];
        },
        {
          name: 'market';
          docs: ['Market.'];
        },
        {
          name: 'position';
          docs: ['The position.'];
          writable: true;
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'params';
          type: {
            defined: {
              name: 'createOrderParams';
            };
          };
        },
      ];
    },
    {
      name: 'prepareTradeEventBuffer';
      docs: [
        'Prepare a trade event buffer.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](PrepareTradeEventBuffer)*',
        '',
        '# Arguments',
        '- `index`: The index of the trade event buffer to prepare.',
        '',
        '# Errors',
        '- The [`authority`](PrepareTradeEventBuffer::authority) must be a signer.',
        '- The [`store`](PrepareTradeEventBuffer::store) must be initialized.',
        '- The [`event`](PrepareTradeEventBuffer::event) must be either:',
        '- Uninitialized, or',
        '- Already initialized with the `authority` as the authority and the `store` as',
        'the store',
      ];
      discriminator: [142, 10, 203, 67, 106, 166, 50, 135];
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
        },
        {
          name: 'event';
          docs: ['Trade Event Buffer.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  116,
                  114,
                  97,
                  100,
                  101,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  100,
                  97,
                  116,
                  97,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'authority';
              },
              {
                kind: 'arg';
                path: 'index';
              },
            ];
          };
        },
        {
          name: 'systemProgram';
          docs: ['System Program.'];
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'index';
          type: 'u16';
        },
      ];
    },
    {
      name: 'prepareUser';
      docs: [
        'Initialize or validate a User Account.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](PrepareUser)*',
        '',
        '# Errors',
        '- The [`owner`](PrepareUser::owner) must be a signer.',
        '- The [`store`](PrepareUser::store) must be properly initialized.',
        '- The [`user`](PrepareUser::user) must be either:',
        '- Uninitialized (for new account creation)',
        '- Or validly initialized and correspond to the `owner`',
      ];
      discriminator: [190, 173, 143, 193, 139, 80, 231, 133];
      accounts: [
        {
          name: 'owner';
          docs: ['Owner.'];
          writable: true;
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
        },
        {
          name: 'user';
          docs: ['User Account.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
              },
            ];
          };
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [];
    },
    {
      name: 'pushToMarketConfigBuffer';
      docs: [
        'Push config items to the given market config buffer account.',
        '',
        'This instruction allows the authority to add new configuration items to their market',
        'config buffer account. The buffer will be reallocated to accommodate the new items,',
        'with the authority paying for any additional rent.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts.*](PushToMarketConfigBuffer)',
        '',
        '# Arguments',
        '- `new_configs`: The list of new config items to append to the buffer. Each item',
        'consists of a string key and a factor value.',
        '',
        '# Errors',
        '- The [`authority`](PushToMarketConfigBuffer::authority) must be a signer',
        'and the owner of the `buffer` account.',
        '- The [`buffer`](PushToMarketConfigBuffer::buffer) must be an initialized',
        'market config buffer account.',
        '- The authority must have enough SOL to pay for any additional rent needed.',
        '- The keys in `new_configs` must be valid [`MarketConfigKey`](states::market::config::MarketConfigKey).',
      ];
      discriminator: [91, 58, 203, 22, 242, 135, 100, 245];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          writable: true;
          signer: true;
          relations: ['buffer'];
        },
        {
          name: 'buffer';
          docs: ['Buffer.'];
          writable: true;
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'newConfigs';
          type: {
            vec: {
              defined: {
                name: 'entryArgs';
              };
            };
          };
        },
      ];
    },
    {
      name: 'pushToTokenMap';
      docs: [
        'Push a new token config to the given token map.',
        '',
        'This instruction is used to add or update the token config for an existing token.',
        "The token's decimals will be automatically set based on the token mint account.",
        '',
        '# Accounts',
        '[*See the documentation for the accounts*](PushToTokenMap).',
        '',
        '# Arguments',
        '- `name`: The token identifier (e.g. "WSOL", "WBTC")',
        '- `builder`: Configuration builder containing token parameters',
        '- `enable`: If true, enables this token config after pushing. If false, disables it.',
        '- `new`: If true, requires this to be a new token config. An error will be returned if',
        'a config already exists for this token. If false, allows updating existing configs.',
        '',
        '# Errors',
        '- The [`authority`](PushToTokenMap::authority) must be a signer with the MARKET_KEEPER role',
        '- The [`store`](PushToTokenMap::store) must be an initialized [`Store`](states::Store)',
        'account owned by the store program.',
        '- The [`token_map`](PushToTokenMap::token_map) must be initialized and owned by the `store`.',
        '- The [`token`](PushToTokenMap::token) must be a valid SPL token mint account.',
        '- If `new` is true, the token must not already have a config in the map.',
      ];
      discriminator: [90, 1, 207, 212, 230, 216, 131, 18];
      accounts: [
        {
          name: 'authority';
          docs: ['The authority of the instruction.'];
          writable: true;
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store that owns the token map.'];
          relations: ['tokenMap'];
        },
        {
          name: 'tokenMap';
          docs: ['The token map to push config to.'];
          writable: true;
        },
        {
          name: 'token';
          docs: ['The token to push config for.'];
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'name';
          type: 'string';
        },
        {
          name: 'builder';
          type: {
            defined: {
              name: 'updateTokenConfigParams';
            };
          };
        },
        {
          name: 'enable';
          type: 'bool';
        },
        {
          name: 'new';
          type: 'bool';
        },
      ];
    },
    {
      name: 'pushToTokenMapSynthetic';
      docs: [
        'Push a new synthetic token config to the given token map.',
        '',
        "This instruction allows adding or updating token configurations for synthetic tokens that don't have",
        'an actual SPL token mint account. Unlike regular tokens where decimals are read from the mint,',
        'synthetic tokens specify their decimals directly through the `token_decimals` parameter.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts*](PushToTokenMapSynthetic).',
        '',
        '# Arguments',
        '- `name`: The identifier for the synthetic token (e.g. "BTC")',
        "- `token`: The public key to use as the synthetic token's address",
        "- `token_decimals`: Number of decimals for the synthetic token's amounts",
        '- `builder`: Configuration builder containing token parameters',
        '- `enable`: If true, enables this token config after pushing. If false, disables it.',
        '- `new`: If true, requires this to be a new token config. An error will be returned if',
        'a config already exists for this token. If false, allows updating the existing config.',
        '',
        '# Errors',
        '- The [`authority`](PushToTokenMapSynthetic::authority) must be a signer with the MARKET_KEEPER role.',
        '- The [`store`](PushToTokenMapSynthetic::store) must be an initialized [`Store`](states::Store)',
        'account owned by the store program.',
        '- The [`token_map`](PushToTokenMapSynthetic::token_map) must be initialized and owned by the `store`.',
        '- If updating an existing config, the `token_decimals` must match the original value.',
        '- If `new` is true, the token must not already have a config in the map.',
      ];
      discriminator: [157, 152, 190, 7, 162, 194, 61, 237];
      accounts: [
        {
          name: 'authority';
          docs: ['The authority of the instruction.'];
          writable: true;
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store that owns the token map.'];
          relations: ['tokenMap'];
        },
        {
          name: 'tokenMap';
          docs: ['The token map to push config to.'];
          writable: true;
        },
        {
          name: 'systemProgram';
          docs: ['The system program.'];
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'name';
          type: 'string';
        },
        {
          name: 'token';
          type: 'pubkey';
        },
        {
          name: 'tokenDecimals';
          type: 'u8';
        },
        {
          name: 'builder';
          type: {
            defined: {
              name: 'updateTokenConfigParams';
            };
          };
        },
        {
          name: 'enable';
          type: 'bool';
        },
        {
          name: 'new';
          type: 'bool';
        },
      ];
    },
    {
      name: 'removeGlvMarket';
      docs: [
        'Remove a market from the GLV.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](RemoveGlvMarket)*',
        '',
        '# Errors',
        '- The [`authority`](RemoveGlvMarket::authority) must:',
        '- Be a signer',
        '- Have MARKET_KEEPER role in the `store`',
        '- The [`store`](RemoveGlvMarket::store) must be properly initialized.',
        '- The [`glv`](RemoveGlvMarket::glv) must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- The [`market_token`](RemoveGlvMarket::market_token) must be:',
        '- A initialized SPL Token mint',
        '- Having `store` as its mint authority',
        '- Contained in the given GLV',
        '- Having deposit disabled in the GLV',
        '- The [`vault`](RemoveGlvMarket::vault) must be:',
        '- The ATA of `market_token` owned by `glv`',
        '- Having no remaining balance',
      ];
      discriminator: [179, 99, 98, 104, 139, 13, 225, 231];
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
          relations: ['glv'];
        },
        {
          name: 'storeWallet';
          docs: ['The store wallet.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  115,
                  116,
                  111,
                  114,
                  101,
                  95,
                  119,
                  97,
                  108,
                  108,
                  101,
                  116,
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
          name: 'glv';
          docs: ['GLV to modify.'];
          writable: true;
        },
        {
          name: 'marketToken';
          docs: ['Market token.'];
        },
        {
          name: 'vault';
          docs: ['Vault.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'glv';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'marketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'storeWalletAta';
          docs: ['Store wallet ATA.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'storeWallet';
              },
              {
                kind: 'const';
                value: [
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
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'marketToken';
              },
            ];
            program: {
              kind: 'const';
              value: [
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
                89,
              ];
            };
          };
        },
        {
          name: 'tokenProgram';
          docs: ['Token program.'];
        },
        {
          name: 'associatedTokenProgram';
          docs: ['Associated token program.'];
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
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
      name: 'requestGtExchange';
      docs: [
        'Request a GT exchange.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](RequestGtExchange)*',
        '',
        '# Arguments',
        '- `amount`: The amount of GT to exchange for rewards.',
        '',
        '# Errors',
        '- The [`owner`](RequestGtExchange::owner) must be a signer.',
        '- The [`store`](RequestGtExchange::store) must be properly initialized with an initialized GT state.',
        '- The [`user`](RequestGtExchange::user) must be properly initialized and correspond to the `owner`.',
        '- The [`vault`](RequestGtExchange::vault) must be properly initialized, owned by the `store`,',
        'and currently accepting deposits (not yet confirmed).',
        '- The [`exchange`](RequestGtExchange::exchange) must be either:',
        '- Uninitialized, or',
        '- Properly initialized and owned by both the `owner` and `vault`',
        '- The `amount` must be:',
        '- Greater than 0',
        "- Not exceed the owner's available (excluding reserved) GT balance in their user account",
      ];
      discriminator: [117, 72, 255, 69, 200, 107, 238, 88];
      accounts: [
        {
          name: 'owner';
          writable: true;
          signer: true;
          relations: ['user'];
        },
        {
          name: 'store';
          writable: true;
          relations: ['user', 'vault'];
        },
        {
          name: 'user';
          docs: ['User Account.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
              },
            ];
          };
        },
        {
          name: 'vault';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
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
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'vault';
              },
              {
                kind: 'account';
                path: 'vault';
              },
            ];
          };
        },
        {
          name: 'exchange';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [103, 116, 95, 101, 120, 99, 104, 97, 110, 103, 101];
              },
              {
                kind: 'account';
                path: 'vault';
              },
              {
                kind: 'account';
                path: 'owner';
              },
            ];
          };
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'amount';
          type: 'u64';
        },
      ];
    },
    {
      name: 'revokeRole';
      docs: [
        'Revoke a role from the given user in the given store.',
        '',
        "This instruction revokes a role from a user in the store's role configuration. If the user does",
        'not have the role, this instruction has no effect.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](RevokeRole).*',
        '',
        '# Arguments',
        '- `user`: The address of the user from whom the role should be revoked.',
        '- `role`: The name of the role to be revoked.',
        '',
        '# Errors',
        '- The [`authority`](RevokeRole::authority) must be a signer and be the `ADMIN` of the store.',
        '- The [`store`](RevokeRole::store) must be an initialized store account owned by the store program.',
        "- The `role` must exist in the store's role table.",
        "- The `user` must exist in the store's member table.",
      ];
      discriminator: [179, 232, 2, 180, 48, 227, 82, 7];
      accounts: [
        {
          name: 'authority';
          docs: ['The caller of this instruction.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store account from which the new role is to be revoked.'];
          writable: true;
        },
      ];
      args: [
        {
          name: 'user';
          type: 'pubkey';
        },
        {
          name: 'role';
          type: 'string';
        },
      ];
    },
    {
      name: 'setExpectedProvider';
      docs: [
        'Set the expected provider for the given token.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts*](SetExpectedProvider).',
        '',
        '# Arguments',
        '- `token`: The token whose config will be updated.',
        '- `provider`: The provider index to be set as the expected provider',
        'for the token. Must be a valid [`PriceProviderKind`] value.',
        '',
        '# Errors',
        '- The [`authority`](SetExpectedProvider::authority) must be a signer',
        'and have the MARKET_KEEPER role in the given store.',
        '- The [`store`](SetExpectedProvider::store) must be an initialized [`Store`](states::Store)',
        'account owned by the store program.',
        '- The [`token_map`](SetExpectedProvider::token_map) must be an initialized token map account',
        'owned by the `store`.',
        '- The given `token` must exist in the token map.',
        '- The `provider` index must correspond to a valid [`PriceProviderKind`].',
      ];
      discriminator: [68, 133, 150, 156, 99, 0, 42, 25];
      accounts: [
        {
          name: 'authority';
          docs: ['The authority of the instruction.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store that owns the token map.'];
          relations: ['tokenMap'];
        },
        {
          name: 'tokenMap';
          docs: ['The token map to update.'];
          writable: true;
        },
      ];
      args: [
        {
          name: 'token';
          type: 'pubkey';
        },
        {
          name: 'provider';
          type: 'u8';
        },
      ];
    },
    {
      name: 'setFeedConfig';
      docs: [
        'Set the feed config of the given provider for the given token.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts*](SetFeedConfig).',
        '',
        '# Arguments',
        '- `token`: The token whose config will be updated.',
        '- `provider`: The index of the provider whose feed config will be updated.',
        'Must be a valid [`PriceProviderKind`] value.',
        '- `feed`: The new feed address.',
        '- `timestamp_adjustment`: The new timestamp adjustment in seconds.',
        '',
        '# Errors',
        '- The [`authority`](SetFeedConfig::authority) must be a signer',
        'and a MARKET_KEEPER in the given store.',
        '- The [`store`](SetFeedConfig::store) must be an initialized [`Store`](states::Store)',
        'account owned by the store program.',
        '- The [`token_map`](SetFeedConfig::token_map) must be an initialized token map account',
        'owned by the `store`.',
        '- The given `token` must exist in the token map.',
        '- The `provider` index must correspond to a valid [`PriceProviderKind`].',
      ];
      discriminator: [154, 210, 174, 54, 7, 47, 57, 18];
      accounts: [
        {
          name: 'authority';
          docs: ['The authority of the instruction.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store that owns the token map.'];
          relations: ['tokenMap'];
        },
        {
          name: 'tokenMap';
          docs: ['The token map to update.'];
          writable: true;
        },
      ];
      args: [
        {
          name: 'token';
          type: 'pubkey';
        },
        {
          name: 'provider';
          type: 'u8';
        },
        {
          name: 'feed';
          type: 'pubkey';
        },
        {
          name: 'timestampAdjustment';
          type: 'u32';
        },
      ];
    },
    {
      name: 'setFeedConfigV2';
      docs: [
        'Set the feed config of the given provider for the given token.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts*](SetFeedConfig).',
        '',
        '# Arguments',
        '- `token`: The token whose config will be updated.',
        '- `provider`: The index of the provider whose feed config will be updated.',
        'Must be a valid [`PriceProviderKind`] value.',
        '- `feed`: The new feed address.',
        '- `timestamp_adjustment`: The new timestamp adjustment in seconds.',
        '',
        '# Errors',
        '- The [`authority`](SetFeedConfig::authority) must be a signer',
        'and a MARKET_KEEPER in the given store.',
        '- The [`store`](SetFeedConfig::store) must be an initialized [`Store`](states::Store)',
        'account owned by the store program.',
        '- The [`token_map`](SetFeedConfig::token_map) must be an initialized token map account',
        'owned by the `store`.',
        '- The given `token` must exist in the token map.',
        '- The `provider` index must correspond to a valid [`PriceProviderKind`].',
      ];
      discriminator: [137, 164, 163, 145, 66, 101, 139, 77];
      accounts: [
        {
          name: 'authority';
          docs: ['The authority of the instruction.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store that owns the token map.'];
          relations: ['tokenMap'];
        },
        {
          name: 'tokenMap';
          docs: ['The token map to update.'];
          writable: true;
        },
      ];
      args: [
        {
          name: 'token';
          type: 'pubkey';
        },
        {
          name: 'provider';
          type: 'u8';
        },
        {
          name: 'feed';
          type: {
            option: 'pubkey';
          };
        },
        {
          name: 'timestampAdjustment';
          type: {
            option: 'u32';
          };
        },
        {
          name: 'maxDeviationFactor';
          type: {
            option: 'u128';
          };
        },
      ];
    },
    {
      name: 'setMarketConfigBufferAuthority';
      docs: [
        'Transfer ownership of a market config buffer account to a new authority.',
        '',
        'This instruction allows the current authority to transfer ownership of the buffer',
        'account to a new authority. After the transfer, only the new authority will be able',
        'to modify or close the buffer.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts.*](SetMarketConfigBufferAuthority)',
        '',
        '# Arguments',
        '- `new_authority`: The public key of the new authority that will own the buffer account.',
        '',
        '# Errors',
        '- The [`authority`](SetMarketConfigBufferAuthority::authority) must be a signer',
        'and the current owner of the `buffer` account.',
        '- The [`buffer`](SetMarketConfigBufferAuthority::buffer) must be an initialized',
        'market config buffer account.',
        '- The `new_authority` cannot be the same as the current authority.',
      ];
      discriminator: [113, 56, 17, 219, 126, 137, 28, 83];
      accounts: [
        {
          name: 'authority';
          docs: ['The authority.'];
          writable: true;
          signer: true;
          relations: ['buffer'];
        },
        {
          name: 'buffer';
          docs: ['Buffer.'];
          writable: true;
        },
      ];
      args: [
        {
          name: 'newAuthority';
          type: 'pubkey';
        },
      ];
    },
    {
      name: 'setPricesFromPriceFeed';
      docs: [
        'Set prices from the provided price feeds.',
        '',
        'This instruction updates token prices in the oracle account using data from configured price feeds.',
        'For each token provided, it reads the current price from the corresponding price feed account and',
        'stores it in the oracle.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](SetPricesFromPriceFeed)*',
        '',
        '# Arguments',
        '- `tokens`: The list of token mint addresses to update prices for. Each token must be configured',
        'in the token map with a valid price feed.',
        '',
        '# Errors',
        '- The [`authority`](SetPricesFromPriceFeed::authority) must be a signer and have the',
        'ORACLE_CONTROLLER role in the given store. It must also be the authority of the `oracle`.',
        '- The [`store`](SetPricesFromPriceFeed::store) must be an initialized store account owned by',
        'the store program.',
        '- The [`oracle`](SetPricesFromPriceFeed::oracle) must be an initialized oracle account owned',
        'by the given store. It must not have any prices set and be in the cleared state.',
        '- The [`token_map`](SetPricesFromPriceFeed::token_map) must be an initialized token map account',
        'that is owned and authorized by the store.',
        '- The number of tokens provided cannot exceed [`MAX_TOKENS`](crate::states::oracle::price_map::PriceMap::MAX_TOKENS).',
        '- Each token in `tokens` must be configured and enabled in the token map.',
        '- For each token, there must be a valid corresponding price feed account included in the remaining accounts.',
      ];
      discriminator: [112, 75, 103, 161, 71, 192, 245, 246];
      accounts: [
        {
          name: 'authority';
          docs: ['The caller.'];
          signer: true;
          relations: ['oracle'];
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['oracle', 'tokenMap'];
        },
        {
          name: 'oracle';
          docs: ['Oracle.'];
          writable: true;
        },
        {
          name: 'tokenMap';
          docs: ['Token map.'];
          relations: ['store'];
        },
        {
          name: 'chainlinkProgram';
          docs: ['Chainlink Program.'];
          optional: true;
          address: 'HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny';
        },
      ];
      args: [
        {
          name: 'tokens';
          type: {
            vec: 'pubkey';
          };
        },
      ];
    },
    {
      name: 'setReferrer';
      docs: [
        'Set referrer.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](SetReferrer)*',
        '',
        '# Arguments',
        '- `code`: The referral code of the referrer.',
        '',
        '# Errors',
        '- The [`owner`](SetReferrer::owner) must be a signer.',
        '- The [`store`](SetReferrer::store) must be properly initialized.',
        '- The [`user`](SetReferrer::user) must be:',
        '- Properly initialized',
        '- Correspond to the `owner`',
        '- Must not already have a referrer set',
        '- The [`referral_code`](SetReferrer::referral_code) must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- Match the provided `code`',
        '- Correspond to the `referrer_user`',
        '- The [`referrer_user`](SetReferrer::referrer_user) must be:',
        '- Properly initialized',
        '- Different from the `user`',
        '- Not have the `user` as their referrer (no circular references)',
      ];
      discriminator: [115, 251, 55, 0, 166, 189, 25, 74];
      accounts: [
        {
          name: 'owner';
          signer: true;
          relations: ['user'];
        },
        {
          name: 'store';
          relations: ['user', 'referralCode', 'referrerUser'];
        },
        {
          name: 'user';
          docs: ['User Account.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
              },
            ];
          };
        },
        {
          name: 'referralCode';
          docs: ['Referral Code Account.'];
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  114,
                  101,
                  102,
                  101,
                  114,
                  114,
                  97,
                  108,
                  95,
                  99,
                  111,
                  100,
                  101,
                ];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'arg';
                path: 'code';
              },
            ];
          };
        },
        {
          name: 'referrerUser';
          docs: ['Referrer.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'referrerUser';
              },
            ];
          };
        },
      ];
      args: [
        {
          name: 'code';
          type: {
            array: ['u8', 8];
          };
        },
      ];
    },
    {
      name: 'setTokenMap';
      docs: [
        'Set the token map address for the store.',
        '',
        'This instruction allows a MARKET_KEEPER to update which token map account the store uses.',
        'The token map account contains token configurations and price feed configurations.',
        '',
        'We say the token map is *authorized by the store* if the token map address of the store is',
        'the same as the address of the token map account.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](SetTokenMap).*',
        '',
        '# Errors',
        '- The [`authority`](SetTokenMap::authority) must be a signer and have the MARKET_KEEPER',
        'role in the store.',
        '- The [`store`](SetTokenMap::store) must be an initialized store account owned by the',
        'store program.',
        '- The [`token_map`](SetTokenMap::token_map) must be an initialized token map account',
        'and owned by the given store.',
        '- The new token map address cannot be the same as the current one.',
      ];
      discriminator: [45, 60, 238, 74, 66, 250, 250, 67];
      accounts: [
        {
          name: 'authority';
          docs: ['The caller of this instruction.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          writable: true;
          relations: ['tokenMap'];
        },
        {
          name: 'tokenMap';
          docs: ['Token map to use.'];
        },
      ];
      args: [];
    },
    {
      name: 'toggleFeature';
      docs: [
        'Enable or disable a feature in this deployment.',
        '',
        'This instruction allows a FEATURE_KEEPER to toggle specific features on or off by providing',
        'a domain and action combination. Features are used to control which functionality is available',
        'in this deployment.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](ToggleFeature).*',
        '',
        '# Arguments',
        '- `domain`: The domain part of the feature flag, must be a valid domain defined in',
        '[`DomainDisabledFlag`](crate::states::feature::DomainDisabledFlag).',
        '- `action`: The action part of the feature flag, must be a valid action defined in',
        '[`ActionDisabledFlag`](crate::states::feature::ActionDisabledFlag).',
        '- `enable`: If true, enables the feature. If false, disables it.',
        '',
        '# Errors',
        '- The [`authority`](ToggleFeature::authority) must be a signer and have the',
        'FEATURE_KEEPER role in the store.',
        '- The `domain` must be a valid domain defined in [`DomainDisabledFlag`](crate::states::feature::DomainDisabledFlag).',
        '- The `action` must be a valid action defined in [`ActionDisabledFlag`](crate::states::feature::ActionDisabledFlag).',
        '',
        '# Warnings',
        'Although we currently do not provide a feature to disable swaps (only a feature to disable swap orders),',
        'if we were to introduce such a feature, we must be aware that the following operations could still potentially',
        'result in swaps:',
        '- (GLV) Deposits',
        '- (GLV) Withdrawals',
        '- Swap Orders',
        '- Increase Orders',
        '- Decrease Orders',
        '',
        'Therefore, to ensure that this feature effectively prevents swaps from occurring, we need to add',
        'validation of the swap parameters before executing all of these actions to ensure that swaps do not happen.',
      ];
      discriminator: [207, 110, 186, 36, 165, 235, 150, 105];
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
        },
      ];
      args: [
        {
          name: 'domain';
          type: 'string';
        },
        {
          name: 'action';
          type: 'string';
        },
        {
          name: 'enable';
          type: 'bool';
        },
      ];
    },
    {
      name: 'toggleGlvMarketFlag';
      docs: [
        'Toggle the given flag of a market in the given GLV.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](UpdateGlvMarketConfig)*',
        '',
        '# Arguments',
        '- `flag`: The flag to toggle.',
        '- `enable`: The value to toggle to.',
        '',
        '# Errors',
        '- The [`authority`](UpdateGlvMarketConfig::authority) must be:',
        '- A signer',
        '- Have MARKET_KEEPER role in the `store`',
        '- The [`store`](UpdateGlvMarketConfig::store) must be properly initialized.',
        '- The [`glv`](UpdateGlvMarketConfig::glv) must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- Have the market token in its list of market tokens',
        '- The [`market_token`](UpdateGlvMarketConfig::market_token) must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- `flag` must be defined in [`GlvMarketFlag`](crate::states::glv::GlvMarketFlag).',
      ];
      discriminator: [223, 156, 69, 160, 7, 197, 9, 234];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['glv'];
        },
        {
          name: 'glv';
          docs: ['GLV.'];
          writable: true;
        },
        {
          name: 'marketToken';
          docs: ['Market token.'];
        },
      ];
      args: [
        {
          name: 'flag';
          type: 'string';
        },
        {
          name: 'enable';
          type: 'bool';
        },
      ];
    },
    {
      name: 'toggleGtMinting';
      docs: [
        'Enable or disable GT minting for the given market.',
        '',
        'This instruction allows a MARKET_KEEPER to control whether GT minting is enabled for the',
        'given market. When disabled, users cannot mint new GT tokens through this market.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts.*](ToggleGTMinting)',
        '',
        '# Arguments',
        '- `enable`: Whether to enable (`true`) or disable (`false`) GT minting for the given market.',
        '',
        '# Errors',
        '- The [`authority`](ToggleGTMinting::authority) must be a signer and be a MARKET_KEEPER',
        'in the store.',
        '- The [`store`](ToggleGTMinting::store) must be an initialized store account.',
        '- The [`market`](ToggleGTMinting::market) must be an initialized market account and owned',
        'by the store.',
      ];
      discriminator: [117, 30, 81, 109, 66, 100, 230, 75];
      accounts: [
        {
          name: 'authority';
          docs: ['The caller.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['market'];
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
      ];
      args: [
        {
          name: 'enable';
          type: 'bool';
        },
      ];
    },
    {
      name: 'toggleMarket';
      docs: [
        'Enable or disable the given market.',
        '',
        'This instruction allows a MARKET_KEEPER to toggle whether a market is enabled or disabled.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts.*](ToggleMarket)',
        '',
        '# Arguments',
        '- `enable`: Whether to enable (`true`) or disable (`false`) the market.',
        '',
        '# Errors',
        '- The [`authority`](ToggleMarket::authority) must be a signer and have the MARKET_KEEPER',
        'role in the store.',
        '- The [`store`](ToggleMarket::store) must be initialized and owned by this program.',
        '- The [`market`](ToggleMarket::market) must be initialized and owned by the store.',
      ];
      discriminator: [185, 244, 78, 180, 171, 226, 75, 210];
      accounts: [
        {
          name: 'authority';
          docs: ['The caller.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['market'];
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
      ];
      args: [
        {
          name: 'enable';
          type: 'bool';
        },
      ];
    },
    {
      name: 'toggleTokenConfig';
      docs: [
        'Enable or disable the config for the given token.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts*](ToggleTokenConfig).',
        '',
        '# Arguments',
        '- `token`: The token whose config will be updated.',
        '- `enable`: Enable or disable the config.',
        '',
        '# Errors',
        '- The [`authority`](ToggleTokenConfig::authority) must be a signer',
        'and a MARKET_KEEPER in the given store.',
        '- The [`store`](ToggleTokenConfig::store) must be an initialized [`Store`](states::Store)',
        'account owned by the store program .',
        '- The [`token_map`](ToggleTokenConfig::token_map) must be an initialized token map account',
        'owned by the `store`.',
        '- The given `token` must exist in the token map.',
      ];
      discriminator: [70, 151, 161, 131, 178, 81, 114, 51];
      accounts: [
        {
          name: 'authority';
          docs: ['The authority of the instruction.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store that owns the token map.'];
          relations: ['tokenMap'];
        },
        {
          name: 'tokenMap';
          docs: ['The token map to update.'];
          writable: true;
        },
      ];
      args: [
        {
          name: 'token';
          type: 'pubkey';
        },
        {
          name: 'enable';
          type: 'bool';
        },
      ];
    },
    {
      name: 'toggleTokenPriceAdjustment';
      docs: [
        'Enable or disable price adjustment for the token.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts*](ToggleTokenConfig).',
        '',
        '# Arguments',
        '- `token`: The token whose config will be updated.',
        '- `enable`: Enable or disable.',
        '',
        '# Errors',
        '- The [`authority`](ToggleTokenConfig::authority) must be a signer',
        'and a MARKET_KEEPER in the given store.',
        '- The [`store`](ToggleTokenConfig::store) must be an initialized [`Store`](states::Store)',
        'account owned by the store program .',
        '- The [`token_map`](ToggleTokenConfig::token_map) must be an initialized token map account',
        'owned by the `store`.',
        '- The given `token` must exist in the token map.',
      ];
      discriminator: [114, 128, 20, 220, 204, 29, 111, 189];
      accounts: [
        {
          name: 'authority';
          docs: ['The authority of the instruction.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store that owns the token map.'];
          relations: ['tokenMap'];
        },
        {
          name: 'tokenMap';
          docs: ['The token map to update.'];
          writable: true;
        },
      ];
      args: [
        {
          name: 'token';
          type: 'pubkey';
        },
        {
          name: 'enable';
          type: 'bool';
        },
      ];
    },
    {
      name: 'tokenDecimals';
      docs: [
        'Get the decimals of the token.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts*](ReadTokenMap).',
        '',
        '# Arguments',
        '- `token`: The address of the token to query for.',
        '',
        '# Errors',
        '- The [`token_map`](ReadTokenMap::token_map) must be an initialized token map account',
        'owned by the store program.',
        '- The given `token` must exist in the token map.',
        '',
        '# Returns',
        'Returns the configured number of decimals for the given token.',
      ];
      discriminator: [167, 171, 85, 147, 131, 122, 3, 161];
      accounts: [
        {
          name: 'tokenMap';
          docs: ['Token map.'];
        },
      ];
      args: [
        {
          name: 'token';
          type: 'pubkey';
        },
      ];
      returns: 'u8';
    },
    {
      name: 'tokenExpectedProvider';
      docs: [
        'Get the expected provider of the given token.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts*](ReadTokenMap).',
        '',
        '# Arguments',
        '- `token`: The address of the token to query for.',
        '',
        '# Errors',
        '- The [`token_map`](ReadTokenMap::token_map) must be an initialized token map account',
        'owned by the `store`.',
        '- The given `token` must exist in the token map.',
        '',
        '# Returns',
        'Returns the expected provider kind as a u8 index. See [`PriceProviderKind`] for valid indices.',
      ];
      discriminator: [17, 189, 13, 24, 175, 140, 220, 70];
      accounts: [
        {
          name: 'tokenMap';
          docs: ['Token map.'];
        },
      ];
      args: [
        {
          name: 'token';
          type: 'pubkey';
        },
      ];
      returns: 'u8';
    },
    {
      name: 'tokenFeed';
      docs: [
        'Get the configured feed of the given token for the provider.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts*](ReadTokenMap).',
        '',
        '# Arguments',
        '- `token`: The address of the token to query for.',
        '- `provider`: The index of provider to query for. Must be a valid index defined in',
        '[`PriceProviderKind`].',
        '',
        '# Errors',
        '- The [`token_map`](ReadTokenMap::token_map) must be an initialized token map account',
        'owned by the `store`.',
        '- The given `token` must exist in the token map.',
        '- The `provider` must be a valid index defined in [`PriceProviderKind`], otherwise',
        'returns [`CoreError::InvalidProviderKindIndex`].',
        '',
        '# Returns',
        'Returns the configured feed address for the given token and provider.',
      ];
      discriminator: [178, 76, 209, 235, 176, 9, 216, 71];
      accounts: [
        {
          name: 'tokenMap';
          docs: ['Token map.'];
        },
      ];
      args: [
        {
          name: 'token';
          type: 'pubkey';
        },
        {
          name: 'provider';
          type: 'u8';
        },
      ];
      returns: 'pubkey';
    },
    {
      name: 'tokenName';
      docs: [
        'Get the name of the token.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts*](ReadTokenMap).',
        '',
        '# Arguments',
        '- `token`: The address of the token to query for.',
        '',
        '# Errors',
        '- The [`token_map`](ReadTokenMap::token_map) must be an initialized token map account',
        'owned by the store program.',
        '- The given `token` must exist in the token map.',
        '',
        '# Returns',
        'Returns the configured name string for the given token.',
      ];
      discriminator: [60, 216, 194, 86, 103, 127, 130, 237];
      accounts: [
        {
          name: 'tokenMap';
          docs: ['Token map.'];
        },
      ];
      args: [
        {
          name: 'token';
          type: 'pubkey';
        },
      ];
      returns: 'string';
    },
    {
      name: 'tokenPrecision';
      docs: [
        'Get the price precision of the token.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts*](ReadTokenMap).',
        '',
        '# Arguments',
        '- `token`: The address of the token to query for.',
        '',
        '# Errors',
        '- The [`token_map`](ReadTokenMap::token_map) must be an initialized token map account',
        'owned by the store program.',
        '- The given `token` must exist in the token map.',
        '',
        '# Returns',
        'Returns the configured price precision for the given token.',
      ];
      discriminator: [133, 90, 219, 89, 70, 161, 16, 153];
      accounts: [
        {
          name: 'tokenMap';
          docs: ['Token map.'];
        },
      ];
      args: [
        {
          name: 'token';
          type: 'pubkey';
        },
      ];
      returns: 'u8';
    },
    {
      name: 'tokenTimestampAdjustment';
      docs: [
        'Get the configured timestamp adjustment of the given token for the provider.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts*](ReadTokenMap).',
        '',
        '# Arguments',
        '- `token`: The address of the token to query for.',
        '- `provider`: The index of provider to query for. Must be a valid index defined in',
        '[`PriceProviderKind`].',
        '',
        '# Errors',
        '- The [`token_map`](ReadTokenMap::token_map) must be an initialized token map account',
        'owned by the `store`.',
        '- The given `token` must exist in the token map.',
        '- The `provider` must be a valid index defined in [`PriceProviderKind`], otherwise',
        'returns [`CoreError::InvalidProviderKindIndex`].',
        '',
        '# Returns',
        'Returns the configured timestamp adjustment for the given token and provider.',
      ];
      discriminator: [167, 181, 240, 191, 105, 0, 107, 172];
      accounts: [
        {
          name: 'tokenMap';
          docs: ['Token map.'];
        },
      ];
      args: [
        {
          name: 'token';
          type: 'pubkey';
        },
        {
          name: 'provider';
          type: 'u8';
        },
      ];
      returns: 'u32';
    },
    {
      name: 'transferReceiver';
      docs: [
        'Request to transfer the receiver address to a new one.',
        '# Note',
        'This instruction only sets `next_receiver`. Use [`accept_receiver`] to',
        'complete the transfer.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](TransferReceiver).*',
        '',
        '# Errors',
        '- The [`authority`](TransferReceiver::authority) must be a signer and the current receiver',
        'of the given store.',
        '- The [`store`](TransferReceiver::store) must be an initialized store account owned by',
        'the store program.',
        '- The new [`next_receiver`](TransferReceiver::next_receiver) account provided cannot be the same as',
        'the current `next_receiver`.',
      ];
      discriminator: [198, 147, 229, 126, 135, 119, 134, 77];
      accounts: [
        {
          name: 'authority';
          docs: ['The caller of this instruction.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store account whose receiver is to be transferred.'];
          writable: true;
        },
        {
          name: 'nextReceiver';
          docs: ['The new receiver.'];
        },
      ];
      args: [];
    },
    {
      name: 'transferReferralCode';
      docs: [
        'Transfer referral code.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](TransferReferralCode)*',
        '',
        '# Errors',
        '- The [`owner`](TransferReferralCode::owner) must be a signer.',
        '- The [`store`](TransferReferralCode::store) must be properly initialized.',
        '- The [`user`](TransferReferralCode::user) account must be:',
        '- Properly initialized',
        '- Correspond to the `owner`',
        '- Different from the [`receiver_user`](TransferReferralCode::receiver_user)',
        '- The [`referral_code`](TransferReferralCode::referral_code) account must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- Correspond to the `owner`',
        '- The [`receiver_user`](TransferReferralCode::receiver_user) account must be:',
        '- Properly initialized',
        '- Not have an associated referral code',
      ];
      discriminator: [249, 29, 27, 219, 157, 16, 30, 35];
      accounts: [
        {
          name: 'owner';
          signer: true;
          relations: ['user'];
        },
        {
          name: 'store';
          relations: ['user', 'referralCode', 'receiverUser'];
        },
        {
          name: 'user';
          docs: ['User Account.'];
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'owner';
              },
            ];
          };
        },
        {
          name: 'referralCode';
          docs: ['Referral Code Account.'];
          writable: true;
        },
        {
          name: 'receiverUser';
          docs: ['Receiver.'];
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'store';
              },
              {
                kind: 'account';
                path: 'receiverUser';
              },
            ];
          };
        },
      ];
      args: [];
    },
    {
      name: 'transferStoreAuthority';
      docs: [
        'Request to transfer the authority (admin) of the given store to a new address.',
        '# Note',
        'This instruction only sets `next_authority`. Use [`accept_store_authority`] to',
        'complete the transfer.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](TransferStoreAuthority).*',
        '',
        '# Errors',
        '- The [`authority`](TransferStoreAuthority::authority) must be a signer and the current',
        'admin of the store.',
        '- The [`store`](TransferStoreAuthority::store) must be an initialized store account',
        'owned by the store program.',
        '- The [`next_authority`](TransferStoreAuthority::next_authority) cannot be the same as',
        'current `next_authority`.',
      ];
      discriminator: [184, 159, 201, 3, 112, 253, 7, 215];
      accounts: [
        {
          name: 'authority';
          docs: ['The caller of this instruction.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store account whose authority is to be transferred.'];
          writable: true;
        },
        {
          name: 'nextAuthority';
          docs: ['Next authority address.'];
        },
      ];
      args: [];
    },
    {
      name: 'updateAdlState';
      docs: [
        'Update the ADL (Auto-Deleveraging) state for the market.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](UpdateAdlState)*',
        '',
        '# Arguments',
        '- `is_long`: Whether to update the ADL state for the long (`true`) or short (`false`) side',
        'of the market.',
        '',
        '# Errors',
        '- The [`authority`](UpdateAdlState::authority) must be a signer and have the ORDER_KEEPER',
        'role in the store.',
        '- The [`store`](UpdateAdlState::store) must be an initialized [`Store`](states::Store)',
        'account owned by the store program.',
        '- The [`oracle`](UpdateAdlState::oracle) must be an initialized [`Oracle`](states::Oracle)',
        'account that is owned by the store.',
        '- The [`market`](UpdateAdlState::market) must be enabled and owned by the store.',
        "- Price feed accounts must be valid and provided in the market's sorted token list order.",
      ];
      discriminator: [12, 45, 19, 113, 13, 43, 203, 232];
      accounts: [
        {
          name: 'authority';
          docs: ['The address authorized to execute this instruction.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store that owns the market.'];
          relations: ['tokenMap', 'oracle', 'market'];
        },
        {
          name: 'tokenMap';
          docs: ['Token map.'];
          relations: ['store'];
        },
        {
          name: 'oracle';
          docs: ['The oracle buffer to use.'];
          writable: true;
        },
        {
          name: 'market';
          docs: ['The market to update the ADL state.'];
          writable: true;
        },
        {
          name: 'chainlinkProgram';
          docs: ['Chainlink Program.'];
          optional: true;
          address: 'HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny';
        },
      ];
      args: [
        {
          name: 'isLong';
          type: 'bool';
        },
      ];
    },
    {
      name: 'updateGlvConfig';
      docs: [
        'Update GLV config.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](UpdateGlvConfig)*',
        '',
        '# Arguments',
        '- `params`: The update of the config.',
        '',
        '# Errors',
        '- The [`authority`](UpdateGlvConfig::authority) must be:',
        '- A signer',
        '- Have MARKET_KEEPER role in the `store`',
        '- The [`store`](UpdateGlvConfig::store) must be properly initialized.',
        '- The [`glv`](UpdateGlvConfig::glv) must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- The `params` must not non-empty.',
      ];
      discriminator: [0, 248, 95, 167, 0, 115, 252, 252];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['glv'];
        },
        {
          name: 'glv';
          docs: ['GLV to update.'];
          writable: true;
        },
      ];
      args: [
        {
          name: 'params';
          type: {
            defined: {
              name: 'updateGlvParams';
            };
          };
        },
      ];
    },
    {
      name: 'updateGlvMarketConfig';
      docs: [
        'Update the config of a market in the given GLV.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](UpdateGlvMarketConfig)*',
        '',
        '# Arguments',
        '- `max_amount`: The maximum amount of the market token that can be stored in the GLV.',
        '- `max_value`: The maximum value of the market token that can be stored in the GLV.',
        '',
        '# Errors',
        '- The [`authority`](UpdateGlvMarketConfig::authority) must be:',
        '- A signer',
        '- Have MARKET_KEEPER role in the `store`',
        '- The [`store`](UpdateGlvMarketConfig::store) must be properly initialized.',
        '- The [`glv`](UpdateGlvMarketConfig::glv) must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- Have the market token in its list of market tokens',
        '- The [`market_token`](UpdateGlvMarketConfig::market_token) must be:',
        '- Properly initialized',
        '- Owned by the `store`',
        '- At least one of `max_amount` or `max_value` must be provided',
      ];
      discriminator: [57, 244, 68, 250, 222, 31, 209, 198];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['glv'];
        },
        {
          name: 'glv';
          docs: ['GLV.'];
          writable: true;
        },
        {
          name: 'marketToken';
          docs: ['Market token.'];
        },
      ];
      args: [
        {
          name: 'maxAmount';
          type: {
            option: 'u64';
          };
        },
        {
          name: 'maxValue';
          type: {
            option: 'u128';
          };
        },
      ];
    },
    {
      name: 'updateLastRestartedSlot';
      docs: [
        'Update last restarted slot.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](UpdateLastRestartedSlot).*',
        '',
        '# Errors',
        '- The [`authority`](UpdateLastRestartedSlot::authority) must be a signer and the current',
        'admin of the store.',
        '- The [`store`](UpdateLastRestartedSlot::store) must be an initialized store account',
        'owned by the store program.',
      ];
      discriminator: [119, 200, 55, 6, 123, 88, 74, 247];
      accounts: [
        {
          name: 'authority';
          docs: ['The caller of this instruction.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['The store account whose authority is to be transferred.'];
          writable: true;
        },
      ];
      args: [];
    },
    {
      name: 'updateMarketConfig';
      docs: [
        'Update an item in the market config.',
        '',
        "This instruction allows a MARKET_KEEPER to update a single configuration value in the market's",
        'configuration. The key must be one of the predefined market config keys.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts.*](UpdateMarketConfig)',
        '',
        '# Arguments',
        '- `key`: The configuration key to update. Must be a valid key defined in',
        '[`MarketConfigKey`](states::market::config::MarketConfigKey).',
        '- `value`: The new value to set for this configuration key.',
        '',
        '# Errors',
        '- The [`authority`](UpdateMarketConfig::authority) must be a signer and have the MARKET_KEEPER',
        'role in the store.',
        '- The [`store`](UpdateMarketConfig::store) must be an initialized store account owned by this program.',
        '- The [`market`](UpdateMarketConfig::market) must be an initialized market account owned by the store.',
        '- The provided `key` must be defined in [`MarketConfigKey`](states::market::config::MarketConfigKey).',
      ];
      discriminator: [91, 87, 149, 101, 110, 116, 16, 120];
      accounts: [
        {
          name: 'authority';
          docs: ['The caller.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['market'];
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
      ];
      args: [
        {
          name: 'key';
          type: 'string';
        },
        {
          name: 'value';
          type: 'u128';
        },
      ];
    },
    {
      name: 'updateMarketConfigFlag';
      docs: [
        'Update a flag in the market config.',
        '',
        "This instruction allows a MARKET_KEEPER to update a single flag in the market's",
        'configuration. The key must be one of the predefined market config flags.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts.*](UpdateMarketConfig)',
        '',
        '# Arguments',
        '- `key`: The flag to update. Must be a valid key defined in',
        '[`MarketConfigFlag`](states::market::config::MarketConfigFlag).',
        '- `value`: The new boolean value to set for this flag.',
        '',
        '# Errors',
        '- The [`authority`](UpdateMarketConfig::authority) must be a signer and have the MARKET_KEEPER',
        'role in the store.',
        '- The [`store`](UpdateMarketConfig::store) must be an initialized store account owned by this program.',
        '- The [`market`](UpdateMarketConfig::market) must be an initialized market account owned by the store.',
        '- The provided `key` must be defined in [`MarketConfigFlag`](states::market::config::MarketConfigFlag).',
      ];
      discriminator: [34, 138, 223, 216, 120, 146, 126, 151];
      accounts: [
        {
          name: 'authority';
          docs: ['The caller.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['market'];
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
      ];
      args: [
        {
          name: 'key';
          type: 'string';
        },
        {
          name: 'value';
          type: 'bool';
        },
      ];
    },
    {
      name: 'updateMarketConfigWithBuffer';
      docs: [
        'Update the market configuration using a pre-populated',
        '[`MarketConfigBuffer`](crate::states::market::config::MarketConfigBuffer) account.',
        '',
        'This instruction allows a MARKET_KEEPER to update multiple market configuration values at once',
        'by applying the changes stored in a buffer account. The buffer must contain valid configuration',
        'keys and values.',
        '',
        '# Accounts',
        '[*See the documentation for the accounts.*](UpdateMarketConfigWithBuffer)',
        '',
        '# Errors',
        '- The [`authority`](UpdateMarketConfigWithBuffer::authority) must be a signer and have the',
        'MARKET_KEEPER role in the store.',
        '- The [`store`](UpdateMarketConfigWithBuffer::store) must be an initialized store account',
        'owned by this program.',
        '- The [`market`](UpdateMarketConfigWithBuffer::market) must be an initialized market account',
        'owned by the store.',
        '- The [`buffer`](UpdateMarketConfigWithBuffer::buffer) must be:',
        '- An initialized market config buffer account',
        '- Owned by both the store and the authority',
        '- Not expired',
        '- All configuration keys in the buffer must be valid keys defined in',
        '[`MarketConfigKey`](states::market::config::MarketConfigKey).',
      ];
      discriminator: [62, 102, 20, 4, 35, 174, 195, 46];
      accounts: [
        {
          name: 'authority';
          docs: ['The caller.'];
          signer: true;
          relations: ['buffer'];
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['market', 'buffer'];
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
        {
          name: 'buffer';
          docs: ['The buffer to use.'];
          writable: true;
        },
      ];
      args: [];
    },
    {
      name: 'updateOrder';
      docs: [
        'Update an order by the owner.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](UpdateOrder)*',
        '',
        '# Arguments',
        '- `params`: Update Order Parameters.',
        '',
        '# Errors',
        '- The [`owner`](UpdateOrder::owner) must be a signer and the owner of the `order`.',
        '- The [`store`](UpdateOrder::store) must be initialized.',
        '- The [`market`](UpdateOrder::market) must be initialized, enabled and owned by the `store`.',
        '- The [`order`](UpdateOrder::order) must be:',
        '- Initialized and owned by both the `store` and the `owner`',
        '- Associated with the provided `market`',
        '- In a pending state',
        '- The order type must support updates',
        '- The feature must be enabled in the `store` for updating the given kind of `order`.',
        '- The updated parameters must be valid for the order type.',
        '',
        '# Notes',
        '- Unlike [`update_order_v2`], this instruction cannot emit a CPI Event due to the lack of required accounts for CPI.',
        'As a result, it does not guarantee that an order will always have a corresponding `OrderUpdated` event.',
      ];
      discriminator: [54, 8, 208, 207, 34, 134, 239, 168];
      accounts: [
        {
          name: 'owner';
          docs: ['Owner.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['market'];
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
        {
          name: 'order';
          docs: ['Order to update.'];
          writable: true;
        },
      ];
      args: [
        {
          name: 'params';
          type: {
            defined: {
              name: 'updateOrderParams';
            };
          };
        },
      ];
    },
    {
      name: 'updateOrderV2';
      docs: [
        'Update an order by the owner.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](UpdateOrderV2)*',
        '',
        '# Arguments',
        '- `params`: Update Order Parameters.',
        '',
        '# Errors',
        '- The [`owner`](UpdateOrderV2::owner) must be a signer and the owner of the `order`.',
        '- The [`store`](UpdateOrderV2::store) must be initialized.',
        '- The [`market`](UpdateOrderV2::market) must be initialized, enabled and owned by the `store`.',
        '- The [`order`](UpdateOrderV2::order) must be:',
        '- Initialized and owned by both the `store` and the `owner`',
        '- Associated with the provided `market`',
        '- In a pending state',
        '- The order type must support updates',
        '- The feature must be enabled in the `store` for updating the given kind of `order`.',
        '- The updated parameters must be valid for the order type.',
      ];
      discriminator: [195, 175, 207, 33, 171, 246, 41, 176];
      accounts: [
        {
          name: 'owner';
          docs: ['Owner.'];
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['market'];
        },
        {
          name: 'market';
          docs: ['Market.'];
          writable: true;
        },
        {
          name: 'order';
          docs: ['Order to update.'];
          writable: true;
        },
        {
          name: 'callbackAuthority';
          docs: ['Callback authority.'];
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 97, 108, 108, 98, 97, 99, 107];
              },
            ];
          };
        },
        {
          name: 'callbackProgram';
          docs: ['Callback program.'];
          optional: true;
        },
        {
          name: 'callbackSharedDataAccount';
          docs: ['Config account for callback.'];
          writable: true;
          optional: true;
        },
        {
          name: 'callbackPartitionedDataAccount';
          docs: ['Action stats account for callback.'];
          writable: true;
          optional: true;
        },
        {
          name: 'eventAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'program';
        },
      ];
      args: [
        {
          name: 'params';
          type: {
            defined: {
              name: 'updateOrderParams';
            };
          };
        },
      ];
    },
    {
      name: 'updatePriceFeedWithChainlink';
      docs: [
        'Updates the price data in a custom price feed account using a signed price report from',
        'Chainlink Data Streams. The price feed must be configured to use the Chainlink Data Streams',
        'provider.',
        '',
        '# Accounts',
        '*[See the documentation for the accounts.](UpdatePriceFeedWithChainlink)*',
        '',
        '# Arguments',
        '- `signed_report`: A signed price report from Chainlink Data Streams containing the price data.',
        '',
        '# Errors',
        '- The [`authority`](UpdatePriceFeedWithChainlink::authority) must be a signer and have the',
        'PRICE_KEEPER role in the store.',
        '- The [`store`](UpdatePriceFeedWithChainlink::store) must be an initialized store account',
        '- The [`verifier_account`](UpdatePriceFeedWithChainlink::verifier_account) must be a valid',
        'Chainlink verifier account.',
        '- The [`price_feed`](UpdatePriceFeedWithChainlink::price_feed) must be initialized, owned by',
        'the store, and authorized for the `authority`.',
        '- The [`chainlink`](UpdatePriceFeedWithChainlink::chainlink) program ID must be trusted in the',
        'definition of the [`ChainlinkDataStreamsInterface`](gmsol_chainlink_datastreams::interface::ChainlinkDataStreamsInterface).',
        '- The price feed must be configured to use [`ChainlinkDataStreams`](PriceProviderKind::ChainlinkDataStreams)',
        'as its provider.',
        '- The `signed_report` must be:',
        '- Decodable as a valid Chainlink price report',
        '- Verifiable by the Chainlink Verifier Program',
        '- Contain valid data for creating a [`PriceFeedPrice`](states::oracle::PriceFeedPrice)',
        "- The current slot and timestamp must be >= the feed's last update.",
        "- The price data timestamp must be >= the feed's last price timestamp",
        '- The price data must meet all validity requirements (see the `update` method of [`PriceFeed`](states::oracle::PriceFeed)).',
      ];
      discriminator: [204, 69, 132, 33, 153, 43, 6, 148];
      accounts: [
        {
          name: 'authority';
          docs: ['Authority.'];
          signer: true;
          relations: ['priceFeed'];
        },
        {
          name: 'store';
          docs: ['Store.'];
          relations: ['priceFeed'];
        },
        {
          name: 'verifierAccount';
          docs: ['Verifier Account.'];
        },
        {
          name: 'accessController';
          docs: ['Access Controller Account.'];
        },
        {
          name: 'configAccount';
          docs: ['Config Account.'];
        },
        {
          name: 'priceFeed';
          docs: ['Price Feed Account.'];
          writable: true;
        },
        {
          name: 'chainlink';
          docs: ['Chainlink Data Streams Program.'];
        },
      ];
      args: [
        {
          name: 'compressedReport';
          type: 'bytes';
        },
      ];
    },
    {
      name: 'useClaimableAccount';
      docs: [
        'Prepare a claimable account to receive tokens during order execution.',
        '',
        'This instruction serves two purposes:',
        '1. For uninitialized accounts: Creates and prepares the account to receive tokens',
        '2. For initialized accounts: Unlocks the funds for the owner to claim',
        '',
        '# Accounts',
        '[*See the documentation for the accounts.*](UseClaimableAccount)',
        '',
        '# Arguments',
        '- `timestamp`: The timestamp for which the claimable account was created.',
        '- `amount`: The token amount to approve for delegation.',
        '',
        '# Errors',
        '- The [`authority`](UseClaimableAccount::authority) must be a signer and have ORDER_KEEPER',
        'permissions in the store.',
        '- The [`store`](UseClaimableAccount::store) must be an initialized store account.',
        '- The [`account`](UseClaimableAccount::account) must be a PDA derived from',
        'the time window of the `timestamp` and other expected seeds. It can be uninitialized.',
        '- If the `account` is initialized, it must be owned by the store.',
      ];
      discriminator: [135, 173, 217, 216, 193, 37, 115, 159];
      accounts: [
        {
          name: 'authority';
          docs: ['The caller.'];
          writable: true;
          signer: true;
        },
        {
          name: 'store';
          docs: ['Store.'];
        },
        {
          name: 'mint';
          docs: ['Mint.'];
        },
        {
          name: 'owner';
          docs: ['Owner.'];
        },
        {
          name: 'account';
          docs: ['The claimable account.'];
          writable: true;
        },
        {
          name: 'systemProgram';
          docs: ['System Program.'];
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          docs: ['Token Program.'];
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
      ];
      args: [
        {
          name: 'timestamp';
          type: 'i64';
        },
        {
          name: 'amount';
          type: 'u64';
        },
      ];
    },
  ];
  accounts: [
    {
      name: 'callbackAuthority';
      discriminator: [21, 221, 199, 241, 143, 109, 216, 15];
    },
    {
      name: 'deposit';
      discriminator: [148, 146, 121, 66, 207, 173, 21, 227];
    },
    {
      name: 'glv';
      discriminator: [136, 174, 157, 179, 203, 155, 156, 243];
    },
    {
      name: 'glvDeposit';
      discriminator: [254, 77, 169, 195, 125, 218, 207, 221];
    },
    {
      name: 'glvShift';
      discriminator: [247, 113, 121, 71, 227, 143, 116, 143];
    },
    {
      name: 'glvWithdrawal';
      discriminator: [253, 149, 26, 103, 16, 11, 232, 200];
    },
    {
      name: 'gtExchange';
      discriminator: [59, 99, 208, 22, 219, 145, 65, 199];
    },
    {
      name: 'gtExchangeVault';
      discriminator: [123, 227, 174, 214, 16, 219, 214, 148];
    },
    {
      name: 'market';
      discriminator: [219, 190, 213, 55, 0, 227, 198, 154];
    },
    {
      name: 'marketConfigBuffer';
      discriminator: [169, 176, 190, 184, 140, 168, 106, 160];
    },
    {
      name: 'oracle';
      discriminator: [139, 194, 131, 179, 140, 179, 229, 244];
    },
    {
      name: 'order';
      discriminator: [134, 173, 223, 185, 77, 86, 28, 51];
    },
    {
      name: 'position';
      discriminator: [170, 188, 143, 228, 122, 64, 247, 208];
    },
    {
      name: 'priceFeed';
      discriminator: [189, 103, 252, 23, 152, 35, 243, 156];
    },
    {
      name: 'referralCodeV2';
      discriminator: [46, 159, 206, 18, 84, 48, 60, 0];
    },
    {
      name: 'shift';
      discriminator: [16, 43, 39, 90, 253, 173, 56, 13];
    },
    {
      name: 'store';
      discriminator: [130, 48, 247, 244, 182, 191, 30, 26];
    },
    {
      name: 'tokenMapHeader';
      discriminator: [107, 43, 27, 24, 245, 62, 145, 126];
    },
    {
      name: 'tradeData';
      discriminator: [226, 22, 163, 52, 243, 223, 187, 74];
    },
    {
      name: 'userHeader';
      discriminator: [12, 78, 211, 244, 225, 77, 209, 249];
    },
    {
      name: 'withdrawal';
      discriminator: [10, 45, 211, 182, 129, 235, 90, 82];
    },
  ];
  events: [
    {
      name: 'borrowingFeesUpdated';
      discriminator: [92, 12, 91, 206, 45, 216, 237, 151];
    },
    {
      name: 'depositCreated';
      discriminator: [146, 225, 181, 133, 194, 173, 54, 71];
    },
    {
      name: 'depositExecuted';
      discriminator: [129, 128, 106, 77, 252, 43, 165, 41];
    },
    {
      name: 'depositRemoved';
      discriminator: [63, 54, 232, 201, 34, 238, 123, 9];
    },
    {
      name: 'glvDepositRemoved';
      discriminator: [208, 162, 246, 217, 191, 14, 14, 36];
    },
    {
      name: 'glvPricing';
      discriminator: [184, 66, 14, 201, 36, 6, 242, 164];
    },
    {
      name: 'glvWithdrawalRemoved';
      discriminator: [152, 149, 83, 212, 221, 225, 72, 207];
    },
    {
      name: 'gtBuyback';
      discriminator: [155, 154, 99, 138, 235, 56, 240, 100];
    },
    {
      name: 'gtUpdated';
      discriminator: [133, 199, 242, 15, 218, 161, 244, 21];
    },
    {
      name: 'insufficientFundingFeePayment';
      discriminator: [247, 151, 12, 203, 116, 59, 165, 140];
    },
    {
      name: 'marketFeesUpdated';
      discriminator: [176, 15, 125, 161, 171, 212, 247, 28];
    },
    {
      name: 'marketStateUpdated';
      discriminator: [213, 205, 40, 245, 113, 230, 58, 18];
    },
    {
      name: 'orderCreated';
      discriminator: [224, 1, 229, 63, 254, 60, 190, 159];
    },
    {
      name: 'orderRemoved';
      discriminator: [84, 155, 121, 142, 240, 235, 144, 23];
    },
    {
      name: 'orderUpdated';
      discriminator: [172, 140, 210, 241, 108, 117, 122, 145];
    },
    {
      name: 'positionDecreased';
      discriminator: [251, 151, 37, 204, 127, 87, 115, 232];
    },
    {
      name: 'positionIncreased';
      discriminator: [73, 58, 247, 181, 100, 237, 249, 81];
    },
    {
      name: 'shiftRemoved';
      discriminator: [126, 134, 137, 211, 214, 131, 121, 188];
    },
    {
      name: 'swapExecuted';
      discriminator: [150, 166, 26, 225, 28, 89, 38, 79];
    },
    {
      name: 'tradeEvent';
      discriminator: [189, 219, 127, 211, 78, 230, 97, 238];
    },
    {
      name: 'withdrawalCreated';
      discriminator: [44, 134, 48, 39, 144, 53, 244, 77];
    },
    {
      name: 'withdrawalExecuted';
      discriminator: [37, 78, 199, 192, 51, 68, 173, 162];
    },
    {
      name: 'withdrawalRemoved';
      discriminator: [87, 152, 166, 67, 16, 233, 27, 56];
    },
  ];
  errors: [
    {
      code: 6000;
      name: 'nonDefaultStore';
      msg: 'non-default store is not allowed';
    },
    {
      code: 6001;
      name: 'internal';
      msg: 'internal error';
    },
    {
      code: 6002;
      name: 'unimplemented';
      msg: 'unimplemented';
    },
    {
      code: 6003;
      name: 'notAnAdmin';
      msg: 'not an admin';
    },
    {
      code: 6004;
      name: 'permissionDenied';
      msg: 'permission denied';
    },
    {
      code: 6005;
      name: 'featureDisabled';
      msg: 'feature disabled';
    },
    {
      code: 6006;
      name: 'model';
      msg: 'model';
    },
    {
      code: 6007;
      name: 'invalidArgument';
      msg: 'invalid argument';
    },
    {
      code: 6008;
      name: 'preconditionsAreNotMet';
      msg: 'preconditions are not met';
    },
    {
      code: 6009;
      name: 'notFound';
      msg: 'not found';
    },
    {
      code: 6010;
      name: 'exceedMaxLengthLimit';
      msg: 'exceed max length limit';
    },
    {
      code: 6011;
      name: 'notEnoughSpace';
      msg: 'not enough space';
    },
    {
      code: 6012;
      name: 'tokenAmountOverflow';
      msg: 'token amount overflow';
    },
    {
      code: 6013;
      name: 'valueOverflow';
      msg: 'value overflow';
    },
    {
      code: 6014;
      name: 'unknownActionState';
      msg: 'unknown action state';
    },
    {
      code: 6015;
      name: 'loadAccountError';
      msg: 'load zero-copy account error';
    },
    {
      code: 6016;
      name: 'tokenAccountNotProvided';
      msg: 'required token account is not provided';
    },
    {
      code: 6017;
      name: 'tokenMintNotProvided';
      msg: 'required token mint is not provided';
    },
    {
      code: 6018;
      name: 'tokenDecimalsMismatched';
      msg: 'token decimals mismatched';
    },
    {
      code: 6019;
      name: 'marketAccountIsNotProvided';
      msg: 'market account is not provided';
    },
    {
      code: 6020;
      name: 'storeMismatched';
      msg: 'store mismatched';
    },
    {
      code: 6021;
      name: 'ownerMismatched';
      msg: 'owner mismatched';
    },
    {
      code: 6022;
      name: 'receiverMismatched';
      msg: 'receiver mismatched';
    },
    {
      code: 6023;
      name: 'rentReceiverMismatched';
      msg: 'rent receiver mismatched';
    },
    {
      code: 6024;
      name: 'marketMismatched';
      msg: 'market mismatched';
    },
    {
      code: 6025;
      name: 'marketTokenMintMismatched';
      msg: 'market token mint mismatched';
    },
    {
      code: 6026;
      name: 'mintAccountNotProvided';
      msg: 'mint account not provided';
    },
    {
      code: 6027;
      name: 'marketTokenAccountMismatched';
      msg: 'market token account mismatched';
    },
    {
      code: 6028;
      name: 'tokenMintMismatched';
      msg: 'token mint mismatched';
    },
    {
      code: 6029;
      name: 'tokenAccountMismatched';
      msg: 'token account mismatched';
    },
    {
      code: 6030;
      name: 'notAnAta';
      msg: 'not an ATA for the given token';
    },
    {
      code: 6031;
      name: 'notEnoughTokenAmount';
      msg: 'not enough token amount';
    },
    {
      code: 6032;
      name: 'tokenAmountExceedsLimit';
      msg: 'token amount exceeds limit';
    },
    {
      code: 6033;
      name: 'unknownToken';
      msg: 'unknown token';
    },
    {
      code: 6034;
      name: 'notEnoughExecutionFee';
      msg: 'not enough execution fee';
    },
    {
      code: 6035;
      name: 'invalidSwapPathLength';
      msg: 'invalid swap path length';
    },
    {
      code: 6036;
      name: 'notEnoughSwapMarkets';
      msg: 'not enough swap markets in the path';
    },
    {
      code: 6037;
      name: 'invalidSwapPath';
      msg: 'invalid swap path';
    },
    {
      code: 6038;
      name: 'insufficientOutputAmount';
      msg: 'insufficient output amounts';
    },
    {
      code: 6039;
      name: 'storeOutdated';
      msg: 'store outdated';
    },
    {
      code: 6040;
      name: 'invalidStoreConfigKey';
      msg: 'invalid store config key';
    },
    {
      code: 6041;
      name: 'invalidProviderKindIndex';
      msg: 'invalid provider kind index';
    },
    {
      code: 6042;
      name: 'chainlinkProgramIsRequired';
      msg: 'chainlink program is required';
    },
    {
      code: 6043;
      name: 'notSupportedCustomPriceProvider';
      msg: 'this price provider is not supported to be used with custom price feed';
    },
    {
      code: 6044;
      name: 'notEnoughTokenFeeds';
      msg: 'not enough token feeds';
    },
    {
      code: 6045;
      name: 'oracleTimestampsAreLargerThanRequired';
      msg: 'oracle timestamps are larger than required';
    },
    {
      code: 6046;
      name: 'oracleTimestampsAreSmallerThanRequired';
      msg: 'oracle timestamps are smaller than required';
    },
    {
      code: 6047;
      name: 'invalidOracleTimestampsRange';
      msg: 'invalid oracle timestamps range';
    },
    {
      code: 6048;
      name: 'maxOracleTimestampsRangeExceeded';
      msg: 'max oracle timestamps range exceeded';
    },
    {
      code: 6049;
      name: 'oracleNotUpdated';
      msg: 'oracle not updated';
    },
    {
      code: 6050;
      name: 'maxPriceAgeExceeded';
      msg: 'max price age exceeded';
    },
    {
      code: 6051;
      name: 'maxPriceTimestampExceeded';
      msg: 'max price timestamp exceeded';
    },
    {
      code: 6052;
      name: 'negativePriceIsNotSupported';
      msg: 'negative price is not supported';
    },
    {
      code: 6053;
      name: 'invalidOracleSlot';
      msg: 'invalid oracle slot';
    },
    {
      code: 6054;
      name: 'missingOraclePrice';
      msg: 'missing oracle price';
    },
    {
      code: 6055;
      name: 'invalidPriceFeedPrice';
      msg: 'invalid price feed price';
    },
    {
      code: 6056;
      name: 'priceOverflow';
      msg: 'price overflow';
    },
    {
      code: 6057;
      name: 'invalidPriceFeedAccount';
      msg: 'invalid price feed account';
    },
    {
      code: 6058;
      name: 'priceFeedNotUpdated';
      msg: 'price feed is not updated';
    },
    {
      code: 6059;
      name: 'pricesAreAlreadySet';
      msg: 'prices are already set';
    },
    {
      code: 6060;
      name: 'priceIsAlreadySet';
      msg: 'price is already set';
    },
    {
      code: 6061;
      name: 'tokenConfigDisabled';
      msg: 'token config is disabled';
    },
    {
      code: 6062;
      name: 'syntheticTokenPriceIsNotAllowed';
      msg: 'synthetic token price is not allowed';
    },
    {
      code: 6063;
      name: 'invalidPriceReport';
      msg: 'invalid price report';
    },
    {
      code: 6064;
      name: 'marketNotOpen';
      msg: 'market is not open';
    },
    {
      code: 6065;
      name: 'emptyDeposit';
      msg: 'empty deposit';
    },
    {
      code: 6066;
      name: 'invalidReceiverForFirstDeposit';
      msg: 'invalid owner for the first deposit';
    },
    {
      code: 6067;
      name: 'notEnoughMarketTokenAmountForFirstDeposit';
      msg: 'not enough market token amount for the first deposit';
    },
    {
      code: 6068;
      name: 'notEnoughGlvTokenAmountForFirstDeposit';
      msg: 'not enough GLV token amount for the first deposit';
    },
    {
      code: 6069;
      name: 'emptyWithdrawal';
      msg: 'empty withdrawal';
    },
    {
      code: 6070;
      name: 'emptyOrder';
      msg: 'empty order';
    },
    {
      code: 6071;
      name: 'invalidMinOutputAmount';
      msg: 'invalid min output amount for limit swap order';
    },
    {
      code: 6072;
      name: 'invalidTriggerPrice';
      msg: 'invalid trigger price';
    },
    {
      code: 6073;
      name: 'invalidPosition';
      msg: 'invalid position';
    },
    {
      code: 6074;
      name: 'invalidPositionKind';
      msg: 'invalid position kind';
    },
    {
      code: 6075;
      name: 'positionMismatched';
      msg: 'position mismatched';
    },
    {
      code: 6076;
      name: 'positionItNotRequired';
      msg: 'position is not required';
    },
    {
      code: 6077;
      name: 'positionIsRequired';
      msg: 'position is required';
    },
    {
      code: 6078;
      name: 'orderKindNotAllowed';
      msg: 'the order kind is not allowed by this instruction';
    },
    {
      code: 6079;
      name: 'unknownOrderKind';
      msg: 'unknown order kind';
    },
    {
      code: 6080;
      name: 'unknownOrderSide';
      msg: 'unknown order side';
    },
    {
      code: 6081;
      name: 'unknownDecreasePositionSwapType';
      msg: 'unknown decrease position swap type';
    },
    {
      code: 6082;
      name: 'missingInitialCollateralToken';
      msg: 'missing initial collateral token';
    },
    {
      code: 6083;
      name: 'missingFinalOutputToken';
      msg: 'missing final output token';
    },
    {
      code: 6084;
      name: 'missingPoolTokens';
      msg: 'missing pool tokens';
    },
    {
      code: 6085;
      name: 'invalidTradeId';
      msg: 'invalid trade ID';
    },
    {
      code: 6086;
      name: 'invalidTradeDeltaSize';
      msg: 'invalid trade delta size';
    },
    {
      code: 6087;
      name: 'invalidTradeDeltaTokens';
      msg: 'invalid trade delta tokens';
    },
    {
      code: 6088;
      name: 'invalidBorrowingFactor';
      msg: 'invalid borrowing factor';
    },
    {
      code: 6089;
      name: 'invalidFundingFactors';
      msg: 'invalid funding factors';
    },
    {
      code: 6090;
      name: 'noDelegatedAuthorityIsSet';
      msg: 'no delegated authority is set';
    },
    {
      code: 6091;
      name: 'claimableCollateralForHoldingCannotBeInOutputTokens';
      msg: 'claimable collateral for holding cannot be in output tokens';
    },
    {
      code: 6092;
      name: 'adlNotEnabled';
      msg: 'ADL is not enabled';
    },
    {
      code: 6093;
      name: 'adlNotRequired';
      msg: 'ADL is not required';
    },
    {
      code: 6094;
      name: 'invalidAdl';
      msg: 'invalid ADL';
    },
    {
      code: 6095;
      name: 'sameOutputTokensNotMerged';
      msg: 'same output tokens not merged';
    },
    {
      code: 6096;
      name: 'eventBufferNotProvided';
      msg: 'event buffer is not provided';
    },
    {
      code: 6097;
      name: 'emptyShift';
      msg: 'empty shift';
    },
    {
      code: 6098;
      name: 'invalidShiftMarkets';
      msg: 'invalid shift markets';
    },
    {
      code: 6099;
      name: 'gtStateHasBeenInitialized';
      msg: 'GT State has been initialized';
    },
    {
      code: 6100;
      name: 'invalidGtConfig';
      msg: 'invalid GT config';
    },
    {
      code: 6101;
      name: 'invalidGtDiscount';
      msg: 'invalid GT discount';
    },
    {
      code: 6102;
      name: 'userAccountHasBeenInitialized';
      msg: 'user account has been initialized';
    },
    {
      code: 6103;
      name: 'referralCodeHasBeenSet';
      msg: 'referral code has been set';
    },
    {
      code: 6104;
      name: 'referrerHasBeenSet';
      msg: 'referrer has been set';
    },
    {
      code: 6105;
      name: 'invalidUserAccount';
      msg: 'invalid user account';
    },
    {
      code: 6106;
      name: 'referralCodeMismatched';
      msg: 'referral code mismatched';
    },
    {
      code: 6107;
      name: 'selfReferral';
      msg: 'self-referral is not allowed';
    },
    {
      code: 6108;
      name: 'mutualReferral';
      msg: 'mutual-referral is not allowed';
    },
    {
      code: 6109;
      name: 'invalidMarketConfigKey';
      msg: 'invalid market config key';
    },
    {
      code: 6110;
      name: 'invalidCollateralToken';
      msg: 'invalid collateral token';
    },
    {
      code: 6111;
      name: 'disabledMarket';
      msg: 'disabled market';
    },
    {
      code: 6112;
      name: 'failedToCalculateGlvValueForMarket';
      msg: 'failed to calculate GLV value for this market';
    },
    {
      code: 6113;
      name: 'failedToCalculateGlvAmountToMint';
      msg: 'failed to calculate GLV amount to mint';
    },
    {
      code: 6114;
      name: 'failedToCalculateMarketTokenAmountToBurn';
    },
    {
      code: 6115;
      name: 'exceedMaxGlvMarketTokenBalanceAmount';
      msg: 'GLV max market token balance amount exceeded';
    },
    {
      code: 6116;
      name: 'exceedMaxGlvMarketTokenBalanceValue';
      msg: 'GLV max market token balance value exceeded';
    },
    {
      code: 6117;
      name: 'emptyGlvWithdrawal';
      msg: 'empty GLV withdrawal';
    },
    {
      code: 6118;
      name: 'glvNegativeMarketPoolValue';
      msg: 'GLV: negative market pool value';
    },
    {
      code: 6119;
      name: 'glvDepositIsNotAllowed';
      msg: 'GLV: deposit is not allowed with the given market';
    },
    {
      code: 6120;
      name: 'glvShiftIntervalNotYetPassed';
      msg: 'GLV: shift interval not yet passed';
    },
    {
      code: 6121;
      name: 'glvShiftMaxPriceImpactExceeded';
      msg: 'GLV: shift max price impact exceeded';
    },
    {
      code: 6122;
      name: 'glvShiftValueNotLargeEnough';
      msg: 'GLV: shift value is not large enough';
    },
    {
      code: 6123;
      name: 'tokenDecimalsChanged';
      msg: 'the decimals of token is immutable';
    },
    {
      code: 6124;
      name: 'priceIsStale';
      msg: 'price is stale';
    },
    {
      code: 6125;
      name: 'deprecated';
      msg: 'deprecated';
    },
  ];
  types: [
    {
      name: 'actionFlagContainer';
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
      name: 'actionHeader';
      docs: ['Action Header.'];
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
            name: 'actionState';
            docs: ['Action State.'];
            type: 'u8';
          },
          {
            name: 'bump';
            docs: ['The bump seed.'];
            type: 'u8';
          },
          {
            name: 'flags';
            type: {
              defined: {
                name: 'actionFlagContainer';
              };
            };
          },
          {
            name: 'callbackKind';
            type: 'u8';
          },
          {
            name: 'callbackVersion';
            type: 'u8';
          },
          {
            name: 'padding0';
            type: {
              array: ['u8', 2];
            };
          },
          {
            name: 'id';
            docs: ['Action id.'];
            type: 'u64';
          },
          {
            name: 'store';
            docs: ['Store.'];
            type: 'pubkey';
          },
          {
            name: 'market';
            docs: ['Market.'];
            type: 'pubkey';
          },
          {
            name: 'owner';
            docs: ['Owner.'];
            type: 'pubkey';
          },
          {
            name: 'nonce';
            docs: ['Nonce bytes.'];
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'maxExecutionLamports';
            docs: ['Max execution lamports.'];
            type: 'u64';
          },
          {
            name: 'updatedAt';
            docs: ['Last updated timestamp.'];
            type: 'i64';
          },
          {
            name: 'updatedAtSlot';
            docs: ['Last updated slot.'];
            type: 'u64';
          },
          {
            name: 'creator';
            docs: ['Creator.'];
            type: 'pubkey';
          },
          {
            name: 'rentReceiver';
            docs: ['Rent receiver.'];
            type: 'pubkey';
          },
          {
            name: 'receiver';
            docs: ['The output funds receiver.'];
            type: 'pubkey';
          },
          {
            name: 'callbackProgramId';
            docs: ['Callback program ID.'];
            type: 'pubkey';
          },
          {
            name: 'callbackSharedData';
            docs: ['The account holding shared data for callback use.'];
            type: 'pubkey';
          },
          {
            name: 'callbackPartitionedData';
            docs: ['The account holding partitioned data for callback use.'];
            type: 'pubkey';
          },
          {
            name: 'reserved';
            type: {
              array: ['u8', 160];
            };
          },
        ];
      };
    },
    {
      name: 'actionState';
      docs: ['Action State.'];
      repr: {
        kind: 'rust';
      };
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'pending';
          },
          {
            name: 'completed';
          },
          {
            name: 'cancelled';
          },
        ];
      };
    },
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
      name: 'borrowingFees';
      docs: ['Borrowing Fee.'];
      generics: [
        {
          kind: 'type';
          name: 't';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'feeAmount';
            type: {
              generic: 't';
            };
          },
          {
            name: 'feeAmountForReceiver';
            type: {
              generic: 't';
            };
          },
        ];
      };
    },
    {
      name: 'borrowingFeesUpdated';
      docs: ['Market borrowing fees updated event.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'rev';
            docs: ['Revision.'];
            type: 'u64';
          },
          {
            name: 'marketToken';
            docs: ['Market token.'];
            type: 'pubkey';
          },
          {
            name: 'updateBorrowingState';
            docs: ['Update borrowing state report.'];
            type: {
              defined: {
                name: 'updateBorrowingReport';
                generics: [
                  {
                    kind: 'type';
                    type: 'u128';
                  },
                ];
              };
            };
          },
        ];
      };
    },
    {
      name: 'callbackAuthority';
      docs: ['Callback authority.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'bumpBytes';
            docs: ['Bump bytes.'];
            type: {
              array: ['u8', 1];
            };
          },
        ];
      };
    },
    {
      name: 'claimableCollateral';
      docs: ['Claimable collateral amounts.'];
      generics: [
        {
          kind: 'type';
          name: 't';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'outputTokenAmount';
            type: {
              generic: 't';
            };
          },
          {
            name: 'secondaryOutputTokenAmount';
            type: {
              generic: 't';
            };
          },
        ];
      };
    },
    {
      name: 'clocks';
      docs: ['Market clocks.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'padding';
            type: {
              array: ['u8', 8];
            };
          },
          {
            name: 'rev';
            type: 'u64';
          },
          {
            name: 'priceImpactDistribution';
            docs: ['Price impact distribution clock.'];
            type: 'i64';
          },
          {
            name: 'borrowing';
            docs: ['Borrowing clock.'];
            type: 'i64';
          },
          {
            name: 'funding';
            docs: ['Funding clock.'];
            type: 'i64';
          },
          {
            name: 'adlForLong';
            docs: ['ADL updated clock for long.'];
            type: 'i64';
          },
          {
            name: 'adlForShort';
            docs: ['ADL updated clock for short.'];
            type: 'i64';
          },
          {
            name: 'reserved';
            type: {
              array: ['i64', 3];
            };
          },
        ];
      };
    },
    {
      name: 'createDepositParams';
      docs: ['Create Deposit Params.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'executionLamports';
            docs: ['Execution fee in lamports'];
            type: 'u64';
          },
          {
            name: 'longTokenSwapLength';
            docs: ['The length of the swap path for long token.'];
            type: 'u8';
          },
          {
            name: 'shortTokenSwapLength';
            docs: ['The length of the swap path for short token.'];
            type: 'u8';
          },
          {
            name: 'initialLongTokenAmount';
            docs: ['Initial long token amount to deposit.'];
            type: 'u64';
          },
          {
            name: 'initialShortTokenAmount';
            docs: ['Initial short token amount to deposit.'];
            type: 'u64';
          },
          {
            name: 'minMarketTokenAmount';
            docs: [
              'The minimum acceptable amount of market tokens to receive.',
            ];
            type: 'u64';
          },
          {
            name: 'shouldUnwrapNativeToken';
            docs: ['Whether to unwrap native token when sending funds back.'];
            type: 'bool';
          },
        ];
      };
    },
    {
      name: 'createGlvDepositParams';
      docs: ['Create GLV Deposit Params.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'executionLamports';
            docs: ['Execution fee in lamports'];
            type: 'u64';
          },
          {
            name: 'longTokenSwapLength';
            docs: ['The length of the swap path for long token.'];
            type: 'u8';
          },
          {
            name: 'shortTokenSwapLength';
            docs: ['The length of the swap path for short token.'];
            type: 'u8';
          },
          {
            name: 'initialLongTokenAmount';
            docs: ['Initial long token amount to deposit.'];
            type: 'u64';
          },
          {
            name: 'initialShortTokenAmount';
            docs: ['Initial short token amount to deposit.'];
            type: 'u64';
          },
          {
            name: 'marketTokenAmount';
            docs: ['Market token amount.'];
            type: 'u64';
          },
          {
            name: 'minMarketTokenAmount';
            docs: ['Minimum acceptable amount of market tokens to be minted.'];
            type: 'u64';
          },
          {
            name: 'minGlvTokenAmount';
            docs: ['Minimum acceptable amount of glv tokens to receive.'];
            type: 'u64';
          },
          {
            name: 'shouldUnwrapNativeToken';
            docs: ['Whether to unwrap native token when sending funds back.'];
            type: 'bool';
          },
        ];
      };
    },
    {
      name: 'createGlvWithdrawalParams';
      docs: ['Create GLV Withdrawal Params.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'executionLamports';
            docs: ['Execution fee in lamports'];
            type: 'u64';
          },
          {
            name: 'longTokenSwapLength';
            docs: ['The length of the swap path for long token.'];
            type: 'u8';
          },
          {
            name: 'shortTokenSwapLength';
            docs: ['The length of the swap path for short token.'];
            type: 'u8';
          },
          {
            name: 'glvTokenAmount';
            docs: ['The amount of glv tokens to burn.'];
            type: 'u64';
          },
          {
            name: 'minFinalLongTokenAmount';
            docs: ['Minimum acceptable final long token to receive.'];
            type: 'u64';
          },
          {
            name: 'minFinalShortTokenAmount';
            docs: ['Minimum acceptable final short token to receive.'];
            type: 'u64';
          },
          {
            name: 'shouldUnwrapNativeToken';
            docs: ['Whether to unwrap native token when sending funds back.'];
            type: 'bool';
          },
        ];
      };
    },
    {
      name: 'createOrderParams';
      docs: ['Create Order Arguments.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'kind';
            docs: ['Order Kind.'];
            type: {
              defined: {
                name: 'orderKind';
              };
            };
          },
          {
            name: 'decreasePositionSwapType';
            docs: ['Decrease Position Swap Type.'];
            type: {
              option: {
                defined: {
                  name: 'decreasePositionSwapType';
                };
              };
            };
          },
          {
            name: 'executionLamports';
            docs: ['Execution fee in lamports.'];
            type: 'u64';
          },
          {
            name: 'swapPathLength';
            docs: ['The length of the swap path.'];
            type: 'u8';
          },
          {
            name: 'initialCollateralDeltaAmount';
            docs: ['Initial collateral / swap in token amount.'];
            type: 'u64';
          },
          {
            name: 'sizeDeltaValue';
            docs: ['Size delta value.'];
            type: 'u128';
          },
          {
            name: 'isLong';
            docs: ['Is long.'];
            type: 'bool';
          },
          {
            name: 'isCollateralLong';
            docs: ['Is collateral or the swap out token the long token.'];
            type: 'bool';
          },
          {
            name: 'minOutput';
            docs: ['Min output amount or value.'];
            type: {
              option: 'u128';
            };
          },
          {
            name: 'triggerPrice';
            docs: ['Trigger price.'];
            type: {
              option: 'u128';
            };
          },
          {
            name: 'acceptablePrice';
            docs: ['Acceptable price.'];
            type: {
              option: 'u128';
            };
          },
          {
            name: 'shouldUnwrapNativeToken';
            docs: ['Whether to unwrap native token when sending funds back.'];
            type: 'bool';
          },
          {
            name: 'validFromTs';
            docs: ['Valid from timestamp.'];
            type: {
              option: 'i64';
            };
          },
        ];
      };
    },
    {
      name: 'createShiftParams';
      docs: ['Create Shift Params.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'executionLamports';
            docs: ['Execution fee in lamports.'];
            type: 'u64';
          },
          {
            name: 'fromMarketTokenAmount';
            docs: ['From market token amount.'];
            type: 'u64';
          },
          {
            name: 'minToMarketTokenAmount';
            docs: ['The minimum acceptable to market token amount to receive.'];
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'createWithdrawalParams';
      docs: ['Create Withdrawal Params.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'executionLamports';
            docs: ['Execution fee in lamports.'];
            type: 'u64';
          },
          {
            name: 'longTokenSwapPathLength';
            docs: ['The length of the swap path for long token.'];
            type: 'u8';
          },
          {
            name: 'shortTokenSwapPathLength';
            docs: ['The length of the swap path for short token.'];
            type: 'u8';
          },
          {
            name: 'marketTokenAmount';
            docs: ['Market token amount to burn.'];
            type: 'u64';
          },
          {
            name: 'minLongTokenAmount';
            docs: [
              'The minimum acceptable final long token amount to receive.',
            ];
            type: 'u64';
          },
          {
            name: 'minShortTokenAmount';
            docs: [
              'The minimum acceptable final short token amount to receive.',
            ];
            type: 'u64';
          },
          {
            name: 'shouldUnwrapNativeToken';
            docs: ['Whether to unwrap native token when sending funds back.'];
            type: 'bool';
          },
        ];
      };
    },
    {
      name: 'decreasePositionReport';
      docs: ['Report of the execution of position decreasing.'];
      generics: [
        {
          kind: 'type';
          name: 'unsigned';
        },
        {
          kind: 'type';
          name: 'signed';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'priceImpactValue';
            type: {
              generic: 'signed';
            };
          },
          {
            name: 'priceImpactDiff';
            type: {
              generic: 'unsigned';
            };
          },
          {
            name: 'executionPrice';
            type: {
              generic: 'unsigned';
            };
          },
          {
            name: 'sizeDeltaInTokens';
            type: {
              generic: 'unsigned';
            };
          },
          {
            name: 'withdrawableCollateralAmount';
            type: {
              generic: 'unsigned';
            };
          },
          {
            name: 'initialSizeDeltaUsd';
            type: {
              generic: 'unsigned';
            };
          },
          {
            name: 'sizeDeltaUsd';
            type: {
              generic: 'unsigned';
            };
          },
          {
            name: 'fees';
            type: {
              defined: {
                name: 'positionFees';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 'unsigned';
                    };
                  },
                ];
              };
            };
          },
          {
            name: 'pnl';
            type: {
              defined: {
                name: 'pnl';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 'signed';
                    };
                  },
                ];
              };
            };
          },
          {
            name: 'insolventCloseStep';
            type: {
              option: {
                defined: {
                  name: 'insolventCloseStep';
                };
              };
            };
          },
          {
            name: 'shouldRemove';
            type: 'bool';
          },
          {
            name: 'isOutputTokenLong';
            type: 'bool';
          },
          {
            name: 'isSecondaryOutputTokenLong';
            type: 'bool';
          },
          {
            name: 'outputAmounts';
            type: {
              defined: {
                name: 'outputAmounts';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 'unsigned';
                    };
                  },
                ];
              };
            };
          },
          {
            name: 'claimableFundingLongTokenAmount';
            type: {
              generic: 'unsigned';
            };
          },
          {
            name: 'claimableFundingShortTokenAmount';
            type: {
              generic: 'unsigned';
            };
          },
          {
            name: 'forHolding';
            type: {
              defined: {
                name: 'claimableCollateral';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 'unsigned';
                    };
                  },
                ];
              };
            };
          },
          {
            name: 'forUser';
            type: {
              defined: {
                name: 'claimableCollateral';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 'unsigned';
                    };
                  },
                ];
              };
            };
          },
        ];
      };
    },
    {
      name: 'decreasePositionSwapType';
      docs: ['Swap Type for the decrease position action.'];
      repr: {
        kind: 'rust';
      };
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'noSwap';
          },
          {
            name: 'pnlTokenToCollateralToken';
          },
          {
            name: 'collateralToPnlToken';
          },
        ];
      };
    },
    {
      name: 'deposit';
      docs: ['Deposit.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'header';
            docs: ['Header.'];
            type: {
              defined: {
                name: 'actionHeader';
              };
            };
          },
          {
            name: 'tokens';
            docs: ['Token accounts.'];
            type: {
              defined: {
                name: 'depositTokenAccounts';
              };
            };
          },
          {
            name: 'params';
            docs: ['Deposit params.'];
            type: {
              defined: {
                name: 'depositActionParams';
              };
            };
          },
          {
            name: 'swap';
            docs: ['Swap params.'];
            type: {
              defined: {
                name: 'swapActionParams';
              };
            };
          },
          {
            name: 'padding0';
            type: {
              array: ['u8', 4];
            };
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
      name: 'depositActionParams';
      docs: ['Deposit Params.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'initialLongTokenAmount';
            docs: ['The amount of initial long tokens to deposit.'];
            type: 'u64';
          },
          {
            name: 'initialShortTokenAmount';
            docs: ['The amount of initial short tokens to deposit.'];
            type: 'u64';
          },
          {
            name: 'minMarketTokenAmount';
            docs: [
              'The minimum acceptable amount of market tokens to receive.',
            ];
            type: 'u64';
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
      name: 'depositCreated';
      docs: ['Deposit Created Event.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'ts';
            docs: ['Event time.'];
            type: 'i64';
          },
          {
            name: 'store';
            docs: ['Store account.'];
            type: 'pubkey';
          },
          {
            name: 'deposit';
            docs: ['Deposit account.'];
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'depositExecuted';
      docs: ['Deposit executed Event.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'rev';
            docs: ['Revision.'];
            type: 'u64';
          },
          {
            name: 'marketToken';
            docs: ['Market token.'];
            type: 'pubkey';
          },
          {
            name: 'report';
            docs: ['Report.'];
            type: {
              defined: {
                name: 'depositReport';
                generics: [
                  {
                    kind: 'type';
                    type: 'u128';
                  },
                  {
                    kind: 'type';
                    type: 'i128';
                  },
                ];
              };
            };
          },
        ];
      };
    },
    {
      name: 'depositParams';
      docs: ['Deposit params.'];
      generics: [
        {
          kind: 'type';
          name: 't';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'longTokenAmount';
            type: {
              generic: 't';
            };
          },
          {
            name: 'shortTokenAmount';
            type: {
              generic: 't';
            };
          },
          {
            name: 'prices';
            type: {
              defined: {
                name: 'prices';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 't';
                    };
                  },
                ];
              };
            };
          },
        ];
      };
    },
    {
      name: 'depositRemoved';
      docs: ['Deposit removed event.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'id';
            docs: ['Action id.'];
            type: 'u64';
          },
          {
            name: 'ts';
            docs: ['Timestamp.'];
            type: 'i64';
          },
          {
            name: 'slot';
            docs: ['Slot.'];
            type: 'u64';
          },
          {
            name: 'store';
            docs: ['Store.'];
            type: 'pubkey';
          },
          {
            name: 'deposit';
            docs: ['Deposit.'];
            type: 'pubkey';
          },
          {
            name: 'marketToken';
            docs: ['Market token.'];
            type: 'pubkey';
          },
          {
            name: 'owner';
            docs: ['Owner.'];
            type: 'pubkey';
          },
          {
            name: 'state';
            docs: ['Final state.'];
            type: {
              defined: {
                name: 'actionState';
              };
            };
          },
          {
            name: 'reason';
            docs: ['Reason.'];
            type: 'string';
          },
        ];
      };
    },
    {
      name: 'depositReport';
      docs: ['Report of the execution of deposit.'];
      generics: [
        {
          kind: 'type';
          name: 'unsigned';
        },
        {
          kind: 'type';
          name: 'signed';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'params';
            type: {
              defined: {
                name: 'depositParams';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 'unsigned';
                    };
                  },
                ];
              };
            };
          },
          {
            name: 'minted';
            type: {
              generic: 'unsigned';
            };
          },
          {
            name: 'priceImpact';
            type: {
              generic: 'signed';
            };
          },
          {
            name: 'fees';
            type: {
              array: [
                {
                  defined: {
                    name: 'fees';
                    generics: [
                      {
                        kind: 'type';
                        type: {
                          generic: 'unsigned';
                        };
                      },
                    ];
                  };
                },
                2,
              ];
            };
          },
        ];
      };
    },
    {
      name: 'depositTokenAccounts';
      docs: ['Token Accounts.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'initialLongToken';
            docs: ['Initial long token accounts.'];
            type: {
              defined: {
                name: 'tokenAndAccount';
              };
            };
          },
          {
            name: 'initialShortToken';
            docs: ['Initial short token accounts.'];
            type: {
              defined: {
                name: 'tokenAndAccount';
              };
            };
          },
          {
            name: 'marketToken';
            docs: ['Market token account.'];
            type: {
              defined: {
                name: 'tokenAndAccount';
              };
            };
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
      name: 'distributePositionImpactReport';
      docs: ['Distribute Position Impact Report.'];
      generics: [
        {
          kind: 'type';
          name: 't';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'durationInSeconds';
            type: 'u64';
          },
          {
            name: 'distributionAmount';
            type: {
              generic: 't';
            };
          },
          {
            name: 'nextPositionImpactPoolAmount';
            type: {
              generic: 't';
            };
          },
        ];
      };
    },
    {
      name: 'entry';
      docs: ['An entry of the config buffer.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'key';
            docs: ['Key.'];
            type: 'u16';
          },
          {
            name: 'value';
            docs: ['Value.'];
            type: 'u128';
          },
        ];
      };
    },
    {
      name: 'entryArgs';
      docs: ['An entry of the config buffer.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'key';
            docs: ['Key.'];
            type: 'string';
          },
          {
            name: 'value';
            docs: ['Value.'];
            type: 'u128';
          },
        ];
      };
    },
    {
      name: 'eventClocks';
      docs: ['Market clocks.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'padding';
            type: {
              array: ['u8', 8];
            };
          },
          {
            name: 'rev';
            docs: ['Revision.'];
            type: 'u64';
          },
          {
            name: 'priceImpactDistribution';
            docs: ['Price impact distribution clock.'];
            type: 'i64';
          },
          {
            name: 'borrowing';
            docs: ['Borrowing clock.'];
            type: 'i64';
          },
          {
            name: 'funding';
            docs: ['Funding clock.'];
            type: 'i64';
          },
          {
            name: 'adlForLong';
            docs: ['ADL updated clock for long.'];
            type: 'i64';
          },
          {
            name: 'adlForShort';
            docs: ['ADL updated clock for short.'];
            type: 'i64';
          },
          {
            name: 'reserved';
            type: {
              array: ['i64', 3];
            };
          },
        ];
      };
    },
    {
      name: 'eventOtherState';
      docs: ['Market State.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'padding';
            type: {
              array: ['u8', 16];
            };
          },
          {
            name: 'rev';
            docs: ['Revision.'];
            type: 'u64';
          },
          {
            name: 'tradeCount';
            docs: ['Trade count.'];
            type: 'u64';
          },
          {
            name: 'longTokenBalance';
            docs: ['Long token balance.'];
            type: 'u64';
          },
          {
            name: 'shortTokenBalance';
            docs: ['Short token balance.'];
            type: 'u64';
          },
          {
            name: 'fundingFactorPerSecond';
            docs: ['Funding factor per second.'];
            type: 'i128';
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
      name: 'eventPool';
      docs: ['A pool for market.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'isPure';
            docs: [
              'Whether the pool only contains one kind of token,',
              'i.e. a pure pool.',
              'For a pure pool, only the `long_token_amount` field is used.',
            ];
            type: 'u8';
          },
          {
            name: 'padding';
            type: {
              array: ['u8', 15];
            };
          },
          {
            name: 'longTokenAmount';
            docs: ['Long token amount.'];
            type: 'u128';
          },
          {
            name: 'shortTokenAmount';
            docs: ['Short token amount.'];
            type: 'u128';
          },
        ];
      };
    },
    {
      name: 'eventPositionState';
      docs: ['Position State.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'tradeId';
            docs: ['Trade id.'];
            type: 'u64';
          },
          {
            name: 'increasedAt';
            docs: ['The time that the position last increased at.'];
            type: 'i64';
          },
          {
            name: 'updatedAtSlot';
            docs: ['Updated at slot.'];
            type: 'u64';
          },
          {
            name: 'decreasedAt';
            docs: ['The time that the position last decreased at.'];
            type: 'i64';
          },
          {
            name: 'sizeInTokens';
            docs: ['Size in tokens.'];
            type: 'u128';
          },
          {
            name: 'collateralAmount';
            docs: ['Collateral amount.'];
            type: 'u128';
          },
          {
            name: 'sizeInUsd';
            docs: ['Size in usd.'];
            type: 'u128';
          },
          {
            name: 'borrowingFactor';
            docs: ['Borrowing factor.'];
            type: 'u128';
          },
          {
            name: 'fundingFeeAmountPerSize';
            docs: ['Funding fee amount per size.'];
            type: 'u128';
          },
          {
            name: 'longTokenClaimableFundingAmountPerSize';
            docs: ['Long token claimable funding amount per size.'];
            type: 'u128';
          },
          {
            name: 'shortTokenClaimableFundingAmountPerSize';
            docs: ['Short token claimable funding amount per size.'];
            type: 'u128';
          },
          {
            name: 'reserved';
            docs: ['Reserved.'];
            type: {
              array: ['u8', 128];
            };
          },
        ];
      };
    },
    {
      name: 'eventTradeFees';
      docs: ['Trade Fees.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'orderFeeForReceiverAmount';
            docs: ['Order fee for receiver amount.'];
            type: 'u128';
          },
          {
            name: 'orderFeeForPoolAmount';
            docs: ['Order fee for pool amount.'];
            type: 'u128';
          },
          {
            name: 'liquidationFeeAmount';
            docs: ['Total liquidation fee amount.'];
            type: 'u128';
          },
          {
            name: 'liquidationFeeForReceiverAmount';
            docs: ['Liquidation fee for pool amount.'];
            type: 'u128';
          },
          {
            name: 'totalBorrowingFeeAmount';
            docs: ['Total borrowing fee amount.'];
            type: 'u128';
          },
          {
            name: 'borrowingFeeForReceiverAmount';
            docs: ['Borrowing fee for receiver amount.'];
            type: 'u128';
          },
          {
            name: 'fundingFeeAmount';
            docs: ['Funding fee amount.'];
            type: 'u128';
          },
          {
            name: 'claimableFundingFeeLongTokenAmount';
            docs: ['Claimable funding fee long token amount.'];
            type: 'u128';
          },
          {
            name: 'claimableFundingFeeShortTokenAmount';
            docs: ['Claimable funding fee short token amount.'];
            type: 'u128';
          },
        ];
      };
    },
    {
      name: 'eventTradeOutputAmounts';
      docs: ['Output amounts.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'outputAmount';
            docs: ['Output amount.'];
            type: 'u128';
          },
          {
            name: 'secondaryOutputAmount';
            docs: ['Secondary output amount.'];
            type: 'u128';
          },
        ];
      };
    },
    {
      name: 'eventTradePnl';
      docs: ['Trade PnL.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'pnl';
            docs: ['Final PnL value.'];
            type: 'i128';
          },
          {
            name: 'uncappedPnl';
            docs: ['Uncapped PnL value.'];
            type: 'i128';
          },
        ];
      };
    },
    {
      name: 'eventTradePrice';
      docs: ['Price.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'min';
            docs: ['Min price.'];
            type: 'u128';
          },
          {
            name: 'max';
            docs: ['Max price.'];
            type: 'u128';
          },
        ];
      };
    },
    {
      name: 'eventTradePrices';
      docs: ['Trade Prices.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'index';
            docs: ['Index token price.'];
            type: {
              defined: {
                name: 'eventTradePrice';
              };
            };
          },
          {
            name: 'long';
            docs: ['Long token price.'];
            type: {
              defined: {
                name: 'eventTradePrice';
              };
            };
          },
          {
            name: 'short';
            docs: ['Short token price.'];
            type: {
              defined: {
                name: 'eventTradePrice';
              };
            };
          },
        ];
      };
    },
    {
      name: 'eventTransferOut';
      docs: ['Transfer Out.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'executed';
            docs: ['Executed.'];
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
            docs: ['Final output token.'];
            type: 'u64';
          },
          {
            name: 'secondaryOutputToken';
            docs: ['Secondary output token.'];
            type: 'u64';
          },
          {
            name: 'longToken';
            docs: ['Long token.'];
            type: 'u64';
          },
          {
            name: 'shortToken';
            docs: ['Short token.'];
            type: 'u64';
          },
          {
            name: 'longTokenForClaimableAccountOfUser';
            docs: ['Long token amount for claimable account of user.'];
            type: 'u64';
          },
          {
            name: 'shortTokenForClaimableAccountOfUser';
            docs: ['Short token amount for claimable account of user.'];
            type: 'u64';
          },
          {
            name: 'longTokenForClaimableAccountOfHolding';
            docs: ['Long token amount for claimable account of holding.'];
            type: 'u64';
          },
          {
            name: 'shortTokenForClaimableAccountOfHolding';
            docs: ['Short token amount for claimable account of holding.'];
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'executionParams';
      docs: ['Execution Params for increasing position.'];
      generics: [
        {
          kind: 'type';
          name: 'unsigned';
        },
        {
          kind: 'type';
          name: 'signed';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'priceImpactValue';
            type: {
              generic: 'signed';
            };
          },
          {
            name: 'priceImpactAmount';
            type: {
              generic: 'signed';
            };
          },
          {
            name: 'sizeDeltaInTokens';
            type: {
              generic: 'unsigned';
            };
          },
          {
            name: 'executionPrice';
            type: {
              generic: 'unsigned';
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
      name: 'fees';
      docs: ['Fees.'];
      generics: [
        {
          kind: 'type';
          name: 't';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'feeAmountForReceiver';
            type: {
              generic: 't';
            };
          },
          {
            name: 'feeAmountForPool';
            type: {
              generic: 't';
            };
          },
        ];
      };
    },
    {
      name: 'fundingFees';
      docs: ['Funding Fees.'];
      generics: [
        {
          kind: 'type';
          name: 't';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'amount';
            type: {
              generic: 't';
            };
          },
          {
            name: 'claimableLongTokenAmount';
            type: {
              generic: 't';
            };
          },
          {
            name: 'claimableShortTokenAmount';
            type: {
              generic: 't';
            };
          },
        ];
      };
    },
    {
      name: 'glv';
      docs: ['Glv.'];
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
            docs: ['Bump seed.'];
            type: 'u8';
          },
          {
            name: 'bumpBytes';
            type: {
              array: ['u8', 1];
            };
          },
          {
            name: 'padding0';
            type: {
              array: ['u8', 3];
            };
          },
          {
            name: 'index';
            docs: ['Index.'];
            type: 'u16';
          },
          {
            name: 'store';
            docs: ['Store.'];
            type: 'pubkey';
          },
          {
            name: 'glvToken';
            type: 'pubkey';
          },
          {
            name: 'longToken';
            type: 'pubkey';
          },
          {
            name: 'shortToken';
            type: 'pubkey';
          },
          {
            name: 'shiftLastExecutedAt';
            type: 'i64';
          },
          {
            name: 'minTokensForFirstDeposit';
            type: 'u64';
          },
          {
            name: 'shiftMinIntervalSecs';
            type: 'u32';
          },
          {
            name: 'padding1';
            type: {
              array: ['u8', 4];
            };
          },
          {
            name: 'shiftMaxPriceImpactFactor';
            type: 'u128';
          },
          {
            name: 'shiftMinValue';
            type: 'u128';
          },
          {
            name: 'reserved';
            type: {
              array: ['u8', 256];
            };
          },
          {
            name: 'markets';
            docs: ['Market config map with market token addresses as keys.'];
            type: {
              defined: {
                name: 'glvMarkets';
              };
            };
          },
        ];
      };
    },
    {
      name: 'glvDeposit';
      docs: ['Glv Deposit.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'header';
            docs: ['Header.'];
            type: {
              defined: {
                name: 'actionHeader';
              };
            };
          },
          {
            name: 'tokens';
            docs: ['Token accounts.'];
            type: {
              defined: {
                name: 'glvDepositTokenAccounts';
              };
            };
          },
          {
            name: 'params';
            docs: ['Params.'];
            type: {
              defined: {
                name: 'glvDepositActionParams';
              };
            };
          },
          {
            name: 'swap';
            docs: ['Swap params.'];
            type: {
              defined: {
                name: 'swapActionParams';
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
            name: 'reserved';
            type: {
              array: ['u8', 128];
            };
          },
        ];
      };
    },
    {
      name: 'glvDepositActionParams';
      docs: ['GLV Deposit Params.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'deposit';
            docs: ['Deposit params.'];
            type: {
              defined: {
                name: 'depositActionParams';
              };
            };
          },
          {
            name: 'marketTokenAmount';
            docs: ['The amount of market tokens to deposit.'];
            type: 'u64';
          },
          {
            name: 'minGlvTokenAmount';
            docs: ['The minimum acceptable amount of glv tokens to receive.'];
            type: 'u64';
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
      name: 'glvDepositRemoved';
      docs: ['GLV Deposit removed event.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'id';
            docs: ['Action id.'];
            type: 'u64';
          },
          {
            name: 'ts';
            docs: ['Timestamp.'];
            type: 'i64';
          },
          {
            name: 'slot';
            docs: ['Slot.'];
            type: 'u64';
          },
          {
            name: 'store';
            docs: ['Store.'];
            type: 'pubkey';
          },
          {
            name: 'glvDeposit';
            docs: ['GLV Deposit.'];
            type: 'pubkey';
          },
          {
            name: 'marketToken';
            docs: ['Market token.'];
            type: 'pubkey';
          },
          {
            name: 'glvToken';
            docs: ['GLV token.'];
            type: 'pubkey';
          },
          {
            name: 'owner';
            docs: ['Owner.'];
            type: 'pubkey';
          },
          {
            name: 'state';
            docs: ['Final state.'];
            type: {
              defined: {
                name: 'actionState';
              };
            };
          },
          {
            name: 'reason';
            docs: ['Reason.'];
            type: 'string';
          },
        ];
      };
    },
    {
      name: 'glvDepositTokenAccounts';
      docs: ['Token and accounts.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'initialLongToken';
            docs: ['Initial long token and account.'];
            type: {
              defined: {
                name: 'tokenAndAccount';
              };
            };
          },
          {
            name: 'initialShortToken';
            docs: ['Initial short token and account.'];
            type: {
              defined: {
                name: 'tokenAndAccount';
              };
            };
          },
          {
            name: 'marketToken';
            docs: ['Market token and account.'];
            type: {
              defined: {
                name: 'tokenAndAccount';
              };
            };
          },
          {
            name: 'glvToken';
            docs: ['GLV token and account.'];
            type: {
              defined: {
                name: 'tokenAndAccount';
              };
            };
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
      name: 'glvMarketConfig';
      docs: ['Market Config for GLV.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'maxAmount';
            type: 'u64';
          },
          {
            name: 'flags';
            type: {
              defined: {
                name: 'glvMarketFlagContainer';
              };
            };
          },
          {
            name: 'padding0';
            type: {
              array: ['u8', 7];
            };
          },
          {
            name: 'maxValue';
            type: 'u128';
          },
          {
            name: 'balance';
            type: 'u64';
          },
          {
            name: 'padding1';
            type: {
              array: ['u8', 8];
            };
          },
        ];
      };
    },
    {
      name: 'glvMarketFlagContainer';
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
      name: 'glvMarkets';
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
                    name: 'glvMarketsEntry';
                  };
                },
                96,
              ];
            };
          },
          {
            name: 'padding';
            type: {
              array: ['u8', 12];
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
      name: 'glvMarketsEntry';
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
                name: 'glvMarketConfig';
              };
            };
          },
        ];
      };
    },
    {
      name: 'glvPricing';
      docs: ['GLV pricing event.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'glvToken';
            docs: ['GLV token.'];
            type: 'pubkey';
          },
          {
            name: 'marketToken';
            docs: ['Market token.'];
            type: 'pubkey';
          },
          {
            name: 'supply';
            docs: ['The supply of the GLV tokens.'];
            type: 'u64';
          },
          {
            name: 'isValueMaximized';
            docs: ['Whether the `value` is maximized.'];
            type: 'bool';
          },
          {
            name: 'value';
            docs: ['Total value of the GLV.'];
            type: 'u128';
          },
          {
            name: 'inputAmount';
            docs: [
              'Input amount.',
              '- For GLV deposit, this is the total amount of market tokens received.',
              '- For GLV withdrawal, this is the amount of GLV tokens received.',
            ];
            type: 'u64';
          },
          {
            name: 'inputValue';
            docs: ['The value of the input amount.'];
            type: 'u128';
          },
          {
            name: 'outputAmount';
            docs: [
              'Output amount.',
              '- For GLV deposit, this will be the amount of GLV tokens to be minted.',
              '- For GLV withdrawal, this will be the amount of market tokens to be burned.',
            ];
            type: 'u64';
          },
          {
            name: 'kind';
            docs: ['The type of GLV pricing.'];
            type: {
              defined: {
                name: 'glvPricingKind';
              };
            };
          },
        ];
      };
    },
    {
      name: 'glvPricingKind';
      docs: ['Pricing kind.'];
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'deposit';
          },
          {
            name: 'withdrawal';
          },
        ];
      };
    },
    {
      name: 'glvShift';
      docs: ['Glv Shift.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'shift';
            type: {
              defined: {
                name: 'shift';
              };
            };
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
      name: 'glvWithdrawal';
      docs: ['Glv Withdrawal.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'header';
            docs: ['Header.'];
            type: {
              defined: {
                name: 'actionHeader';
              };
            };
          },
          {
            name: 'tokens';
            docs: ['Token accounts.'];
            type: {
              defined: {
                name: 'glvWithdrawalTokenAccounts';
              };
            };
          },
          {
            name: 'params';
            docs: ['Params.'];
            type: {
              defined: {
                name: 'glvWithdrawalActionParams';
              };
            };
          },
          {
            name: 'swap';
            docs: ['Swap params.'];
            type: {
              defined: {
                name: 'swapActionParams';
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
            name: 'reserved';
            type: {
              array: ['u8', 128];
            };
          },
        ];
      };
    },
    {
      name: 'glvWithdrawalActionParams';
      docs: ['GLV Withdrawal Params.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'glvTokenAmount';
            docs: ['The amount of GLV tokens to burn.'];
            type: 'u64';
          },
          {
            name: 'minFinalLongTokenAmount';
            docs: [
              'The minimum acceptable amount of final long tokens to receive.',
            ];
            type: 'u64';
          },
          {
            name: 'minFinalShortTokenAmount';
            docs: [
              'The minimum acceptable amount of final short tokens to receive.',
            ];
            type: 'u64';
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
      name: 'glvWithdrawalRemoved';
      docs: ['GLV Withdrawal removed event.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'id';
            docs: ['Action id.'];
            type: 'u64';
          },
          {
            name: 'ts';
            docs: ['Timestamp.'];
            type: 'i64';
          },
          {
            name: 'slot';
            docs: ['Slot.'];
            type: 'u64';
          },
          {
            name: 'store';
            docs: ['Store.'];
            type: 'pubkey';
          },
          {
            name: 'glvWithdrawal';
            docs: ['GLV Withdrawal'];
            type: 'pubkey';
          },
          {
            name: 'marketToken';
            docs: ['Market token.'];
            type: 'pubkey';
          },
          {
            name: 'glvToken';
            docs: ['GLV token.'];
            type: 'pubkey';
          },
          {
            name: 'owner';
            docs: ['Owner.'];
            type: 'pubkey';
          },
          {
            name: 'state';
            docs: ['Final state.'];
            type: {
              defined: {
                name: 'actionState';
              };
            };
          },
          {
            name: 'reason';
            docs: ['Reason.'];
            type: 'string';
          },
        ];
      };
    },
    {
      name: 'glvWithdrawalTokenAccounts';
      docs: ['Token and accounts.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'finalLongToken';
            docs: ['Final ong token and account.'];
            type: {
              defined: {
                name: 'tokenAndAccount';
              };
            };
          },
          {
            name: 'finalShortToken';
            docs: ['Final short token and account.'];
            type: {
              defined: {
                name: 'tokenAndAccount';
              };
            };
          },
          {
            name: 'marketToken';
            docs: ['Market token and account.'];
            type: {
              defined: {
                name: 'tokenAndAccount';
              };
            };
          },
          {
            name: 'glvToken';
            docs: ['GLV token and account.'];
            type: {
              defined: {
                name: 'tokenAndAccount';
              };
            };
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
      name: 'gtBuyback';
      docs: ['Event indicating that a GT buyback has occurred.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'ts';
            docs: ['Timestamp.'];
            type: 'i64';
          },
          {
            name: 'slot';
            docs: ['Slot.'];
            type: 'u64';
          },
          {
            name: 'store';
            docs: ['Store.'];
            type: 'pubkey';
          },
          {
            name: 'gtExchangeVault';
            docs: ['GT exchange vault.'];
            type: 'pubkey';
          },
          {
            name: 'authority';
            docs: ['Authority.'];
            type: 'pubkey';
          },
          {
            name: 'buybackAmount';
            docs: ['Total buyback amount.'];
            type: 'u64';
          },
          {
            name: 'buybackValue';
            docs: ['Buyback value.'];
            type: {
              option: 'u128';
            };
          },
          {
            name: 'buybackPrice';
            docs: ['Buyback price.'];
            type: {
              option: 'u128';
            };
          },
        ];
      };
    },
    {
      name: 'gtExchange';
      docs: ['GT Exchange Account.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'bump';
            docs: ['Bump.'];
            type: 'u8';
          },
          {
            name: 'flags';
            type: {
              defined: {
                name: 'gtExchangeFlagContainer';
              };
            };
          },
          {
            name: 'padding';
            type: {
              array: ['u8', 6];
            };
          },
          {
            name: 'amount';
            type: 'u64';
          },
          {
            name: 'owner';
            docs: ['Owner address.'];
            type: 'pubkey';
          },
          {
            name: 'store';
            docs: ['Store address.'];
            type: 'pubkey';
          },
          {
            name: 'vault';
            docs: ['Vault address.'];
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
      name: 'gtExchangeFlagContainer';
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
      name: 'gtExchangeVault';
      docs: ['GT Exchange Vault.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'bump';
            docs: ['Bump seed.'];
            type: 'u8';
          },
          {
            name: 'flags';
            type: {
              defined: {
                name: 'gtExchangeVaultFlagContainer';
              };
            };
          },
          {
            name: 'padding';
            type: {
              array: ['u8', 6];
            };
          },
          {
            name: 'ts';
            type: 'i64';
          },
          {
            name: 'timeWindow';
            type: 'i64';
          },
          {
            name: 'amount';
            type: 'u64';
          },
          {
            name: 'store';
            docs: ['Store.'];
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
      name: 'gtExchangeVaultFlagContainer';
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
      name: 'gtUpdateKind';
      docs: ['GT Update Kind.'];
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'reward';
          },
          {
            name: 'mint';
          },
          {
            name: 'burn';
          },
        ];
      };
    },
    {
      name: 'gtUpdated';
      docs: ['GT updated event.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'kind';
            docs: ['Update kind.'];
            type: {
              defined: {
                name: 'gtUpdateKind';
              };
            };
          },
          {
            name: 'receiver';
            docs: ['Receiver.'];
            type: {
              option: 'pubkey';
            };
          },
          {
            name: 'receiverDelta';
            docs: ['Receiver Delta.'];
            type: 'u64';
          },
          {
            name: 'receiverBalance';
            docs: ['Receiver balance.'];
            type: {
              option: 'u64';
            };
          },
          {
            name: 'mintingCost';
            docs: ['Minting cost.'];
            type: 'u128';
          },
          {
            name: 'totalMinted';
            docs: ['Total minted.'];
            type: 'u64';
          },
          {
            name: 'growSteps';
            docs: ['Grow steps.'];
            type: 'u64';
          },
          {
            name: 'supply';
            docs: ['Latest supply.'];
            type: 'u64';
          },
          {
            name: 'vault';
            docs: ['Vault.'];
            type: 'u64';
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
      name: 'increasePositionParams';
      docs: ['Increase Position Params.'];
      generics: [
        {
          kind: 'type';
          name: 't';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'collateralIncrementAmount';
            type: {
              generic: 't';
            };
          },
          {
            name: 'sizeDeltaUsd';
            type: {
              generic: 't';
            };
          },
          {
            name: 'acceptablePrice';
            type: {
              option: {
                generic: 't';
              };
            };
          },
          {
            name: 'prices';
            type: {
              defined: {
                name: 'prices';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 't';
                    };
                  },
                ];
              };
            };
          },
        ];
      };
    },
    {
      name: 'increasePositionReport';
      docs: ['Report of the execution of position increasing.'];
      generics: [
        {
          kind: 'type';
          name: 'unsigned';
        },
        {
          kind: 'type';
          name: 'signed';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'params';
            type: {
              defined: {
                name: 'increasePositionParams';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 'unsigned';
                    };
                  },
                ];
              };
            };
          },
          {
            name: 'execution';
            type: {
              defined: {
                name: 'executionParams';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 'unsigned';
                    };
                  },
                  {
                    kind: 'type';
                    type: {
                      generic: 'signed';
                    };
                  },
                ];
              };
            };
          },
          {
            name: 'collateralDeltaAmount';
            type: {
              generic: 'signed';
            };
          },
          {
            name: 'fees';
            type: {
              defined: {
                name: 'positionFees';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 'unsigned';
                    };
                  },
                ];
              };
            };
          },
          {
            name: 'claimableFundingLongTokenAmount';
            docs: ['Output amounts that must be processed.'];
            type: {
              generic: 'unsigned';
            };
          },
          {
            name: 'claimableFundingShortTokenAmount';
            type: {
              generic: 'unsigned';
            };
          },
        ];
      };
    },
    {
      name: 'indexer';
      docs: ['Market indexer.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'tradeCount';
            type: 'u64';
          },
          {
            name: 'depositCount';
            type: 'u64';
          },
          {
            name: 'withdrawalCount';
            type: 'u64';
          },
          {
            name: 'orderCount';
            type: 'u64';
          },
          {
            name: 'shiftCount';
            type: 'u64';
          },
          {
            name: 'glvDepositCount';
            type: 'u64';
          },
          {
            name: 'glvWithdrawalCount';
            type: 'u64';
          },
          {
            name: 'padding0';
            type: {
              array: ['u8', 8];
            };
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
      name: 'insolventCloseStep';
      docs: ['Insolvent Close Step.'];
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'pnl';
          },
          {
            name: 'fees';
          },
          {
            name: 'funding';
          },
          {
            name: 'impact';
          },
          {
            name: 'diff';
          },
        ];
      };
    },
    {
      name: 'insufficientFundingFeePayment';
      docs: [
        'An event indicating that insufficient funding fee payment has occurred.',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'ts';
            docs: ['Timestamp.'];
            type: 'i64';
          },
          {
            name: 'slot';
            docs: ['Slot.'];
            type: 'u64';
          },
          {
            name: 'store';
            docs: ['Store.'];
            type: 'pubkey';
          },
          {
            name: 'marketToken';
            docs: ['Market token.'];
            type: 'pubkey';
          },
          {
            name: 'costAmount';
            docs: ['Funding fee amount to pay.'];
            type: 'u128';
          },
          {
            name: 'paidInCollateralAmount';
            docs: ['Paid collateral token amount.'];
            type: 'u128';
          },
          {
            name: 'paidInSecondaryOutputAmount';
            docs: ['Paid secondary token amount.'];
            type: 'u128';
          },
          {
            name: 'isCollateralTokenLong';
            docs: ['Whether the collateral token is long token.'];
            type: 'bool';
          },
        ];
      };
    },
    {
      name: 'liquidationFees';
      docs: ['Liquidation Fees.'];
      generics: [
        {
          kind: 'type';
          name: 't';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'feeValue';
            type: {
              generic: 't';
            };
          },
          {
            name: 'feeAmount';
            type: {
              generic: 't';
            };
          },
          {
            name: 'feeAmountForReceiver';
            type: {
              generic: 't';
            };
          },
        ];
      };
    },
    {
      name: 'market';
      docs: ['Market.'];
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
            docs: ['Bump Seed.'];
            type: 'u8';
          },
          {
            name: 'flags';
            type: {
              defined: {
                name: 'marketFlagContainer';
              };
            };
          },
          {
            name: 'padding';
            type: {
              array: ['u8', 13];
            };
          },
          {
            name: 'name';
            type: {
              array: ['u8', 64];
            };
          },
          {
            name: 'meta';
            type: {
              defined: {
                name: 'marketMeta';
              };
            };
          },
          {
            name: 'store';
            docs: ['Store.'];
            type: 'pubkey';
          },
          {
            name: 'config';
            type: {
              defined: {
                name: 'marketConfig';
              };
            };
          },
          {
            name: 'indexer';
            type: {
              defined: {
                name: 'indexer';
              };
            };
          },
          {
            name: 'state';
            type: {
              defined: {
                name: 'state';
              };
            };
          },
          {
            name: 'buffer';
            type: {
              defined: {
                name: 'revertibleBuffer';
              };
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
      name: 'marketConfig';
      docs: ['Market Config.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'flag';
            docs: ['Flags.'];
            type: {
              defined: {
                name: 'marketConfigFlagContainer';
              };
            };
          },
          {
            name: 'swapImpactExponent';
            type: 'u128';
          },
          {
            name: 'swapImpactPositiveFactor';
            type: 'u128';
          },
          {
            name: 'swapImpactNegativeFactor';
            type: 'u128';
          },
          {
            name: 'swapFeeReceiverFactor';
            type: 'u128';
          },
          {
            name: 'swapFeeFactorForPositiveImpact';
            type: 'u128';
          },
          {
            name: 'swapFeeFactorForNegativeImpact';
            type: 'u128';
          },
          {
            name: 'minPositionSizeUsd';
            type: 'u128';
          },
          {
            name: 'minCollateralValue';
            type: 'u128';
          },
          {
            name: 'minCollateralFactor';
            type: 'u128';
          },
          {
            name: 'minCollateralFactorForOpenInterestMultiplierForLong';
            type: 'u128';
          },
          {
            name: 'minCollateralFactorForOpenInterestMultiplierForShort';
            type: 'u128';
          },
          {
            name: 'maxPositivePositionImpactFactor';
            type: 'u128';
          },
          {
            name: 'maxNegativePositionImpactFactor';
            type: 'u128';
          },
          {
            name: 'maxPositionImpactFactorForLiquidations';
            type: 'u128';
          },
          {
            name: 'positionImpactExponent';
            type: 'u128';
          },
          {
            name: 'positionImpactPositiveFactor';
            type: 'u128';
          },
          {
            name: 'positionImpactNegativeFactor';
            type: 'u128';
          },
          {
            name: 'orderFeeReceiverFactor';
            type: 'u128';
          },
          {
            name: 'orderFeeFactorForPositiveImpact';
            type: 'u128';
          },
          {
            name: 'orderFeeFactorForNegativeImpact';
            type: 'u128';
          },
          {
            name: 'liquidationFeeReceiverFactor';
            type: 'u128';
          },
          {
            name: 'liquidationFeeFactor';
            type: 'u128';
          },
          {
            name: 'positionImpactDistributeFactor';
            type: 'u128';
          },
          {
            name: 'minPositionImpactPoolAmount';
            type: 'u128';
          },
          {
            name: 'borrowingFeeReceiverFactor';
            type: 'u128';
          },
          {
            name: 'borrowingFeeFactorForLong';
            type: 'u128';
          },
          {
            name: 'borrowingFeeFactorForShort';
            type: 'u128';
          },
          {
            name: 'borrowingFeeExponentForLong';
            type: 'u128';
          },
          {
            name: 'borrowingFeeExponentForShort';
            type: 'u128';
          },
          {
            name: 'borrowingFeeOptimalUsageFactorForLong';
            type: 'u128';
          },
          {
            name: 'borrowingFeeOptimalUsageFactorForShort';
            type: 'u128';
          },
          {
            name: 'borrowingFeeBaseFactorForLong';
            type: 'u128';
          },
          {
            name: 'borrowingFeeBaseFactorForShort';
            type: 'u128';
          },
          {
            name: 'borrowingFeeAboveOptimalUsageFactorForLong';
            type: 'u128';
          },
          {
            name: 'borrowingFeeAboveOptimalUsageFactorForShort';
            type: 'u128';
          },
          {
            name: 'fundingFeeExponent';
            type: 'u128';
          },
          {
            name: 'fundingFeeFactor';
            type: 'u128';
          },
          {
            name: 'fundingFeeMaxFactorPerSecond';
            type: 'u128';
          },
          {
            name: 'fundingFeeMinFactorPerSecond';
            type: 'u128';
          },
          {
            name: 'fundingFeeIncreaseFactorPerSecond';
            type: 'u128';
          },
          {
            name: 'fundingFeeDecreaseFactorPerSecond';
            type: 'u128';
          },
          {
            name: 'fundingFeeThresholdForStableFunding';
            type: 'u128';
          },
          {
            name: 'fundingFeeThresholdForDecreaseFunding';
            type: 'u128';
          },
          {
            name: 'reserveFactor';
            type: 'u128';
          },
          {
            name: 'openInterestReserveFactor';
            type: 'u128';
          },
          {
            name: 'maxPnlFactorForLongDeposit';
            type: 'u128';
          },
          {
            name: 'maxPnlFactorForShortDeposit';
            type: 'u128';
          },
          {
            name: 'maxPnlFactorForLongWithdrawal';
            type: 'u128';
          },
          {
            name: 'maxPnlFactorForShortWithdrawal';
            type: 'u128';
          },
          {
            name: 'maxPnlFactorForLongTrader';
            type: 'u128';
          },
          {
            name: 'maxPnlFactorForShortTrader';
            type: 'u128';
          },
          {
            name: 'maxPnlFactorForLongAdl';
            type: 'u128';
          },
          {
            name: 'maxPnlFactorForShortAdl';
            type: 'u128';
          },
          {
            name: 'minPnlFactorAfterLongAdl';
            type: 'u128';
          },
          {
            name: 'minPnlFactorAfterShortAdl';
            type: 'u128';
          },
          {
            name: 'maxPoolAmountForLongToken';
            type: 'u128';
          },
          {
            name: 'maxPoolAmountForShortToken';
            type: 'u128';
          },
          {
            name: 'maxPoolValueForDepositForLongToken';
            type: 'u128';
          },
          {
            name: 'maxPoolValueForDepositForShortToken';
            type: 'u128';
          },
          {
            name: 'maxOpenInterestForLong';
            type: 'u128';
          },
          {
            name: 'maxOpenInterestForShort';
            type: 'u128';
          },
          {
            name: 'minTokensForFirstDeposit';
            type: 'u128';
          },
          {
            name: 'reserved';
            type: {
              array: ['u128', 32];
            };
          },
        ];
      };
    },
    {
      name: 'marketConfigBuffer';
      docs: ['Market Config Buffer.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'store';
            docs: ['Store.'];
            type: 'pubkey';
          },
          {
            name: 'authority';
            docs: ['Authority.'];
            type: 'pubkey';
          },
          {
            name: 'expiry';
            docs: ['Expiration time.'];
            type: 'i64';
          },
          {
            name: 'entries';
            type: {
              vec: {
                defined: {
                  name: 'entry';
                };
              };
            };
          },
        ];
      };
    },
    {
      name: 'marketConfigFlagContainer';
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
            type: 'u128';
          },
        ];
      };
    },
    {
      name: 'marketFeesUpdated';
      docs: ['Market fees updated event.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'rev';
            docs: ['Revision.'];
            type: 'u64';
          },
          {
            name: 'marketToken';
            docs: ['Market token.'];
            type: 'pubkey';
          },
          {
            name: 'positionImpactDistribution';
            docs: ['Position impact distribution report.'];
            type: {
              defined: {
                name: 'distributePositionImpactReport';
                generics: [
                  {
                    kind: 'type';
                    type: 'u128';
                  },
                ];
              };
            };
          },
          {
            name: 'updateBorrowingState';
            docs: ['Update borrowing state report.'];
            type: {
              defined: {
                name: 'updateBorrowingReport';
                generics: [
                  {
                    kind: 'type';
                    type: 'u128';
                  },
                ];
              };
            };
          },
          {
            name: 'updateFundingState';
            docs: ['Update funding state report.'];
            type: {
              defined: {
                name: 'updateFundingReport';
                generics: [
                  {
                    kind: 'type';
                    type: 'u128';
                  },
                  {
                    kind: 'type';
                    type: 'i128';
                  },
                ];
              };
            };
          },
        ];
      };
    },
    {
      name: 'marketFlagContainer';
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
      name: 'marketMeta';
      docs: ['Market Metadata.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'marketTokenMint';
            docs: ['Market token.'];
            type: 'pubkey';
          },
          {
            name: 'indexTokenMint';
            docs: ['Index token.'];
            type: 'pubkey';
          },
          {
            name: 'longTokenMint';
            docs: ['Long token.'];
            type: 'pubkey';
          },
          {
            name: 'shortTokenMint';
            docs: ['Short token.'];
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'marketStateUpdated';
      docs: ['Market State Updated Event.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'rev';
            docs: ['Revision.'];
            type: 'u64';
          },
          {
            name: 'marketToken';
            docs: ['Market token.'];
            type: 'pubkey';
          },
          {
            name: 'poolKinds';
            docs: ['Updated pool kinds.'];
            type: {
              vec: {
                defined: {
                  name: 'poolKind';
                };
              };
            };
          },
          {
            name: 'pools';
            docs: ['Updated pools.'];
            type: {
              vec: {
                defined: {
                  name: 'eventPool';
                };
              };
            };
          },
          {
            name: 'clocks';
            docs: ['Clocks.'];
            type: {
              vec: {
                defined: {
                  name: 'eventClocks';
                };
              };
            };
          },
          {
            name: 'other';
            docs: ['Other states.'];
            type: {
              vec: {
                defined: {
                  name: 'eventOtherState';
                };
              };
            };
          },
        ];
      };
    },
    {
      name: 'marketStatus';
      docs: ['Market Status.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'fundingFactorPerSecond';
            docs: ['Funding factor per second.'];
            type: 'i128';
          },
          {
            name: 'borrowingFactorPerSecondForLong';
            docs: ['Borrowing factor per second for long.'];
            type: 'u128';
          },
          {
            name: 'borrowingFactorPerSecondForShort';
            docs: ['Borrowing factor per second for short.'];
            type: 'u128';
          },
          {
            name: 'pendingPnlForLong';
            docs: ['Pending pnl for long.'];
            type: 'i128';
          },
          {
            name: 'pendingPnlForShort';
            docs: ['Pending pnl for short.'];
            type: 'i128';
          },
          {
            name: 'reserveValueForLong';
            docs: ['Reserve value for long.'];
            type: 'u128';
          },
          {
            name: 'reserveValueForShort';
            docs: ['Reserve value for short.'];
            type: 'u128';
          },
          {
            name: 'poolValueWithoutPnlForLong';
            docs: ['Pool value without pnl for long.'];
            type: 'u128';
          },
          {
            name: 'poolValueWithoutPnlForShort';
            docs: ['Pool value without pnl for short.'];
            type: 'u128';
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
      name: 'oracle';
      docs: ['Oracle Account.'];
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
            name: 'padding0';
            type: {
              array: ['u8', 7];
            };
          },
          {
            name: 'store';
            docs: ['Store.'];
            type: 'pubkey';
          },
          {
            name: 'authority';
            docs: [
              'This address is authorized to **directly** modify',
              'the oracle through instructions.',
            ];
            type: 'pubkey';
          },
          {
            name: 'minOracleTs';
            type: 'i64';
          },
          {
            name: 'maxOracleTs';
            type: 'i64';
          },
          {
            name: 'minOracleSlot';
            type: 'u64';
          },
          {
            name: 'primary';
            type: {
              defined: {
                name: 'priceMap';
              };
            };
          },
          {
            name: 'flags';
            type: {
              defined: {
                name: 'oracleFlagContainer';
              };
            };
          },
          {
            name: 'padding1';
            type: {
              array: ['u8', 3];
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
      name: 'oracleFlagContainer';
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
      name: 'order';
      docs: ['Order.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'header';
            docs: ['Action header.'];
            type: {
              defined: {
                name: 'actionHeader';
              };
            };
          },
          {
            name: 'marketToken';
            docs: ['Market token.'];
            type: 'pubkey';
          },
          {
            name: 'tokens';
            docs: ['Token accounts.'];
            type: {
              defined: {
                name: 'orderTokenAccounts';
              };
            };
          },
          {
            name: 'swap';
            docs: ['Swap params.'];
            type: {
              defined: {
                name: 'swapActionParams';
              };
            };
          },
          {
            name: 'padding0';
            type: {
              array: ['u8', 4];
            };
          },
          {
            name: 'params';
            docs: ['Order params.'];
            type: {
              defined: {
                name: 'orderActionParams';
              };
            };
          },
          {
            name: 'gtReward';
            type: 'u64';
          },
          {
            name: 'padding1';
            type: {
              array: ['u8', 8];
            };
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
      name: 'orderActionParams';
      docs: ['Order params.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'kind';
            docs: ['Kind.'];
            type: 'u8';
          },
          {
            name: 'side';
            docs: ['Order side.'];
            type: 'u8';
          },
          {
            name: 'decreasePositionSwapType';
            docs: ['Decrease position swap type.'];
            type: 'u8';
          },
          {
            name: 'padding1';
            type: {
              array: ['u8', 5];
            };
          },
          {
            name: 'collateralToken';
            docs: ['Collateral/Output token.'];
            type: 'pubkey';
          },
          {
            name: 'position';
            docs: ['Position address.'];
            type: 'pubkey';
          },
          {
            name: 'initialCollateralDeltaAmount';
            docs: ['Initial collateral delta amount.'];
            type: 'u64';
          },
          {
            name: 'sizeDeltaValue';
            docs: ['Size delta value.'];
            type: 'u128';
          },
          {
            name: 'minOutput';
            docs: [
              'Min output amount or value.',
              '- Used as amount for swap orders.',
              '- Used as value for decrease position orders.',
            ];
            type: 'u128';
          },
          {
            name: 'triggerPrice';
            docs: ['Trigger price (in unit price).'];
            type: 'u128';
          },
          {
            name: 'acceptablePrice';
            docs: ['Acceptable price (in unit price).'];
            type: 'u128';
          },
          {
            name: 'validFromTs';
            type: 'i64';
          },
          {
            name: 'padding2';
            type: {
              array: ['u8', 8];
            };
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
      name: 'orderCreated';
      docs: ['Order created event.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'ts';
            docs: ['Event time.'];
            type: 'i64';
          },
          {
            name: 'store';
            docs: ['Store account.'];
            type: 'pubkey';
          },
          {
            name: 'order';
            docs: ['Order account.'];
            type: 'pubkey';
          },
          {
            name: 'position';
            docs: ['Position account.'];
            type: {
              option: 'pubkey';
            };
          },
        ];
      };
    },
    {
      name: 'orderFees';
      docs: ['Order Fees.'];
      generics: [
        {
          kind: 'type';
          name: 't';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'base';
            type: {
              defined: {
                name: 'fees';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 't';
                    };
                  },
                ];
              };
            };
          },
          {
            name: 'feeValue';
            type: {
              generic: 't';
            };
          },
        ];
      };
    },
    {
      name: 'orderKind';
      docs: ['Order Kind.'];
      repr: {
        kind: 'rust';
      };
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'liquidation';
          },
          {
            name: 'autoDeleveraging';
          },
          {
            name: 'marketSwap';
          },
          {
            name: 'marketIncrease';
          },
          {
            name: 'marketDecrease';
          },
          {
            name: 'limitSwap';
          },
          {
            name: 'limitIncrease';
          },
          {
            name: 'limitDecrease';
          },
          {
            name: 'stopLossDecrease';
          },
        ];
      };
    },
    {
      name: 'orderParamsForEvent';
      docs: ['Order parameters for event.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'kind';
            docs: ['Order kind.'];
            type: {
              defined: {
                name: 'orderKind';
              };
            };
          },
          {
            name: 'isLong';
            docs: ['Order side.'];
            type: 'bool';
          },
          {
            name: 'decreasePositionSwapType';
            docs: ['Decrease position swap type.'];
            type: {
              defined: {
                name: 'decreasePositionSwapType';
              };
            };
          },
          {
            name: 'position';
            docs: ['Position address.'];
            type: {
              option: 'pubkey';
            };
          },
          {
            name: 'collateralToken';
            docs: ['Collateral token.'];
            type: 'pubkey';
          },
          {
            name: 'initialCollateralToken';
            docs: ['Initial collateral token.'];
            type: {
              option: 'pubkey';
            };
          },
          {
            name: 'initialCollateralDeltaAmount';
            docs: ['Initial collateral delta amount.'];
            type: 'u64';
          },
          {
            name: 'sizeDeltaValue';
            docs: ['Size delta value.'];
            type: 'u128';
          },
          {
            name: 'minOutput';
            docs: ['Min output.'];
            type: 'u128';
          },
          {
            name: 'triggerPrice';
            docs: ['Trigger price (in unit price).'];
            type: 'u128';
          },
          {
            name: 'acceptablePrice';
            docs: ['Acceptable price (in unit price).'];
            type: 'u128';
          },
          {
            name: 'validFromTs';
            docs: ['Valid from this timestamp.'];
            type: 'i64';
          },
        ];
      };
    },
    {
      name: 'orderRemoved';
      docs: ['Order removed event.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'id';
            docs: ['Action id.'];
            type: 'u64';
          },
          {
            name: 'ts';
            docs: ['Timestamp.'];
            type: 'i64';
          },
          {
            name: 'slot';
            docs: ['Slot.'];
            type: 'u64';
          },
          {
            name: 'store';
            docs: ['Store.'];
            type: 'pubkey';
          },
          {
            name: 'order';
            docs: ['Order.'];
            type: 'pubkey';
          },
          {
            name: 'kind';
            docs: ['Kind.'];
            type: {
              defined: {
                name: 'orderKind';
              };
            };
          },
          {
            name: 'marketToken';
            docs: ['Market token.'];
            type: 'pubkey';
          },
          {
            name: 'owner';
            docs: ['Owner.'];
            type: 'pubkey';
          },
          {
            name: 'state';
            docs: ['Final state.'];
            type: {
              defined: {
                name: 'actionState';
              };
            };
          },
          {
            name: 'reason';
            docs: ['Reason.'];
            type: 'string';
          },
        ];
      };
    },
    {
      name: 'orderTokenAccounts';
      docs: ['Token accounts for Order.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'initialCollateral';
            docs: ['Initial collateral.'];
            type: {
              defined: {
                name: 'tokenAndAccount';
              };
            };
          },
          {
            name: 'finalOutputToken';
            docs: ['Final output token.'];
            type: {
              defined: {
                name: 'tokenAndAccount';
              };
            };
          },
          {
            name: 'longToken';
            docs: ['Long token.'];
            type: {
              defined: {
                name: 'tokenAndAccount';
              };
            };
          },
          {
            name: 'shortToken';
            docs: ['Short token.'];
            type: {
              defined: {
                name: 'tokenAndAccount';
              };
            };
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
      name: 'orderUpdated';
      docs: [
        'An event indicating that an order is created or updated.',
        '',
        '# Notes',
        '- For compatibility reasons, the [`OrderUpdated`] event is not emitted',
        'by the [`create_order`](crate::gmsol_store::create_order) and',
        '[`update_order`](crate::gmsol_store::update_order) instructions.',
        'As a result, there is no guarantee that every order will have',
        'corresponding [`OrderUpdated`] events.',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'isCreate';
            docs: ['Whether it is a create event.'];
            type: 'bool';
          },
          {
            name: 'id';
            docs: ['Action id.'];
            type: 'u64';
          },
          {
            name: 'ts';
            docs: ['Timestamp.'];
            type: 'i64';
          },
          {
            name: 'slot';
            docs: ['Slot.'];
            type: 'u64';
          },
          {
            name: 'store';
            docs: ['Store.'];
            type: 'pubkey';
          },
          {
            name: 'order';
            docs: ['Order.'];
            type: 'pubkey';
          },
          {
            name: 'marketToken';
            docs: ['Market token.'];
            type: 'pubkey';
          },
          {
            name: 'owner';
            docs: ['Owner.'];
            type: 'pubkey';
          },
          {
            name: 'params';
            docs: ['Parameters.'];
            type: {
              defined: {
                name: 'orderParamsForEvent';
              };
            };
          },
        ];
      };
    },
    {
      name: 'otherState';
      docs: ['Market State.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'padding';
            type: {
              array: ['u8', 16];
            };
          },
          {
            name: 'rev';
            type: 'u64';
          },
          {
            name: 'tradeCount';
            type: 'u64';
          },
          {
            name: 'longTokenBalance';
            type: 'u64';
          },
          {
            name: 'shortTokenBalance';
            type: 'u64';
          },
          {
            name: 'fundingFactorPerSecond';
            type: 'i128';
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
      name: 'outputAmounts';
      docs: ['Output amounts.'];
      generics: [
        {
          kind: 'type';
          name: 't';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'outputAmount';
            type: {
              generic: 't';
            };
          },
          {
            name: 'secondaryOutputAmount';
            type: {
              generic: 't';
            };
          },
        ];
      };
    },
    {
      name: 'pnl';
      docs: ['Processed PnL.'];
      generics: [
        {
          kind: 'type';
          name: 't';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'pnl';
            docs: ['Final PnL value.'];
            type: {
              generic: 't';
            };
          },
          {
            name: 'uncappedPnl';
            docs: ['Uncapped PnL value.'];
            type: {
              generic: 't';
            };
          },
        ];
      };
    },
    {
      name: 'pool';
      docs: ['A pool for market.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'isPure';
            docs: [
              'Whether the pool only contains one kind of token,',
              'i.e. a pure pool.',
              'For a pure pool, only the `long_token_amount` field is used.',
            ];
            type: 'u8';
          },
          {
            name: 'padding';
            type: {
              array: ['u8', 15];
            };
          },
          {
            name: 'longTokenAmount';
            docs: ['Long token amount.'];
            type: 'u128';
          },
          {
            name: 'shortTokenAmount';
            docs: ['Short token amount.'];
            type: 'u128';
          },
        ];
      };
    },
    {
      name: 'poolKind';
      docs: ['Pool kind.'];
      repr: {
        kind: 'rust';
      };
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'primary';
          },
          {
            name: 'swapImpact';
          },
          {
            name: 'claimableFee';
          },
          {
            name: 'openInterestForLong';
          },
          {
            name: 'openInterestForShort';
          },
          {
            name: 'openInterestInTokensForLong';
          },
          {
            name: 'openInterestInTokensForShort';
          },
          {
            name: 'positionImpact';
          },
          {
            name: 'borrowingFactor';
          },
          {
            name: 'fundingAmountPerSizeForLong';
          },
          {
            name: 'fundingAmountPerSizeForShort';
          },
          {
            name: 'claimableFundingAmountPerSizeForLong';
          },
          {
            name: 'claimableFundingAmountPerSizeForShort';
          },
          {
            name: 'collateralSumForLong';
          },
          {
            name: 'collateralSumForShort';
          },
          {
            name: 'totalBorrowing';
          },
        ];
      };
    },
    {
      name: 'poolStorage';
      docs: ['A pool storage for market.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'rev';
            type: 'u64';
          },
          {
            name: 'padding';
            type: {
              array: ['u8', 8];
            };
          },
          {
            name: 'pool';
            type: {
              defined: {
                name: 'pool';
              };
            };
          },
        ];
      };
    },
    {
      name: 'pools';
      docs: ['Market Pools.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'primary';
            docs: ['Primary Pool.'];
            type: {
              defined: {
                name: 'poolStorage';
              };
            };
          },
          {
            name: 'swapImpact';
            docs: ['Swap Impact Pool.'];
            type: {
              defined: {
                name: 'poolStorage';
              };
            };
          },
          {
            name: 'claimableFee';
            docs: ['Claimable Fee Pool.'];
            type: {
              defined: {
                name: 'poolStorage';
              };
            };
          },
          {
            name: 'openInterestForLong';
            docs: ['Long open interest.'];
            type: {
              defined: {
                name: 'poolStorage';
              };
            };
          },
          {
            name: 'openInterestForShort';
            docs: ['Short open interest.'];
            type: {
              defined: {
                name: 'poolStorage';
              };
            };
          },
          {
            name: 'openInterestInTokensForLong';
            docs: ['Long open interest in tokens.'];
            type: {
              defined: {
                name: 'poolStorage';
              };
            };
          },
          {
            name: 'openInterestInTokensForShort';
            docs: ['Short open interest in tokens.'];
            type: {
              defined: {
                name: 'poolStorage';
              };
            };
          },
          {
            name: 'positionImpact';
            docs: ['Position Impact.'];
            type: {
              defined: {
                name: 'poolStorage';
              };
            };
          },
          {
            name: 'borrowingFactor';
            docs: ['Borrowing Factor.'];
            type: {
              defined: {
                name: 'poolStorage';
              };
            };
          },
          {
            name: 'fundingAmountPerSizeForLong';
            docs: ['Funding Amount Per Size for long.'];
            type: {
              defined: {
                name: 'poolStorage';
              };
            };
          },
          {
            name: 'fundingAmountPerSizeForShort';
            docs: ['Funding Amount Per Size for short.'];
            type: {
              defined: {
                name: 'poolStorage';
              };
            };
          },
          {
            name: 'claimableFundingAmountPerSizeForLong';
            docs: ['Claimable Funding Amount Per Size for long.'];
            type: {
              defined: {
                name: 'poolStorage';
              };
            };
          },
          {
            name: 'claimableFundingAmountPerSizeForShort';
            docs: ['Claimable Funding Amount Per Size for short.'];
            type: {
              defined: {
                name: 'poolStorage';
              };
            };
          },
          {
            name: 'collateralSumForLong';
            docs: ['Collateral sum pool for long.'];
            type: {
              defined: {
                name: 'poolStorage';
              };
            };
          },
          {
            name: 'collateralSumForShort';
            docs: ['Collateral sum pool for short.'];
            type: {
              defined: {
                name: 'poolStorage';
              };
            };
          },
          {
            name: 'totalBorrowing';
            docs: ['Total borrowing pool.'];
            type: {
              defined: {
                name: 'poolStorage';
              };
            };
          },
          {
            name: 'reserved';
            type: {
              array: [
                {
                  defined: {
                    name: 'poolStorage';
                  };
                },
                16,
              ];
            };
          },
        ];
      };
    },
    {
      name: 'position';
      docs: ['Position.'];
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
            docs: ['Bump seed.'];
            type: 'u8';
          },
          {
            name: 'store';
            docs: ['Store.'];
            type: 'pubkey';
          },
          {
            name: 'kind';
            docs: ['Position kind (the representation of [`PositionKind`]).'];
            type: 'u8';
          },
          {
            name: 'padding0';
            docs: ['Padding.'];
            type: {
              array: ['u8', 13];
            };
          },
          {
            name: 'owner';
            docs: ['Owner.'];
            type: 'pubkey';
          },
          {
            name: 'marketToken';
            docs: ['The market token of the position market.'];
            type: 'pubkey';
          },
          {
            name: 'collateralToken';
            docs: ['Collateral token.'];
            type: 'pubkey';
          },
          {
            name: 'state';
            docs: ['Position State.'];
            type: {
              defined: {
                name: 'positionState';
              };
            };
          },
          {
            name: 'reserved';
            docs: ['Reserved.'];
            type: {
              array: ['u8', 256];
            };
          },
        ];
      };
    },
    {
      name: 'positionDecreased';
      docs: ['Position decrease event.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'rev';
            docs: ['Revision.'];
            type: 'u64';
          },
          {
            name: 'marketToken';
            docs: ['Market token.'];
            type: 'pubkey';
          },
          {
            name: 'report';
            docs: ['Report.'];
            type: {
              defined: {
                name: 'decreasePositionReport';
                generics: [
                  {
                    kind: 'type';
                    type: 'u128';
                  },
                  {
                    kind: 'type';
                    type: 'i128';
                  },
                ];
              };
            };
          },
        ];
      };
    },
    {
      name: 'positionFees';
      docs: ['Position Fees.'];
      generics: [
        {
          kind: 'type';
          name: 't';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'paidOrderFeeValue';
            type: {
              generic: 't';
            };
          },
          {
            name: 'order';
            type: {
              defined: {
                name: 'orderFees';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 't';
                    };
                  },
                ];
              };
            };
          },
          {
            name: 'borrowing';
            type: {
              defined: {
                name: 'borrowingFees';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 't';
                    };
                  },
                ];
              };
            };
          },
          {
            name: 'funding';
            type: {
              defined: {
                name: 'fundingFees';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 't';
                    };
                  },
                ];
              };
            };
          },
          {
            name: 'liquidation';
            type: {
              option: {
                defined: {
                  name: 'liquidationFees';
                  generics: [
                    {
                      kind: 'type';
                      type: {
                        generic: 't';
                      };
                    },
                  ];
                };
              };
            };
          },
        ];
      };
    },
    {
      name: 'positionIncreased';
      docs: ['Position increased event.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'rev';
            docs: ['Revision.'];
            type: 'u64';
          },
          {
            name: 'marketToken';
            docs: ['Market token.'];
            type: 'pubkey';
          },
          {
            name: 'report';
            docs: ['Report.'];
            type: {
              defined: {
                name: 'increasePositionReport';
                generics: [
                  {
                    kind: 'type';
                    type: 'u128';
                  },
                  {
                    kind: 'type';
                    type: 'i128';
                  },
                ];
              };
            };
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
            docs: ['Trade id.'];
            type: 'u64';
          },
          {
            name: 'increasedAt';
            docs: ['The time that the position last increased at.'];
            type: 'i64';
          },
          {
            name: 'updatedAtSlot';
            docs: ['Updated at slot.'];
            type: 'u64';
          },
          {
            name: 'decreasedAt';
            docs: ['The time that the position last decreased at.'];
            type: 'i64';
          },
          {
            name: 'sizeInTokens';
            docs: ['Size in tokens.'];
            type: 'u128';
          },
          {
            name: 'collateralAmount';
            docs: ['Collateral amount.'];
            type: 'u128';
          },
          {
            name: 'sizeInUsd';
            docs: ['Size in usd.'];
            type: 'u128';
          },
          {
            name: 'borrowingFactor';
            docs: ['Borrowing factor.'];
            type: 'u128';
          },
          {
            name: 'fundingFeeAmountPerSize';
            docs: ['Funding fee amount per size.'];
            type: 'u128';
          },
          {
            name: 'longTokenClaimableFundingAmountPerSize';
            docs: ['Long token claimable funding amount per size.'];
            type: 'u128';
          },
          {
            name: 'shortTokenClaimableFundingAmountPerSize';
            docs: ['Short token claimable funding amount per size.'];
            type: 'u128';
          },
          {
            name: 'reserved';
            docs: ['Reserved.'];
            type: {
              array: ['u8', 128];
            };
          },
        ];
      };
    },
    {
      name: 'price';
      docs: ['Price.'];
      generics: [
        {
          kind: 'type';
          name: 't';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'min';
            docs: ['Minimum Price.'];
            type: {
              generic: 't';
            };
          },
          {
            name: 'max';
            docs: ['Maximum Price.'];
            type: {
              generic: 't';
            };
          },
        ];
      };
    },
    {
      name: 'priceFeed';
      docs: ['Custom Price Feed.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'bump';
            type: 'u8';
          },
          {
            name: 'provider';
            type: 'u8';
          },
          {
            name: 'index';
            type: 'u16';
          },
          {
            name: 'padding0';
            type: {
              array: ['u8', 12];
            };
          },
          {
            name: 'store';
            type: 'pubkey';
          },
          {
            name: 'authority';
            docs: ['Authority.'];
            type: 'pubkey';
          },
          {
            name: 'token';
            type: 'pubkey';
          },
          {
            name: 'feedId';
            type: 'pubkey';
          },
          {
            name: 'lastPublishedAtSlot';
            type: 'u64';
          },
          {
            name: 'lastPublishedAt';
            type: 'i64';
          },
          {
            name: 'price';
            type: {
              defined: {
                name: 'priceFeedPrice';
              };
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
      name: 'priceFeedPrice';
      docs: ['Price structure for Price Feed.'];
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
            name: 'flags';
            type: {
              defined: {
                name: 'priceFlagContainer';
              };
            };
          },
          {
            name: 'padding';
            type: {
              array: ['u8', 6];
            };
          },
          {
            name: 'ts';
            type: 'i64';
          },
          {
            name: 'price';
            type: 'u128';
          },
          {
            name: 'minPrice';
            type: 'u128';
          },
          {
            name: 'maxPrice';
            type: 'u128';
          },
        ];
      };
    },
    {
      name: 'priceFlagContainer';
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
      name: 'priceMap';
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
                    name: 'priceMapEntry';
                  };
                },
                512,
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
      name: 'priceMapEntry';
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
                name: 'smallPrices';
              };
            };
          },
        ];
      };
    },
    {
      name: 'prices';
      docs: ['Prices for execution.'];
      generics: [
        {
          kind: 'type';
          name: 't';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'indexTokenPrice';
            docs: ['Index token price.'];
            type: {
              defined: {
                name: 'price';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 't';
                    };
                  },
                ];
              };
            };
          },
          {
            name: 'longTokenPrice';
            docs: ['Long token price.'];
            type: {
              defined: {
                name: 'price';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 't';
                    };
                  },
                ];
              };
            };
          },
          {
            name: 'shortTokenPrice';
            docs: ['Short token price.'];
            type: {
              defined: {
                name: 'price';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 't';
                    };
                  },
                ];
              };
            };
          },
        ];
      };
    },
    {
      name: 'referral';
      docs: ['Referral.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'referrer';
            docs: [
              'The (owner) address of the referrer.',
              '',
              '[`DEFAULT_PUBKEY`] means no referrer.',
            ];
            type: 'pubkey';
          },
          {
            name: 'code';
            docs: ['Referral Code Address.'];
            type: 'pubkey';
          },
          {
            name: 'refereeCount';
            docs: ['Number of referee.'];
            type: 'u128';
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
      name: 'referralCodeV2';
      docs: ['Referral Code.'];
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
            docs: ['Bump.'];
            type: 'u8';
          },
          {
            name: 'code';
            docs: ['Code bytes.'];
            type: {
              array: ['u8', 8];
            };
          },
          {
            name: 'store';
            docs: ['Store.'];
            type: 'pubkey';
          },
          {
            name: 'owner';
            docs: ['Owner.'];
            type: 'pubkey';
          },
          {
            name: 'nextOwner';
            docs: ['Next owner.'];
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
      name: 'revertibleBuffer';
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'rev';
            type: 'u64';
          },
          {
            name: 'padding';
            type: {
              array: ['u8', 8];
            };
          },
          {
            name: 'state';
            type: {
              defined: {
                name: 'state';
              };
            };
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
      name: 'shift';
      docs: ['Shift.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'header';
            docs: ['Action header.'];
            type: {
              defined: {
                name: 'actionHeader';
              };
            };
          },
          {
            name: 'tokens';
            docs: ['Token accounts.'];
            type: {
              defined: {
                name: 'shiftTokenAccounts';
              };
            };
          },
          {
            name: 'params';
            docs: ['Shift params.'];
            type: {
              defined: {
                name: 'shiftActionParams';
              };
            };
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
      name: 'shiftActionParams';
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'fromMarketTokenAmount';
            type: 'u64';
          },
          {
            name: 'minToMarketTokenAmount';
            type: 'u64';
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
      name: 'shiftRemoved';
      docs: ['Shift removed event.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'id';
            docs: ['Action id.'];
            type: 'u64';
          },
          {
            name: 'ts';
            docs: ['Timestamp.'];
            type: 'i64';
          },
          {
            name: 'slot';
            docs: ['Slot.'];
            type: 'u64';
          },
          {
            name: 'store';
            docs: ['Store.'];
            type: 'pubkey';
          },
          {
            name: 'shift';
            docs: ['Shift.'];
            type: 'pubkey';
          },
          {
            name: 'marketToken';
            docs: ['Market token.'];
            type: 'pubkey';
          },
          {
            name: 'owner';
            docs: ['Owner.'];
            type: 'pubkey';
          },
          {
            name: 'state';
            docs: ['Final state.'];
            type: {
              defined: {
                name: 'actionState';
              };
            };
          },
          {
            name: 'reason';
            docs: ['Reason.'];
            type: 'string';
          },
        ];
      };
    },
    {
      name: 'shiftTokenAccounts';
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'fromMarketToken';
            type: {
              defined: {
                name: 'tokenAndAccount';
              };
            };
          },
          {
            name: 'toMarketToken';
            type: {
              defined: {
                name: 'tokenAndAccount';
              };
            };
          },
          {
            name: 'longToken';
            type: 'pubkey';
          },
          {
            name: 'shortToken';
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
    {
      name: 'smallPrices';
      docs: ['Zero-copy price structure for storing min max prices.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'decimalMultiplier';
            type: 'u8';
          },
          {
            name: 'flags';
            type: 'u8';
          },
          {
            name: 'padding0';
            type: {
              array: ['u8', 2];
            };
          },
          {
            name: 'min';
            type: 'u32';
          },
          {
            name: 'max';
            type: 'u32';
          },
        ];
      };
    },
    {
      name: 'state';
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'pools';
            type: {
              defined: {
                name: 'pools';
              };
            };
          },
          {
            name: 'clocks';
            type: {
              defined: {
                name: 'clocks';
              };
            };
          },
          {
            name: 'other';
            type: {
              defined: {
                name: 'otherState';
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
      name: 'swapActionParams';
      docs: ['Swap params.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'primaryLength';
            docs: ['The length of primary swap path.'];
            type: 'u8';
          },
          {
            name: 'secondaryLength';
            docs: ['The length of secondary swap path.'];
            type: 'u8';
          },
          {
            name: 'numTokens';
            docs: ['The number of tokens.'];
            type: 'u8';
          },
          {
            name: 'padding0';
            docs: ['Padding.'];
            type: {
              array: ['u8', 1];
            };
          },
          {
            name: 'currentMarketToken';
            type: 'pubkey';
          },
          {
            name: 'paths';
            docs: ['Swap paths.'];
            type: {
              array: ['pubkey', 10];
            };
          },
          {
            name: 'tokens';
            docs: ['Tokens.'];
            type: {
              array: ['pubkey', 25];
            };
          },
        ];
      };
    },
    {
      name: 'swapExecuted';
      docs: ['Swap executed Event.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'rev';
            docs: ['Revision.'];
            type: 'u64';
          },
          {
            name: 'marketToken';
            docs: ['Market token.'];
            type: 'pubkey';
          },
          {
            name: 'report';
            docs: ['Report.'];
            type: {
              defined: {
                name: 'swapReport';
                generics: [
                  {
                    kind: 'type';
                    type: 'u128';
                  },
                  {
                    kind: 'type';
                    type: 'i128';
                  },
                ];
              };
            };
          },
          {
            name: 'ty';
            docs: ['Type.'];
            type: {
              option: {
                defined: {
                  name: 'decreasePositionSwapType';
                };
              };
            };
          },
        ];
      };
    },
    {
      name: 'swapParams';
      docs: ['Swap params.'];
      generics: [
        {
          kind: 'type';
          name: 't';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'isTokenInLong';
            type: 'bool';
          },
          {
            name: 'tokenInAmount';
            type: {
              generic: 't';
            };
          },
          {
            name: 'prices';
            type: {
              defined: {
                name: 'prices';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 't';
                    };
                  },
                ];
              };
            };
          },
        ];
      };
    },
    {
      name: 'swapReport';
      docs: ['Report of the execution of swap.'];
      generics: [
        {
          kind: 'type';
          name: 'unsigned';
        },
        {
          kind: 'type';
          name: 'signed';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'params';
            type: {
              defined: {
                name: 'swapParams';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 'unsigned';
                    };
                  },
                ];
              };
            };
          },
          {
            name: 'result';
            type: {
              defined: {
                name: 'swapResult';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 'unsigned';
                    };
                  },
                  {
                    kind: 'type';
                    type: {
                      generic: 'signed';
                    };
                  },
                ];
              };
            };
          },
        ];
      };
    },
    {
      name: 'swapResult';
      generics: [
        {
          kind: 'type';
          name: 'unsigned';
        },
        {
          kind: 'type';
          name: 'signed';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'tokenInFees';
            type: {
              defined: {
                name: 'fees';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 'unsigned';
                    };
                  },
                ];
              };
            };
          },
          {
            name: 'tokenOutAmount';
            type: {
              generic: 'unsigned';
            };
          },
          {
            name: 'priceImpactValue';
            type: {
              generic: 'signed';
            };
          },
          {
            name: 'priceImpactAmount';
            type: {
              generic: 'unsigned';
            };
          },
        ];
      };
    },
    {
      name: 'tokenAndAccount';
      docs: ['Token Account.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'token';
            docs: ['Token.'];
            type: 'pubkey';
          },
          {
            name: 'account';
            docs: ['Account.'];
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'tokenMapHeader';
      docs: ['Header of `TokenMap`.'];
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
            name: 'padding0';
            type: {
              array: ['u8', 7];
            };
          },
          {
            name: 'store';
            docs: ['The authorized store.'];
            type: 'pubkey';
          },
          {
            name: 'tokens';
            type: {
              defined: {
                name: 'tokens';
              };
            };
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
      name: 'tokens';
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
                    name: 'tokensEntry';
                  };
                },
                256,
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
      name: 'tokensEntry';
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
            type: 'u8';
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
            docs: ['Trade flag.'];
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
            docs: ['Trade id.'];
            type: 'u64';
          },
          {
            name: 'authority';
            docs: ['Authority.'];
            type: 'pubkey';
          },
          {
            name: 'store';
            docs: ['Store address.'];
            type: 'pubkey';
          },
          {
            name: 'marketToken';
            docs: ['Market token.'];
            type: 'pubkey';
          },
          {
            name: 'user';
            docs: ['User.'];
            type: 'pubkey';
          },
          {
            name: 'position';
            docs: ['Position address.'];
            type: 'pubkey';
          },
          {
            name: 'order';
            docs: ['Order address.'];
            type: 'pubkey';
          },
          {
            name: 'finalOutputToken';
            docs: ['Final output token.'];
            type: 'pubkey';
          },
          {
            name: 'ts';
            docs: ['Trade ts.'];
            type: 'i64';
          },
          {
            name: 'slot';
            docs: ['Trade slot.'];
            type: 'u64';
          },
          {
            name: 'before';
            docs: ['Before state.'];
            type: {
              defined: {
                name: 'positionState';
              };
            };
          },
          {
            name: 'after';
            docs: ['After state.'];
            type: {
              defined: {
                name: 'positionState';
              };
            };
          },
          {
            name: 'transferOut';
            docs: ['Transfer out.'];
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
            docs: ['Prices.'];
            type: {
              defined: {
                name: 'tradePrices';
              };
            };
          },
          {
            name: 'executionPrice';
            docs: ['Execution price.'];
            type: 'u128';
          },
          {
            name: 'priceImpactValue';
            docs: ['Price impact value.'];
            type: 'i128';
          },
          {
            name: 'priceImpactDiff';
            docs: ['Price impact diff.'];
            type: 'u128';
          },
          {
            name: 'pnl';
            docs: ['Processed pnl.'];
            type: {
              defined: {
                name: 'tradePnl';
              };
            };
          },
          {
            name: 'fees';
            docs: ['Fees.'];
            type: {
              defined: {
                name: 'tradeFees';
              };
            };
          },
          {
            name: 'outputAmounts';
            docs: ['Output amounts.'];
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
      name: 'tradeEvent';
      docs: ['Trade event.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'flags';
            docs: ['Trade flag.'];
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
            docs: ['Trade id.'];
            type: 'u64';
          },
          {
            name: 'authority';
            docs: ['Authority.'];
            type: 'pubkey';
          },
          {
            name: 'store';
            docs: ['Store address.'];
            type: 'pubkey';
          },
          {
            name: 'marketToken';
            docs: ['Market token.'];
            type: 'pubkey';
          },
          {
            name: 'user';
            docs: ['User.'];
            type: 'pubkey';
          },
          {
            name: 'position';
            docs: ['Position address.'];
            type: 'pubkey';
          },
          {
            name: 'order';
            docs: ['Order address.'];
            type: 'pubkey';
          },
          {
            name: 'finalOutputToken';
            docs: ['Final output token.'];
            type: 'pubkey';
          },
          {
            name: 'ts';
            docs: ['Trade ts.'];
            type: 'i64';
          },
          {
            name: 'slot';
            docs: ['Trade slot.'];
            type: 'u64';
          },
          {
            name: 'before';
            docs: ['Before state.'];
            type: {
              defined: {
                name: 'eventPositionState';
              };
            };
          },
          {
            name: 'after';
            docs: ['After state.'];
            type: {
              defined: {
                name: 'eventPositionState';
              };
            };
          },
          {
            name: 'transferOut';
            docs: ['Transfer out.'];
            type: {
              defined: {
                name: 'eventTransferOut';
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
            docs: ['Prices.'];
            type: {
              defined: {
                name: 'eventTradePrices';
              };
            };
          },
          {
            name: 'executionPrice';
            docs: ['Execution price.'];
            type: 'u128';
          },
          {
            name: 'priceImpactValue';
            docs: ['Price impact value.'];
            type: 'i128';
          },
          {
            name: 'priceImpactDiff';
            docs: ['Price impact diff.'];
            type: 'u128';
          },
          {
            name: 'pnl';
            docs: ['Processed pnl.'];
            type: {
              defined: {
                name: 'eventTradePnl';
              };
            };
          },
          {
            name: 'fees';
            docs: ['Fees.'];
            type: {
              defined: {
                name: 'eventTradeFees';
              };
            };
          },
          {
            name: 'outputAmounts';
            docs: ['Output amounts.'];
            type: {
              defined: {
                name: 'eventTradeOutputAmounts';
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
            docs: ['Order fee for receiver amount.'];
            type: 'u128';
          },
          {
            name: 'orderFeeForPoolAmount';
            docs: ['Order fee for pool amount.'];
            type: 'u128';
          },
          {
            name: 'liquidationFeeAmount';
            docs: ['Total liquidation fee amount.'];
            type: 'u128';
          },
          {
            name: 'liquidationFeeForReceiverAmount';
            docs: ['Liquidation fee for pool amount.'];
            type: 'u128';
          },
          {
            name: 'totalBorrowingFeeAmount';
            docs: ['Total borrowing fee amount.'];
            type: 'u128';
          },
          {
            name: 'borrowingFeeForReceiverAmount';
            docs: ['Borrowing fee for receiver amount.'];
            type: 'u128';
          },
          {
            name: 'fundingFeeAmount';
            docs: ['Funding fee amount.'];
            type: 'u128';
          },
          {
            name: 'claimableFundingFeeLongTokenAmount';
            docs: ['Claimable funding fee long token amount.'];
            type: 'u128';
          },
          {
            name: 'claimableFundingFeeShortTokenAmount';
            docs: ['Claimable funding fee short token amount.'];
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
            docs: ['Output amount.'];
            type: 'u128';
          },
          {
            name: 'secondaryOutputAmount';
            docs: ['Secondary output amount.'];
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
            docs: ['Final PnL value.'];
            type: 'i128';
          },
          {
            name: 'uncappedPnl';
            docs: ['Uncapped PnL value.'];
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
            docs: ['Min price.'];
            type: 'u128';
          },
          {
            name: 'max';
            docs: ['Max price.'];
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
            docs: ['Index token price.'];
            type: {
              defined: {
                name: 'tradePrice';
              };
            };
          },
          {
            name: 'long';
            docs: ['Long token price.'];
            type: {
              defined: {
                name: 'tradePrice';
              };
            };
          },
          {
            name: 'short';
            docs: ['Short token price.'];
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
            docs: ['Executed.'];
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
            docs: ['Final output token.'];
            type: 'u64';
          },
          {
            name: 'secondaryOutputToken';
            docs: ['Secondary output token.'];
            type: 'u64';
          },
          {
            name: 'longToken';
            docs: ['Long token.'];
            type: 'u64';
          },
          {
            name: 'shortToken';
            docs: ['Short token.'];
            type: 'u64';
          },
          {
            name: 'longTokenForClaimableAccountOfUser';
            docs: ['Long token amount for claimable account of user.'];
            type: 'u64';
          },
          {
            name: 'shortTokenForClaimableAccountOfUser';
            docs: ['Short token amount for claimable account of user.'];
            type: 'u64';
          },
          {
            name: 'longTokenForClaimableAccountOfHolding';
            docs: ['Long token amount for claimable account of holding.'];
            type: 'u64';
          },
          {
            name: 'shortTokenForClaimableAccountOfHolding';
            docs: ['Short token amount for claimable account of holding.'];
            type: 'u64';
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
    {
      name: 'updateBorrowingReport';
      docs: ['Update Borrowing Report.'];
      generics: [
        {
          kind: 'type';
          name: 't';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'durationInSeconds';
            type: 'u64';
          },
          {
            name: 'nextCumulativeBorrowingFactorForLong';
            type: {
              generic: 't';
            };
          },
          {
            name: 'nextCumulativeBorrowingFactorForShort';
            type: {
              generic: 't';
            };
          },
        ];
      };
    },
    {
      name: 'updateFundingReport';
      docs: ['Update Funding Report.'];
      generics: [
        {
          kind: 'type';
          name: 'unsigned';
        },
        {
          kind: 'type';
          name: 'signed';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'durationInSeconds';
            type: 'u64';
          },
          {
            name: 'nextFundingFactorPerSecond';
            type: {
              generic: 'signed';
            };
          },
          {
            name: 'deltaFundingAmountPerSize';
            type: {
              array: [
                {
                  generic: 'unsigned';
                },
                4,
              ];
            };
          },
          {
            name: 'deltaClaimableFundingAmountPerSize';
            type: {
              array: [
                {
                  generic: 'unsigned';
                },
                4,
              ];
            };
          },
        ];
      };
    },
    {
      name: 'updateGlvParams';
      docs: ['GLV Update Params.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'minTokensForFirstDeposit';
            docs: ['Minimum amount for the first GLV deposit.'];
            type: {
              option: 'u64';
            };
          },
          {
            name: 'shiftMinIntervalSecs';
            docs: ['Minimum shift interval seconds.'];
            type: {
              option: 'u32';
            };
          },
          {
            name: 'shiftMaxPriceImpactFactor';
            docs: ['Maximum price impact factor after shift.'];
            type: {
              option: 'u128';
            };
          },
          {
            name: 'shiftMinValue';
            docs: ['Minimum shift value.'];
            type: {
              option: 'u128';
            };
          },
        ];
      };
    },
    {
      name: 'updateOrderParams';
      docs: ['Update Order Params.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'sizeDeltaValue';
            docs: ['Size delta in USD.'];
            type: {
              option: 'u128';
            };
          },
          {
            name: 'acceptablePrice';
            docs: ['Acceptable price.'];
            type: {
              option: 'u128';
            };
          },
          {
            name: 'triggerPrice';
            docs: ['Trigger price.'];
            type: {
              option: 'u128';
            };
          },
          {
            name: 'minOutput';
            docs: ['Min output amount.'];
            type: {
              option: 'u128';
            };
          },
          {
            name: 'validFromTs';
            docs: ['Valid from this timestamp.'];
            type: {
              option: 'i64';
            };
          },
        ];
      };
    },
    {
      name: 'updateTokenConfigParams';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'heartbeatDuration';
            docs: ['Heartbeat duration.'];
            type: 'u32';
          },
          {
            name: 'precision';
            docs: ['Price precision.'];
            type: 'u8';
          },
          {
            name: 'feeds';
            docs: ['Feeds.'];
            type: {
              vec: 'pubkey';
            };
          },
          {
            name: 'timestampAdjustments';
            docs: ['Timestamp adjustments.'];
            type: {
              vec: 'u32';
            };
          },
          {
            name: 'expectedProvider';
            docs: ['Expected price provider.'];
            type: {
              option: 'u8';
            };
          },
        ];
      };
    },
    {
      name: 'userFlagContainer';
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
      name: 'userGtState';
      docs: ['GT State.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'rank';
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
            name: 'amount';
            type: 'u64';
          },
          {
            name: 'padding1';
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'paidFeeValue';
            type: 'u128';
          },
          {
            name: 'mintedFeeValue';
            type: 'u128';
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
      name: 'userHeader';
      docs: ['Header of `User` Account.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'version';
            docs: ['Version of the user account.'];
            type: 'u8';
          },
          {
            name: 'bump';
            docs: ['The bump seed.'];
            type: 'u8';
          },
          {
            name: 'flags';
            type: {
              defined: {
                name: 'userFlagContainer';
              };
            };
          },
          {
            name: 'padding0';
            type: {
              array: ['u8', 13];
            };
          },
          {
            name: 'owner';
            docs: ['The owner of this user account.'];
            type: 'pubkey';
          },
          {
            name: 'store';
            docs: ['The store.'];
            type: 'pubkey';
          },
          {
            name: 'referral';
            docs: ['Referral.'];
            type: {
              defined: {
                name: 'referral';
              };
            };
          },
          {
            name: 'gt';
            docs: ['GT State.'];
            type: {
              defined: {
                name: 'userGtState';
              };
            };
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
      name: 'withdrawParams';
      docs: ['Withdraw params.'];
      generics: [
        {
          kind: 'type';
          name: 't';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'marketTokenAmount';
            type: {
              generic: 't';
            };
          },
          {
            name: 'prices';
            type: {
              defined: {
                name: 'prices';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 't';
                    };
                  },
                ];
              };
            };
          },
        ];
      };
    },
    {
      name: 'withdrawReport';
      docs: ['Report of the execution of withdrawal.'];
      generics: [
        {
          kind: 'type';
          name: 't';
        },
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'params';
            type: {
              defined: {
                name: 'withdrawParams';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 't';
                    };
                  },
                ];
              };
            };
          },
          {
            name: 'longTokenFees';
            type: {
              defined: {
                name: 'fees';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 't';
                    };
                  },
                ];
              };
            };
          },
          {
            name: 'shortTokenFees';
            type: {
              defined: {
                name: 'fees';
                generics: [
                  {
                    kind: 'type';
                    type: {
                      generic: 't';
                    };
                  },
                ];
              };
            };
          },
          {
            name: 'longTokenOutput';
            type: {
              generic: 't';
            };
          },
          {
            name: 'shortTokenOutput';
            type: {
              generic: 't';
            };
          },
        ];
      };
    },
    {
      name: 'withdrawal';
      docs: ['Withdrawal.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'header';
            docs: ['Action header.'];
            type: {
              defined: {
                name: 'actionHeader';
              };
            };
          },
          {
            name: 'tokens';
            docs: ['Token accounts.'];
            type: {
              defined: {
                name: 'withdrawalTokenAccounts';
              };
            };
          },
          {
            name: 'params';
            docs: ['Withdrawal params.'];
            type: {
              defined: {
                name: 'withdrawalActionParams';
              };
            };
          },
          {
            name: 'swap';
            docs: ['Swap params.'];
            type: {
              defined: {
                name: 'swapActionParams';
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
            name: 'reserved';
            type: {
              array: ['u8', 128];
            };
          },
        ];
      };
    },
    {
      name: 'withdrawalActionParams';
      docs: ['Withdrawal params.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'marketTokenAmount';
            docs: ['Market token amount to burn.'];
            type: 'u64';
          },
          {
            name: 'minLongTokenAmount';
            docs: [
              'The minimum acceptable amount of final long tokens to receive.',
            ];
            type: 'u64';
          },
          {
            name: 'minShortTokenAmount';
            docs: [
              'The minimum acceptable amount of final short tokens to receive.',
            ];
            type: 'u64';
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
      name: 'withdrawalCreated';
      docs: ['Withdrawal created event.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'ts';
            docs: ['Event time.'];
            type: 'i64';
          },
          {
            name: 'store';
            docs: ['Store account.'];
            type: 'pubkey';
          },
          {
            name: 'withdrawal';
            docs: ['Withdrawal account.'];
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'withdrawalExecuted';
      docs: ['Withdrawal executed Event.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'rev';
            docs: ['Revision.'];
            type: 'u64';
          },
          {
            name: 'marketToken';
            docs: ['Market token.'];
            type: 'pubkey';
          },
          {
            name: 'report';
            docs: ['Report.'];
            type: {
              defined: {
                name: 'withdrawReport';
                generics: [
                  {
                    kind: 'type';
                    type: 'u128';
                  },
                ];
              };
            };
          },
        ];
      };
    },
    {
      name: 'withdrawalRemoved';
      docs: ['Withdrawal removed event.'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'id';
            docs: ['Action id.'];
            type: 'u64';
          },
          {
            name: 'ts';
            docs: ['Timestamp.'];
            type: 'i64';
          },
          {
            name: 'slot';
            docs: ['Slot.'];
            type: 'u64';
          },
          {
            name: 'store';
            docs: ['Store.'];
            type: 'pubkey';
          },
          {
            name: 'withdrawal';
            docs: ['Withdrawal.'];
            type: 'pubkey';
          },
          {
            name: 'marketToken';
            docs: ['Market token.'];
            type: 'pubkey';
          },
          {
            name: 'owner';
            docs: ['Owner.'];
            type: 'pubkey';
          },
          {
            name: 'state';
            docs: ['Final state.'];
            type: {
              defined: {
                name: 'actionState';
              };
            };
          },
          {
            name: 'reason';
            docs: ['Reason.'];
            type: 'string';
          },
        ];
      };
    },
    {
      name: 'withdrawalTokenAccounts';
      docs: ['Token Accounts.'];
      serialization: 'bytemuck';
      repr: {
        kind: 'c';
      };
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'finalLongToken';
            docs: ['Final long token accounts.'];
            type: {
              defined: {
                name: 'tokenAndAccount';
              };
            };
          },
          {
            name: 'finalShortToken';
            docs: ['Final short token accounts.'];
            type: {
              defined: {
                name: 'tokenAndAccount';
              };
            };
          },
          {
            name: 'marketToken';
            docs: ['Market token account.'];
            type: {
              defined: {
                name: 'tokenAndAccount';
              };
            };
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
  constants: [
    {
      name: 'claimableAccountSeed';
      docs: ['Claimable Account Seed.'];
      type: 'bytes';
      value: '[99, 108, 97, 105, 109, 97, 98, 108, 101, 95, 97, 99, 99, 111, 117, 110, 116]';
    },
    {
      name: 'eventAuthoritySeed';
      docs: ['Event authority SEED.'];
      type: 'bytes';
      value: '[95, 95, 101, 118, 101, 110, 116, 95, 97, 117, 116, 104, 111, 114, 105, 116, 121]';
    },
    {
      name: 'fundingAmountPerSizeAdjustment';
      docs: ['Adjustment factor for saving funding amount per size.'];
      type: 'u128';
      value: '10000000000';
    },
    {
      name: 'gtMintSeed';
      docs: ['GT Mint Seed.'];
      type: 'bytes';
      value: '[103, 116]';
    },
    {
      name: 'marketDecimals';
      docs: ['Decimals of usd values of factors.'];
      type: 'u8';
      value: '20';
    },
    {
      name: 'marketTokenDecimals';
      docs: ['Decimals of a market token.'];
      type: 'u8';
      value: '9';
    },
    {
      name: 'marketTokenMintSeed';
      docs: ['Market Token Mint Address Seed.'];
      type: 'bytes';
      value: '[109, 97, 114, 107, 101, 116, 95, 116, 111, 107, 101, 110, 95, 109, 105, 110, 116]';
    },
    {
      name: 'marketUsdToAmountDivisor';
      docs: ['USD value to amount divisor.'];
      type: 'u128';
      value: '100000000000';
    },
    {
      name: 'marketUsdUnit';
      docs: ['Unit USD value i.e. `one`.'];
      type: 'u128';
      value: '100000000000000000000';
    },
    {
      name: 'marketVaultSeed';
      docs: ['Market Vault Seed.'];
      type: 'bytes';
      value: '[109, 97, 114, 107, 101, 116, 95, 118, 97, 117, 108, 116]';
    },
  ];
};
