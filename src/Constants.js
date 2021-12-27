import { MAINNET, TESTNET, ARBITRUM_TESTNET, ARBITRUM, AVALANCHE, expandDecimals } from "./Helpers"

const INCREASE_ORDER_EXECUTION_GAS_LIMIT = 1000000 // https://arbiscan.io/tx/0x63e08dab7044af40f074c1458734ad6aba61061c9161a002f02cb65a23e518db
const DECREASE_ORDER_EXECUTION_GAS_LIMIT = 1000000 // https://arbiscan.io/tx/0xa27b456717e0d092992ff013a93d106043e5d9dbdd5761ddebd06d9c9dc6cd39
const SWAP_ORDER_EXECUTION_GAS_LIMIT = 1000000 // https://arbiscan.io/tx/0x18070f49e94d428bf3c7d3c249b8e4cdb18ea6a3f4945de52b705187827a6b73

const ARBITRUM_ORDER_EXECUTION_GAS_PRICE = expandDecimals(1, 9) // 1 gwei
const AVALANCHE_ORDER_EXECUTION_GAS_PRICE = expandDecimals(10, 9)

const constants = {
  [MAINNET]: {
    networkTokenSymbol: "BNB",
    defaultCollateralSymbol: "BUSD",
    defaultFlagOrdersEnabled: false,
    positionReaderPropsLength: 8,
    v2: false
  },

  [TESTNET]: {
    networkTokenSymbol: "BNB",
    defaultCollateralSymbol: "BUSD",
    defaultFlagOrdersEnabled: true,
    positionReaderPropsLength: 8,
    v2: false
  },

  [ARBITRUM_TESTNET]: {
    networkTokenSymbol: "ETH",
    defaultCollateralSymbol: "USDC",
    defaultFlagOrdersEnabled: false,
    positionReaderPropsLength: 9,
    v2: true
  },

  [ARBITRUM]: {
    networkTokenSymbol: "ETH",
    nativeTokenSymbol: "WETH",
    defaultCollateralSymbol: "USDC",
    defaultFlagOrdersEnabled: false,
    positionReaderPropsLength: 9,
    v2: true,

    SWAP_ORDER_EXECUTION_GAS_FEE: ARBITRUM_ORDER_EXECUTION_GAS_PRICE.mul(SWAP_ORDER_EXECUTION_GAS_LIMIT),
    INCREASE_ORDER_EXECUTION_GAS_FEE: ARBITRUM_ORDER_EXECUTION_GAS_PRICE.mul(INCREASE_ORDER_EXECUTION_GAS_LIMIT),
    DECREASE_ORDER_EXECUTION_GAS_FEE: ARBITRUM_ORDER_EXECUTION_GAS_PRICE.mul(DECREASE_ORDER_EXECUTION_GAS_LIMIT)
  },

  [AVALANCHE]: {
    networkTokenSymbol: "AVAX",
    nativeTokenSymbol: "WAVAX",
    defaultCollateralSymbol: "MIM",
    defaultFlagOrdersEnabled: true,
    positionReaderPropsLength: 9,
    v2: true,

    SWAP_ORDER_EXECUTION_GAS_FEE: AVALANCHE_ORDER_EXECUTION_GAS_PRICE.mul(SWAP_ORDER_EXECUTION_GAS_LIMIT),
    INCREASE_ORDER_EXECUTION_GAS_FEE: AVALANCHE_ORDER_EXECUTION_GAS_PRICE.mul(INCREASE_ORDER_EXECUTION_GAS_LIMIT),
    DECREASE_ORDER_EXECUTION_GAS_FEE: AVALANCHE_ORDER_EXECUTION_GAS_PRICE.mul(DECREASE_ORDER_EXECUTION_GAS_LIMIT)
  }
}

export const getConstant = (chainId, key) => {
  if (!constants[chainId]) {
    throw new Error(`Unsupported chainId ${chainId}`)
  }
  if (!(key in constants[chainId])) {
    throw new Error(`Key ${key} does not exist for chainId ${chainId}`)
  }
  return constants[chainId][key]
}
