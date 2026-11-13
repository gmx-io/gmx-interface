/* tslint:disable */
/* eslint-disable */
/**
 * Get default [`StoreProgram`].
 */
export function default_store_program(): StoreProgram;
/**
 * Create transaction builder for create-order ixs.
 */
export function create_orders_builder(kind: CreateOrderKind, orders: CreateOrderParams[], options: CreateOrderOptions): CreateOrdersBuilder;
/**
 * Build transactions for creating orders.
 */
export function create_orders(kind: CreateOrderKind, orders: CreateOrderParams[], options: CreateOrderOptions): TransactionGroup;
/**
 * Build transactions for closing orders.
 */
export function close_orders(args: CloseOrderArgs): TransactionGroup;
/**
 * Build transactions for updating orders.
 */
export function update_orders(args: UpdateOrderArgs): TransactionGroup;
export function create_deposits_builder(deposits: CreateDepositParamsJs[], options: CreateDepositOptions): CreateDepositsBuilder;
export function create_deposits(deposits: CreateDepositParamsJs[], options: CreateDepositOptions): TransactionGroup;
export function create_withdrawals_builder(withdrawals: CreateWithdrawalParamsJs[], options: CreateWithdrawalOptions): CreateWithdrawalsBuilder;
export function create_withdrawals(withdrawals: CreateWithdrawalParamsJs[], options: CreateWithdrawalOptions): TransactionGroup;
export function create_shifts_builder(shifts: CreateShiftParamsJs[], options: CreateShiftOptions): CreateShiftsBuilder;
export function create_shifts(shifts: CreateShiftParamsJs[], options: CreateShiftOptions): TransactionGroup;
export function create_glv_deposits_builder(deposits: CreateGlvDepositParamsJs[], options: CreateGlvDepositOptions): CreateGlvDepositsBuilder;
export function create_glv_deposits(deposits: CreateGlvDepositParamsJs[], options: CreateGlvDepositOptions): TransactionGroup;
export function create_glv_withdrawals_builder(withdrawals: CreateGlvWithdrawalParamsJs[], options: CreateGlvWithdrawalOptions): CreateGlvWithdrawalsBuilder;
export function create_glv_withdrawals(withdrawals: CreateGlvWithdrawalParamsJs[], options: CreateGlvWithdrawalOptions): TransactionGroup;
/**
 * Build transactions for settling builder fees on one or more orders.
 */
export function settle_builder_fee(args: SettleBuilderFeeArgs): TransactionGroup;
/**
 * Build a transaction for claiming accumulated builder fees for one token mint.
 */
export function claim_builder_fees(args: ClaimBuilderFeesArgs): TransactionGroup;
/**
 * Build a transaction for setting the builder fee factor on the caller's User Account.
 */
export function set_builder_fee_factor(args: SetBuilderFeeFactorArgs): TransactionGroup;
/**
 * Apply `factor` to the `value`.
 */
export function apply_factor(value: bigint, factor: bigint): bigint | undefined;
/**
 * Initialize Javascript logging and panic handler
 */
export function solana_program_init(): void;
/**
 * Params for calculating market token price.
 */
export interface MarketTokenPriceParams {
    /**
     * Prices.
     */
    prices: Prices;
    /**
     * Pnl Factor.
     */
    pnl_factor?: PnlFactorKind;
    /**
     * Maximize.
     */
    maximize: boolean;
}

/**
 * Params for calculating market status.
 */
export interface MarketStatusParams {
    /**
     * Prices.
     */
    prices: Prices;
}

/**
 * Params for calculating max sellable avlue.
 */
export interface MaxSellableValueParams {
    /**
     * Prices.
     */
    prices: Prices;
}

/**
 * Parameters for creating empty position model.
 */
export interface CreateEmptyPositionArgs {
    /**
     * Is long side.
     */
    is_long: boolean;
    /**
     * Collateral token.
     */
    collateral_token: StringPubkey;
    /**
     * The owner of the position.
     *
     * If set to `None`, the `owner` will use the default pubkey.
     */
    owner?: StringPubkey | undefined;
    /**
     * The timestamp of the position creation.
     */
    created_at?: number | undefined;
    /**
     * Whether to generate a bump seed.
     *
     * If set `false`, the `bump` will be fixed to `0`.
     */
    generate_bump?: boolean | undefined;
    /**
     * The store program ID used to generate the bump seed.
     */
    store_program_id?: StringPubkey | undefined;
}

/**
 * Best swap path.
 */
export interface BestSwapPath {
    /**
     * Params.
     */
    params: SwapEstimationParams;
    /**
     * Exchange rate.
     */
    exchange_rate: bigint | undefined;
    /**
     * Path.
     */
    path: string[];
    /**
     * Arbitrage exists.
     */
    arbitrage_exists: boolean | undefined;
}

/**
 * Options for attaching a `set_builder_fee` instruction to the created orders.
 *
 * A single value for the whole call, see [`CreateOrderOptions::set_builder_fee`].
 * The token the fee is denominated in is not given here: it is the orders\' own
 * final output token, which they necessarily share.
 */
export interface SetBuilderFeeOptions {
    builder: StringPubkey;
    expected_factor: bigint;
}

/**
 * Options for creating orders.
 */
export interface CreateOrderOptions {
    recent_blockhash: string;
    compute_unit_price_micro_lamports?: number | undefined;
    compute_unit_min_priority_lamports?: number | undefined;
    payer: StringPubkey;
    collateral_or_swap_out_token: StringPubkey;
    hints: Map<StringPubkey, CreateOrderHint>;
    program?: StoreProgram | undefined;
    pay_token?: StringPubkey | undefined;
    receive_token?: StringPubkey | undefined;
    swap_path?: StringPubkey[] | undefined;
    skip_wrap_native_on_pay?: boolean | undefined;
    skip_unwrap_native_on_receive?: boolean | undefined;
    callback?: Callback | undefined;
    transaction_group?: TransactionGroupOptions;
    force_create_positions_in_parallel?: boolean | undefined;
    force_create_positions?: boolean | undefined;
    /**
     * Builder fee to attach to every order created by this call.
     *
     * When set, a `set_builder_fee` instruction is merged into each order\'s own
     * atomic group immediately after its create instruction, so no submission can
     * land an order that exists without its checkpoint.
     *
     * The same builder and factor apply to every order in the call. Swap orders are
     * rejected, matching the on-chain `BuilderFeeOrderKindNotAllowed`.
     */
    set_builder_fee?: SetBuilderFeeOptions | undefined;
}

/**
 * Parameters for closing orders.
 */
export interface CloseOrderArgs {
    recent_blockhash: string;
    compute_unit_price_micro_lamports?: number | undefined;
    compute_unit_min_priority_lamports?: number | undefined;
    payer: StringPubkey;
    orders: Map<StringPubkey, CloseOrderHint>;
    program?: StoreProgram | undefined;
    transaction_group?: TransactionGroupOptions;
    /**
     * Per-order `settle_builder_fee` hints, keyed by order address.
     *
     * When present, the keys must match `orders` exactly. Each order\'s
     * `settle_builder_fee` is emitted in the same atomic group as its close, ahead of the
     * close instruction, so the escrow still exists when it runs and neither can land
     * without the other.
     *
     * Each hint must be built from a fresh read of its order account; only field
     * presence is validated here, never freshness, and a stale hint reverts the close
     * along with the settle. See `SettleBuilderFeeHint` for which field fails how.
     */
    settle_builder_fee?: Map<StringPubkey, SettleBuilderFeeHint> | undefined;
}

export interface UpdateParams {
    params: UpdateOrderParams;
    hint: UpdateOrderHint;
}

/**
 * Parameters for updating orders.
 */
export interface UpdateOrderArgs {
    recent_blockhash: string;
    compute_unit_price_micro_lamports?: number | undefined;
    compute_unit_min_priority_lamports?: number | undefined;
    payer: StringPubkey;
    orders: Map<StringPubkey, UpdateParams>;
    program?: StoreProgram | undefined;
    transaction_group?: TransactionGroupOptions;
}

export interface CreateDepositParamsJs {
    market_token: StringPubkey;
    receiver?: StringPubkey | undefined;
    long_pay_token?: StringPubkey | undefined;
    short_pay_token?: StringPubkey | undefined;
    long_swap_path?: StringPubkey[] | undefined;
    short_swap_path?: StringPubkey[] | undefined;
    long_pay_amount?: bigint | undefined;
    short_pay_amount?: bigint | undefined;
    min_receive_amount?: bigint | undefined;
    skip_unwrap_native_on_receive?: boolean | undefined;
}

export interface CreateDepositOptions {
    recent_blockhash: string;
    payer: StringPubkey;
    program?: StoreProgram | undefined;
    compute_unit_price_micro_lamports?: number | undefined;
    compute_unit_min_priority_lamports?: number | undefined;
    hints: Map<StringPubkey, CreateDepositHint>;
    transaction_group?: TransactionGroupOptions;
    skip_wrap_native_on_pay?: boolean | undefined;
}

export interface CreateWithdrawalParamsJs {
    market_token: StringPubkey;
    receiver?: StringPubkey | undefined;
    long_receive_token?: StringPubkey | undefined;
    short_receive_token?: StringPubkey | undefined;
    long_swap_path?: StringPubkey[] | undefined;
    short_swap_path?: StringPubkey[] | undefined;
    market_token_amount?: bigint | undefined;
    min_long_receive_amount?: bigint | undefined;
    min_short_receive_amount?: bigint | undefined;
    skip_unwrap_native_on_receive?: boolean | undefined;
}

export interface CreateWithdrawalOptions {
    recent_blockhash: string;
    payer: StringPubkey;
    program?: StoreProgram | undefined;
    compute_unit_price_micro_lamports?: number | undefined;
    compute_unit_min_priority_lamports?: number | undefined;
    hints: Map<StringPubkey, CreateWithdrawalHint>;
    transaction_group?: TransactionGroupOptions;
}

export interface CreateShiftParamsJs {
    from_market_token: StringPubkey;
    to_market_token: StringPubkey;
    receiver?: StringPubkey | undefined;
    from_market_token_amount?: bigint | undefined;
    min_to_market_token_amount?: bigint | undefined;
    skip_to_market_token_ata_creation?: boolean | undefined;
}

export interface CreateShiftOptions {
    recent_blockhash: string;
    payer: StringPubkey;
    program?: StoreProgram | undefined;
    compute_unit_price_micro_lamports?: number | undefined;
    compute_unit_min_priority_lamports?: number | undefined;
    transaction_group?: TransactionGroupOptions;
}

export interface CreateGlvDepositParamsJs {
    glv_token: StringPubkey;
    market_token: StringPubkey;
    receiver?: StringPubkey | undefined;
    long_pay_token?: StringPubkey | undefined;
    short_pay_token?: StringPubkey | undefined;
    long_swap_path?: StringPubkey[] | undefined;
    short_swap_path?: StringPubkey[] | undefined;
    long_pay_amount?: bigint | undefined;
    short_pay_amount?: bigint | undefined;
    market_token_amount?: bigint | undefined;
    min_market_token_amount?: bigint | undefined;
    min_receive_amount?: bigint | undefined;
    skip_unwrap_native_on_receive?: boolean | undefined;
    skip_glv_token_ata_creation?: boolean | undefined;
}

export interface CreateGlvDepositOptions {
    recent_blockhash: string;
    payer: StringPubkey;
    program?: StoreProgram | undefined;
    compute_unit_price_micro_lamports?: number | undefined;
    compute_unit_min_priority_lamports?: number | undefined;
    hints: Map<StringPubkey, CreateGlvDepositHint>;
    transaction_group?: TransactionGroupOptions;
    skip_wrap_native_on_pay?: boolean | undefined;
}

export interface CreateGlvWithdrawalParamsJs {
    glv_token: StringPubkey;
    market_token: StringPubkey;
    receiver?: StringPubkey | undefined;
    long_receive_token?: StringPubkey | undefined;
    short_receive_token?: StringPubkey | undefined;
    long_swap_path?: StringPubkey[] | undefined;
    short_swap_path?: StringPubkey[] | undefined;
    glv_token_amount?: bigint | undefined;
    min_long_receive_amount?: bigint | undefined;
    min_short_receive_amount?: bigint | undefined;
    skip_unwrap_native_on_receive?: boolean | undefined;
    skip_long_receive_token_ata_creation?: boolean | undefined;
    skip_short_receive_token_ata_creation?: boolean | undefined;
}

export interface CreateGlvWithdrawalOptions {
    recent_blockhash: string;
    payer: StringPubkey;
    program?: StoreProgram | undefined;
    compute_unit_price_micro_lamports?: number | undefined;
    compute_unit_min_priority_lamports?: number | undefined;
    hints: Map<StringPubkey, CreateGlvWithdrawalHint>;
    transaction_group?: TransactionGroupOptions;
}

/**
 * Arguments for standalone `settle_builder_fee` transactions.
 */
export interface SettleBuilderFeeArgs {
    recent_blockhash: string;
    compute_unit_price_micro_lamports?: number | undefined;
    compute_unit_min_priority_lamports?: number | undefined;
    payer: StringPubkey;
    /**
     * Orders to settle, keyed by order address.
     *
     * Each hint must be built from a fresh read of its order account; only field
     * presence is validated here, never freshness. See `SettleBuilderFeeHint`.
     */
    orders: Map<StringPubkey, SettleBuilderFeeHint>;
    program?: StoreProgram | undefined;
    transaction_group?: TransactionGroupOptions;
}

/**
 * Arguments for a `claim_builder_fees` transaction.
 */
export interface ClaimBuilderFeesArgs {
    recent_blockhash: string;
    compute_unit_price_micro_lamports?: number | undefined;
    compute_unit_min_priority_lamports?: number | undefined;
    /**
     * Builder (payer and fee owner).
     */
    payer: StringPubkey;
    /**
     * The mint the fees are denominated in.
     */
    token_mint: StringPubkey;
    /**
     * Destination token account to receive the claimed balance.
     */
    destination: StringPubkey;
    program?: StoreProgram | undefined;
    transaction_group?: TransactionGroupOptions;
}

/**
 * Arguments for a `set_builder_fee_factor` transaction.
 */
export interface SetBuilderFeeFactorArgs {
    recent_blockhash: string;
    compute_unit_price_micro_lamports?: number | undefined;
    compute_unit_min_priority_lamports?: number | undefined;
    /**
     * Builder (payer and owner of the User Account).
     */
    payer: StringPubkey;
    /**
     * Factor to advertise. Pass `0` to opt out.
     */
    factor: bigint;
    program?: StoreProgram | undefined;
    transaction_group?: TransactionGroupOptions;
}

/**
 * A JS version transaction group options.
 */
export interface TransactionGroupOptions {
    max_transaction_size?: number | undefined;
    max_instructions_per_tx?: number | undefined;
    luts?: Map<StringPubkey, StringPubkey[]>;
    memo?: string | undefined;
}

/**
 * Serialized transaction group.
 */
export type SerializedTransactionGroup = number[][][];

/**
 * Build transaction options.
 */
export interface BuildTransactionOptions {
    recent_blockhash: string;
    compute_unit_price_micro_lamports?: number | undefined;
    compute_unit_min_priority_lamports?: number | undefined;
}

/**
 * Arguments for deposit simulation.
 */
export interface SimulateDepositArgs {
    params: CreateDepositParamsJs;
}

/**
 * Arguments for GLV deposit simulation.
 */
export interface SimulateGlvDepositArgs {
    params: CreateGlvDepositParamsJs;
}

/**
 * Arguments for GLV withdrawal simulation.
 */
export interface SimulateGlvWithdrawalArgs {
    params: CreateGlvWithdrawalParamsJs;
}

/**
 * Arguments for order simulation.
 */
export interface SimulateOrderArgs {
    kind: CreateOrderKind;
    params: CreateOrderParams;
    collateral_or_swap_out_token: StringPubkey;
    pay_token?: StringPubkey | undefined;
    receive_token?: StringPubkey | undefined;
    swap_path?: StringPubkey[] | undefined;
    prefer_swap_out_token_update?: boolean | undefined;
    skip_limit_price_validation?: boolean | undefined;
    limit_swap_slippage?: bigint | undefined;
    update_prices_for_limit_order?: boolean | undefined;
}

/**
 * Simulation output for increase order.
 */
export interface IncreaseOrderSimulationOutput {
    swaps: string[];
    report: string;
    position: string | undefined;
}

/**
 * Simulation output for decrease order.
 */
export interface DecreaseOrderSimulationOutput {
    swaps: string[];
    report: string;
    position: string | undefined;
    decrease_swap: string | undefined;
}

/**
 * Simulation output for swap order.
 */
export interface SwapOrderSimulationOutput {
    output_token: StringPubkey;
    amount: bigint;
    report: string[];
}

/**
 * Arguments for shift simulation.
 */
export interface SimulateShiftArgs {
    params: CreateShiftParamsJs;
}

/**
 * Arguments for GLV status calculations.
 */
export interface GetGlvStatusArgs {
    glv_token: StringPubkey;
}

/**
 * Arguments for GLV status calculations.
 */
export interface GetGlvTokenValueArgs {
    glv_token: StringPubkey;
    amount: bigint;
    maximize: boolean;
}

/**
 * Arguments for withdrawal simulation.
 */
export interface SimulateWithdrawalArgs {
    params: CreateWithdrawalParamsJs;
}


/**
 * A Base58-encoded string representing a public key.
 */
export type StringPubkey = string;


/**
 * Options for updating [`MarketGraph`] with [`Simulator`].
 */
export interface UpdateGraphWithSimulatorOptions {
    /**
     * Whether to update token prices with the simulator.
     */
    update_token_prices?: boolean;
    /**
     * Whether to not update markets with the simulator.
     */
    skip_markets_update?: boolean;
    /**
     * Whether to not update virtual inventories with the simulator.
     */
    skip_vis_update?: boolean;
}

/**
 * Options for creating [`Simulator`].
 */
export interface CreateGraphSimulatorOptions {
    /**
     * Market filter.
     */
    market_filter?: StringPubkey[] | undefined;
}

/**
 * Config for [`MarketGraph`](super::MarketGraph).
 */
export interface MarketGraphConfig {
    /**
     * Estimation Params for swap.
     */
    swap_estimation_params: SwapEstimationParams;
    /**
     * Max steps.
     */
    max_steps: number;
}

/**
 * Estimation Parameters for Swap.
 */
export interface SwapEstimationParams {
    /**
     * Value.
     */
    value: bigint;
    /**
     * Base cost.
     */
    base_cost: bigint;
}

/**
 * Js Prices.
 */
export interface Prices {
    /**
     * Index token price.
     */
    index_token: Value;
    /**
     * Long token price.
     */
    long_token: Value;
    /**
     * Short token price.
     */
    short_token: Value;
}

/**
 * GLV Status.
 */
export interface GlvStatus {
    /**
     * The estimated max sellable value in the GLV.
     */
    max_sellable_value: bigint;
    /**
     * The estimated total GLV value.
     */
    total_value: Value;
}

/**
 * Position Status.
 */
export interface PositionStatus {
    /**
     * Entry price.
     */
    entry_price: bigint;
    /**
     * Collateral value.
     */
    collateral_value: bigint;
    /**
     * Pending PnL.
     */
    pending_pnl: bigint;
    /**
     * Pending borrowing fee value.
     */
    pending_borrowing_fee_value: bigint;
    /**
     * Pending funding fee value.
     */
    pending_funding_fee_value: bigint;
    /**
     * Pending claimable funding fee value in long token.
     */
    pending_claimable_funding_fee_value_in_long_token: bigint;
    /**
     * Pending claimable funding fee value in short token.
     */
    pending_claimable_funding_fee_value_in_short_token: bigint;
    /**
     * Close order fee value.
     */
    close_order_fee_value: bigint;
    /**
     * Net value.
     */
    net_value: bigint;
    /**
     * Leverage.
     */
    leverage: bigint | undefined;
    /**
     * Liquidation price.
     */
    liquidation_price: bigint | undefined;
}

/**
 * Market Status.
 */
export interface MarketStatus {
    /**
     * Funding fee rate per hour for long.
     */
    funding_rate_per_second_for_long: bigint;
    /**
     * Funding fee rate per hour for short.
     */
    funding_rate_per_second_for_short: bigint;
    /**
     * Borrowing fee rate per second for long.
     */
    borrowing_rate_per_second_for_long: bigint;
    /**
     * Borrowing fee rate per second for short.
     */
    borrowing_rate_per_second_for_short: bigint;
    /**
     * Pending pnl for long.
     */
    pending_pnl_for_long: SignedValue;
    /**
     * Pending pnl for short.
     */
    pending_pnl_for_short: SignedValue;
    /**
     * Reserved value for long.
     */
    reserved_value_for_long: bigint;
    /**
     * Reserved value for short.
     */
    reserved_value_for_short: bigint;
    /**
     * Max reserve value for long.
     */
    max_reserve_value_for_long: bigint;
    /**
     * Max reserve value for short.
     */
    max_reserve_value_for_short: bigint;
    /**
     * Pool value without pnl for long.
     */
    pool_value_without_pnl_for_long: Value;
    /**
     * Pool value without pnl for short.
     */
    pool_value_without_pnl_for_short: Value;
    /**
     * Liquidity for long.
     */
    liquidity_for_long: bigint;
    /**
     * Liquidity for short.
     */
    liquidity_for_short: bigint;
    /**
     * Max liquidity for long.
     */
    max_liquidity_for_long: bigint;
    /**
     * Max liquidity for short.
     */
    max_liquidity_for_short: bigint;
    /**
     * Open interest for long.
     */
    open_interest_for_long: bigint;
    /**
     * Open interest for short.
     */
    open_interest_for_short: bigint;
    /**
     * Open interest in tokens for long.
     */
    open_interest_in_tokens_for_long: bigint;
    /**
     * Open interest in tokens for short.
     */
    open_interest_in_tokens_for_short: bigint;
    /**
     * Min collateral factor for long.
     */
    min_collateral_factor_for_long: bigint;
    /**
     * Min collateral factor for short.
     */
    min_collateral_factor_for_short: bigint;
}

/**
 * Min max signed values.
 */
export interface SignedValue {
    /**
     * Min value.
     */
    min: bigint;
    /**
     * Max value.
     */
    max: bigint;
}

/**
 * Min max values.
 */
export interface Value {
    /**
     * Min value.
     */
    min: bigint;
    /**
     * Max value.
     */
    max: bigint;
}

/**
 * Callback.
 */
export interface Callback {
    /**
     * Callback version.
     */
    version: number;
    /**
     * Callback program ID.
     */
    program: StringPubkey;
    /**
     * The address of shared data account.
     */
    shared_data: StringPubkey;
    /**
     * The address of partitioned data account.
     */
    partitioned_data: StringPubkey;
}

/**
 * Hint for pool tokens.
 */
export interface PoolTokenHint {
    /**
     * Long token.
     */
    long_token: StringPubkey;
    /**
     * Short token.
     */
    short_token: StringPubkey;
}

/**
 * Builder for `mint_gt_reward` instruction.
 */
export interface MintGtReward {
    /**
     * Payer (a.k.a. authority).
     */
    payer: StringPubkey;
    /**
     * Store program.
     */
    store_program?: StoreProgram;
    /**
     * The owner for whom the GT reward will be minted.
     */
    owner: StringPubkey;
    /**
     * The amount to mint.
     */
    amount: number;
}

/**
 * Hint for [`CreateGlvWithdrawal`].
 */
export interface CreateGlvWithdrawalHint {
    /**
     * Pool tokens.
     */
    pool_tokens: PoolTokenHint;
}

/**
 * Builder for the `create_glv_withdrawal` instruction.
 */
export interface CreateGlvWithdrawal {
    /**
     * Program.
     */
    program?: StoreProgram;
    /**
     * Payer (a.k.a. owner).
     */
    payer: StringPubkey;
    /**
     * Reciever.
     */
    receiver?: StringPubkey | undefined;
    /**
     * Nonce for the GLV withdrawal.
     */
    nonce?: NonceBytes | undefined;
    /**
     * Execution fee paid to the keeper in lamports.
     */
    execution_lamports?: number;
    /**
     * The GLV token.
     */
    glv_token: StringPubkey;
    /**
     * The market token of the market in which the GLV withdrawal will be created.
     */
    market_token: StringPubkey;
    /**
     * GLV token account.
     */
    glv_token_account?: StringPubkey | undefined;
    /**
     * Long receive token.
     */
    long_receive_token?: StringPubkey | undefined;
    /**
     * Swap path for long receive token.
     */
    long_swap_path?: StringPubkey[];
    /**
     * Short receive token.
     */
    short_receive_token?: StringPubkey | undefined;
    /**
     * Swap path for short receive token.
     */
    short_swap_path?: StringPubkey[];
    /**
     * GLV token amount.
     */
    glv_token_amount?: number;
    /**
     * Minimum amount of long receive tokens.
     */
    min_long_receive_amount?: number;
    /**
     * Minimum amount of short receive tokens.
     */
    min_short_receive_amount?: number;
    /**
     * Whether to unwrap the native token when receiving (e.g., convert WSOL to SOL).
     */
    unwrap_native_on_receive?: boolean;
    /**
     * Whether to skip the creation of long receive token ATA.
     */
    skip_long_receive_token_ata_creation?: boolean;
    /**
     * Whether to skip the creation of short receive token ATA.
     */
    skip_short_receive_token_ata_creation?: boolean;
}

/**
 * Hint for [`CreateGlvDeposit`].
 */
export interface CreateGlvDepositHint {
    /**
     * Pool tokens.
     */
    pool_tokens: PoolTokenHint;
}

/**
 * Builder for the `create_glv_deposit` instruction.
 */
export interface CreateGlvDeposit {
    /**
     * Program.
     */
    program?: StoreProgram;
    /**
     * Payer (a.k.a. owner).
     */
    payer: StringPubkey;
    /**
     * Reciever.
     */
    receiver?: StringPubkey | undefined;
    /**
     * Nonce for the deposit.
     */
    nonce?: NonceBytes | undefined;
    /**
     * The GLV token.
     */
    glv_token: StringPubkey;
    /**
     * The market token of the market in which the deposit will be created.
     */
    market_token: StringPubkey;
    /**
     * Execution fee paid to the keeper in lamports.
     */
    execution_lamports?: number;
    /**
     * Long pay token.
     */
    long_pay_token?: StringPubkey | undefined;
    /**
     * Long pay token account.
     */
    long_pay_token_account?: StringPubkey | undefined;
    /**
     * Swap path for long pay token.
     */
    long_swap_path?: StringPubkey[];
    /**
     * Short pay token.
     */
    short_pay_token?: StringPubkey | undefined;
    /**
     * Short pay token account.
     */
    short_pay_token_account?: StringPubkey | undefined;
    /**
     * Swap path for short pay token.
     */
    short_swap_path?: StringPubkey[];
    /**
     * Market token account.
     */
    market_token_account?: StringPubkey | undefined;
    /**
     * Long pay token amount.
     */
    long_pay_amount?: number;
    /**
     * Short pay token amount.
     */
    short_pay_amount?: number;
    /**
     * Market token amount to pay.
     */
    market_token_amount?: number;
    /**
     * Minimum amount of output market tokens.
     */
    min_market_token_amount?: number;
    /**
     * Minimum amount of output GLV tokens.
     */
    min_receive_amount?: number;
    /**
     * Whether to unwrap the native token when receiving (e.g., convert WSOL to SOL).
     */
    unwrap_native_on_receive?: boolean;
    /**
     * Whether to skip the creation of GLV token ATA.
     */
    skip_glv_token_ata_creation?: boolean;
}

/**
 * Builder for the `create_shift` instruction.
 */
export interface CreateShift {
    /**
     * Program.
     */
    program?: StoreProgram;
    /**
     * Payer (a.k.a. owner).
     */
    payer: StringPubkey;
    /**
     * Reciever.
     */
    receiver?: StringPubkey | undefined;
    /**
     * Nonce for the shift.
     */
    nonce?: NonceBytes | undefined;
    /**
     * The from-market token.
     */
    from_market_token: StringPubkey;
    /**
     * From-market token account.
     */
    from_market_token_account?: StringPubkey | undefined;
    /**
     * The to-market token.
     */
    to_market_token: StringPubkey;
    /**
     * Execution fee paid to the keeper in lamports.
     */
    execution_lamports?: number;
    /**
     * From-market token amount to pay.
     */
    from_market_token_amount?: number;
    /**
     * Minimum to-market token amount to receive.
     */
    min_to_market_token_amount?: number;
    /**
     * Whether to skip the creation of to-market token ATA.
     */
    skip_to_market_token_ata_creation?: boolean;
}

/**
 * Hint for [`CreateWithdrawal`].
 */
export interface CreateWithdrawalHint {
    /**
     * Pool tokens.
     */
    pool_tokens: PoolTokenHint;
}

/**
 * Builder for the `create_withdrawal` instruction.
 */
export interface CreateWithdrawal {
    /**
     * Program.
     */
    program?: StoreProgram;
    /**
     * Payer (a.k.a. owner).
     */
    payer: StringPubkey;
    /**
     * Reciever.
     */
    receiver?: StringPubkey | undefined;
    /**
     * Nonce for the withdrawal.
     */
    nonce?: NonceBytes | undefined;
    /**
     * Execution fee paid to the keeper in lamports.
     */
    execution_lamports?: number;
    /**
     * The market token of the market in which the withdrawal will be created.
     */
    market_token: StringPubkey;
    /**
     * Market token account.
     */
    market_token_account?: StringPubkey | undefined;
    /**
     * Long receive token.
     */
    long_receive_token?: StringPubkey | undefined;
    /**
     * Swap path for long receive token.
     */
    long_swap_path?: StringPubkey[];
    /**
     * Short receive token.
     */
    short_receive_token?: StringPubkey | undefined;
    /**
     * Swap path for short receive token.
     */
    short_swap_path?: StringPubkey[];
    /**
     * Market token amount.
     */
    market_token_amount?: number;
    /**
     * Minimum amount of long receive tokens.
     */
    min_long_receive_amount?: number;
    /**
     * Minimum amount of short receive tokens.
     */
    min_short_receive_amount?: number;
    /**
     * Whether to unwrap the native token when receiving (e.g., convert WSOL to SOL).
     */
    unwrap_native_on_receive?: boolean;
    /**
     * Whether to skip the creation of long receive token ATA.
     */
    skip_long_receive_token_ata_creation?: boolean;
    /**
     * Whether to skip the creation of short receive token ATA.
     */
    skip_short_receive_token_ata_creation?: boolean;
}

/**
 * Hint for [`CreateDeposit`].
 */
export interface CreateDepositHint {
    /**
     * Pool tokens.
     */
    pool_tokens: PoolTokenHint;
}

/**
 * Builder for the `create_deposit` instruction.
 */
export interface CreateDeposit {
    /**
     * Program.
     */
    program?: StoreProgram;
    /**
     * Payer (a.k.a. owner).
     */
    payer: StringPubkey;
    /**
     * Reciever.
     */
    receiver?: StringPubkey | undefined;
    /**
     * Nonce for the deposit.
     */
    nonce?: NonceBytes | undefined;
    /**
     * The market token of the market in which the deposit will be created.
     */
    market_token: StringPubkey;
    /**
     * Execution fee paid to the keeper in lamports.
     */
    execution_lamports?: number;
    /**
     * Long pay token.
     */
    long_pay_token?: StringPubkey | undefined;
    /**
     * Long pay token account.
     */
    long_pay_token_account?: StringPubkey | undefined;
    /**
     * Swap path for long pay token.
     */
    long_swap_path?: StringPubkey[];
    /**
     * Short pay token.
     */
    short_pay_token?: StringPubkey | undefined;
    /**
     * Short pay token account.
     */
    short_pay_token_account?: StringPubkey | undefined;
    /**
     * Swap path for short pay token.
     */
    short_swap_path?: StringPubkey[];
    /**
     * Long pay token amount.
     */
    long_pay_amount?: number;
    /**
     * Short pay token amount.
     */
    short_pay_amount?: number;
    /**
     * Minimum amount of output market tokens.
     */
    min_receive_amount?: number;
    /**
     * Whether to unwrap the native token when receiving (e.g., convert WSOL to SOL).
     */
    unwrap_native_on_receive?: boolean;
    /**
     * Whether to skip the creation of market token ATA.
     */
    skip_market_token_ata_creation?: boolean;
}

/**
 * Hint for [`UpdateFeesState`].
 */
export interface UpdateFeesStateHint {
    /**
     * Token map.
     */
    token_map: StringPubkey;
    /**
     * Virtual inventories.
     */
    virtual_inventories: StringPubkey[];
    /**
     * Feeds.
     */
    feeds: SerdeTokenRecord[];
}

/**
 * Builder for `update_fees_state` instruction.
 */
export interface UpdateFeesState {
    /**
     * Payer (a.k.a. authority).
     */
    payer: StringPubkey;
    /**
     * Store program.
     */
    store_program?: StoreProgram;
    /**
     * Oracle buffer account.
     */
    oracle: StringPubkey;
    /**
     * Market token mint address.
     */
    market_token: StringPubkey;
}

/**
 * Hint for [`UpdateClosedState`].
 */
export interface UpdateClosedStateHint {
    /**
     * Token map.
     */
    token_map: StringPubkey;
    /**
     * Feeds.
     */
    feeds: SerdeTokenRecord[];
}

/**
 * Builder for `update_closed_state` instruction.
 */
export interface UpdateClosedState {
    /**
     * Payer (a.k.a. authority).
     */
    payer: StringPubkey;
    /**
     * Store program.
     */
    store_program?: StoreProgram;
    /**
     * Oracle buffer account.
     */
    oracle: StringPubkey;
    /**
     * Market token mint address.
     */
    market_token: StringPubkey;
}

/**
 * Builder for `udpate_closed_state` instruction.
 */
export interface SetMarketConfigUpdatable {
    /**
     * Payer (a.k.a. authority).
     */
    payer: StringPubkey;
    /**
     * Store program.
     */
    store_program?: StoreProgram;
    /**
     * Flags.
     */
    flags?: IndexMap<MarketConfigFlag, boolean>;
    /**
     * Factors.
     */
    factors?: IndexMap<MarketConfigFactor, boolean>;
}

/**
 * Builder for the `close_empty_position` instruction.
 */
export interface CloseEmptyPosition {
    /**
     * Program.
     */
    program?: StoreProgram;
    /**
     * Payer (a.k.a. owner).
     */
    payer: StringPubkey;
    /**
     * Position to close.
     */
    position: StringPubkey;
}

/**
 * Builder for the `claim_builder_fees` instruction.
 *
 * Sweeps the whole balance of the payer\'s own claim vault for one token mint
 * into a destination token account. The program restricts the call to the
 * payer\'s own User Account, so there is nothing to authorize beyond the
 * signature and no hint to fetch: every account is a pure function of the
 * store, the mint, the destination and the payer\'s key.
 *
 * The claim vault has to exist. A builder that has never been settled for
 * this mint therefore fails here rather than succeeding with nothing moved,
 * which is the more useful answer for a caller who asked to be paid.
 */
export interface ClaimBuilderFees {
    /**
     * Program.
     */
    program?: StoreProgram;
    /**
     * Payer, i.e. the builder claiming its own fees.
     */
    payer: StringPubkey;
    /**
     * The mint the fees are denominated in.
     *
     * One claim vault exists per `(User Account, mint)`, so a builder owed
     * fees in several mints claims each of them separately.
     */
    token_mint: StringPubkey;
    /**
     * Token account to receive the claimed balance.
     *
     * Chosen freely by the caller and not derived, so it must already exist
     * and match `token_mint`.
     */
    destination: StringPubkey;
}

/**
 * Builder for the `set_builder_fee_factor` instruction.
 *
 * Sets the fee factor the payer\'s User Account advertises to order owners.
 * The factor is a ceiling enforced by the store\'s `MaxBuilderFeeFactor`,
 * which reads `0` until a config keeper raises it, so a builder cannot
 * advertise anything until that happens.
 *
 * Advertising `0` opts out. It is also what an order owner checkpoints to
 * cancel a builder fee, since every User Account advertises `0` until its
 * owner sets a factor.
 */
export interface SetBuilderFeeFactor {
    /**
     * Program.
     */
    program?: StoreProgram;
    /**
     * Payer, i.e. the builder whose own User Account advertises the factor.
     */
    payer: StringPubkey;
    /**
     * The factor to advertise.
     *
     * Rejected if it exceeds the store\'s `MaxBuilderFeeFactor`.
     */
    factor: bigint;
}

/**
 * Hint for [`SettleBuilderFee`].
 *
 * Every field is read off the order account. A zero `builder_fee_amount`
 * makes the other three irrelevant, because settlement is then a no-op that
 * performs no CPI and touches none of them.
 *
 * The read has to be a current one. Nothing here is checked against the chain
 * while the transaction is built, but every field is load-bearing once it
 * lands: a stale `escrow` fails with `TokenAccountMismatched`, a stale
 * `builder` with `InvalidUserAccount`, and a `builder_fee_amount` captured
 * while the order was still pending, and therefore zero, takes the no-op path
 * and then fails with `TokenMintNotProvided` if a keeper executed the order in
 * the meantime. `FromRpcClientWith<SettleBuilderFee>` derives all four from the
 * live account; prefer it to a hint cached across a user session.
 */
export interface SettleBuilderFeeHint {
    /**
     * The order\'s recorded builder fee amount.
     */
    builder_fee_amount: number;
    /**
     * The builder\'s User Account, if the order has one attached.
     */
    builder: StringPubkey | undefined;
    /**
     * The order\'s final output token mint, i.e. the token the fee is
     * denominated in.
     *
     * `None` for an order that never had one, which is a supported state.
     */
    final_output_token: StringPubkey | undefined;
    /**
     * The order\'s escrow account for the final output token.
     *
     * `None` when it was never initialized. Also a supported state rather
     * than an error.
     */
    escrow: StringPubkey | undefined;
}

/**
 * Builder for the `settle_builder_fee` instruction.
 *
 * Moves an order\'s recorded builder fee out of the final output token escrow
 * and into the builder\'s claim vault. Permissionless and idempotent: safe to
 * call on any order, in any state, whether or not it carries a non-zero
 * recorded amount.
 *
 * The payer signs only to pay the transaction. The instruction itself takes no
 * authority account, which is what makes a keeper able to settle on anyone\'s
 * behalf.
 */
export interface SettleBuilderFee {
    /**
     * Program.
     */
    program?: StoreProgram;
    /**
     * Payer, who signs for the transaction fee only.
     */
    payer: StringPubkey;
    /**
     * Order whose builder fee is being settled.
     */
    order: StringPubkey;
}

/**
 * Hint for [`SetBuilderFee`].
 */
export interface SetBuilderFeeHint {
    /**
     * Market recorded on the order.
     */
    market: StringPubkey;
    /**
     * The order\'s final output token.
     *
     * Read from the order account. An order whose final output token is
     * uninitialized cannot carry a builder fee, so there is no hint to build
     * here and the instruction would be rejected anyway.
     */
    final_output_token: StringPubkey;
}

/**
 * Builder for the `set_builder_fee` instruction.
 *
 * Checkpoints a builder and its fee factor onto a pending order. The order\'s
 * owner must sign, and the factor must match what the builder currently
 * advertises, so the caller has to read that factor before building this
 * instruction rather than letting the program pick it up implicitly.
 *
 * Submit this instruction with order creation in the same transaction when a
 * builder fee is required. If submitted separately, a keeper can execute the
 * order without the fee before this checkpoint lands. Execution or closure
 * prevents attaching it afterwards. Check the order\'s state before retrying a
 * failed checkpoint, since a non-pending order will reject it again.
 *
 * To cancel a builder fee, checkpoint a User Account advertising `0`. The
 * owner\'s own User Account does so until its owner sets a factor, which makes
 * it the natural choice.
 *
 * The checkpoint is bound to the order address and market, but not to the
 * order\'s market-scoped ID. A transaction can therefore be withheld and
 * applied to a replacement order at the same address in the same market. A
 * durable nonce transaction can be withheld indefinitely. Use random order
 * nonces without reuse and submit this instruction with order creation when
 * possible.
 */
export interface SetBuilderFee {
    /**
     * Program.
     */
    program?: StoreProgram;
    /**
     * Payer (a.k.a. the order\'s owner).
     */
    payer: StringPubkey;
    /**
     * Order to checkpoint the builder fee onto.
     */
    order: StringPubkey;
    /**
     * The builder\'s User Account.
     */
    builder: StringPubkey;
    /**
     * The factor the builder is expected to be advertising.
     *
     * The instruction fails unless it matches exactly, which is what prevents
     * the builder from raising its rate after the owner has signed.
     */
    expected_factor: bigint;
}

/**
 * Builder for the `prepare_position` instruction.
 */
export interface PreparePosition {
    /**
     * Program.
     */
    program?: StoreProgram;
    /**
     * Payer (a.k.a. owner).
     */
    payer: StringPubkey;
    /**
     * Order Kind.
     */
    kind: CreateOrderKind;
    /**
     * Collateral token.
     */
    collateral_token: StringPubkey;
    /**
     * Order Parameters.
     */
    params: CreateOrderParams;
    /**
     * Execution lamports.
     */
    execution_lamports?: number;
    /**
     * Swap path length.
     */
    swap_path_length?: number;
    /**
     * Whether to unwrap the native token.
     */
    should_unwrap_native_token?: boolean;
}

/**
 * Builder for the `set_should_keep_position_account` instruction.
 */
export interface SetShouldKeepPositionAccount {
    /**
     * Program.
     */
    program?: StoreProgram;
    /**
     * Payer (a.k.a. owner).
     */
    payer: StringPubkey;
    /**
     * Order.
     */
    order: StringPubkey;
    /**
     * Whether to keep position account.
     */
    keep: boolean;
}

/**
 * Hint for [`UpdateOrder`].
 */
export interface UpdateOrderHint {
    /**
     * Market token.
     */
    market_token: StringPubkey;
    /**
     * Callback.
     */
    callback: Callback | undefined;
}

/**
 * Parameters for creating an order.
 */
export interface UpdateOrderParams {
    /**
     * Size delta value.
     */
    size_delta_value?: bigint | undefined;
    /**
     * Acceptable price.
     */
    acceptable_price?: bigint | undefined;
    /**
     * Trigger price.
     */
    trigger_price?: bigint | undefined;
    /**
     * Min output.
     */
    min_output?: bigint | undefined;
    /**
     * Valid from this timestamp.
     */
    valid_from_ts?: number | undefined;
}

/**
 * Builder for the `update_order` instruction.
 */
export interface UpdateOrder {
    /**
     * Program.
     */
    program?: StoreProgram;
    /**
     * Payer (a.k.a. owner).
     */
    payer: StringPubkey;
    /**
     * Order.
     */
    order: StringPubkey;
    /**
     * Parameters.
     */
    params: UpdateOrderParams;
}

/**
 * Hint for [`CloseOrder`].
 */
export interface CloseOrderHint {
    /**
     * Owner.
     */
    owner: StringPubkey;
    /**
     * Receiver.
     */
    receiver: StringPubkey;
    /**
     * Rent Receiver.
     */
    rent_receiver: StringPubkey;
    /**
     * Referrer.
     */
    referrer: StringPubkey | undefined;
    /**
     * Initial collateral token.
     */
    initial_collateral_token: StringPubkey | undefined;
    /**
     * Final output token.
     */
    final_output_token: StringPubkey | undefined;
    /**
     * Long token.
     */
    long_token: StringPubkey | undefined;
    /**
     * Short token.
     */
    short_token: StringPubkey | undefined;
    /**
     * `should_unwrap_native_token` flag.
     */
    should_unwrap_native_token: boolean;
    /**
     * Callback.
     */
    callback: Callback | undefined;
}

/**
 * Builder for the `close_order` instruction.
 */
export interface CloseOrder {
    /**
     * Program.
     */
    program?: StoreProgram;
    /**
     * Payer.
     */
    payer: StringPubkey;
    /**
     * Order.
     */
    order: StringPubkey;
    /**
     * Reason.
     */
    reason: string;
}

/**
 * Hint for [`CreateOrder`].
 */
export interface CreateOrderHint {
    /**
     * Long token.
     */
    long_token: StringPubkey;
    /**
     * Short token.
     */
    short_token: StringPubkey;
}

/**
 * Builder for the `create_order` instruction.
 */
export interface CreateOrder {
    /**
     * Program.
     */
    program?: StoreProgram;
    /**
     * Payer (a.k.a. owner).
     */
    payer: StringPubkey;
    /**
     * Reciever.
     */
    receiver?: StringPubkey | undefined;
    /**
     * Nonce for the order.
     *
     * Use a random value and do not reuse it. An order address can be created
     * again after closure, and a withheld authorization may still target a
     * replacement order at that address.
     */
    nonce?: NonceBytes | undefined;
    /**
     * Execution fee paid to the keeper in lamports.
     */
    execution_lamports?: number;
    /**
     * Order Kind.
     */
    kind: CreateOrderKind;
    /**
     * Collateral or swap out token.
     */
    collateral_or_swap_out_token: StringPubkey;
    /**
     * Order Parameters.
     */
    params: CreateOrderParams;
    /**
     * Pay token.
     */
    pay_token?: StringPubkey | undefined;
    /**
     * Pay token account.
     */
    pay_token_account?: StringPubkey | undefined;
    /**
     * Receive token.
     */
    receive_token?: StringPubkey | undefined;
    /**
     * Swap path.
     */
    swap_path?: StringPubkey[];
    /**
     * Whether to unwrap the native token when receiving (e.g., convert WSOL to SOL).
     */
    unwrap_native_on_receive?: boolean;
    /**
     * Callback.
     */
    callback?: Callback | undefined;
    /**
     * Whether to skip position account creation.
     */
    skip_position_creation?: boolean;
    /**
     * Whether to force position account creation.
     */
    force_position_creation?: boolean;
}

/**
 * Parameters for creating an order.
 */
export interface CreateOrderParams {
    /**
     * The market token of the market in which the order will be created.
     */
    market_token: StringPubkey;
    /**
     * Whether the order is for a long or short position.
     */
    is_long: boolean;
    /**
     * Delta size in USD.
     */
    size: bigint;
    /**
     * Delta amount of tokens:
     * - For increase / swap orders, it is the amount of pay tokens.
     * - For decrease orders, it is the amount of collateral tokens to withdraw.
     */
    amount?: bigint;
    /**
     * Minimum amount or value of output tokens.
     *
     * - Minimum collateral amount for increase-position orders after swap.
     * - Minimum swap-out amount for swap orders.
     * - Minimum output value for decrease-position orders.
     */
    min_output?: bigint;
    /**
     * Trigger price (in unit price).
     */
    trigger_price?: bigint | undefined;
    /**
     * Acceptable price (in unit price).
     */
    acceptable_price?: bigint | undefined;
    /**
     * Decrease Position Swap Type.
     */
    decrease_position_swap_type?: DecreasePositionSwapType | undefined;
    /**
     * Timestamp from which the order becomes valid.
     */
    valid_from_ts?: number | undefined;
    /**
     * Nonce that pins the order address.
     *
     * When provided the address is deterministic; a follow-on `set_builder_fee`
     * instruction in the same transaction can use it as an account.
     * When absent a random nonce is generated inside the builder.
     *
     * [`CreateOrder::nonce`] takes precedence over this field when both are set.
     */
    nonce?: NonceBytes | undefined;
}

/**
 * Swap type for decreasing position.
 */
export type DecreasePositionSwapType = "NoSwap" | "PnlTokenToCollateralToken" | "CollateralToPnlToken";

/**
 * Create Order Kind.
 */
export type CreateOrderKind = "MarketSwap" | "MarketIncrease" | "MarketDecrease" | "LimitSwap" | "LimitIncrease" | "LimitDecrease" | "StopLossDecrease";

/**
 * A store program.
 */
export interface StoreProgram {
    /**
     * Program ID.
     */
    id: StringPubkey;
    /**
     * Store address.
     */
    store: StringPubkey;
}

/**
 * Pnl Factor Kind.
 */
export type PnlFactorKind = "max_after_deposit" | "max_after_withdrawal" | "max_for_trader" | "for_adl" | "min_after_adl";

export class CreateDepositsBuilder {
  private constructor();
  free(): void;
  build_with_options(transaction_group?: TransactionGroupOptions | null, build?: BuildTransactionOptions | null): TransactionGroup;
}
export class CreateGlvDepositsBuilder {
  private constructor();
  free(): void;
  build_with_options(transaction_group?: TransactionGroupOptions | null, build?: BuildTransactionOptions | null): TransactionGroup;
}
export class CreateGlvWithdrawalsBuilder {
  private constructor();
  free(): void;
  build_with_options(transaction_group?: TransactionGroupOptions | null, build?: BuildTransactionOptions | null): TransactionGroup;
}
/**
 * Builder for create-order ixs.
 */
export class CreateOrdersBuilder {
  private constructor();
  free(): void;
  /**
   * Build transactions.
   */
  build_with_options(transaction_group?: TransactionGroupOptions | null, build?: BuildTransactionOptions | null): TransactionGroup;
  /**
   * Merge with the other [`CreateOrderBuilder`].
   */
  merge(other: CreateOrdersBuilder): void;
}
export class CreateShiftsBuilder {
  private constructor();
  free(): void;
  build_with_options(transaction_group?: TransactionGroupOptions | null, build?: BuildTransactionOptions | null): TransactionGroup;
}
export class CreateWithdrawalsBuilder {
  private constructor();
  free(): void;
  build_with_options(transaction_group?: TransactionGroupOptions | null, build?: BuildTransactionOptions | null): TransactionGroup;
}
/**
 * Simulation output for deposit.
 */
export class DepositSimulationOutput {
  private constructor();
  free(): void;
  /**
   * Returns the deposit report.
   */
  report(): string;
  /**
   * Returns swap reports for the long token path.
   */
  long_swaps(): string[];
  /**
   * Returns swap reports for the short token path.
   */
  short_swaps(): string[];
}
/**
 * A (twisted) ElGamal encryption keypair.
 *
 * The instances of the secret key are zeroized on drop.
 */
export class ElGamalKeypair {
  private constructor();
  free(): void;
  /**
   * Generates the public and secret keys for ElGamal encryption.
   *
   * This function is randomized. It internally samples a scalar element using `OsRng`.
   */
  static new_rand(): ElGamalKeypair;
  pubkey_owned(): ElGamalPubkey;
}
/**
 * Public key for the ElGamal encryption scheme.
 */
export class ElGamalPubkey {
  private constructor();
  free(): void;
}
/**
 * Wrapper of [`Glv`].
 */
export class Glv {
  private constructor();
  free(): void;
  /**
   * Create from base64 encoded account data with options.
   */
  static decode_from_base64_with_options(data: string, no_discriminator?: boolean | null): Glv;
  /**
   * Create from base64 encoded account data with options.
   */
  static decode_with_options(data: Uint8Array, no_discriminator?: boolean | null): Glv;
  /**
   * Convert into [`JsGlvModel`].
   */
  to_model(supply: bigint): GlvModel;
  /**
   * Returns GLV token address.
   */
  glv_token_address(): string;
  /**
   * Returns long token address.
   */
  long_token_address(): string;
  /**
   * Returns short token address.
   */
  short_token_address(): string;
  /**
   * Create a clone of this market.
   */
  clone(): Glv;
}
/**
 * Simulation output for GLV deposit.
 */
export class GlvDepositSimulationOutput {
  private constructor();
  free(): void;
  /**
   * Returns the deposit report.
   */
  deposit_report(): string | undefined;
  /**
   * Returns swap reports for the long token path.
   */
  long_swaps(): string[];
  /**
   * Returns swap reports for the short token path.
   */
  short_swaps(): string[];
  /**
   * Returns the output GLV token amount.
   */
  output_amount(): bigint;
}
/**
 * Wrapper of [`GlvModel`].
 */
export class GlvModel {
  private constructor();
  free(): void;
  /**
   * Returns current supply.
   */
  supply(): bigint;
  /**
   * Returns GLV token address.
   */
  glv_token_address(): string;
  /**
   * Returns long token address.
   */
  long_token_address(): string;
  /**
   * Returns short token address.
   */
  short_token_address(): string;
  /**
   * Create a clone of this market model.
   */
  clone(): GlvModel;
}
/**
 * Simulation output for withdrawal.
 */
export class GlvWithdrawalSimulationOutput {
  private constructor();
  free(): void;
  /**
   * Returns the withdraw report.
   */
  withdraw_report(): string;
  /**
   * Returns swap reports for the long token path.
   */
  long_swaps(): string[];
  /**
   * Returns swap reports for the short token path.
   */
  short_swaps(): string[];
  /**
   * Returns long token output amount.
   */
  long_output_amount(): bigint;
  /**
   * Returns short token output amount.
   */
  short_output_amount(): bigint;
}
/**
 * A hash; the 32-byte output of a hashing algorithm.
 *
 * This struct is used most often in `solana-sdk` and related crates to contain
 * a [SHA-256] hash, but may instead contain a [blake3] hash.
 *
 * [SHA-256]: https://en.wikipedia.org/wiki/SHA-2
 * [blake3]: https://github.com/BLAKE3-team/BLAKE3
 */
export class Hash {
  free(): void;
  /**
   * Create a new Hash object
   *
   * * `value` - optional hash as a base58 encoded string, `Uint8Array`, `[number]`
   */
  constructor(value: any);
  /**
   * Return the base58 string representation of the hash
   */
  toString(): string;
  /**
   * Checks if two `Hash`s are equal
   */
  equals(other: Hash): boolean;
  /**
   * Return the `Uint8Array` representation of the hash
   */
  toBytes(): Uint8Array;
}
/**
 * wasm-bindgen version of the Instruction struct.
 * This duplication is required until https://github.com/rustwasm/wasm-bindgen/issues/3671
 * is fixed. This must not diverge from the regular non-wasm Instruction struct.
 */
export class Instruction {
  private constructor();
  free(): void;
}
export class Instructions {
  free(): void;
  constructor();
  push(instruction: Instruction): void;
}
/**
 * A vanilla Ed25519 key pair
 */
export class Keypair {
  free(): void;
  /**
   * Create a new `Keypair `
   */
  constructor();
  /**
   * Convert a `Keypair` to a `Uint8Array`
   */
  toBytes(): Uint8Array;
  /**
   * Recover a `Keypair` from a `Uint8Array`
   */
  static fromBytes(bytes: Uint8Array): Keypair;
  /**
   * Return the `Pubkey` for this `Keypair`
   */
  pubkey(): Pubkey;
}
/**
 * Wrapper of [`Market`].
 */
export class Market {
  private constructor();
  free(): void;
  /**
   * Create from base64 encoded account data with options.
   */
  static decode_from_base64_with_options(data: string, no_discriminator?: boolean | null): Market;
  /**
   * Create from base64 encoded account data.
   */
  static decode_from_base64(data: string): Market;
  /**
   * Create from account data.
   */
  static decode(data: Uint8Array): Market;
  /**
   * Convert into [`JsMarketModel`]
   */
  to_model(supply: bigint): MarketModel;
  /**
   * Get market token address.
   */
  market_token_address(): string;
  /**
   * Get index token address.
   */
  index_token_address(): string;
  /**
   * Get long token address.
   */
  long_token_address(): string;
  /**
   * Get short token address.
   */
  short_token_address(): string;
  /**
   * Create a clone of this market.
   */
  clone(): Market;
}
/**
 * A JS binding for [`MarketGraph`].
 */
export class MarketGraph {
  free(): void;
  /**
   * Create an empty market graph.
   */
  constructor(config: MarketGraphConfig);
  /**
   * Insert market from base64 encoded data.
   */
  insert_market_from_base64_with_options(data: string, supply: bigint, update_estimation: boolean): boolean;
  /**
   * Insert market from base64 encoded data.
   */
  insert_market_from_base64(data: string, supply: bigint): boolean;
  /**
   * Update token price.
   */
  update_token_price(token: string, price: Value): void;
  /**
   * Update value.
   */
  update_value(value: bigint): void;
  /**
   * Update base cost.
   */
  update_base_cost(base_cost: bigint): void;
  /**
   * Update max steps.
   */
  update_max_steps(max_steps: number): void;
  /**
   * Get market by its market token.
   */
  get_market(market_token: string): MarketModel | undefined;
  /**
   * Get all market tokens.
   */
  market_tokens(): string[];
  /**
   * Get all index tokens.
   */
  index_tokens(): string[];
  /**
   * Compute best swap path.
   */
  best_swap_path(source: string, target: string, skip_bellman_ford: boolean): BestSwapPath;
  /**
   * Simulates order execution.
   */
  simulate_order(args: SimulateOrderArgs, position?: Position | null): OrderSimulationOutput;
  /**
   * Create a simulator.
   */
  to_simulator(options?: CreateGraphSimulatorOptions | null): Simulator;
  /**
   * Update with simulator.
   */
  update_with_simulator(simulator: Simulator, options?: UpdateGraphWithSimulatorOptions | null): void;
  /**
   * Insert virtual inventory from base64 encoded data.
   */
  insert_vi_from_base64(vi_address: string, data: string, update_estimation: boolean): string | undefined;
  /**
   * Check if virtual inventory exists.
   */
  has_vi(vi_address: string): boolean;
  /**
   * Remove virtual inventory.
   */
  remove_vi(vi_address: string): string | undefined;
  /**
   * Get all virtual inventory addresses.
   */
  vi_addresses(): string[];
  /**
   * Insert virtual inventory for a market by market token.
   */
  insert_vi_for_market(market_token: string, vi_data: string, update_estimation: boolean): void;
  /**
   * Create a clone of this graph.
   */
  clone(): MarketGraph;
}
/**
 * Wrapper of [`MarketModel`].
 */
export class MarketModel {
  private constructor();
  free(): void;
  /**
   * Get market token price.
   */
  market_token_price(params: MarketTokenPriceParams): bigint;
  /**
   * Calculates max sellable value.
   */
  max_sellable_value(params: MaxSellableValueParams): bigint;
  /**
   * Get market status.
   */
  status(params: MarketStatusParams): MarketStatus;
  /**
   * Returns current supply.
   */
  supply(): bigint;
  /**
   * Create an empty position model.
   */
  create_empty_position(args: CreateEmptyPositionArgs): PositionModel;
  /**
   * Create a clone of this market model.
   */
  clone(): MarketModel;
  /**
   * Set order fee discount factor.
   */
  setOrderFeeDiscountFactor(factor: bigint): void;
}
/**
 * wasm-bindgen version of the Message struct.
 * This duplication is required until https://github.com/rustwasm/wasm-bindgen/issues/3671
 * is fixed. This must not diverge from the regular non-wasm Message struct.
 */
export class Message {
  private constructor();
  free(): void;
  /**
   * The id of a recent ledger entry.
   */
  recent_blockhash: Hash;
}
/**
 * A JS binding for [`OrderSimulationOutput`].
 */
export class OrderSimulationOutput {
  private constructor();
  free(): void;
  /**
   * Returns increase order simulation output.
   */
  increase(skip_position?: boolean | null): IncreaseOrderSimulationOutput | undefined;
  /**
   * Returns decrease order simulation output.
   */
  decrease(skip_position?: boolean | null): DecreaseOrderSimulationOutput | undefined;
  /**
   * Returns swap order simulation output.
   */
  swap(): SwapOrderSimulationOutput | undefined;
  /**
   * Returns the result position model.
   */
  position_model(): PositionModel | undefined;
}
/**
 * The `ElGamalPubkey` type as a `Pod`.
 */
export class PodElGamalPubkey {
  free(): void;
  /**
   * Create a new `PodElGamalPubkey` object
   *
   * * `value` - optional public key as a base64 encoded string, `Uint8Array`, `[number]`
   */
  constructor(value: any);
  /**
   * Return the base64 string representation of the public key
   */
  toString(): string;
  /**
   * Checks if two `ElGamalPubkey`s are equal
   */
  equals(other: PodElGamalPubkey): boolean;
  /**
   * Return the `Uint8Array` representation of the public key
   */
  toBytes(): Uint8Array;
  static compressed(decoded: ElGamalPubkey): PodElGamalPubkey;
  decompressed(): ElGamalPubkey;
}
/**
 * JS version of [`Position`].
 */
export class Position {
  private constructor();
  free(): void;
  /**
   * Create from base64 encoded account data with options.
   */
  static decode_from_base64_with_options(data: string, no_discriminator?: boolean | null): Position;
  /**
   * Create from base64 encoded account data.
   */
  static decode_from_base64(data: string): Position;
  /**
   * Create from account data.
   */
  static decode(data: Uint8Array): Position;
  /**
   * Convert to a [`JsPositionModel`].
   */
  to_model(market: MarketModel): PositionModel;
  /**
   * Create a clone of this position.
   */
  clone(): Position;
}
/**
 * JS version of [`PositionModel`].
 */
export class PositionModel {
  private constructor();
  free(): void;
  /**
   * Get position status.
   */
  status(prices: Prices): PositionStatus;
  /**
   * Get position status with options.
   */
  status_with_options(prices: Prices, include_virtual_inventory_impact?: boolean | null): PositionStatus;
  /**
   * Get position size.
   */
  size(): bigint;
  /**
   * Get position size in tokens.
   */
  size_in_tokens(): bigint;
  /**
   * Get collateral amount.
   */
  collateral_amount(): bigint;
  /**
   * Returns the inner [`JsPosition`].
   */
  position(): Position;
  /**
   * Update with trade event.
   */
  update_with_trade_event(event: TradeEvent, force_update?: boolean | null): boolean;
  /**
   * Create a clone of this position model.
   */
  clone(): PositionModel;
}
/**
 * The address of a [Solana account][acc].
 *
 * Some account addresses are [ed25519] public keys, with corresponding secret
 * keys that are managed off-chain. Often, though, account addresses do not
 * have corresponding secret keys &mdash; as with [_program derived
 * addresses_][pdas] &mdash; or the secret key is not relevant to the operation
 * of a program, and may have even been disposed of. As running Solana programs
 * can not safely create or manage secret keys, the full [`Keypair`] is not
 * defined in `solana-program` but in `solana-sdk`.
 *
 * [acc]: https://solana.com/docs/core/accounts
 * [ed25519]: https://ed25519.cr.yp.to/
 * [pdas]: https://solana.com/docs/core/cpi#program-derived-addresses
 * [`Keypair`]: https://docs.rs/solana-sdk/latest/solana_sdk/signer/keypair/struct.Keypair.html
 */
export class Pubkey {
  free(): void;
  /**
   * Create a new Pubkey object
   *
   * * `value` - optional public key as a base58 encoded string, `Uint8Array`, `[number]`
   */
  constructor(value: any);
  /**
   * Return the base58 string representation of the public key
   */
  toString(): string;
  /**
   * Check if a `Pubkey` is on the ed25519 curve.
   */
  isOnCurve(): boolean;
  /**
   * Checks if two `Pubkey`s are equal
   */
  equals(other: Pubkey): boolean;
  /**
   * Return the `Uint8Array` representation of the public key
   */
  toBytes(): Uint8Array;
  /**
   * Derive a Pubkey from another Pubkey, string seed, and a program id
   */
  static createWithSeed(base: Pubkey, seed: string, owner: Pubkey): Pubkey;
  /**
   * Derive a program address from seeds and a program id
   */
  static createProgramAddress(seeds: any[], program_id: Pubkey): Pubkey;
  /**
   * Find a valid program address
   *
   * Returns:
   * * `[PubKey, number]` - the program address and bump seed
   */
  static findProgramAddress(seeds: any[], program_id: Pubkey): any;
}
/**
 * Simulation output for shift.
 */
export class ShiftSimulationOutput {
  private constructor();
  free(): void;
  /**
   * Returns the deposit report.
   */
  deposit_report(): string;
  /**
   * Returns the withdraw report.
   */
  withdraw_report(): string;
}
/**
 * A JS binding for [`Simulator`].
 */
export class Simulator {
  private constructor();
  free(): void;
  /**
   * Get market by its market token.
   */
  get_market(market_token: string): MarketModel | undefined;
  /**
   * Get price for the given token.
   */
  get_price(token: string): Value | undefined;
  /**
   * Get GLV by its GLV token.
   */
  get_glv(glv_token: string): GlvModel | undefined;
  /**
   * Upsert the prices for the given token.
   */
  insert_price(token: string, price: Value): void;
  /**
   * Upsert a GLV model.
   */
  insert_glv(glv: GlvModel): void;
  /**
   * Insert a virtual inventory model.
   */
  insert_vi(vi_address: string, vi: VirtualInventoryModel): void;
  /**
   * Get virtual inventory model by address.
   */
  get_vi(vi_address: string): VirtualInventoryModel | undefined;
  /**
   * Set whether to disable virtual inventories for simulations.
   */
  set_disable_vis(disable: boolean): void;
  /**
   * Get whether virtual inventories are disabled.
   */
  disable_vis(): boolean;
  /**
   * Simulate an order execution.
   */
  simulate_order(args: SimulateOrderArgs, position?: Position | null): OrderSimulationOutput;
  /**
   * Simulate a deposit execution.
   */
  simulate_deposit(args: SimulateDepositArgs): DepositSimulationOutput;
  /**
   * Simulate a withdrawal execution.
   */
  simulate_withdrawal(args: SimulateWithdrawalArgs): WithdrawalSimulationOutput;
  /**
   * Simulate a shift execution.
   */
  simulate_shift(args: SimulateShiftArgs): ShiftSimulationOutput;
  /**
   * Simulate a GLV deposit execution.
   */
  simulate_glv_deposit(args: SimulateGlvDepositArgs): GlvDepositSimulationOutput;
  /**
   * Simulate a GLV withdrawal execution.
   */
  simulate_glv_withdrawal(args: SimulateGlvWithdrawalArgs): GlvWithdrawalSimulationOutput;
  /**
   * Create a clone of this simulator.
   */
  clone(): Simulator;
  /**
   * Calculates GLV status.
   */
  get_glv_status(args: GetGlvStatusArgs): GlvStatus;
  /**
   * Calculates GLV token value.
   */
  get_glv_token_value(args: GetGlvTokenValueArgs): bigint;
}
/**
 * JS version of [`TradeEvent`].
 */
export class TradeEvent {
  private constructor();
  free(): void;
  /**
   * Create from base64 encoded event data with options.
   */
  static decode_from_base64_with_options(data: string, no_discriminator?: boolean | null): TradeEvent;
  /**
   * Create from base64 encoded event data.
   */
  static decode_from_base64(data: string): TradeEvent;
  /**
   * Create from event data.
   */
  static decode_with_options(data: Uint8Array, no_discriminator?: boolean | null): TradeEvent;
  /**
   * Convert into a position model.
   */
  to_position_model(market: MarketModel): PositionModel;
}
/**
 * wasm-bindgen version of the Transaction struct.
 * This duplication is required until https://github.com/rustwasm/wasm-bindgen/issues/3671
 * is fixed. This must not diverge from the regular non-wasm Transaction struct.
 */
export class Transaction {
  free(): void;
  /**
   * Create a new `Transaction`
   */
  constructor(instructions: Instructions, payer?: Pubkey | null);
  /**
   * Return a message containing all data that should be signed.
   */
  message(): Message;
  /**
   * Return the serialized message data to sign.
   */
  messageData(): Uint8Array;
  /**
   * Verify the transaction
   */
  verify(): void;
  partialSign(keypair: Keypair, recent_blockhash: Hash): void;
  isSigned(): boolean;
  toBytes(): Uint8Array;
  static fromBytes(bytes: Uint8Array): Transaction;
}
/**
 * A JS binding for compiled transaction group.
 */
export class TransactionGroup {
  private constructor();
  free(): void;
  /**
   * Returns serialized transaciton group.
   */
  serialize(): SerializedTransactionGroup;
}
/**
 * JS binding wrapper for [`UserHeader`]
 */
export class User {
  private constructor();
  free(): void;
  /**
   * Create from base64 encoded account data.
   */
  static decode_from_base64(data: string): User;
  /**
   * Get the owner address.
   */
  owner_address(): string;
  /**
   * Get the store address.
   */
  store_address(): string;
  /**
   * Get the referral code address.
   */
  referral_code_address(): string | undefined;
  /**
   * Get the referrer address.
   */
  referrer_address(): string | undefined;
  /**
   * Get the GT rank.
   */
  gt_rank(): number;
  /**
   * Get GT last minted at.
   */
  gt_last_minted_at(): bigint;
  /**
   * Get total minted GT amount.
   */
  gt_total_minted(): bigint;
  /**
   * Get GT amount.
   */
  gt_amount(): bigint;
  /**
   * Get paid fee value of GT.
   */
  gt_paid_fee_value(): bigint;
  /**
   * Get minted fee value of GT.
   */
  gt_minted_fee_value(): bigint;
}
/**
 * Wrapper of [`VirtualInventory`].
 */
export class VirtualInventory {
  private constructor();
  free(): void;
  /**
   * Create from base64 encoded account data with options.
   */
  static decode_from_base64_with_options(data: string, no_discriminator?: boolean | null): VirtualInventory;
  /**
   * Create from base64 encoded account data.
   */
  static decode_from_base64(data: string): VirtualInventory;
  /**
   * Create from account data.
   */
  static decode(data: Uint8Array): VirtualInventory;
  /**
   * Convert into [`JsVirtualInventoryModel`].
   */
  to_model(): VirtualInventoryModel;
  /**
   * Create a clone of this virtual inventory.
   */
  clone(): VirtualInventory;
}
/**
 * Wrapper of [`VirtualInventoryModel`].
 */
export class VirtualInventoryModel {
  private constructor();
  free(): void;
  /**
   * Create a clone of this virtual inventory model.
   */
  clone(): VirtualInventoryModel;
}
/**
 * Simulation output for withdrawal.
 */
export class WithdrawalSimulationOutput {
  private constructor();
  free(): void;
  /**
   * Returns the withdraw report.
   */
  report(): string;
  /**
   * Returns swap reports for the long token path.
   */
  long_swaps(): string[];
  /**
   * Returns swap reports for the short token path.
   */
  short_swaps(): string[];
  /**
   * Returns long token output amount.
   */
  long_output_amount(): bigint;
  /**
   * Returns short token output amount.
   */
  short_output_amount(): bigint;
}
