let wasm;
export function __wbg_set_wasm(val) {
    wasm = val;
}


let WASM_VECTOR_LEN = 0;

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

const lTextEncoder = typeof TextEncoder === 'undefined' ? (0, module.require)('util').TextEncoder : TextEncoder;

let cachedTextEncoder = new lTextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedDataViewMemory0 = null;

function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_export_4.set(idx, obj);
    return idx;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

const lTextDecoder = typeof TextDecoder === 'undefined' ? (0, module.require)('util').TextDecoder : TextDecoder;

let cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}
/**
 * Get default [`StoreProgram`].
 * @returns {StoreProgram}
 */
export function default_store_program() {
    const ret = wasm.default_store_program();
    return ret;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_export_4.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_export_4.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    for (let i = 0; i < array.length; i++) {
        const add = addToExternrefTable0(array[i]);
        getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}
/**
 * Create transaction builder for create-order ixs.
 * @param {CreateOrderKind} kind
 * @param {CreateOrderParams[]} orders
 * @param {CreateOrderOptions} options
 * @returns {CreateOrdersBuilder}
 */
export function create_orders_builder(kind, orders, options) {
    const ptr0 = passArrayJsValueToWasm0(orders, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.create_orders_builder(kind, ptr0, len0, options);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return CreateOrdersBuilder.__wrap(ret[0]);
}

/**
 * Build transactions for creating orders.
 * @param {CreateOrderKind} kind
 * @param {CreateOrderParams[]} orders
 * @param {CreateOrderOptions} options
 * @returns {TransactionGroup}
 */
export function create_orders(kind, orders, options) {
    const ptr0 = passArrayJsValueToWasm0(orders, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.create_orders(kind, ptr0, len0, options);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return TransactionGroup.__wrap(ret[0]);
}

/**
 * Build transactions for closing orders.
 * @param {CloseOrderArgs} args
 * @returns {TransactionGroup}
 */
export function close_orders(args) {
    const ret = wasm.close_orders(args);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return TransactionGroup.__wrap(ret[0]);
}

/**
 * Build transactions for updating orders.
 * @param {UpdateOrderArgs} args
 * @returns {TransactionGroup}
 */
export function update_orders(args) {
    const ret = wasm.update_orders(args);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return TransactionGroup.__wrap(ret[0]);
}

/**
 * @param {CreateDepositParamsJs[]} deposits
 * @param {CreateDepositOptions} options
 * @returns {CreateDepositsBuilder}
 */
export function create_deposits_builder(deposits, options) {
    const ptr0 = passArrayJsValueToWasm0(deposits, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.create_deposits_builder(ptr0, len0, options);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return CreateDepositsBuilder.__wrap(ret[0]);
}

/**
 * @param {CreateDepositParamsJs[]} deposits
 * @param {CreateDepositOptions} options
 * @returns {TransactionGroup}
 */
export function create_deposits(deposits, options) {
    const ptr0 = passArrayJsValueToWasm0(deposits, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.create_deposits(ptr0, len0, options);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return TransactionGroup.__wrap(ret[0]);
}

/**
 * @param {CreateWithdrawalParamsJs[]} withdrawals
 * @param {CreateWithdrawalOptions} options
 * @returns {CreateWithdrawalsBuilder}
 */
export function create_withdrawals_builder(withdrawals, options) {
    const ptr0 = passArrayJsValueToWasm0(withdrawals, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.create_withdrawals_builder(ptr0, len0, options);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return CreateWithdrawalsBuilder.__wrap(ret[0]);
}

/**
 * @param {CreateWithdrawalParamsJs[]} withdrawals
 * @param {CreateWithdrawalOptions} options
 * @returns {TransactionGroup}
 */
export function create_withdrawals(withdrawals, options) {
    const ptr0 = passArrayJsValueToWasm0(withdrawals, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.create_withdrawals(ptr0, len0, options);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return TransactionGroup.__wrap(ret[0]);
}

/**
 * @param {CreateShiftParamsJs[]} shifts
 * @param {CreateShiftOptions} options
 * @returns {CreateShiftsBuilder}
 */
export function create_shifts_builder(shifts, options) {
    const ptr0 = passArrayJsValueToWasm0(shifts, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.create_shifts_builder(ptr0, len0, options);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return CreateShiftsBuilder.__wrap(ret[0]);
}

/**
 * @param {CreateShiftParamsJs[]} shifts
 * @param {CreateShiftOptions} options
 * @returns {TransactionGroup}
 */
export function create_shifts(shifts, options) {
    const ptr0 = passArrayJsValueToWasm0(shifts, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.create_shifts(ptr0, len0, options);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return TransactionGroup.__wrap(ret[0]);
}

/**
 * @param {CreateGlvDepositParamsJs[]} deposits
 * @param {CreateGlvDepositOptions} options
 * @returns {CreateGlvDepositsBuilder}
 */
export function create_glv_deposits_builder(deposits, options) {
    const ptr0 = passArrayJsValueToWasm0(deposits, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.create_glv_deposits_builder(ptr0, len0, options);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return CreateGlvDepositsBuilder.__wrap(ret[0]);
}

/**
 * @param {CreateGlvDepositParamsJs[]} deposits
 * @param {CreateGlvDepositOptions} options
 * @returns {TransactionGroup}
 */
export function create_glv_deposits(deposits, options) {
    const ptr0 = passArrayJsValueToWasm0(deposits, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.create_glv_deposits(ptr0, len0, options);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return TransactionGroup.__wrap(ret[0]);
}

/**
 * @param {CreateGlvWithdrawalParamsJs[]} withdrawals
 * @param {CreateGlvWithdrawalOptions} options
 * @returns {CreateGlvWithdrawalsBuilder}
 */
export function create_glv_withdrawals_builder(withdrawals, options) {
    const ptr0 = passArrayJsValueToWasm0(withdrawals, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.create_glv_withdrawals_builder(ptr0, len0, options);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return CreateGlvWithdrawalsBuilder.__wrap(ret[0]);
}

/**
 * @param {CreateGlvWithdrawalParamsJs[]} withdrawals
 * @param {CreateGlvWithdrawalOptions} options
 * @returns {TransactionGroup}
 */
export function create_glv_withdrawals(withdrawals, options) {
    const ptr0 = passArrayJsValueToWasm0(withdrawals, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.create_glv_withdrawals(ptr0, len0, options);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return TransactionGroup.__wrap(ret[0]);
}

/**
 * Build transactions for settling builder fees on one or more orders.
 * @param {SettleBuilderFeeArgs} args
 * @returns {TransactionGroup}
 */
export function settle_builder_fee(args) {
    const ret = wasm.settle_builder_fee(args);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return TransactionGroup.__wrap(ret[0]);
}

/**
 * Build a transaction for claiming accumulated builder fees for one token mint.
 * @param {ClaimBuilderFeesArgs} args
 * @returns {TransactionGroup}
 */
export function claim_builder_fees(args) {
    const ret = wasm.claim_builder_fees(args);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return TransactionGroup.__wrap(ret[0]);
}

/**
 * Build a transaction for setting the builder fee factor on the caller's User Account.
 * @param {SetBuilderFeeFactorArgs} args
 * @returns {TransactionGroup}
 */
export function set_builder_fee_factor(args) {
    const ret = wasm.set_builder_fee_factor(args);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return TransactionGroup.__wrap(ret[0]);
}

/**
 * Apply `factor` to the `value`.
 * @param {bigint} value
 * @param {bigint} factor
 * @returns {bigint | undefined}
 */
export function apply_factor(value, factor) {
    const ret = wasm.apply_factor(value, value >> BigInt(64), factor, factor >> BigInt(64));
    return ret[0] === 0 ? undefined : (BigInt.asUintN(64, ret[1]) | (BigInt.asUintN(64, ret[2]) << BigInt(64)));
}

/**
 * Initialize Javascript logging and panic handler
 */
export function solana_program_init() {
    wasm.solana_program_init();
}

const CreateDepositsBuilderFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_createdepositsbuilder_free(ptr >>> 0, 1));

export class CreateDepositsBuilder {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(CreateDepositsBuilder.prototype);
        obj.__wbg_ptr = ptr;
        CreateDepositsBuilderFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CreateDepositsBuilderFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_createdepositsbuilder_free(ptr, 0);
    }
    /**
     * @param {TransactionGroupOptions | null} [transaction_group]
     * @param {BuildTransactionOptions | null} [build]
     * @returns {TransactionGroup}
     */
    build_with_options(transaction_group, build) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.createdepositsbuilder_build_with_options(ptr, isLikeNone(transaction_group) ? 0 : addToExternrefTable0(transaction_group), isLikeNone(build) ? 0 : addToExternrefTable0(build));
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TransactionGroup.__wrap(ret[0]);
    }
}

const CreateGlvDepositsBuilderFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_createglvdepositsbuilder_free(ptr >>> 0, 1));

export class CreateGlvDepositsBuilder {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(CreateGlvDepositsBuilder.prototype);
        obj.__wbg_ptr = ptr;
        CreateGlvDepositsBuilderFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CreateGlvDepositsBuilderFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_createglvdepositsbuilder_free(ptr, 0);
    }
    /**
     * @param {TransactionGroupOptions | null} [transaction_group]
     * @param {BuildTransactionOptions | null} [build]
     * @returns {TransactionGroup}
     */
    build_with_options(transaction_group, build) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.createglvdepositsbuilder_build_with_options(ptr, isLikeNone(transaction_group) ? 0 : addToExternrefTable0(transaction_group), isLikeNone(build) ? 0 : addToExternrefTable0(build));
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TransactionGroup.__wrap(ret[0]);
    }
}

const CreateGlvWithdrawalsBuilderFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_createglvwithdrawalsbuilder_free(ptr >>> 0, 1));

export class CreateGlvWithdrawalsBuilder {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(CreateGlvWithdrawalsBuilder.prototype);
        obj.__wbg_ptr = ptr;
        CreateGlvWithdrawalsBuilderFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CreateGlvWithdrawalsBuilderFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_createglvwithdrawalsbuilder_free(ptr, 0);
    }
    /**
     * @param {TransactionGroupOptions | null} [transaction_group]
     * @param {BuildTransactionOptions | null} [build]
     * @returns {TransactionGroup}
     */
    build_with_options(transaction_group, build) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.createglvwithdrawalsbuilder_build_with_options(ptr, isLikeNone(transaction_group) ? 0 : addToExternrefTable0(transaction_group), isLikeNone(build) ? 0 : addToExternrefTable0(build));
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TransactionGroup.__wrap(ret[0]);
    }
}

const CreateOrdersBuilderFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_createordersbuilder_free(ptr >>> 0, 1));
/**
 * Builder for create-order ixs.
 */
export class CreateOrdersBuilder {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(CreateOrdersBuilder.prototype);
        obj.__wbg_ptr = ptr;
        CreateOrdersBuilderFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CreateOrdersBuilderFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_createordersbuilder_free(ptr, 0);
    }
    /**
     * Build transactions.
     * @param {TransactionGroupOptions | null} [transaction_group]
     * @param {BuildTransactionOptions | null} [build]
     * @returns {TransactionGroup}
     */
    build_with_options(transaction_group, build) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.createordersbuilder_build_with_options(ptr, isLikeNone(transaction_group) ? 0 : addToExternrefTable0(transaction_group), isLikeNone(build) ? 0 : addToExternrefTable0(build));
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TransactionGroup.__wrap(ret[0]);
    }
    /**
     * Merge with the other [`CreateOrderBuilder`].
     * @param {CreateOrdersBuilder} other
     */
    merge(other) {
        _assertClass(other, CreateOrdersBuilder);
        const ret = wasm.createordersbuilder_merge(this.__wbg_ptr, other.__wbg_ptr);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
}

const CreateShiftsBuilderFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_createshiftsbuilder_free(ptr >>> 0, 1));

export class CreateShiftsBuilder {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(CreateShiftsBuilder.prototype);
        obj.__wbg_ptr = ptr;
        CreateShiftsBuilderFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CreateShiftsBuilderFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_createshiftsbuilder_free(ptr, 0);
    }
    /**
     * @param {TransactionGroupOptions | null} [transaction_group]
     * @param {BuildTransactionOptions | null} [build]
     * @returns {TransactionGroup}
     */
    build_with_options(transaction_group, build) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.createshiftsbuilder_build_with_options(ptr, isLikeNone(transaction_group) ? 0 : addToExternrefTable0(transaction_group), isLikeNone(build) ? 0 : addToExternrefTable0(build));
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TransactionGroup.__wrap(ret[0]);
    }
}

const CreateWithdrawalsBuilderFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_createwithdrawalsbuilder_free(ptr >>> 0, 1));

export class CreateWithdrawalsBuilder {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(CreateWithdrawalsBuilder.prototype);
        obj.__wbg_ptr = ptr;
        CreateWithdrawalsBuilderFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CreateWithdrawalsBuilderFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_createwithdrawalsbuilder_free(ptr, 0);
    }
    /**
     * @param {TransactionGroupOptions | null} [transaction_group]
     * @param {BuildTransactionOptions | null} [build]
     * @returns {TransactionGroup}
     */
    build_with_options(transaction_group, build) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.createwithdrawalsbuilder_build_with_options(ptr, isLikeNone(transaction_group) ? 0 : addToExternrefTable0(transaction_group), isLikeNone(build) ? 0 : addToExternrefTable0(build));
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TransactionGroup.__wrap(ret[0]);
    }
}

const DepositSimulationOutputFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_depositsimulationoutput_free(ptr >>> 0, 1));
/**
 * Simulation output for deposit.
 */
export class DepositSimulationOutput {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(DepositSimulationOutput.prototype);
        obj.__wbg_ptr = ptr;
        DepositSimulationOutputFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DepositSimulationOutputFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_depositsimulationoutput_free(ptr, 0);
    }
    /**
     * Returns the deposit report.
     * @returns {string}
     */
    report() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.depositsimulationoutput_report(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * Returns swap reports for the long token path.
     * @returns {string[]}
     */
    long_swaps() {
        const ret = wasm.depositsimulationoutput_long_swaps(this.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Returns swap reports for the short token path.
     * @returns {string[]}
     */
    short_swaps() {
        const ret = wasm.depositsimulationoutput_short_swaps(this.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
}

const ElGamalKeypairFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_elgamalkeypair_free(ptr >>> 0, 1));
/**
 * A (twisted) ElGamal encryption keypair.
 *
 * The instances of the secret key are zeroized on drop.
 */
export class ElGamalKeypair {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ElGamalKeypair.prototype);
        obj.__wbg_ptr = ptr;
        ElGamalKeypairFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ElGamalKeypairFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_elgamalkeypair_free(ptr, 0);
    }
    /**
     * Generates the public and secret keys for ElGamal encryption.
     *
     * This function is randomized. It internally samples a scalar element using `OsRng`.
     * @returns {ElGamalKeypair}
     */
    static new_rand() {
        const ret = wasm.elgamalkeypair_new_rand();
        return ElGamalKeypair.__wrap(ret);
    }
    /**
     * @returns {ElGamalPubkey}
     */
    pubkey_owned() {
        const ret = wasm.elgamalkeypair_pubkey_owned(this.__wbg_ptr);
        return ElGamalPubkey.__wrap(ret);
    }
}

const ElGamalPubkeyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_elgamalpubkey_free(ptr >>> 0, 1));
/**
 * Public key for the ElGamal encryption scheme.
 */
export class ElGamalPubkey {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ElGamalPubkey.prototype);
        obj.__wbg_ptr = ptr;
        ElGamalPubkeyFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ElGamalPubkeyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_elgamalpubkey_free(ptr, 0);
    }
}

const GlvFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_glv_free(ptr >>> 0, 1));
/**
 * Wrapper of [`Glv`].
 */
export class Glv {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Glv.prototype);
        obj.__wbg_ptr = ptr;
        GlvFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GlvFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_glv_free(ptr, 0);
    }
    /**
     * Create from base64 encoded account data with options.
     * @param {string} data
     * @param {boolean | null} [no_discriminator]
     * @returns {Glv}
     */
    static decode_from_base64_with_options(data, no_discriminator) {
        const ptr0 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.glv_decode_from_base64_with_options(ptr0, len0, isLikeNone(no_discriminator) ? 0xFFFFFF : no_discriminator ? 1 : 0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return Glv.__wrap(ret[0]);
    }
    /**
     * Create from base64 encoded account data with options.
     * @param {Uint8Array} data
     * @param {boolean | null} [no_discriminator]
     * @returns {Glv}
     */
    static decode_with_options(data, no_discriminator) {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.glv_decode_with_options(ptr0, len0, isLikeNone(no_discriminator) ? 0xFFFFFF : no_discriminator ? 1 : 0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return Glv.__wrap(ret[0]);
    }
    /**
     * Convert into [`JsGlvModel`].
     * @param {bigint} supply
     * @returns {GlvModel}
     */
    to_model(supply) {
        const ret = wasm.glv_to_model(this.__wbg_ptr, supply, supply >> BigInt(64));
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return GlvModel.__wrap(ret[0]);
    }
    /**
     * Returns GLV token address.
     * @returns {string}
     */
    glv_token_address() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.glv_glv_token_address(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Returns long token address.
     * @returns {string}
     */
    long_token_address() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.glv_long_token_address(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Returns short token address.
     * @returns {string}
     */
    short_token_address() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.glv_short_token_address(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Create a clone of this market.
     * @returns {Glv}
     */
    clone() {
        const ret = wasm.glv_clone(this.__wbg_ptr);
        return Glv.__wrap(ret);
    }
}

const GlvDepositSimulationOutputFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_glvdepositsimulationoutput_free(ptr >>> 0, 1));
/**
 * Simulation output for GLV deposit.
 */
export class GlvDepositSimulationOutput {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(GlvDepositSimulationOutput.prototype);
        obj.__wbg_ptr = ptr;
        GlvDepositSimulationOutputFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GlvDepositSimulationOutputFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_glvdepositsimulationoutput_free(ptr, 0);
    }
    /**
     * Returns the deposit report.
     * @returns {string | undefined}
     */
    deposit_report() {
        const ret = wasm.glvdepositsimulationoutput_deposit_report(this.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * Returns swap reports for the long token path.
     * @returns {string[]}
     */
    long_swaps() {
        const ret = wasm.glvdepositsimulationoutput_long_swaps(this.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Returns swap reports for the short token path.
     * @returns {string[]}
     */
    short_swaps() {
        const ret = wasm.glvdepositsimulationoutput_short_swaps(this.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Returns the output GLV token amount.
     * @returns {bigint}
     */
    output_amount() {
        const ret = wasm.glvdepositsimulationoutput_output_amount(this.__wbg_ptr);
        return (BigInt.asUintN(64, ret[0]) | (BigInt.asUintN(64, ret[1]) << BigInt(64)));
    }
}

const GlvModelFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_glvmodel_free(ptr >>> 0, 1));
/**
 * Wrapper of [`GlvModel`].
 */
export class GlvModel {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(GlvModel.prototype);
        obj.__wbg_ptr = ptr;
        GlvModelFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GlvModelFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_glvmodel_free(ptr, 0);
    }
    /**
     * Returns current supply.
     * @returns {bigint}
     */
    supply() {
        const ret = wasm.glvmodel_supply(this.__wbg_ptr);
        return (BigInt.asUintN(64, ret[0]) | (BigInt.asUintN(64, ret[1]) << BigInt(64)));
    }
    /**
     * Returns GLV token address.
     * @returns {string}
     */
    glv_token_address() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.glvmodel_glv_token_address(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Returns long token address.
     * @returns {string}
     */
    long_token_address() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.glvmodel_long_token_address(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Returns short token address.
     * @returns {string}
     */
    short_token_address() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.glvmodel_short_token_address(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Create a clone of this market model.
     * @returns {GlvModel}
     */
    clone() {
        const ret = wasm.glvmodel_clone(this.__wbg_ptr);
        return GlvModel.__wrap(ret);
    }
}

const GlvWithdrawalSimulationOutputFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_glvwithdrawalsimulationoutput_free(ptr >>> 0, 1));
/**
 * Simulation output for withdrawal.
 */
export class GlvWithdrawalSimulationOutput {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(GlvWithdrawalSimulationOutput.prototype);
        obj.__wbg_ptr = ptr;
        GlvWithdrawalSimulationOutputFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GlvWithdrawalSimulationOutputFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_glvwithdrawalsimulationoutput_free(ptr, 0);
    }
    /**
     * Returns the withdraw report.
     * @returns {string}
     */
    withdraw_report() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.glvwithdrawalsimulationoutput_withdraw_report(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * Returns swap reports for the long token path.
     * @returns {string[]}
     */
    long_swaps() {
        const ret = wasm.glvwithdrawalsimulationoutput_long_swaps(this.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Returns swap reports for the short token path.
     * @returns {string[]}
     */
    short_swaps() {
        const ret = wasm.glvwithdrawalsimulationoutput_short_swaps(this.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Returns long token output amount.
     * @returns {bigint}
     */
    long_output_amount() {
        const ret = wasm.glvwithdrawalsimulationoutput_long_output_amount(this.__wbg_ptr);
        return (BigInt.asUintN(64, ret[0]) | (BigInt.asUintN(64, ret[1]) << BigInt(64)));
    }
    /**
     * Returns short token output amount.
     * @returns {bigint}
     */
    short_output_amount() {
        const ret = wasm.glvwithdrawalsimulationoutput_short_output_amount(this.__wbg_ptr);
        return (BigInt.asUintN(64, ret[0]) | (BigInt.asUintN(64, ret[1]) << BigInt(64)));
    }
}

const HashFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_hash_free(ptr >>> 0, 1));
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

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Hash.prototype);
        obj.__wbg_ptr = ptr;
        HashFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        HashFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_hash_free(ptr, 0);
    }
    /**
     * Create a new Hash object
     *
     * * `value` - optional hash as a base58 encoded string, `Uint8Array`, `[number]`
     * @param {any} value
     */
    constructor(value) {
        const ret = wasm.hash_constructor(value);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        HashFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Return the base58 string representation of the hash
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.hash_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Checks if two `Hash`s are equal
     * @param {Hash} other
     * @returns {boolean}
     */
    equals(other) {
        _assertClass(other, Hash);
        const ret = wasm.hash_equals(this.__wbg_ptr, other.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Return the `Uint8Array` representation of the hash
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.hash_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}

const InstructionFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_instruction_free(ptr >>> 0, 1));
/**
 * wasm-bindgen version of the Instruction struct.
 * This duplication is required until https://github.com/rustwasm/wasm-bindgen/issues/3671
 * is fixed. This must not diverge from the regular non-wasm Instruction struct.
 */
export class Instruction {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Instruction.prototype);
        obj.__wbg_ptr = ptr;
        InstructionFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        InstructionFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_instruction_free(ptr, 0);
    }
}

const InstructionsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_instructions_free(ptr >>> 0, 1));

export class Instructions {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        InstructionsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_instructions_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.instructions_constructor();
        this.__wbg_ptr = ret >>> 0;
        InstructionsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {Instruction} instruction
     */
    push(instruction) {
        _assertClass(instruction, Instruction);
        var ptr0 = instruction.__destroy_into_raw();
        wasm.instructions_push(this.__wbg_ptr, ptr0);
    }
}

const KeypairFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_keypair_free(ptr >>> 0, 1));
/**
 * A vanilla Ed25519 key pair
 */
export class Keypair {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Keypair.prototype);
        obj.__wbg_ptr = ptr;
        KeypairFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        KeypairFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_keypair_free(ptr, 0);
    }
    /**
     * Create a new `Keypair `
     */
    constructor() {
        const ret = wasm.keypair_constructor();
        this.__wbg_ptr = ret >>> 0;
        KeypairFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Convert a `Keypair` to a `Uint8Array`
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.keypair_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Recover a `Keypair` from a `Uint8Array`
     * @param {Uint8Array} bytes
     * @returns {Keypair}
     */
    static fromBytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.keypair_fromBytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return Keypair.__wrap(ret[0]);
    }
    /**
     * Return the `Pubkey` for this `Keypair`
     * @returns {Pubkey}
     */
    pubkey() {
        const ret = wasm.keypair_pubkey(this.__wbg_ptr);
        return Pubkey.__wrap(ret);
    }
}

const MarketFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_market_free(ptr >>> 0, 1));
/**
 * Wrapper of [`Market`].
 */
export class Market {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Market.prototype);
        obj.__wbg_ptr = ptr;
        MarketFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MarketFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_market_free(ptr, 0);
    }
    /**
     * Create from base64 encoded account data with options.
     * @param {string} data
     * @param {boolean | null} [no_discriminator]
     * @returns {Market}
     */
    static decode_from_base64_with_options(data, no_discriminator) {
        const ptr0 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.market_decode_from_base64_with_options(ptr0, len0, isLikeNone(no_discriminator) ? 0xFFFFFF : no_discriminator ? 1 : 0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return Market.__wrap(ret[0]);
    }
    /**
     * Create from base64 encoded account data.
     * @param {string} data
     * @returns {Market}
     */
    static decode_from_base64(data) {
        const ptr0 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.market_decode_from_base64(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return Market.__wrap(ret[0]);
    }
    /**
     * Create from account data.
     * @param {Uint8Array} data
     * @returns {Market}
     */
    static decode(data) {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.market_decode(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return Market.__wrap(ret[0]);
    }
    /**
     * Convert into [`JsMarketModel`]
     * @param {bigint} supply
     * @returns {MarketModel}
     */
    to_model(supply) {
        const ret = wasm.market_to_model(this.__wbg_ptr, supply);
        return MarketModel.__wrap(ret);
    }
    /**
     * Get market token address.
     * @returns {string}
     */
    market_token_address() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.market_market_token_address(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get index token address.
     * @returns {string}
     */
    index_token_address() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.market_index_token_address(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get long token address.
     * @returns {string}
     */
    long_token_address() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.market_long_token_address(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get short token address.
     * @returns {string}
     */
    short_token_address() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.market_short_token_address(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Create a clone of this market.
     * @returns {Market}
     */
    clone() {
        const ret = wasm.market_clone(this.__wbg_ptr);
        return Market.__wrap(ret);
    }
}

const MarketGraphFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_marketgraph_free(ptr >>> 0, 1));
/**
 * A JS binding for [`MarketGraph`].
 */
export class MarketGraph {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(MarketGraph.prototype);
        obj.__wbg_ptr = ptr;
        MarketGraphFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MarketGraphFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_marketgraph_free(ptr, 0);
    }
    /**
     * Create an empty market graph.
     * @param {MarketGraphConfig} config
     */
    constructor(config) {
        const ret = wasm.marketgraph_new(config);
        this.__wbg_ptr = ret >>> 0;
        MarketGraphFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Insert market from base64 encoded data.
     * @param {string} data
     * @param {bigint} supply
     * @param {boolean} update_estimation
     * @returns {boolean}
     */
    insert_market_from_base64_with_options(data, supply, update_estimation) {
        const ptr0 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.marketgraph_insert_market_from_base64_with_options(this.__wbg_ptr, ptr0, len0, supply, update_estimation);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] !== 0;
    }
    /**
     * Insert market from base64 encoded data.
     * @param {string} data
     * @param {bigint} supply
     * @returns {boolean}
     */
    insert_market_from_base64(data, supply) {
        const ptr0 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.marketgraph_insert_market_from_base64(this.__wbg_ptr, ptr0, len0, supply);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] !== 0;
    }
    /**
     * Update token price.
     * @param {string} token
     * @param {Value} price
     */
    update_token_price(token, price) {
        const ptr0 = passStringToWasm0(token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.marketgraph_update_token_price(this.__wbg_ptr, ptr0, len0, price);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Update value.
     * @param {bigint} value
     */
    update_value(value) {
        wasm.marketgraph_update_value(this.__wbg_ptr, value, value >> BigInt(64));
    }
    /**
     * Update base cost.
     * @param {bigint} base_cost
     */
    update_base_cost(base_cost) {
        wasm.marketgraph_update_base_cost(this.__wbg_ptr, base_cost, base_cost >> BigInt(64));
    }
    /**
     * Update max steps.
     * @param {number} max_steps
     */
    update_max_steps(max_steps) {
        wasm.marketgraph_update_max_steps(this.__wbg_ptr, max_steps);
    }
    /**
     * Get market by its market token.
     * @param {string} market_token
     * @returns {MarketModel | undefined}
     */
    get_market(market_token) {
        const ptr0 = passStringToWasm0(market_token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.marketgraph_get_market(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] === 0 ? undefined : MarketModel.__wrap(ret[0]);
    }
    /**
     * Get all market tokens.
     * @returns {string[]}
     */
    market_tokens() {
        const ret = wasm.marketgraph_market_tokens(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Get all index tokens.
     * @returns {string[]}
     */
    index_tokens() {
        const ret = wasm.marketgraph_index_tokens(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Compute best swap path.
     * @param {string} source
     * @param {string} target
     * @param {boolean} skip_bellman_ford
     * @returns {BestSwapPath}
     */
    best_swap_path(source, target, skip_bellman_ford) {
        const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(target, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.marketgraph_best_swap_path(this.__wbg_ptr, ptr0, len0, ptr1, len1, skip_bellman_ford);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Simulates order execution.
     * @param {SimulateOrderArgs} args
     * @param {Position | null} [position]
     * @returns {OrderSimulationOutput}
     */
    simulate_order(args, position) {
        let ptr0 = 0;
        if (!isLikeNone(position)) {
            _assertClass(position, Position);
            ptr0 = position.__destroy_into_raw();
        }
        const ret = wasm.marketgraph_simulate_order(this.__wbg_ptr, args, ptr0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return OrderSimulationOutput.__wrap(ret[0]);
    }
    /**
     * Create a simulator.
     * @param {CreateGraphSimulatorOptions | null} [options]
     * @returns {Simulator}
     */
    to_simulator(options) {
        const ret = wasm.marketgraph_to_simulator(this.__wbg_ptr, isLikeNone(options) ? 0 : addToExternrefTable0(options));
        return Simulator.__wrap(ret);
    }
    /**
     * Update with simulator.
     * @param {Simulator} simulator
     * @param {UpdateGraphWithSimulatorOptions | null} [options]
     */
    update_with_simulator(simulator, options) {
        _assertClass(simulator, Simulator);
        const ret = wasm.marketgraph_update_with_simulator(this.__wbg_ptr, simulator.__wbg_ptr, isLikeNone(options) ? 0 : addToExternrefTable0(options));
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Insert virtual inventory from base64 encoded data.
     * @param {string} vi_address
     * @param {string} data
     * @param {boolean} update_estimation
     * @returns {string | undefined}
     */
    insert_vi_from_base64(vi_address, data, update_estimation) {
        const ptr0 = passStringToWasm0(vi_address, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.marketgraph_insert_vi_from_base64(this.__wbg_ptr, ptr0, len0, ptr1, len1, update_estimation);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        let v3;
        if (ret[0] !== 0) {
            v3 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v3;
    }
    /**
     * Check if virtual inventory exists.
     * @param {string} vi_address
     * @returns {boolean}
     */
    has_vi(vi_address) {
        const ptr0 = passStringToWasm0(vi_address, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.marketgraph_has_vi(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] !== 0;
    }
    /**
     * Remove virtual inventory.
     * @param {string} vi_address
     * @returns {string | undefined}
     */
    remove_vi(vi_address) {
        const ptr0 = passStringToWasm0(vi_address, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.marketgraph_remove_vi(this.__wbg_ptr, ptr0, len0);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        let v2;
        if (ret[0] !== 0) {
            v2 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v2;
    }
    /**
     * Get all virtual inventory addresses.
     * @returns {string[]}
     */
    vi_addresses() {
        const ret = wasm.marketgraph_vi_addresses(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Insert virtual inventory for a market by market token.
     * @param {string} market_token
     * @param {string} vi_data
     * @param {boolean} update_estimation
     */
    insert_vi_for_market(market_token, vi_data, update_estimation) {
        const ptr0 = passStringToWasm0(market_token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(vi_data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.marketgraph_insert_vi_for_market(this.__wbg_ptr, ptr0, len0, ptr1, len1, update_estimation);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Create a clone of this graph.
     * @returns {MarketGraph}
     */
    clone() {
        const ret = wasm.marketgraph_clone(this.__wbg_ptr);
        return MarketGraph.__wrap(ret);
    }
}

const MarketModelFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_marketmodel_free(ptr >>> 0, 1));
/**
 * Wrapper of [`MarketModel`].
 */
export class MarketModel {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(MarketModel.prototype);
        obj.__wbg_ptr = ptr;
        MarketModelFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MarketModelFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_marketmodel_free(ptr, 0);
    }
    /**
     * Get market token price.
     * @param {MarketTokenPriceParams} params
     * @returns {bigint}
     */
    market_token_price(params) {
        const ret = wasm.marketmodel_market_token_price(this.__wbg_ptr, params);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        return (BigInt.asUintN(64, ret[0]) | (BigInt.asUintN(64, ret[1]) << BigInt(64)));
    }
    /**
     * Calculates max sellable value.
     * @param {MaxSellableValueParams} params
     * @returns {bigint}
     */
    max_sellable_value(params) {
        const ret = wasm.marketmodel_max_sellable_value(this.__wbg_ptr, params);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        return (BigInt.asUintN(64, ret[0]) | (BigInt.asUintN(64, ret[1]) << BigInt(64)));
    }
    /**
     * Get market status.
     * @param {MarketStatusParams} params
     * @returns {MarketStatus}
     */
    status(params) {
        const ret = wasm.marketmodel_status(this.__wbg_ptr, params);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Returns current supply.
     * @returns {bigint}
     */
    supply() {
        const ret = wasm.marketmodel_supply(this.__wbg_ptr);
        return (BigInt.asUintN(64, ret[0]) | (BigInt.asUintN(64, ret[1]) << BigInt(64)));
    }
    /**
     * Create an empty position model.
     * @param {CreateEmptyPositionArgs} args
     * @returns {PositionModel}
     */
    create_empty_position(args) {
        const ret = wasm.marketmodel_create_empty_position(this.__wbg_ptr, args);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return PositionModel.__wrap(ret[0]);
    }
    /**
     * Create a clone of this market model.
     * @returns {MarketModel}
     */
    clone() {
        const ret = wasm.marketmodel_clone(this.__wbg_ptr);
        return MarketModel.__wrap(ret);
    }
    /**
     * Set order fee discount factor.
     * @param {bigint} factor
     */
    setOrderFeeDiscountFactor(factor) {
        wasm.marketmodel_setOrderFeeDiscountFactor(this.__wbg_ptr, factor, factor >> BigInt(64));
    }
}

const MessageFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_message_free(ptr >>> 0, 1));
/**
 * wasm-bindgen version of the Message struct.
 * This duplication is required until https://github.com/rustwasm/wasm-bindgen/issues/3671
 * is fixed. This must not diverge from the regular non-wasm Message struct.
 */
export class Message {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Message.prototype);
        obj.__wbg_ptr = ptr;
        MessageFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MessageFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_message_free(ptr, 0);
    }
    /**
     * The id of a recent ledger entry.
     * @returns {Hash}
     */
    get recent_blockhash() {
        const ret = wasm.__wbg_get_message_recent_blockhash(this.__wbg_ptr);
        return Hash.__wrap(ret);
    }
    /**
     * The id of a recent ledger entry.
     * @param {Hash} arg0
     */
    set recent_blockhash(arg0) {
        _assertClass(arg0, Hash);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_message_recent_blockhash(this.__wbg_ptr, ptr0);
    }
}

const OrderSimulationOutputFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_ordersimulationoutput_free(ptr >>> 0, 1));
/**
 * A JS binding for [`OrderSimulationOutput`].
 */
export class OrderSimulationOutput {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(OrderSimulationOutput.prototype);
        obj.__wbg_ptr = ptr;
        OrderSimulationOutputFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        OrderSimulationOutputFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_ordersimulationoutput_free(ptr, 0);
    }
    /**
     * Returns increase order simulation output.
     * @param {boolean | null} [skip_position]
     * @returns {IncreaseOrderSimulationOutput | undefined}
     */
    increase(skip_position) {
        const ret = wasm.ordersimulationoutput_increase(this.__wbg_ptr, isLikeNone(skip_position) ? 0xFFFFFF : skip_position ? 1 : 0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Returns decrease order simulation output.
     * @param {boolean | null} [skip_position]
     * @returns {DecreaseOrderSimulationOutput | undefined}
     */
    decrease(skip_position) {
        const ret = wasm.ordersimulationoutput_decrease(this.__wbg_ptr, isLikeNone(skip_position) ? 0xFFFFFF : skip_position ? 1 : 0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Returns swap order simulation output.
     * @returns {SwapOrderSimulationOutput | undefined}
     */
    swap() {
        const ret = wasm.ordersimulationoutput_swap(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Returns the result position model.
     * @returns {PositionModel | undefined}
     */
    position_model() {
        const ret = wasm.ordersimulationoutput_position_model(this.__wbg_ptr);
        return ret === 0 ? undefined : PositionModel.__wrap(ret);
    }
}

const PodElGamalPubkeyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_podelgamalpubkey_free(ptr >>> 0, 1));
/**
 * The `ElGamalPubkey` type as a `Pod`.
 */
export class PodElGamalPubkey {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PodElGamalPubkey.prototype);
        obj.__wbg_ptr = ptr;
        PodElGamalPubkeyFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PodElGamalPubkeyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_podelgamalpubkey_free(ptr, 0);
    }
    /**
     * Create a new `PodElGamalPubkey` object
     *
     * * `value` - optional public key as a base64 encoded string, `Uint8Array`, `[number]`
     * @param {any} value
     */
    constructor(value) {
        const ret = wasm.podelgamalpubkey_constructor(value);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        PodElGamalPubkeyFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Return the base64 string representation of the public key
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.podelgamalpubkey_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Checks if two `ElGamalPubkey`s are equal
     * @param {PodElGamalPubkey} other
     * @returns {boolean}
     */
    equals(other) {
        _assertClass(other, PodElGamalPubkey);
        const ret = wasm.podelgamalpubkey_equals(this.__wbg_ptr, other.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Return the `Uint8Array` representation of the public key
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.podelgamalpubkey_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @param {ElGamalPubkey} decoded
     * @returns {PodElGamalPubkey}
     */
    static compressed(decoded) {
        _assertClass(decoded, ElGamalPubkey);
        const ret = wasm.podelgamalpubkey_compressed(decoded.__wbg_ptr);
        return PodElGamalPubkey.__wrap(ret);
    }
    /**
     * @returns {ElGamalPubkey}
     */
    decompressed() {
        const ret = wasm.podelgamalpubkey_decompressed(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ElGamalPubkey.__wrap(ret[0]);
    }
}

const PositionFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_position_free(ptr >>> 0, 1));
/**
 * JS version of [`Position`].
 */
export class Position {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Position.prototype);
        obj.__wbg_ptr = ptr;
        PositionFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PositionFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_position_free(ptr, 0);
    }
    /**
     * Create from base64 encoded account data with options.
     * @param {string} data
     * @param {boolean | null} [no_discriminator]
     * @returns {Position}
     */
    static decode_from_base64_with_options(data, no_discriminator) {
        const ptr0 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.position_decode_from_base64_with_options(ptr0, len0, isLikeNone(no_discriminator) ? 0xFFFFFF : no_discriminator ? 1 : 0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return Position.__wrap(ret[0]);
    }
    /**
     * Create from base64 encoded account data.
     * @param {string} data
     * @returns {Position}
     */
    static decode_from_base64(data) {
        const ptr0 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.position_decode_from_base64(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return Position.__wrap(ret[0]);
    }
    /**
     * Create from account data.
     * @param {Uint8Array} data
     * @returns {Position}
     */
    static decode(data) {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.position_decode(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return Position.__wrap(ret[0]);
    }
    /**
     * Convert to a [`JsPositionModel`].
     * @param {MarketModel} market
     * @returns {PositionModel}
     */
    to_model(market) {
        _assertClass(market, MarketModel);
        const ret = wasm.position_to_model(this.__wbg_ptr, market.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return PositionModel.__wrap(ret[0]);
    }
    /**
     * Create a clone of this position.
     * @returns {Position}
     */
    clone() {
        const ret = wasm.position_clone(this.__wbg_ptr);
        return Position.__wrap(ret);
    }
}

const PositionModelFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_positionmodel_free(ptr >>> 0, 1));
/**
 * JS version of [`PositionModel`].
 */
export class PositionModel {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PositionModel.prototype);
        obj.__wbg_ptr = ptr;
        PositionModelFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PositionModelFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_positionmodel_free(ptr, 0);
    }
    /**
     * Get position status.
     * @param {Prices} prices
     * @returns {PositionStatus}
     */
    status(prices) {
        const ret = wasm.positionmodel_status(this.__wbg_ptr, prices);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Get position status with options.
     * @param {Prices} prices
     * @param {boolean | null} [include_virtual_inventory_impact]
     * @returns {PositionStatus}
     */
    status_with_options(prices, include_virtual_inventory_impact) {
        const ret = wasm.positionmodel_status_with_options(this.__wbg_ptr, prices, isLikeNone(include_virtual_inventory_impact) ? 0xFFFFFF : include_virtual_inventory_impact ? 1 : 0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Get position size.
     * @returns {bigint}
     */
    size() {
        const ret = wasm.positionmodel_size(this.__wbg_ptr);
        return (BigInt.asUintN(64, ret[0]) | (BigInt.asUintN(64, ret[1]) << BigInt(64)));
    }
    /**
     * Get position size in tokens.
     * @returns {bigint}
     */
    size_in_tokens() {
        const ret = wasm.positionmodel_size_in_tokens(this.__wbg_ptr);
        return (BigInt.asUintN(64, ret[0]) | (BigInt.asUintN(64, ret[1]) << BigInt(64)));
    }
    /**
     * Get collateral amount.
     * @returns {bigint}
     */
    collateral_amount() {
        const ret = wasm.positionmodel_collateral_amount(this.__wbg_ptr);
        return (BigInt.asUintN(64, ret[0]) | (BigInt.asUintN(64, ret[1]) << BigInt(64)));
    }
    /**
     * Returns the inner [`JsPosition`].
     * @returns {Position}
     */
    position() {
        const ret = wasm.positionmodel_position(this.__wbg_ptr);
        return Position.__wrap(ret);
    }
    /**
     * Update with trade event.
     * @param {TradeEvent} event
     * @param {boolean | null} [force_update]
     * @returns {boolean}
     */
    update_with_trade_event(event, force_update) {
        _assertClass(event, TradeEvent);
        const ret = wasm.positionmodel_update_with_trade_event(this.__wbg_ptr, event.__wbg_ptr, isLikeNone(force_update) ? 0xFFFFFF : force_update ? 1 : 0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] !== 0;
    }
    /**
     * Create a clone of this position model.
     * @returns {PositionModel}
     */
    clone() {
        const ret = wasm.positionmodel_clone(this.__wbg_ptr);
        return PositionModel.__wrap(ret);
    }
}

const PubkeyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_pubkey_free(ptr >>> 0, 1));
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

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Pubkey.prototype);
        obj.__wbg_ptr = ptr;
        PubkeyFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PubkeyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_pubkey_free(ptr, 0);
    }
    /**
     * Create a new Pubkey object
     *
     * * `value` - optional public key as a base58 encoded string, `Uint8Array`, `[number]`
     * @param {any} value
     */
    constructor(value) {
        const ret = wasm.pubkey_constructor(value);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        PubkeyFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Return the base58 string representation of the public key
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.pubkey_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Check if a `Pubkey` is on the ed25519 curve.
     * @returns {boolean}
     */
    isOnCurve() {
        const ret = wasm.pubkey_isOnCurve(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Checks if two `Pubkey`s are equal
     * @param {Pubkey} other
     * @returns {boolean}
     */
    equals(other) {
        _assertClass(other, Pubkey);
        const ret = wasm.pubkey_equals(this.__wbg_ptr, other.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Return the `Uint8Array` representation of the public key
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.pubkey_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Derive a Pubkey from another Pubkey, string seed, and a program id
     * @param {Pubkey} base
     * @param {string} seed
     * @param {Pubkey} owner
     * @returns {Pubkey}
     */
    static createWithSeed(base, seed, owner) {
        _assertClass(base, Pubkey);
        const ptr0 = passStringToWasm0(seed, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(owner, Pubkey);
        const ret = wasm.pubkey_createWithSeed(base.__wbg_ptr, ptr0, len0, owner.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return Pubkey.__wrap(ret[0]);
    }
    /**
     * Derive a program address from seeds and a program id
     * @param {any[]} seeds
     * @param {Pubkey} program_id
     * @returns {Pubkey}
     */
    static createProgramAddress(seeds, program_id) {
        const ptr0 = passArrayJsValueToWasm0(seeds, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(program_id, Pubkey);
        const ret = wasm.pubkey_createProgramAddress(ptr0, len0, program_id.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return Pubkey.__wrap(ret[0]);
    }
    /**
     * Find a valid program address
     *
     * Returns:
     * * `[PubKey, number]` - the program address and bump seed
     * @param {any[]} seeds
     * @param {Pubkey} program_id
     * @returns {any}
     */
    static findProgramAddress(seeds, program_id) {
        const ptr0 = passArrayJsValueToWasm0(seeds, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(program_id, Pubkey);
        const ret = wasm.pubkey_findProgramAddress(ptr0, len0, program_id.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
}

const ShiftSimulationOutputFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_shiftsimulationoutput_free(ptr >>> 0, 1));
/**
 * Simulation output for shift.
 */
export class ShiftSimulationOutput {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ShiftSimulationOutput.prototype);
        obj.__wbg_ptr = ptr;
        ShiftSimulationOutputFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ShiftSimulationOutputFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_shiftsimulationoutput_free(ptr, 0);
    }
    /**
     * Returns the deposit report.
     * @returns {string}
     */
    deposit_report() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.shiftsimulationoutput_deposit_report(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * Returns the withdraw report.
     * @returns {string}
     */
    withdraw_report() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.shiftsimulationoutput_withdraw_report(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
}

const SimulatorFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_simulator_free(ptr >>> 0, 1));
/**
 * A JS binding for [`Simulator`].
 */
export class Simulator {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Simulator.prototype);
        obj.__wbg_ptr = ptr;
        SimulatorFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SimulatorFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_simulator_free(ptr, 0);
    }
    /**
     * Get market by its market token.
     * @param {string} market_token
     * @returns {MarketModel | undefined}
     */
    get_market(market_token) {
        const ptr0 = passStringToWasm0(market_token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.simulator_get_market(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] === 0 ? undefined : MarketModel.__wrap(ret[0]);
    }
    /**
     * Get price for the given token.
     * @param {string} token
     * @returns {Value | undefined}
     */
    get_price(token) {
        const ptr0 = passStringToWasm0(token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.simulator_get_price(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Get GLV by its GLV token.
     * @param {string} glv_token
     * @returns {GlvModel | undefined}
     */
    get_glv(glv_token) {
        const ptr0 = passStringToWasm0(glv_token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.simulator_get_glv(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] === 0 ? undefined : GlvModel.__wrap(ret[0]);
    }
    /**
     * Upsert the prices for the given token.
     * @param {string} token
     * @param {Value} price
     */
    insert_price(token, price) {
        const ptr0 = passStringToWasm0(token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.simulator_insert_price(this.__wbg_ptr, ptr0, len0, price);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Upsert a GLV model.
     * @param {GlvModel} glv
     */
    insert_glv(glv) {
        _assertClass(glv, GlvModel);
        const ret = wasm.simulator_insert_glv(this.__wbg_ptr, glv.__wbg_ptr);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Insert a virtual inventory model.
     * @param {string} vi_address
     * @param {VirtualInventoryModel} vi
     */
    insert_vi(vi_address, vi) {
        const ptr0 = passStringToWasm0(vi_address, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(vi, VirtualInventoryModel);
        const ret = wasm.simulator_insert_vi(this.__wbg_ptr, ptr0, len0, vi.__wbg_ptr);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Get virtual inventory model by address.
     * @param {string} vi_address
     * @returns {VirtualInventoryModel | undefined}
     */
    get_vi(vi_address) {
        const ptr0 = passStringToWasm0(vi_address, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.simulator_get_vi(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] === 0 ? undefined : VirtualInventoryModel.__wrap(ret[0]);
    }
    /**
     * Set whether to disable virtual inventories for simulations.
     * @param {boolean} disable
     */
    set_disable_vis(disable) {
        wasm.simulator_set_disable_vis(this.__wbg_ptr, disable);
    }
    /**
     * Get whether virtual inventories are disabled.
     * @returns {boolean}
     */
    disable_vis() {
        const ret = wasm.simulator_disable_vis(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Simulate an order execution.
     * @param {SimulateOrderArgs} args
     * @param {Position | null} [position]
     * @returns {OrderSimulationOutput}
     */
    simulate_order(args, position) {
        let ptr0 = 0;
        if (!isLikeNone(position)) {
            _assertClass(position, Position);
            ptr0 = position.__destroy_into_raw();
        }
        const ret = wasm.simulator_simulate_order(this.__wbg_ptr, args, ptr0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return OrderSimulationOutput.__wrap(ret[0]);
    }
    /**
     * Simulate a deposit execution.
     * @param {SimulateDepositArgs} args
     * @returns {DepositSimulationOutput}
     */
    simulate_deposit(args) {
        const ret = wasm.simulator_simulate_deposit(this.__wbg_ptr, args);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return DepositSimulationOutput.__wrap(ret[0]);
    }
    /**
     * Simulate a withdrawal execution.
     * @param {SimulateWithdrawalArgs} args
     * @returns {WithdrawalSimulationOutput}
     */
    simulate_withdrawal(args) {
        const ret = wasm.simulator_simulate_withdrawal(this.__wbg_ptr, args);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return WithdrawalSimulationOutput.__wrap(ret[0]);
    }
    /**
     * Simulate a shift execution.
     * @param {SimulateShiftArgs} args
     * @returns {ShiftSimulationOutput}
     */
    simulate_shift(args) {
        const ret = wasm.simulator_simulate_shift(this.__wbg_ptr, args);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ShiftSimulationOutput.__wrap(ret[0]);
    }
    /**
     * Simulate a GLV deposit execution.
     * @param {SimulateGlvDepositArgs} args
     * @returns {GlvDepositSimulationOutput}
     */
    simulate_glv_deposit(args) {
        const ret = wasm.simulator_simulate_glv_deposit(this.__wbg_ptr, args);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return GlvDepositSimulationOutput.__wrap(ret[0]);
    }
    /**
     * Simulate a GLV withdrawal execution.
     * @param {SimulateGlvWithdrawalArgs} args
     * @returns {GlvWithdrawalSimulationOutput}
     */
    simulate_glv_withdrawal(args) {
        const ret = wasm.simulator_simulate_glv_withdrawal(this.__wbg_ptr, args);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return GlvWithdrawalSimulationOutput.__wrap(ret[0]);
    }
    /**
     * Create a clone of this simulator.
     * @returns {Simulator}
     */
    clone() {
        const ret = wasm.simulator_clone(this.__wbg_ptr);
        return Simulator.__wrap(ret);
    }
    /**
     * Calculates GLV status.
     * @param {GetGlvStatusArgs} args
     * @returns {GlvStatus}
     */
    get_glv_status(args) {
        const ret = wasm.simulator_get_glv_status(this.__wbg_ptr, args);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Calculates GLV token value.
     * @param {GetGlvTokenValueArgs} args
     * @returns {bigint}
     */
    get_glv_token_value(args) {
        const ret = wasm.simulator_get_glv_token_value(this.__wbg_ptr, args);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        return (BigInt.asUintN(64, ret[0]) | (BigInt.asUintN(64, ret[1]) << BigInt(64)));
    }
}

const SystemInstructionFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_systeminstruction_free(ptr >>> 0, 1));

export class SystemInstruction {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SystemInstructionFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_systeminstruction_free(ptr, 0);
    }
    /**
     * @param {Pubkey} from_pubkey
     * @param {Pubkey} to_pubkey
     * @param {bigint} lamports
     * @param {bigint} space
     * @param {Pubkey} owner
     * @returns {Instruction}
     */
    static createAccount(from_pubkey, to_pubkey, lamports, space, owner) {
        _assertClass(from_pubkey, Pubkey);
        _assertClass(to_pubkey, Pubkey);
        _assertClass(owner, Pubkey);
        const ret = wasm.systeminstruction_createAccount(from_pubkey.__wbg_ptr, to_pubkey.__wbg_ptr, lamports, space, owner.__wbg_ptr);
        return Instruction.__wrap(ret);
    }
    /**
     * @param {Pubkey} from_pubkey
     * @param {Pubkey} to_pubkey
     * @param {Pubkey} base
     * @param {string} seed
     * @param {bigint} lamports
     * @param {bigint} space
     * @param {Pubkey} owner
     * @returns {Instruction}
     */
    static createAccountWithSeed(from_pubkey, to_pubkey, base, seed, lamports, space, owner) {
        _assertClass(from_pubkey, Pubkey);
        _assertClass(to_pubkey, Pubkey);
        _assertClass(base, Pubkey);
        const ptr0 = passStringToWasm0(seed, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(owner, Pubkey);
        const ret = wasm.systeminstruction_createAccountWithSeed(from_pubkey.__wbg_ptr, to_pubkey.__wbg_ptr, base.__wbg_ptr, ptr0, len0, lamports, space, owner.__wbg_ptr);
        return Instruction.__wrap(ret);
    }
    /**
     * @param {Pubkey} pubkey
     * @param {Pubkey} owner
     * @returns {Instruction}
     */
    static assign(pubkey, owner) {
        _assertClass(pubkey, Pubkey);
        _assertClass(owner, Pubkey);
        const ret = wasm.systeminstruction_assign(pubkey.__wbg_ptr, owner.__wbg_ptr);
        return Instruction.__wrap(ret);
    }
    /**
     * @param {Pubkey} pubkey
     * @param {Pubkey} base
     * @param {string} seed
     * @param {Pubkey} owner
     * @returns {Instruction}
     */
    static assignWithSeed(pubkey, base, seed, owner) {
        _assertClass(pubkey, Pubkey);
        _assertClass(base, Pubkey);
        const ptr0 = passStringToWasm0(seed, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(owner, Pubkey);
        const ret = wasm.systeminstruction_assignWithSeed(pubkey.__wbg_ptr, base.__wbg_ptr, ptr0, len0, owner.__wbg_ptr);
        return Instruction.__wrap(ret);
    }
    /**
     * @param {Pubkey} from_pubkey
     * @param {Pubkey} to_pubkey
     * @param {bigint} lamports
     * @returns {Instruction}
     */
    static transfer(from_pubkey, to_pubkey, lamports) {
        _assertClass(from_pubkey, Pubkey);
        _assertClass(to_pubkey, Pubkey);
        const ret = wasm.systeminstruction_transfer(from_pubkey.__wbg_ptr, to_pubkey.__wbg_ptr, lamports);
        return Instruction.__wrap(ret);
    }
    /**
     * @param {Pubkey} from_pubkey
     * @param {Pubkey} from_base
     * @param {string} from_seed
     * @param {Pubkey} from_owner
     * @param {Pubkey} to_pubkey
     * @param {bigint} lamports
     * @returns {Instruction}
     */
    static transferWithSeed(from_pubkey, from_base, from_seed, from_owner, to_pubkey, lamports) {
        _assertClass(from_pubkey, Pubkey);
        _assertClass(from_base, Pubkey);
        const ptr0 = passStringToWasm0(from_seed, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(from_owner, Pubkey);
        _assertClass(to_pubkey, Pubkey);
        const ret = wasm.systeminstruction_transferWithSeed(from_pubkey.__wbg_ptr, from_base.__wbg_ptr, ptr0, len0, from_owner.__wbg_ptr, to_pubkey.__wbg_ptr, lamports);
        return Instruction.__wrap(ret);
    }
    /**
     * @param {Pubkey} pubkey
     * @param {bigint} space
     * @returns {Instruction}
     */
    static allocate(pubkey, space) {
        _assertClass(pubkey, Pubkey);
        const ret = wasm.systeminstruction_allocate(pubkey.__wbg_ptr, space);
        return Instruction.__wrap(ret);
    }
    /**
     * @param {Pubkey} address
     * @param {Pubkey} base
     * @param {string} seed
     * @param {bigint} space
     * @param {Pubkey} owner
     * @returns {Instruction}
     */
    static allocateWithSeed(address, base, seed, space, owner) {
        _assertClass(address, Pubkey);
        _assertClass(base, Pubkey);
        const ptr0 = passStringToWasm0(seed, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(owner, Pubkey);
        const ret = wasm.systeminstruction_allocateWithSeed(address.__wbg_ptr, base.__wbg_ptr, ptr0, len0, space, owner.__wbg_ptr);
        return Instruction.__wrap(ret);
    }
    /**
     * @param {Pubkey} from_pubkey
     * @param {Pubkey} nonce_pubkey
     * @param {Pubkey} authority
     * @param {bigint} lamports
     * @returns {Array<any>}
     */
    static createNonceAccount(from_pubkey, nonce_pubkey, authority, lamports) {
        _assertClass(from_pubkey, Pubkey);
        _assertClass(nonce_pubkey, Pubkey);
        _assertClass(authority, Pubkey);
        const ret = wasm.systeminstruction_createNonceAccount(from_pubkey.__wbg_ptr, nonce_pubkey.__wbg_ptr, authority.__wbg_ptr, lamports);
        return ret;
    }
    /**
     * @param {Pubkey} nonce_pubkey
     * @param {Pubkey} authorized_pubkey
     * @returns {Instruction}
     */
    static advanceNonceAccount(nonce_pubkey, authorized_pubkey) {
        _assertClass(nonce_pubkey, Pubkey);
        _assertClass(authorized_pubkey, Pubkey);
        const ret = wasm.systeminstruction_advanceNonceAccount(nonce_pubkey.__wbg_ptr, authorized_pubkey.__wbg_ptr);
        return Instruction.__wrap(ret);
    }
    /**
     * @param {Pubkey} nonce_pubkey
     * @param {Pubkey} authorized_pubkey
     * @param {Pubkey} to_pubkey
     * @param {bigint} lamports
     * @returns {Instruction}
     */
    static withdrawNonceAccount(nonce_pubkey, authorized_pubkey, to_pubkey, lamports) {
        _assertClass(nonce_pubkey, Pubkey);
        _assertClass(authorized_pubkey, Pubkey);
        _assertClass(to_pubkey, Pubkey);
        const ret = wasm.systeminstruction_withdrawNonceAccount(nonce_pubkey.__wbg_ptr, authorized_pubkey.__wbg_ptr, to_pubkey.__wbg_ptr, lamports);
        return Instruction.__wrap(ret);
    }
    /**
     * @param {Pubkey} nonce_pubkey
     * @param {Pubkey} authorized_pubkey
     * @param {Pubkey} new_authority
     * @returns {Instruction}
     */
    static authorizeNonceAccount(nonce_pubkey, authorized_pubkey, new_authority) {
        _assertClass(nonce_pubkey, Pubkey);
        _assertClass(authorized_pubkey, Pubkey);
        _assertClass(new_authority, Pubkey);
        const ret = wasm.systeminstruction_authorizeNonceAccount(nonce_pubkey.__wbg_ptr, authorized_pubkey.__wbg_ptr, new_authority.__wbg_ptr);
        return Instruction.__wrap(ret);
    }
}

const TradeEventFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_tradeevent_free(ptr >>> 0, 1));
/**
 * JS version of [`TradeEvent`].
 */
export class TradeEvent {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TradeEvent.prototype);
        obj.__wbg_ptr = ptr;
        TradeEventFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TradeEventFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_tradeevent_free(ptr, 0);
    }
    /**
     * Create from base64 encoded event data with options.
     * @param {string} data
     * @param {boolean | null} [no_discriminator]
     * @returns {TradeEvent}
     */
    static decode_from_base64_with_options(data, no_discriminator) {
        const ptr0 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.tradeevent_decode_from_base64_with_options(ptr0, len0, isLikeNone(no_discriminator) ? 0xFFFFFF : no_discriminator ? 1 : 0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TradeEvent.__wrap(ret[0]);
    }
    /**
     * Create from base64 encoded event data.
     * @param {string} data
     * @returns {TradeEvent}
     */
    static decode_from_base64(data) {
        const ptr0 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.tradeevent_decode_from_base64(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TradeEvent.__wrap(ret[0]);
    }
    /**
     * Create from event data.
     * @param {Uint8Array} data
     * @param {boolean | null} [no_discriminator]
     * @returns {TradeEvent}
     */
    static decode_with_options(data, no_discriminator) {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.tradeevent_decode_with_options(ptr0, len0, isLikeNone(no_discriminator) ? 0xFFFFFF : no_discriminator ? 1 : 0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TradeEvent.__wrap(ret[0]);
    }
    /**
     * Convert into a position model.
     * @param {MarketModel} market
     * @returns {PositionModel}
     */
    to_position_model(market) {
        _assertClass(market, MarketModel);
        const ret = wasm.tradeevent_to_position_model(this.__wbg_ptr, market.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return PositionModel.__wrap(ret[0]);
    }
}

const TransactionFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_transaction_free(ptr >>> 0, 1));
/**
 * wasm-bindgen version of the Transaction struct.
 * This duplication is required until https://github.com/rustwasm/wasm-bindgen/issues/3671
 * is fixed. This must not diverge from the regular non-wasm Transaction struct.
 */
export class Transaction {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Transaction.prototype);
        obj.__wbg_ptr = ptr;
        TransactionFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TransactionFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_transaction_free(ptr, 0);
    }
    /**
     * Create a new `Transaction`
     * @param {Instructions} instructions
     * @param {Pubkey | null} [payer]
     */
    constructor(instructions, payer) {
        _assertClass(instructions, Instructions);
        var ptr0 = instructions.__destroy_into_raw();
        let ptr1 = 0;
        if (!isLikeNone(payer)) {
            _assertClass(payer, Pubkey);
            ptr1 = payer.__destroy_into_raw();
        }
        const ret = wasm.transaction_constructor(ptr0, ptr1);
        this.__wbg_ptr = ret >>> 0;
        TransactionFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Return a message containing all data that should be signed.
     * @returns {Message}
     */
    message() {
        const ret = wasm.transaction_message(this.__wbg_ptr);
        return Message.__wrap(ret);
    }
    /**
     * Return the serialized message data to sign.
     * @returns {Uint8Array}
     */
    messageData() {
        const ret = wasm.transaction_messageData(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Verify the transaction
     */
    verify() {
        const ret = wasm.transaction_verify(this.__wbg_ptr);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {Keypair} keypair
     * @param {Hash} recent_blockhash
     */
    partialSign(keypair, recent_blockhash) {
        _assertClass(keypair, Keypair);
        _assertClass(recent_blockhash, Hash);
        wasm.transaction_partialSign(this.__wbg_ptr, keypair.__wbg_ptr, recent_blockhash.__wbg_ptr);
    }
    /**
     * @returns {boolean}
     */
    isSigned() {
        const ret = wasm.transaction_isSigned(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.transaction_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {Transaction}
     */
    static fromBytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.transaction_fromBytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return Transaction.__wrap(ret[0]);
    }
}

const TransactionGroupFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_transactiongroup_free(ptr >>> 0, 1));
/**
 * A JS binding for compiled transaction group.
 */
export class TransactionGroup {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TransactionGroup.prototype);
        obj.__wbg_ptr = ptr;
        TransactionGroupFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TransactionGroupFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_transactiongroup_free(ptr, 0);
    }
    /**
     * Returns serialized transaciton group.
     * @returns {SerializedTransactionGroup}
     */
    serialize() {
        const ret = wasm.transactiongroup_serialize(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
}

const UserFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_user_free(ptr >>> 0, 1));
/**
 * JS binding wrapper for [`UserHeader`]
 */
export class User {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(User.prototype);
        obj.__wbg_ptr = ptr;
        UserFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        UserFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_user_free(ptr, 0);
    }
    /**
     * Create from base64 encoded account data.
     * @param {string} data
     * @returns {User}
     */
    static decode_from_base64(data) {
        const ptr0 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.user_decode_from_base64(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return User.__wrap(ret[0]);
    }
    /**
     * Get the owner address.
     * @returns {string}
     */
    owner_address() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.user_owner_address(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get the store address.
     * @returns {string}
     */
    store_address() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.user_store_address(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get the referral code address.
     * @returns {string | undefined}
     */
    referral_code_address() {
        const ret = wasm.user_referral_code_address(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * Get the referrer address.
     * @returns {string | undefined}
     */
    referrer_address() {
        const ret = wasm.user_referrer_address(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * Get the GT rank.
     * @returns {number}
     */
    gt_rank() {
        const ret = wasm.user_gt_rank(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get GT last minted at.
     * @returns {bigint}
     */
    gt_last_minted_at() {
        const ret = wasm.user_gt_last_minted_at(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get total minted GT amount.
     * @returns {bigint}
     */
    gt_total_minted() {
        const ret = wasm.user_gt_total_minted(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * Get GT amount.
     * @returns {bigint}
     */
    gt_amount() {
        const ret = wasm.user_gt_amount(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * Get paid fee value of GT.
     * @returns {bigint}
     */
    gt_paid_fee_value() {
        const ret = wasm.user_gt_paid_fee_value(this.__wbg_ptr);
        return (BigInt.asUintN(64, ret[0]) | (BigInt.asUintN(64, ret[1]) << BigInt(64)));
    }
    /**
     * Get minted fee value of GT.
     * @returns {bigint}
     */
    gt_minted_fee_value() {
        const ret = wasm.user_gt_minted_fee_value(this.__wbg_ptr);
        return (BigInt.asUintN(64, ret[0]) | (BigInt.asUintN(64, ret[1]) << BigInt(64)));
    }
}

const VirtualInventoryFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_virtualinventory_free(ptr >>> 0, 1));
/**
 * Wrapper of [`VirtualInventory`].
 */
export class VirtualInventory {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(VirtualInventory.prototype);
        obj.__wbg_ptr = ptr;
        VirtualInventoryFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        VirtualInventoryFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_virtualinventory_free(ptr, 0);
    }
    /**
     * Create from base64 encoded account data with options.
     * @param {string} data
     * @param {boolean | null} [no_discriminator]
     * @returns {VirtualInventory}
     */
    static decode_from_base64_with_options(data, no_discriminator) {
        const ptr0 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.virtualinventory_decode_from_base64_with_options(ptr0, len0, isLikeNone(no_discriminator) ? 0xFFFFFF : no_discriminator ? 1 : 0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return VirtualInventory.__wrap(ret[0]);
    }
    /**
     * Create from base64 encoded account data.
     * @param {string} data
     * @returns {VirtualInventory}
     */
    static decode_from_base64(data) {
        const ptr0 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.virtualinventory_decode_from_base64(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return VirtualInventory.__wrap(ret[0]);
    }
    /**
     * Create from account data.
     * @param {Uint8Array} data
     * @returns {VirtualInventory}
     */
    static decode(data) {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.virtualinventory_decode(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return VirtualInventory.__wrap(ret[0]);
    }
    /**
     * Convert into [`JsVirtualInventoryModel`].
     * @returns {VirtualInventoryModel}
     */
    to_model() {
        const ret = wasm.virtualinventory_to_model(this.__wbg_ptr);
        return VirtualInventoryModel.__wrap(ret);
    }
    /**
     * Create a clone of this virtual inventory.
     * @returns {VirtualInventory}
     */
    clone() {
        const ret = wasm.virtualinventory_clone(this.__wbg_ptr);
        return VirtualInventory.__wrap(ret);
    }
}

const VirtualInventoryModelFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_virtualinventorymodel_free(ptr >>> 0, 1));
/**
 * Wrapper of [`VirtualInventoryModel`].
 */
export class VirtualInventoryModel {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(VirtualInventoryModel.prototype);
        obj.__wbg_ptr = ptr;
        VirtualInventoryModelFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        VirtualInventoryModelFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_virtualinventorymodel_free(ptr, 0);
    }
    /**
     * Create a clone of this virtual inventory model.
     * @returns {VirtualInventoryModel}
     */
    clone() {
        const ret = wasm.virtualinventorymodel_clone(this.__wbg_ptr);
        return VirtualInventoryModel.__wrap(ret);
    }
}

const WithdrawalSimulationOutputFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_withdrawalsimulationoutput_free(ptr >>> 0, 1));
/**
 * Simulation output for withdrawal.
 */
export class WithdrawalSimulationOutput {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WithdrawalSimulationOutput.prototype);
        obj.__wbg_ptr = ptr;
        WithdrawalSimulationOutputFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WithdrawalSimulationOutputFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_withdrawalsimulationoutput_free(ptr, 0);
    }
    /**
     * Returns the withdraw report.
     * @returns {string}
     */
    report() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.withdrawalsimulationoutput_report(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * Returns swap reports for the long token path.
     * @returns {string[]}
     */
    long_swaps() {
        const ret = wasm.withdrawalsimulationoutput_long_swaps(this.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Returns swap reports for the short token path.
     * @returns {string[]}
     */
    short_swaps() {
        const ret = wasm.withdrawalsimulationoutput_short_swaps(this.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Returns long token output amount.
     * @returns {bigint}
     */
    long_output_amount() {
        const ret = wasm.withdrawalsimulationoutput_long_output_amount(this.__wbg_ptr);
        return (BigInt.asUintN(64, ret[0]) | (BigInt.asUintN(64, ret[1]) << BigInt(64)));
    }
    /**
     * Returns short token output amount.
     * @returns {bigint}
     */
    short_output_amount() {
        const ret = wasm.withdrawalsimulationoutput_short_output_amount(this.__wbg_ptr);
        return (BigInt.asUintN(64, ret[0]) | (BigInt.asUintN(64, ret[1]) << BigInt(64)));
    }
}

export function __wbg_String_8f0eb39a4a4c2f66(arg0, arg1) {
    const ret = String(arg1);
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
};

export function __wbg_buffer_609cc3eee51ed158(arg0) {
    const ret = arg0.buffer;
    return ret;
};

export function __wbg_call_672a4d21634d4a24() { return handleError(function (arg0, arg1) {
    const ret = arg0.call(arg1);
    return ret;
}, arguments) };

export function __wbg_call_7cccdd69e0791ae2() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.call(arg1, arg2);
    return ret;
}, arguments) };

export function __wbg_crypto_038798f665f985e2(arg0) {
    const ret = arg0.crypto;
    return ret;
};

export function __wbg_crypto_574e78ad8b13b65f(arg0) {
    const ret = arg0.crypto;
    return ret;
};

export function __wbg_debug_3cb59063b29f58c1(arg0) {
    console.debug(arg0);
};

export function __wbg_done_769e5ede4b31c67b(arg0) {
    const ret = arg0.done;
    return ret;
};

export function __wbg_entries_3265d4158b33e5dc(arg0) {
    const ret = Object.entries(arg0);
    return ret;
};

export function __wbg_error_524f506f44df1645(arg0) {
    console.error(arg0);
};

export function __wbg_error_7534b8e9a36f1ab4(arg0, arg1) {
    let deferred0_0;
    let deferred0_1;
    try {
        deferred0_0 = arg0;
        deferred0_1 = arg1;
        console.error(getStringFromWasm0(arg0, arg1));
    } finally {
        wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
    }
};

export function __wbg_getRandomValues_371e7ade8bd92088(arg0, arg1) {
    arg0.getRandomValues(arg1);
};

export function __wbg_getRandomValues_7dfe5bd1b67c9ca1(arg0) {
    const ret = arg0.getRandomValues;
    return ret;
};

export function __wbg_getRandomValues_b8f5dbd5f3995a9e() { return handleError(function (arg0, arg1) {
    arg0.getRandomValues(arg1);
}, arguments) };

export function __wbg_getTime_46267b1c24877e30(arg0) {
    const ret = arg0.getTime();
    return ret;
};

export function __wbg_get_67b2ba62fc30de12() { return handleError(function (arg0, arg1) {
    const ret = Reflect.get(arg0, arg1);
    return ret;
}, arguments) };

export function __wbg_get_b9b93047fe3cf45b(arg0, arg1) {
    const ret = arg0[arg1 >>> 0];
    return ret;
};

export function __wbg_getwithrefkey_1dc361bd10053bfe(arg0, arg1) {
    const ret = arg0[arg1];
    return ret;
};

export function __wbg_info_3daf2e093e091b66(arg0) {
    console.info(arg0);
};

export function __wbg_instanceof_ArrayBuffer_e14585432e3737fc(arg0) {
    let result;
    try {
        result = arg0 instanceof ArrayBuffer;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
};

export function __wbg_instanceof_Uint8Array_17156bcf118086a9(arg0) {
    let result;
    try {
        result = arg0 instanceof Uint8Array;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
};

export function __wbg_instruction_new(arg0) {
    const ret = Instruction.__wrap(arg0);
    return ret;
};

export function __wbg_isArray_a1eab7e0d067391b(arg0) {
    const ret = Array.isArray(arg0);
    return ret;
};

export function __wbg_isSafeInteger_343e2beeeece1bb0(arg0) {
    const ret = Number.isSafeInteger(arg0);
    return ret;
};

export function __wbg_iterator_9a24c88df860dc65() {
    const ret = Symbol.iterator;
    return ret;
};

export function __wbg_length_a446193dc22c12f8(arg0) {
    const ret = arg0.length;
    return ret;
};

export function __wbg_length_e2d2a49132c1b256(arg0) {
    const ret = arg0.length;
    return ret;
};

export function __wbg_log_c222819a41e063d3(arg0) {
    console.log(arg0);
};

export function __wbg_msCrypto_a61aeb35a24c1329(arg0) {
    const ret = arg0.msCrypto;
    return ret;
};

export function __wbg_msCrypto_ff35fce085fab2a3(arg0) {
    const ret = arg0.msCrypto;
    return ret;
};

export function __wbg_new0_f788a2397c7ca929() {
    const ret = new Date();
    return ret;
};

export function __wbg_new_405e22f390576ce2() {
    const ret = new Object();
    return ret;
};

export function __wbg_new_78feb108b6472713() {
    const ret = new Array();
    return ret;
};

export function __wbg_new_8a6f238a6ece86ea() {
    const ret = new Error();
    return ret;
};

export function __wbg_new_a12002a7f91c75be(arg0) {
    const ret = new Uint8Array(arg0);
    return ret;
};

export function __wbg_newnoargs_105ed471475aaf50(arg0, arg1) {
    const ret = new Function(getStringFromWasm0(arg0, arg1));
    return ret;
};

export function __wbg_newwithbyteoffsetandlength_d97e637ebe145a9a(arg0, arg1, arg2) {
    const ret = new Uint8Array(arg0, arg1 >>> 0, arg2 >>> 0);
    return ret;
};

export function __wbg_newwithlength_a381634e90c276d4(arg0) {
    const ret = new Uint8Array(arg0 >>> 0);
    return ret;
};

export function __wbg_newwithlength_c4c419ef0bc8a1f8(arg0) {
    const ret = new Array(arg0 >>> 0);
    return ret;
};

export function __wbg_next_25feadfc0913fea9(arg0) {
    const ret = arg0.next;
    return ret;
};

export function __wbg_next_6574e1a8a62d1055() { return handleError(function (arg0) {
    const ret = arg0.next();
    return ret;
}, arguments) };

export function __wbg_node_905d3e251edff8a2(arg0) {
    const ret = arg0.node;
    return ret;
};

export function __wbg_process_dc0fbacc7c1c06f7(arg0) {
    const ret = arg0.process;
    return ret;
};

export function __wbg_pubkey_new(arg0) {
    const ret = Pubkey.__wrap(arg0);
    return ret;
};

export function __wbg_push_737cfc8c1432c2c6(arg0, arg1) {
    const ret = arg0.push(arg1);
    return ret;
};

export function __wbg_randomFillSync_994ac6d9ade7a695(arg0, arg1, arg2) {
    arg0.randomFillSync(getArrayU8FromWasm0(arg1, arg2));
};

export function __wbg_randomFillSync_ac0988aba3254290() { return handleError(function (arg0, arg1) {
    arg0.randomFillSync(arg1);
}, arguments) };

export function __wbg_require_0d6aeaec3c042c88(arg0, arg1, arg2) {
    const ret = arg0.require(getStringFromWasm0(arg1, arg2));
    return ret;
};

export function __wbg_require_60cc747a6bc5215a() { return handleError(function () {
    const ret = module.require;
    return ret;
}, arguments) };

export function __wbg_self_25aabeb5a7b41685() { return handleError(function () {
    const ret = self.self;
    return ret;
}, arguments) };

export function __wbg_set_37837023f3d740e8(arg0, arg1, arg2) {
    arg0[arg1 >>> 0] = arg2;
};

export function __wbg_set_3f1d0b984ed272ed(arg0, arg1, arg2) {
    arg0[arg1] = arg2;
};

export function __wbg_set_65595bdd868b3009(arg0, arg1, arg2) {
    arg0.set(arg1, arg2 >>> 0);
};

export function __wbg_stack_0ed75d68575b0f3c(arg0, arg1) {
    const ret = arg1.stack;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
};

export function __wbg_static_accessor_GLOBAL_88a902d13a557d07() {
    const ret = typeof global === 'undefined' ? null : global;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
};

export function __wbg_static_accessor_GLOBAL_THIS_56578be7e9f832b0() {
    const ret = typeof globalThis === 'undefined' ? null : globalThis;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
};

export function __wbg_static_accessor_MODULE_ef3aa2eb251158a5() {
    const ret = module;
    return ret;
};

export function __wbg_static_accessor_SELF_37c5d418e4bf5819() {
    const ret = typeof self === 'undefined' ? null : self;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
};

export function __wbg_static_accessor_WINDOW_5de37043a91a9c40() {
    const ret = typeof window === 'undefined' ? null : window;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
};

export function __wbg_subarray_aa9065fa9dc5df96(arg0, arg1, arg2) {
    const ret = arg0.subarray(arg1 >>> 0, arg2 >>> 0);
    return ret;
};

export function __wbg_value_cd1ffa7b1ab794f1(arg0) {
    const ret = arg0.value;
    return ret;
};

export function __wbg_values_99f7a68c7f313d66(arg0) {
    const ret = arg0.values();
    return ret;
};

export function __wbg_versions_c01dfd4722a88165(arg0) {
    const ret = arg0.versions;
    return ret;
};

export function __wbg_warn_4ca3906c248c47c4(arg0) {
    console.warn(arg0);
};

export function __wbindgen_as_number(arg0) {
    const ret = +arg0;
    return ret;
};

export function __wbindgen_bigint_from_i128(arg0, arg1) {
    const ret = arg0 << BigInt(64) | BigInt.asUintN(64, arg1);
    return ret;
};

export function __wbindgen_bigint_from_i64(arg0) {
    const ret = arg0;
    return ret;
};

export function __wbindgen_bigint_from_u128(arg0, arg1) {
    const ret = BigInt.asUintN(64, arg0) << BigInt(64) | BigInt.asUintN(64, arg1);
    return ret;
};

export function __wbindgen_bigint_from_u64(arg0) {
    const ret = BigInt.asUintN(64, arg0);
    return ret;
};

export function __wbindgen_bigint_get_as_i64(arg0, arg1) {
    const v = arg1;
    const ret = typeof(v) === 'bigint' ? v : undefined;
    getDataViewMemory0().setBigInt64(arg0 + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
};

export function __wbindgen_boolean_get(arg0) {
    const v = arg0;
    const ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
    return ret;
};

export function __wbindgen_debug_string(arg0, arg1) {
    const ret = debugString(arg1);
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
};

export function __wbindgen_error_new(arg0, arg1) {
    const ret = new Error(getStringFromWasm0(arg0, arg1));
    return ret;
};

export function __wbindgen_in(arg0, arg1) {
    const ret = arg0 in arg1;
    return ret;
};

export function __wbindgen_init_externref_table() {
    const table = wasm.__wbindgen_export_4;
    const offset = table.grow(4);
    table.set(0, undefined);
    table.set(offset + 0, undefined);
    table.set(offset + 1, null);
    table.set(offset + 2, true);
    table.set(offset + 3, false);
    ;
};

export function __wbindgen_is_bigint(arg0) {
    const ret = typeof(arg0) === 'bigint';
    return ret;
};

export function __wbindgen_is_function(arg0) {
    const ret = typeof(arg0) === 'function';
    return ret;
};

export function __wbindgen_is_object(arg0) {
    const val = arg0;
    const ret = typeof(val) === 'object' && val !== null;
    return ret;
};

export function __wbindgen_is_string(arg0) {
    const ret = typeof(arg0) === 'string';
    return ret;
};

export function __wbindgen_is_undefined(arg0) {
    const ret = arg0 === undefined;
    return ret;
};

export function __wbindgen_jsval_eq(arg0, arg1) {
    const ret = arg0 === arg1;
    return ret;
};

export function __wbindgen_jsval_loose_eq(arg0, arg1) {
    const ret = arg0 == arg1;
    return ret;
};

export function __wbindgen_memory() {
    const ret = wasm.memory;
    return ret;
};

export function __wbindgen_number_get(arg0, arg1) {
    const obj = arg1;
    const ret = typeof(obj) === 'number' ? obj : undefined;
    getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
};

export function __wbindgen_number_new(arg0) {
    const ret = arg0;
    return ret;
};

export function __wbindgen_shr(arg0, arg1) {
    const ret = arg0 >> arg1;
    return ret;
};

export function __wbindgen_string_get(arg0, arg1) {
    const obj = arg1;
    const ret = typeof(obj) === 'string' ? obj : undefined;
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
};

export function __wbindgen_string_new(arg0, arg1) {
    const ret = getStringFromWasm0(arg0, arg1);
    return ret;
};

export function __wbindgen_throw(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

