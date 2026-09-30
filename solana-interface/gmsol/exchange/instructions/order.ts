import { Keypair, PublicKey } from '@solana/web3.js';
import { toBN } from '../../utils/number';
import { optionalAccount } from '../../utils/address';
import {
  findMarketPDA,
  findOrderPDA,
  findPositionPDA,
  findUserPDA,
  findPartitionedDataAccountPDA,
} from '../../store';
import { IxWithOutput, makeInvoke } from '../../utils/invoke';
import {
  COMPETITION_PROGRAM_ID,
  CompetitionProgram,
  STORE_PROGRAM_ID,
  StoreProgram,
} from '../../program';
import { getPositionSide } from '../utils';
import {
  ataMintsToPrepare,
  createParticipantIdempotent,
  getOptionalATA,
  getShouldWrapNativeTokenAmount,
  getTokenAccount,
  getTokenEscrow,
  prepareAssociatedTokenAccounts,
  prepareMissingAssociatedTokenAccounts,
  preparePosition,
  prepareUser,
  uniqueTokenMints,
  wrapNativeToken,
} from './utils';

const MIN_ORDER_EXECUTION_LAMPORTS = toBN(300000);

const SHOULD_UNWRAP_NATIVE_TOKEN_BIT = 0;

const emptyKey = new PublicKey('11111111111111111111111111111111');

export type MakeCreateDecreaseOrderParams = {
  store: PublicKey;
  owner: PublicKey;
  position: PublicKey;
  initialCollateralDeltaAmount?: number | bigint;
  sizeDeltaUsd?: number | bigint;
  options: {
    nonce?: Buffer;
    decreaseSwapType?:
      | 'noSwap'
      | 'pnlTokenToCollateralToken'
      | 'collateralToPnlToken';
    extraExecutionFee?: number | bigint;
    swapPath?: PublicKey[];
    minOutputAmount?: number | bigint;
    acceptablePrice?: number | bigint;
    triggerPrice?: number | bigint;
    stopLoss?: boolean;
    finalOutputToken?: PublicKey;
    longTokenAccount?: PublicKey;
    shortTokenAccount?: PublicKey;
    hint?: {
      market: {
        marketToken: PublicKey;
        longToken: PublicKey;
        shortToken: PublicKey;
      };
      collateralToken: PublicKey;
      isLong: boolean;
    };
    skipNativeTokenUnwrap?: boolean;
  };
  competitionId?: PublicKey | null;
  competitionProgram?: CompetitionProgram;
};

export const makeCreateDecreaseOrderInstruction = async (
  storeProgram: StoreProgram,
  {
    store,
    owner,
    position,
    initialCollateralDeltaAmount,
    sizeDeltaUsd,
    options,
    competitionId,
    competitionProgram,
  }: MakeCreateDecreaseOrderParams
) => {
  let collateralToken: PublicKey;
  let market: PublicKey;
  let isLong: boolean;
  let longToken: PublicKey;
  let shortToken: PublicKey;
  if (options.hint) {
    const { marketToken, ...rest } = options.hint.market;
    ({ longToken, shortToken } = rest);
    isLong = options.hint.isLong;
    collateralToken = options.hint.collateralToken;
    [market] = findMarketPDA(store, marketToken);
  } else if (storeProgram) {
    const program = storeProgram;
    const {
      kind,
      collateralToken: fetchedCollateralToken,
      marketToken,
    } = await program.account.position.fetch(position);
    isLong = getPositionSide(kind)! === 'long';
    collateralToken = fetchedCollateralToken;
    [market] = findMarketPDA(store, marketToken);
    const {
      meta: { longTokenMint, shortTokenMint },
    } = await program.account.market.fetch(market);
    longToken = longTokenMint;
    shortToken = shortTokenMint;
  } else {
    throw Error('Must provide either `hints` or `dataStore` program');
  }

  const swapPath = options?.swapPath ?? [];
  // const [authority] = findControllerPDA(store);
  const nonce = options?.nonce ?? Keypair.generate().publicKey.toBuffer();
  const [order] = findOrderPDA(store, owner, nonce);
  const acceptablePrice = options?.acceptablePrice;
  const finalOutputToken = options?.finalOutputToken ?? collateralToken;

  const triggerPrice = options?.triggerPrice
    ? toBN(options?.triggerPrice)
    : null;
  const kind = triggerPrice
    ? options?.stopLoss
      ? { stopLossDecrease: {} }
      : { limitDecrease: {} }
    : { marketDecrease: {} };

  const isCollateralLong = collateralToken.equals(longToken)
    ? true
    : collateralToken.equals(shortToken)
      ? false
      : null;
  if (isCollateralLong === null)
    throw Error('Collateral token must be either long or short token');

  const finalOutputTokenEscrow = getTokenEscrow(order, finalOutputToken);
  const longTokenEscrow = getTokenEscrow(order, longToken);
  const shortTokenEscrow = getTokenEscrow(order, shortToken);

  const decreasePositionSwapTypeName = options?.decreaseSwapType
    ? options?.decreaseSwapType
    : null;

  const decreasePositionSwapType =
    decreasePositionSwapTypeName === 'noSwap'
      ? { noSwap: {} }
      : decreasePositionSwapTypeName === 'collateralToPnlToken'
        ? { collateralToPnlToken: {} }
        : decreasePositionSwapTypeName === 'pnlTokenToCollateralToken'
          ? { pnlTokenToCollateralToken: {} }
          : null;

  const skipNativeTokenUnwrap = options?.skipNativeTokenUnwrap ?? false;

  const receiver = owner;
  console.log('makeCreateGlvWithdrawalInstruction');
  let accountsParams = {
    store,
    owner,
    receiver,
    order,
    position,
    market,
    initialCollateralToken: null,
    finalOutputToken,
    longToken,
    shortToken,
    initialCollateralTokenEscrow: null,
    initialCollateralTokenSource: null,
    finalOutputTokenEscrow,
    longTokenEscrow,
    shortTokenEscrow,
    // add params
    eventAuthority: new PublicKey(
      '8a4wJ2bMiH6XWDZ7biTnejkss8VG7GMwd9Mg6F5fDfHF'
    ), // PDA: fixed event authority pubkey
    program: STORE_PROGRAM_ID, // store program id ?
    callbackAuthority: null,
    callbackProgram: null,
    callbackSharedDataAccount: null,
    callbackPartitionedDataAccount: null,
  };
  console.log('preparePosition', competitionId);
  let createParticipantIdempotentInstruction;
  if (competitionId && competitionProgram) {
    const participantDataAccountPda = findPartitionedDataAccountPDA(
      owner,
      competitionId
    )[0];
    // join competition add parmas
    accountsParams = Object.assign(accountsParams, {
      ...accountsParams,
      callbackAuthority: new PublicKey(
        'EvVTs5Ts2xdPx2PK8pU2PYssYaGtUo6mQ4k9aMnZFwRK'
      ), // PDA: fixed callback authority pubkey
      callbackProgram: COMPETITION_PROGRAM_ID, // competition program ID ?
      callbackSharedDataAccount: competitionId, // competition account pubkey ? getProgramAccounts
      callbackPartitionedDataAccount: participantDataAccountPda, // new PublicKey("4AH7JbBCS2ZCCAcusk1QLrWRQrAiRSFg8tqGMNYMyWvo"), // PDA participant account pubkey
    });
    createParticipantIdempotentInstruction = await createParticipantIdempotent(
      competitionProgram,
      owner,
      competitionId,
      participantDataAccountPda
    );
  }

  const instruction = await storeProgram.methods
    .createOrderV2(
      [...nonce],
      {
        kind,
        decreasePositionSwapType,
        minOutput: toBN(options?.minOutputAmount ?? 0),
        sizeDeltaValue: toBN(sizeDeltaUsd ?? 0),
        initialCollateralDeltaAmount: toBN(initialCollateralDeltaAmount ?? 0),
        acceptablePrice: acceptablePrice ? toBN(acceptablePrice) : null,
        triggerPrice,
        isLong,
        isCollateralLong,
        executionLamports: toBN(options?.extraExecutionFee ?? 0).add(
          MIN_ORDER_EXECUTION_LAMPORTS
        ),
        swapPathLength: swapPath.length,
        shouldUnwrapNativeToken: !skipNativeTokenUnwrap,
        validFromTs: null,
      },
      competitionId ? 0 : null
    )
    .accountsPartial(accountsParams)
    .remainingAccounts(
      swapPath.map((mint) => {
        return {
          pubkey: findMarketPDA(store, mint)[0],
          isSigner: false,
          isWritable: false,
        };
      })
    )
    .instruction();

  const prepareUserIx = await prepareUser(storeProgram, store, owner);
  const prepare = await prepareAssociatedTokenAccounts(
    storeProgram,
    owner,
    order,
    [finalOutputToken, longToken, shortToken]
  );
  const prepareReceiverAta = await prepareAssociatedTokenAccounts(
    storeProgram,
    owner,
    receiver,
    [finalOutputToken, longToken, shortToken]
  );

  const instructionList = [
    prepareUserIx,
    ...prepare,
    ...prepareReceiverAta,
    instruction,
  ];
  // competition
  if (competitionId && createParticipantIdempotentInstruction) {
    instructionList.splice(-1, 0, createParticipantIdempotentInstruction);
  }

  return [instructionList, order] as IxWithOutput<PublicKey>;
};

export const invokeCreateDecreaseOrderWithPayerAsSigner = makeInvoke(
  makeCreateDecreaseOrderInstruction,
  ['owner']
);
export const invokeCreateDecreaseOrder = makeInvoke(
  makeCreateDecreaseOrderInstruction,
  [],
  true
);

export type MakeCreateIncreaseOrderParams = {
  store: PublicKey;
  owner: PublicKey;
  marketToken: PublicKey;
  collateralToken: PublicKey;
  isLong: boolean;
  initialCollateralDeltaAmount?: number | bigint;
  sizeDeltaUsd?: number | bigint;
  options: {
    nonce?: Buffer;
    extraExecutionFee?: number | bigint;
    swapPath?: PublicKey[];
    minOutputAmount?: number | bigint;
    acceptablePrice?: number | bigint;
    triggerPrice?: number | bigint;
    initialCollateralToken?: PublicKey;
    initialCollateralTokenAccount?: PublicKey;
    longTokenAccount?: PublicKey;
    shortTokenAccount?: PublicKey;
    hint?: {
      longToken: PublicKey;
      shortToken: PublicKey;
    };
    skipNativeTokenUnwrap?: boolean;
    shouldWrapNativeToken?: boolean;
  };
  competitionId?: PublicKey | null;
  competitionProgram?: CompetitionProgram;
};

export const makeCreateIncreaseOrderInstruction = async (
  storeProgram: StoreProgram,
  {
    store,
    owner,
    marketToken,
    collateralToken,
    isLong,
    initialCollateralDeltaAmount,
    sizeDeltaUsd,
    options,
    competitionId,
    competitionProgram,
  }: MakeCreateIncreaseOrderParams
) => {
  const swapPath = options?.swapPath ?? [];
  // const [authority] = findControllerPDA(store);
  const nonce = options?.nonce ?? Keypair.generate().publicKey.toBuffer();
  const [order] = findOrderPDA(store, owner, nonce);
  const acceptablePrice = options?.acceptablePrice;
  const initialCollateralToken =
    options?.initialCollateralToken ?? collateralToken;
  const initialCollateralTokenAccount = getTokenAccount(
    owner,
    initialCollateralToken,
    options?.initialCollateralTokenAccount,
    options?.shouldWrapNativeToken
  );
  const [market] = findMarketPDA(store, marketToken);
  const collateralTokens = options?.hint
    ? options.hint
    : storeProgram
      ? await storeProgram.account.market.fetch(market).then((market) => {
          return {
            longToken: market.meta.longTokenMint,
            shortToken: market.meta.shortTokenMint,
          };
        })
      : undefined;

  if (!collateralTokens)
    throw Error('Neither `hint` nor `GmsolStoreProgram` provided');
  const { longToken, shortToken } = collateralTokens;
  const triggerPrice = options?.triggerPrice
    ? toBN(options?.triggerPrice)
    : null;
  const kind = triggerPrice ? { limitIncrease: {} } : { marketIncrease: {} };

  const isCollateralLong = collateralToken.equals(longToken)
    ? true
    : collateralToken.equals(shortToken)
      ? false
      : null;
  if (isCollateralLong === null)
    throw Error('Collateral token must be either long or short token');

  const initialCollateralTokenEscrow = getTokenEscrow(
    order,
    initialCollateralToken
  );
  const longTokenEscrow = getTokenEscrow(order, longToken);
  const shortTokenEscrow = getTokenEscrow(order, shortToken);
  const skipNativeTokenUnwrap = options?.skipNativeTokenUnwrap ?? false;

  const initialCollateralDeltaAmountBN = toBN(
    initialCollateralDeltaAmount ?? 0
  );
  const params = {
    kind,
    decreasePositionSwapType: null,
    minOutput: toBN(options?.minOutputAmount ?? 0),
    sizeDeltaValue: toBN(sizeDeltaUsd ?? 0),
    initialCollateralDeltaAmount: initialCollateralDeltaAmountBN,
    acceptablePrice: acceptablePrice ? toBN(acceptablePrice) : null,
    triggerPrice,
    isLong,
    isCollateralLong,
    executionLamports: toBN(options?.extraExecutionFee ?? 0).add(
      MIN_ORDER_EXECUTION_LAMPORTS
    ),
    swapPathLength: swapPath.length,
    shouldUnwrapNativeToken: !skipNativeTokenUnwrap,
    validFromTs: null,
  };
  const [position] = findPositionPDA(
    store,
    owner,
    marketToken,
    collateralToken,
    isLong
  );
  const receiver = owner;
  let accountsParams = {
    store,
    owner,
    receiver,
    order,
    position,
    market: findMarketPDA(store, marketToken)[0],
    initialCollateralTokenSource: initialCollateralTokenAccount,
    initialCollateralTokenEscrow,
    finalOutputToken: collateralToken,
    longToken,
    shortToken,
    initialCollateralToken,
    longTokenEscrow,
    shortTokenEscrow,
    // add params
    eventAuthority: new PublicKey(
      '8a4wJ2bMiH6XWDZ7biTnejkss8VG7GMwd9Mg6F5fDfHF'
    ), // PDA: fixed event authority pubkey
    program: STORE_PROGRAM_ID, // store program id ?
    callbackAuthority: null,
    callbackProgram: null,
    callbackSharedDataAccount: null,
    callbackPartitionedDataAccount: null,
  };
  let createParticipantIdempotentInstruction;
  if (competitionId && competitionProgram) {
    const participantDataAccountPda = findPartitionedDataAccountPDA(
      owner,
      competitionId
    )[0];
    // join competition add parmas
    accountsParams = Object.assign(accountsParams, {
      ...accountsParams,
      callbackAuthority: new PublicKey(
        'EvVTs5Ts2xdPx2PK8pU2PYssYaGtUo6mQ4k9aMnZFwRK'
      ), // PDA: fixed callback authority pubkey
      callbackProgram: COMPETITION_PROGRAM_ID, // competition program ID ?
      callbackSharedDataAccount: competitionId, // competition account pubkey ? getProgramAccounts
      callbackPartitionedDataAccount: participantDataAccountPda, // new PublicKey("4AH7JbBCS2ZCCAcusk1QLrWRQrAiRSFg8tqGMNYMyWvo"), // PDA participant account pubkey
    });
    createParticipantIdempotentInstruction = await createParticipantIdempotent(
      competitionProgram,
      owner,
      competitionId,
      participantDataAccountPda
    );
  }
  const instruction = await storeProgram.methods
    .createOrderV2([...nonce], params, competitionId ? 0 : null)
    .accountsPartial(accountsParams)
    .remainingAccounts(
      swapPath.map((mint, idx) => {
        return {
          pubkey: findMarketPDA(store, mint)[0],
          isSigner: false,
          // We need to record transferred in amounts in the first market.
          isWritable: idx == 0,
        };
      })
    )
    .instruction();

  const lamports = getShouldWrapNativeTokenAmount(
    [initialCollateralToken],
    [initialCollateralDeltaAmountBN],
    options?.shouldWrapNativeToken
  );
  const wrap = await wrapNativeToken(owner, lamports);

  const prepareUserIx = await prepareUser(storeProgram, store, owner);
  const preparePositionIx = await preparePosition(
    storeProgram,
    store,
    owner,
    market,
    position,
    params
  );

  const prepareOwnerAta = await prepareAssociatedTokenAccounts(
    storeProgram,
    owner,
    owner,
    [initialCollateralToken]
  );
  const prepare = await prepareAssociatedTokenAccounts(
    storeProgram,
    owner,
    order,
    [initialCollateralToken, longToken, shortToken]
  );
  const prepareReceiverAta = await prepareAssociatedTokenAccounts(
    storeProgram,
    owner,
    receiver,
    [longToken, shortToken]
  );
  const instructionList = [
    prepareUserIx,
    preparePositionIx,
    ...prepareOwnerAta,
    ...prepare,
    ...prepareReceiverAta,
    ...wrap,
    instruction,
  ];
  // competition
  if (competitionId && createParticipantIdempotentInstruction) {
    instructionList.splice(-1, 0, createParticipantIdempotentInstruction);
  }
  console.log('instructionList', {
    competitionId,
    createParticipantIdempotentInstruction,
    instructionList,
  });
  return [instructionList, order] as IxWithOutput<PublicKey>;
};

export const invokeCreateIncreaseOrderWithPayerAsSigner = makeInvoke(
  makeCreateIncreaseOrderInstruction,
  ['owner']
);

export const invokeCreateIncreaseOrder = makeInvoke(
  makeCreateIncreaseOrderInstruction,
  [],
  true
);

export type MakeCreateSwapOrderParams = {
  store: PublicKey;
  owner: PublicKey;
  marketToken: PublicKey;
  swapOutToken: PublicKey;
  initialSwapInToken: PublicKey;
  initialSwapInTokenAmount: number | bigint;
  swapPath: PublicKey[];
  options: {
    nonce?: Buffer;
    extraExecutionFee?: number | bigint;
    minOutputAmount?: number | bigint;
    acceptablePrice?: number | bigint;
    limit?: boolean;
    initialSwapInTokenAccount?: PublicKey;
    longTokenAccount?: PublicKey;
    shortTokenAccount?: PublicKey;
    hint?: {
      longToken: PublicKey;
      shortToken: PublicKey;
    };
    skipNativeTokenUnwrap?: boolean;
    shouldWrapNativeToken?: boolean;
  };
};

export const makeCreateSwapOrderInstruction = async (
  storeProgram: StoreProgram,
  {
    store,
    owner,
    marketToken,
    swapOutToken,
    initialSwapInToken,
    initialSwapInTokenAmount,
    swapPath,
    options,
  }: MakeCreateSwapOrderParams
) => {
  if (swapPath.length === 0) throw Error('`swapPath` cannot be empty');
  const nonce = options?.nonce ?? Keypair.generate().publicKey.toBuffer();
  const [order] = findOrderPDA(store, owner, nonce);
  console.log('makeCreateSwapOrderInstruction order');
  const acceptablePrice = options?.acceptablePrice;
  const initialCollateralToken = initialSwapInToken;
  const initialCollateralTokenAccount = getTokenAccount(
    owner,
    initialCollateralToken,
    options?.initialSwapInTokenAccount,
    options?.shouldWrapNativeToken
  );
  console.log('makeCreateSwapOrderInstruction initialCollateralTokenAccount');
  const [market] = findMarketPDA(store, marketToken);
  console.log('makeCreateSwapOrderInstruction collateralTokens');
  const collateralTokens = options?.hint
    ? options.hint
    : storeProgram
      ? await storeProgram.account.market.fetch(market).then((market) => {
          return {
            longToken: market.meta.longTokenMint,
            shortToken: market.meta.shortTokenMint,
          };
        })
      : undefined;

  console.log('makeCreateSwapOrderInstruction findMarketPDA');
  if (!collateralTokens)
    throw Error('Neither `hint` nor `storeProgram` provided');
  const { longToken, shortToken } = collateralTokens;

  if (!(swapOutToken.equals(longToken) || swapOutToken.equals(shortToken)))
    throw Error('Swap out token must be one of the long token or short token');

  const minOutputAmount = toBN(options?.minOutputAmount ?? 0);
  if (options?.limit && minOutputAmount.isZero())
    throw Error('cannot create limit swap order with zero min output amount');
  const kind = options?.limit ? { limitSwap: {} } : { marketSwap: {} };

  const finalOutputTokenEscrow = getTokenEscrow(order, swapOutToken);
  const initialCollateralTokenEscrow = getTokenEscrow(
    order,
    initialCollateralToken
  );

  console.log('makeCreateSwapOrderInstruction initialCollateralTokenEscrow');
  const skipNativeTokenUnwrap = options?.skipNativeTokenUnwrap ?? false;
  const initialSwapInTokenAmountBN = toBN(initialSwapInTokenAmount ?? 0);

  const receiver = owner;
  const accountsParams = {
    store,
    owner,
    receiver,
    order,
    position: null,
    market: findMarketPDA(store, marketToken)[0],
    initialCollateralToken,
    initialCollateralTokenSource: initialCollateralTokenAccount,
    longToken: null,
    shortToken: null,
    finalOutputToken: swapOutToken,
    finalOutputTokenEscrow,
    initialCollateralTokenEscrow,
    longTokenEscrow: null,
    shortTokenEscrow: null,
    // add params
    eventAuthority: new PublicKey(
      '8a4wJ2bMiH6XWDZ7biTnejkss8VG7GMwd9Mg6F5fDfHF'
    ), // PDA: fixed event authority pubkey
    program: STORE_PROGRAM_ID, // store program id ?
    callbackAuthority: null,
    callbackProgram: null,
    callbackSharedDataAccount: null,
    callbackPartitionedDataAccount: null,
  };

  console.log('makeCreateSwapOrderInstruction start');
  const instruction = await storeProgram.methods
    .createOrderV2(
      [...nonce],
      {
        kind,
        decreasePositionSwapType: null,
        minOutput: minOutputAmount,
        sizeDeltaValue: toBN(0),
        initialCollateralDeltaAmount: initialSwapInTokenAmountBN,
        acceptablePrice: acceptablePrice ? toBN(acceptablePrice) : null,
        triggerPrice: null,
        isLong: true,
        isCollateralLong: true,
        executionLamports: toBN(options?.extraExecutionFee ?? 0).add(
          MIN_ORDER_EXECUTION_LAMPORTS
        ),
        swapPathLength: swapPath.length,
        shouldUnwrapNativeToken: !skipNativeTokenUnwrap,
        validFromTs: null,
      },
      null
    )
    .accountsPartial(accountsParams)
    .remainingAccounts(
      swapPath.map((mint, idx) => {
        return {
          pubkey: findMarketPDA(store, mint)[0],
          isSigner: false,
          // We need to record transferred in amounts in the first market.
          isWritable: idx == 0,
        };
      })
    )
    .instruction();

  console.log('makeCreateSwapOrderInstruction instruction', instruction);

  const lamports = getShouldWrapNativeTokenAmount(
    [initialCollateralToken],
    [initialSwapInTokenAmountBN],
    options?.shouldWrapNativeToken
  );
  const wrap = await wrapNativeToken(owner, lamports);

  console.log('makeCreateSwapOrderInstruction wrap');

  const prepareUserIx = await prepareUser(storeProgram, store, owner);
  const prepareOwnerAta = await prepareAssociatedTokenAccounts(
    storeProgram,
    owner,
    owner,
    [initialCollateralToken]
  );

  console.log('makeCreateSwapOrderInstruction prepareOwnerAta');
  const prepare = await prepareAssociatedTokenAccounts(
    storeProgram,
    owner,
    order,
    [initialCollateralToken, swapOutToken]
  );
  const prepareReceiverAta = await prepareAssociatedTokenAccounts(
    storeProgram,
    owner,
    receiver,
    [swapOutToken]
  );

  console.log('makeCreateSwapOrderInstruction instruction list', [
    prepareUserIx,
    ...prepareOwnerAta,
    ...prepareReceiverAta,
    ...prepare,
    ...wrap,
    instruction,
  ]);
  return [
    [
      prepareUserIx,
      ...prepareOwnerAta,
      ...prepareReceiverAta,
      ...prepare,
      ...wrap,
      instruction,
    ],
    order,
  ] as IxWithOutput<PublicKey>;
};

export const invokeCreateSwapOrderWithPayerAsSigner = makeInvoke(
  makeCreateSwapOrderInstruction,
  ['owner']
);
export const invokeCreateSwapOrder = makeInvoke(
  makeCreateSwapOrderInstruction,
  [],
  true
);

export type MakeCancelOrderParams = {
  owner: PublicKey;
  order: PublicKey;
  options: {
    hint?: {
      receiver: PublicKey;
      referrer: PublicKey | null;
      store: PublicKey;
      initialCollateralToken: PublicKey | null;
      finalOutputToken: PublicKey | null;
      longToken: PublicKey | null;
      shortToken: PublicKey | null;
      initialCollateralTokenEscrow: PublicKey | null;
      finalOutputTokenEscrow: PublicKey | null;
      longTokenEscrow: PublicKey | null;
      shortTokenEscrow: PublicKey | null;
      shouldUnwrapNativeToken: boolean;
      callbackPartitionedData: PublicKey | null;
      callbackSharedData: PublicKey | null;
      callbackProgramId: PublicKey | null;
    };
  };
};

export const makeCancelOrderInstruction = async (
  storeProgram: StoreProgram,
  { owner, order, options }: MakeCancelOrderParams
) => {
  const hint =
    options?.hint ??
    (await storeProgram.account.order
      .fetch(order)
      .then((order) => {
        console.log('order', order);
        const callbackPartitionedData = order.header.callbackPartitionedData;
        const callbackSharedData = order.header.callbackSharedData;
        const callbackProgramId = order.header.callbackProgramId;
        const store = order.header.store;
        const initialCollateralToken = optionalAccount(
          order.tokens.initialCollateral.token
        );
        const initialCollateralTokenEscrow = optionalAccount(
          order.tokens.initialCollateral.account
        );
        const finalOutputToken = optionalAccount(
          order.tokens.finalOutputToken.token
        );
        const finalOutputTokenEscrow = optionalAccount(
          order.tokens.finalOutputToken.account
        );
        const longToken = optionalAccount(order.tokens.longToken.token);
        const shortToken = optionalAccount(order.tokens.shortToken.token);
        const longTokenEscrow = optionalAccount(order.tokens.longToken.account);
        const shortTokenEscrow = optionalAccount(
          order.tokens.shortToken.account
        );
        const shouldUnwrapNativeToken =
          ((order.header.flags.value >> SHOULD_UNWRAP_NATIVE_TOKEN_BIT) & 1) ===
          1;
        return {
          receiver:
            optionalAccount(order.header.receiver) ?? order.header.owner,
          store,
          initialCollateralToken,
          initialCollateralTokenEscrow,
          finalOutputToken,
          finalOutputTokenEscrow,
          longToken,
          shortToken,
          longTokenEscrow,
          shortTokenEscrow,
          shouldUnwrapNativeToken,
          callbackPartitionedData,
          callbackSharedData,
          callbackProgramId,
        };
      })
      .then(async (hint) => {
        const [user] = findUserPDA(hint.store, owner);
        const referrer = await storeProgram.account.userHeader
          .fetch(user)
          .then((header) => {
            optionalAccount(header.referral.referrer);
          });

        return {
          referrer,
          ...hint,
        };
      }));
  if (!hint) throw Error('Neither `hint` nor `storeProgram` provided');

  const {
    store,
    referrer,
    initialCollateralToken,
    initialCollateralTokenEscrow,
    finalOutputToken,
    finalOutputTokenEscrow,
    longToken,
    shortToken,
    longTokenEscrow,
    shortTokenEscrow,
    shouldUnwrapNativeToken,
    callbackPartitionedData,
    callbackSharedData,
    callbackProgramId,
  } = hint;

  const referrerUser = referrer ? findUserPDA(store, referrer)[0] : null;

  const prepareOwnerAta = await prepareMissingAssociatedTokenAccounts(
    storeProgram,
    owner,
    owner,
    ataMintsToPrepare([initialCollateralToken], shouldUnwrapNativeToken)
  );

  const prepareReceiverAta = await prepareMissingAssociatedTokenAccounts(
    storeProgram,
    owner,
    hint.receiver,
    ataMintsToPrepare(
      [finalOutputToken, longToken, shortToken],
      shouldUnwrapNativeToken
    )
  );

  const prepareEscrows = await prepareMissingAssociatedTokenAccounts(
    storeProgram,
    owner,
    order,
    uniqueTokenMints([
      initialCollateralTokenEscrow ? initialCollateralToken : null,
      finalOutputTokenEscrow ? finalOutputToken : null,
      longTokenEscrow ? longToken : null,
      shortTokenEscrow ? shortToken : null,
    ])
  );

  console.log('closeOrderV2', {
    callbackProgramId: callbackProgramId.equals(emptyKey),
    callbackSharedData: callbackSharedData.equals(emptyKey),
    callbackPartitionedData: callbackPartitionedData.equals(emptyKey),
  });
  return [
    ...prepareOwnerAta,
    ...prepareReceiverAta,
    ...prepareEscrows,
    await storeProgram.methods
      .closeOrderV2('cancel')
      .accountsPartial({
        owner,
        receiver: hint.receiver,
        rentReceiver: owner,
        store,
        order,
        referrerUser,
        initialCollateralToken,
        initialCollateralTokenAta: getOptionalATA(
          owner,
          initialCollateralToken,
          shouldUnwrapNativeToken
        ),
        initialCollateralTokenEscrow,
        finalOutputToken,
        finalOutputTokenAta: getOptionalATA(
          hint.receiver,
          finalOutputToken,
          shouldUnwrapNativeToken
        ),
        finalOutputTokenEscrow,
        longToken,
        longTokenAta: getOptionalATA(
          hint.receiver,
          longToken,
          shouldUnwrapNativeToken
        ),
        shortToken,
        shortTokenAta: getOptionalATA(
          hint.receiver,
          shortToken,
          shouldUnwrapNativeToken
        ),
        longTokenEscrow,
        shortTokenEscrow,
        callbackAuthority: new PublicKey(
          'EvVTs5Ts2xdPx2PK8pU2PYssYaGtUo6mQ4k9aMnZFwRK'
        ),
        callbackProgram:
          callbackProgramId && !callbackProgramId.equals(emptyKey)
            ? callbackProgramId
            : null,
        callbackSharedDataAccount:
          callbackSharedData && !callbackSharedData.equals(emptyKey)
            ? callbackSharedData
            : null,
        callbackPartitionedDataAccount:
          callbackPartitionedData && !callbackPartitionedData.equals(emptyKey)
            ? callbackPartitionedData
            : null,
        eventAuthority: new PublicKey(
          '8a4wJ2bMiH6XWDZ7biTnejkss8VG7GMwd9Mg6F5fDfHF'
        ),
      })
      .instruction(),
  ];
};

export const invokeCancelOrderWithUserAsSigner = makeInvoke(
  makeCancelOrderInstruction,
  ['owner']
);
export const invokeCancelOrder = makeInvoke(
  makeCancelOrderInstruction,
  [],
  true
);

export type MakeUpdateOrderParams = {
  store: PublicKey;
  owner: PublicKey;
  order: PublicKey;
  sizeDeltaUsd?: number | bigint;
  acceptablePrice?: number | bigint;
  triggerPrice?: number | bigint;
  minOutputAmount?: number | bigint;
  options?: {
    hint?: {
      market: PublicKey;
      callbackPartitionedData: PublicKey | null;
      callbackSharedData: PublicKey | null;
      callbackProgramId: PublicKey | null;
    };
  };
};

export const makeUpdateOrderInstruction = async (
  storeProgram: StoreProgram,
  {
    store,
    owner,
    order,
    sizeDeltaUsd,
    acceptablePrice,
    triggerPrice,
    minOutputAmount,
    options,
  }: MakeUpdateOrderParams
) => {
  const hint =
    options?.hint ??
    (await storeProgram.account.order.fetch(order).then((order) => ({
      market: order.header.market,
      callbackPartitionedData: order.header.callbackPartitionedData,
      callbackSharedData: order.header.callbackSharedData,
      callbackProgramId: order.header.callbackProgramId,
    })));

  if (!hint) throw Error('Neither `hint` nor `storeProgram` provided');

  const {
    market,
    callbackProgramId,
    callbackSharedData,
    callbackPartitionedData,
  } = hint;
  console.log('updateOrderV2', {
    market,
    callbackProgramId,
    callbackSharedData,
    callbackPartitionedData,
  });
  return [
    await storeProgram.methods
      .updateOrderV2({
        sizeDeltaValue: toBN(sizeDeltaUsd ?? 0),
        acceptablePrice: acceptablePrice ? toBN(acceptablePrice) : null,
        triggerPrice: triggerPrice ? toBN(triggerPrice) : null,
        minOutput: toBN(minOutputAmount ?? 0),
        validFromTs: null,
      })
      .accountsPartial({
        owner,
        store,
        market,
        order,
        callbackAuthority: new PublicKey(
          'EvVTs5Ts2xdPx2PK8pU2PYssYaGtUo6mQ4k9aMnZFwRK'
        ),
        callbackProgram:
          callbackProgramId && !callbackProgramId.equals(emptyKey)
            ? callbackProgramId
            : null,
        callbackSharedDataAccount:
          callbackSharedData && !callbackSharedData.equals(emptyKey)
            ? callbackSharedData
            : null,
        callbackPartitionedDataAccount:
          callbackPartitionedData && !callbackPartitionedData.equals(emptyKey)
            ? callbackPartitionedData
            : null,
        eventAuthority: new PublicKey(
          '8a4wJ2bMiH6XWDZ7biTnejkss8VG7GMwd9Mg6F5fDfHF'
        ),
      })
      .instruction(),
  ];
};

export const invokeUpdateOrderWithPayerAsSigner = makeInvoke(
  makeUpdateOrderInstruction,
  ['owner']
);
export const invokeUpdateOrder = makeInvoke(
  makeUpdateOrderInstruction,
  [],
  true
);
