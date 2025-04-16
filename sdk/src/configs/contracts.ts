import { type Address, zeroAddress } from "viem";

import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, BSС_MAINNET, BSС_TESTNET } from "./chains";

export const CONTRACTS = {
  [BSС_MAINNET]: {
    // bsc mainnet
    Treasury: "0xa44E7252a0C137748F523F112644042E5987FfC7",
    BUSD: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
    GMT: "0x99e92123eB77Bc8f999316f622e5222498438784",
    Vault: "0xc73A8DcAc88498FD4b4B1b2AaA37b0a2614Ff67B",
    Router: "0xD46B23D042E976F8666F554E928e0Dc7478a8E1f",
    Reader: "0x087A618fD25c92B61254DBe37b09E5E8065FeaE7",
    AmmFactory: "0xBCfCcbde45cE874adCB698cC183deBcF17952812",
    AmmFactoryV2: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
    OrderBook: "0x1111111111111111111111111111111111111111",
    OrderBookReader: "0x1111111111111111111111111111111111111111",
    GmxMigrator: "0xDEF2af818514c1Ca1A9bBe2a4D45E28f260063f9",
    USDG: "0x85E76cbf4893c1fbcB34dCF1239A91CE2A4CF5a7",
    NATIVE_TOKEN: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    XGMT: "0xe304ff0983922787Fd84BC9170CD21bF78B16B10",
    GMT_USDG_PAIR: "0xa41e57459f09a126F358E118b693789d088eA8A0",
    XGMT_USDG_PAIR: "0x0b622208fc0691C2486A3AE6B7C875b4A174b317",
    GMT_USDG_FARM: "0x3E8B08876c791dC880ADC8f965A02e53Bb9C0422",
    XGMT_USDG_FARM: "0x68D7ee2A16AB7c0Ee1D670BECd144166d2Ae0759",
    USDG_YIELD_TRACKER: "0x0EF0Cf825B8e9F89A43FfD392664131cFB4cfA89",
    XGMT_YIELD_TRACKER: "0x82A012A9b3003b18B6bCd6052cbbef7Fa4892e80",
    GMT_USDG_FARM_TRACKER_XGMT: "0x08FAb024BEfcb6068847726b2eccEAd18b6c23Cd",
    GMT_USDG_FARM_TRACKER_NATIVE: "0xd8E26637B34B2487Cad1f91808878a391134C5c2",
    XGMT_USDG_FARM_TRACKER_XGMT: "0x026A02F7F26C1AFccb9Cba7C4df3Dc810F4e92e8",
    XGMT_USDG_FARM_TRACKER_NATIVE: "0x22458CEbD14a9679b2880147d08CA1ce5aa40E84",
    AUTO: "0xa184088a740c695E156F91f5cC086a06bb78b827",
    AUTO_USDG_PAIR: "0x0523FD5C53ea5419B4DAF656BC1b157dDFE3ce50",
    AUTO_USDG_FARM: "0xE6958298328D02051769282628a3b4178D0F3A47",
    AUTO_USDG_FARM_TRACKER_XGMT: "0x093b8be41c1A30704De84a9521632f9a139c08bd",
    AUTO_USDG_FARM_TRACKER_NATIVE: "0x23ed48E5dce3acC7704d0ce275B7b9a0e346b63A",
    GMT_GMX_IOU: "0x47052469970C2484729875CC9E2dd2683fcE71fb",
    XGMT_GMX_IOU: "0xeB3733DFe3b68C9d26898De2493A3Bb59FDb4A7B",
    GMT_USDG_GMX_IOU: "0x481312655F81b5e249780A6a49735335BF6Ca7f4",
    XGMT_USDG_GMX_IOU: "0x8095F1A92526C304623483018aA28cC6E62EB1e1",
  },
  [BSС_TESTNET]: {
    // bsc testnet
    Vault: "0x1B183979a5cd95FAF392c8002dbF0D5A1C687D9a",
    Router: "0x10800f683aa564534497a5b67F45bE3556a955AB",
    Reader: "0x98D4742F1B6a821bae672Cd8721283b91996E454",
    AmmFactory: "0x6725f303b657a9451d8ba641348b6761a6cc7a17",
    AmmFactoryV2: "0x1111111111111111111111111111111111111111",
    OrderBook: "0x9afD7B4f0b58d65F6b2978D3581383a06b2ac4e9",
    OrderBookReader: "0x0713562970D1A802Fa3FeB1D15F9809943982Ea9",
    GmxMigrator: "0xDEF2af818514c1Ca1A9bBe2a4D45E28f260063f9",
    USDG: "0x2D549bdBf810523fe9cd660cC35fE05f0FcAa028",
    GMT: "0xedba0360a44f885ed390fad01aa34d00d2532817",
    NATIVE_TOKEN: "0x612777Eea37a44F7a95E3B101C39e1E2695fa6C2",
    XGMT: "0x28cba798eca1a3128ffd1b734afb93870f22e613",
    GMT_USDG_PAIR: "0xe0b0a315746f51932de033ab27223d85114c6b85",
    XGMT_USDG_PAIR: "0x0108de1eea192ce8448080c3d90a1560cf643fa0",
    GMT_USDG_FARM: "0xbe3cB06CE03cA692b77902040479572Ba8D01b0B",
    XGMT_USDG_FARM: "0x138E92195D4B99CE3618092D3F9FA830d9A69B4b",
    USDG_YIELD_TRACKER: "0x62B49Bc3bF252a5DB26D88ccc7E61119e3179B4f",
    XGMT_YIELD_TRACKER: "0x5F235A582e0993eE9466FeEb8F7B4682993a57d0",
    GMT_USDG_FARM_TRACKER_XGMT: "0x4f8EE3aE1152422cbCaFACd4e3041ba2D859913C",
    GMT_USDG_FARM_TRACKER_NATIVE: "0xd691B26E544Fe370f39A776964c991363aF72e56",
    XGMT_USDG_FARM_TRACKER_XGMT: "0xfd5617CFB082Ba9bcD62d654603972AE312bC695",
    XGMT_USDG_FARM_TRACKER_NATIVE: "0x0354387DD85b7D8aaD1611B3D167A384d6AE0c28",
    GMT_GMX_IOU: "0x47052469970C2484729875CC9E2dd2683fcE71fb",
    XGMT_GMX_IOU: "0xeB3733DFe3b68C9d26898De2493A3Bb59FDb4A7B",
    GMT_USDG_GMX_IOU: "0x481312655F81b5e249780A6a49735335BF6Ca7f4",
    XGMT_USDG_GMX_IOU: "0x8095F1A92526C304623483018aA28cC6E62EB1e1",
  },
  [ARBITRUM]: {
    // arbitrum mainnet
    Vault: "0x489ee077994B6658eAfA855C308275EAd8097C4A",
    Router: "0xaBBc5F99639c9B6bCb58544ddf04EFA6802F4064",
    VaultReader: "0xfebB9f4CAC4cD523598fE1C5771181440143F24A",
    Reader: "0x2b43c90D1B727cEe1Df34925bcd5Ace52Ec37694",
    GlpManager: "0x3963FfC9dff443c2A94f21b129D429891E32ec18",
    RewardRouter: "0x5E4766F932ce00aA4a1A82d3Da85adf15C5694A1",
    GlpRewardRouter: "0xB95DB5B167D75e6d04227CfFFA61069348d271F5",
    RewardReader: "0x8BFb8e82Ee4569aee78D03235ff465Bd436D40E0",
    GovToken: "0x2A29D3a792000750807cc401806d6fd539928481",
    NATIVE_TOKEN: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    GLP: "0x4277f8F2c384827B5273592FF7CeBd9f2C1ac258",
    GMX: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
    ES_GMX: "0xf42Ae1D54fd613C9bb14810b0588FaAa09a426cA",
    BN_GMX: "0x35247165119B69A40edD5304969560D0ef486921",
    USDG: "0x45096e7aA921f27590f8F19e457794EB09678141",
    ES_GMX_IOU: "0x6260101218eC4cCfFF1b778936C6f2400f95A954",
    StakedGmxTracker: "0x908C4D94D34924765f1eDc22A1DD098397c59dD4",
    BonusGmxTracker: "0x4d268a7d4C16ceB5a606c173Bd974984343fea13",
    FeeGmxTracker: "0xd2D1162512F927a7e282Ef43a362659E4F2a728F",
    StakedGlpTracker: "0x1aDDD80E6039594eE970E5872D247bf0414C8903",
    FeeGlpTracker: "0x4e971a87900b931fF39d1Aad67697F49835400b6",
    ExtendedGmxTracker: "0x0755D33e45eD2B874c9ebF5B279023c8Bd1e5E93",

    StakedGmxDistributor: "0x23208B91A98c7C1CD9FE63085BFf68311494F193",
    StakedGlpDistributor: "0x60519b48ec4183a61ca2B8e37869E675FD203b34",

    GmxVester: "0x199070DDfd1CFb69173aa2F7e20906F26B363004",
    GlpVester: "0xA75287d2f8b217273E7FCD7E86eF07D33972042E",
    AffiliateVester: "0x7c100c0F55A15221A4c1C5a25Db8C98A81df49B2",

    OrderBook: "0x09f77E8A13De9a35a7231028187e9fD5DB8a2ACB",
    OrderExecutor: "0x7257ac5D0a0aaC04AA7bA2AC0A6Eb742E332c3fB",
    OrderBookReader: "0xa27C20A7CF0e1C68C0460706bB674f98F362Bc21",

    PositionRouter: "0xb87a436B93fFE9D75c5cFA7bAcFff96430b09868",
    PositionManager: "0x75E42e6f01baf1D6022bEa862A28774a9f8a4A0C",

    UniswapGmxEthPool: "0x80A9ae39310abf666A87C743d6ebBD0E8C42158E",
    ReferralStorage: "0xe6fab3f0c7199b0d34d7fbe83394fc0e0d06e99d",
    ReferralReader: "0x8Aa382760BCdCe8644C33e6C2D52f6304A76F5c8",
    Timelock: "0xaa50bD556CE0Fe61D4A57718BA43177a3aB6A597",

    // Synthetics
    DataStore: "0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8",
    EventEmitter: "0xC8ee91A54287DB53897056e12D9819156D3822Fb",
    SubaccountRouter: "0xa329221a77BE08485f59310b873b14815c82E10D",
    ExchangeRouter: "0x602b805EedddBbD9ddff44A7dcBD46cb07849685",
    DepositVault: "0xF89e77e8Dc11691C9e8757e84aaFbCD8A67d7A55",
    WithdrawalVault: "0x0628D46b5D145f183AdB6Ef1f2c97eD1C4701C55",
    OrderVault: "0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5",
    ShiftVault: "0xfe99609C4AA83ff6816b64563Bdffd7fa68753Ab",
    SyntheticsReader: "0x0537C767cDAC0726c76Bb89e92904fe28fd02fE1",
    SyntheticsRouter: "0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6",

    GlvReader: "0x6a9505D0B44cFA863d9281EA5B0b34cB36243b45",
    GlvRouter: "0x994c598e3b0661bb805d53c6fa6b4504b23b68dd",
    GlvVault: "0x393053B58f9678C9c28c2cE941fF6cac49C3F8f9",

    GelatoRelayRouter: "0x63daFB2CA71767129AB8D0a0909383023C4AfF6E",
    SubaccountGelatoRelayRouter: "0x8964c82e1878d35bEd66d377f97e4F518b7A024F",

    ExternalHandler: "0x389CEf541397e872dC04421f166B5Bc2E0b374a5",
    OpenOceanRouter: "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64",

    ChainlinkPriceFeedProvider: "0x527FB0bCfF63C47761039bB386cFE181A92a4701",

    Multicall: "0x842ec2c7d803033edf55e478f461fc547bc54eb2",
  },
  [AVALANCHE]: {
    // avalanche
    Vault: "0x9ab2De34A33fB459b538c43f251eB825645e8595",
    Router: "0x5F719c2F1095F7B9fc68a68e35B51194f4b6abe8",
    VaultReader: "0x66eC8fc33A26feAEAe156afA3Cb46923651F6f0D",
    Reader: "0x2eFEE1950ededC65De687b40Fd30a7B5f4544aBd",
    GlpManager: "0xD152c7F25db7F4B95b7658323c5F33d176818EE4",
    RewardRouter: "0x091eD806490Cc58Fd514441499e58984cCce0630",
    GlpRewardRouter: "0xB70B91CE0771d3f4c81D87660f71Da31d48eB3B3",
    RewardReader: "0x04Fc11Bd28763872d143637a7c768bD96E44c1b6",
    GovToken: "0x0ff183E29f1924ad10475506D7722169010CecCb",
    NATIVE_TOKEN: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    GLP: "0x01234181085565ed162a948b6a5e88758CD7c7b8",
    GMX: "0x62edc0692BD897D2295872a9FFCac5425011c661",
    ES_GMX: "0xFf1489227BbAAC61a9209A08929E4c2a526DdD17",
    BN_GMX: "0x8087a341D32D445d9aC8aCc9c14F5781E04A26d2",
    USDG: "0xc0253c3cC6aa5Ab407b5795a04c28fB063273894",
    ES_GMX_IOU: "0x6260101218eC4cCfFF1b778936C6f2400f95A954", // placeholder address

    StakedGmxTracker: "0x2bD10f8E93B3669b6d42E74eEedC65dd1B0a1342",
    BonusGmxTracker: "0x908C4D94D34924765f1eDc22A1DD098397c59dD4",
    FeeGmxTracker: "0x4d268a7d4C16ceB5a606c173Bd974984343fea13",
    StakedGlpTracker: "0x9e295B5B976a184B14aD8cd72413aD846C299660",
    FeeGlpTracker: "0xd2D1162512F927a7e282Ef43a362659E4F2a728F",
    ExtendedGmxTracker: "0xB0D12Bf95CC1341d6C845C978daaf36F70b5910d",

    StakedGmxDistributor: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
    StakedGlpDistributor: "0xDd593Cf40734199afc9207eBe9ffF23dA4Bf7720",

    GmxVester: "0x472361d3cA5F49c8E633FB50385BfaD1e018b445",
    GlpVester: "0x62331A7Bd1dfB3A7642B7db50B5509E57CA3154A",
    AffiliateVester: "0x754eC029EF9926184b4CFDeA7756FbBAE7f326f7",

    OrderBook: "0x4296e307f108B2f583FF2F7B7270ee7831574Ae5",
    OrderExecutor: "0x4296e307f108B2f583FF2F7B7270ee7831574Ae5",
    OrderBookReader: "0xccFE3E576f8145403d3ce8f3c2f6519Dae40683B",

    PositionRouter: "0xffF6D276Bc37c61A23f06410Dce4A400f66420f8",
    PositionManager: "0xA21B83E579f4315951bA658654c371520BDcB866",

    TraderJoeGmxAvaxPool: "0x0c91a070f862666bbcce281346be45766d874d98",
    ReferralStorage: "0x827ed045002ecdabeb6e2b0d1604cf5fc3d322f8",
    ReferralReader: "0x505Ce16D3017be7D76a7C2631C0590E71A975083",
    Timelock: "0x8A68a039D555599Fd745f9343e8dE20C9eaFca75",

    // Synthetics
    DataStore: "0x2F0b22339414ADeD7D5F06f9D604c7fF5b2fe3f6",
    EventEmitter: "0xDb17B211c34240B014ab6d61d4A31FA0C0e20c26",
    SubaccountRouter: "0x5aEb6AD978f59e220aA9099e09574e1c5E03AafD",
    ExchangeRouter: "0xFa843af557824Be5127eaCB3c4B5D86EADEB73A1",
    DepositVault: "0x90c670825d0C62ede1c5ee9571d6d9a17A722DFF",
    WithdrawalVault: "0xf5F30B10141E1F63FC11eD772931A8294a591996",
    OrderVault: "0xD3D60D22d415aD43b7e64b510D86A30f19B1B12C",
    ShiftVault: "0x7fC46CCb386e9bbBFB49A2639002734C3Ec52b39",
    SyntheticsReader: "0x618fCEe30D9A26e8533C3B244CAd2D6486AFf655",
    SyntheticsRouter: "0x820F5FfC5b525cD4d88Cd91aCf2c28F16530Cc68",

    GlvReader: "0xae9596a1C438675AcC75f69d32E21Ac9c8fF99bD",
    GlvRouter: "0x16500c1d8ffe2f695d8dcadf753f664993287ae4",
    GlvVault: "0x527FB0bCfF63C47761039bB386cFE181A92a4701",

    GelatoRelayRouter: "0x035A9A047d20a486e14A613B04d5a95d7A617c5D",
    SubaccountGelatoRelayRouter: "0x3B753c0D0aE55530f24532B8Bb9d0bAcD5B675C0",

    ExternalHandler: "0xD149573a098223a9185433290a5A5CDbFa54a8A9",
    OpenOceanRouter: "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64",

    ChainlinkPriceFeedProvider: "0x713c6a2479f6C079055A6AD3690D95dEDCEf9e1e",

    Multicall: "0xcA11bde05977b3631167028862bE2a173976CA11",
  },

  [AVALANCHE_FUJI]: {
    Vault: zeroAddress,
    Router: zeroAddress,
    VaultReader: zeroAddress,
    Reader: zeroAddress,
    GlpManager: zeroAddress,
    RewardRouter: zeroAddress,
    RewardReader: zeroAddress,
    GlpRewardRouter: zeroAddress,
    NATIVE_TOKEN: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
    GLP: zeroAddress,
    GMX: zeroAddress,
    ES_GMX: zeroAddress,
    BN_GMX: zeroAddress,
    USDG: zeroAddress,
    ES_GMX_IOU: zeroAddress,

    StakedGmxTracker: zeroAddress,
    BonusGmxTracker: zeroAddress,
    FeeGmxTracker: zeroAddress,
    StakedGlpTracker: zeroAddress,
    FeeGlpTracker: zeroAddress,
    ExtendedGmxTracker: zeroAddress,

    StakedGmxDistributor: zeroAddress,
    StakedGlpDistributor: zeroAddress,

    GmxVester: zeroAddress,
    GlpVester: zeroAddress,
    AffiliateVester: zeroAddress,

    OrderBook: zeroAddress,
    OrderExecutor: zeroAddress,
    OrderBookReader: zeroAddress,

    PositionRouter: zeroAddress,
    PositionManager: zeroAddress,

    TraderJoeGmxAvaxPool: zeroAddress,
    ReferralStorage: "0x58726dB901C9DF3654F45a37DD307a0C44b6420e",
    ReferralReader: zeroAddress,

    // Synthetics
    DataStore: "0xEA1BFb4Ea9A412dCCd63454AbC127431eBB0F0d4",
    EventEmitter: "0xc67D98AC5803aFD776958622CeEE332A0B2CabB9",
    ExchangeRouter: "0x52A1c10c462ca4e5219d0Eb4da5052cc73F9050D",
    SubaccountRouter: "0x0595f01860aa5c4C6091EED096515b4b9FE372CE",
    DepositVault: "0x2964d242233036C8BDC1ADC795bB4DeA6fb929f2",
    WithdrawalVault: "0x74d49B6A630Bf519bDb6E4efc4354C420418A6A2",
    OrderVault: "0x25D23e8E655727F2687CC808BB9589525A6F599B",
    ShiftVault: "0x257D0EA0B040E2Cd1D456fB4C66d7814102aD346",
    SyntheticsReader: "0x16Fb5b8846fbfAe09c034fCdF3D3F9492484DA80",
    SyntheticsRouter: "0x5e7d61e4C52123ADF651961e4833aCc349b61491",
    Timelock: zeroAddress,

    GlvReader: "0x4599Ed5939C673505B7AFcd020E1d603b0dCAf69",
    GlvRouter: "0x377d979AB35Cd848497707ffa6Ee91783f925b80",
    GlvVault: "0x76f93b5240DF811a3fc32bEDd58daA5784e46C96",

    SubaccountGelatoRelayRouter: zeroAddress,
    GelatoRelayRouter: zeroAddress,
    OpenOceanRouter: zeroAddress,

    ExternalHandler: "0x0d9F90c66C392c4d0e70EE0d399c43729B942512",

    Multicall: "0x0f53e512b49202a37c81c6085417C9a9005F2196",
  },

  [ARBITRUM_SEPOLIA]: {
    AdlHandler: "0x726678f4BBeF7AF17cD5243fDB88c4F789E580b9",
    AdlUtils: "0x6132b1EA5Bc896525B80a279E402fBC6BC330200",
    AutoCancelSyncer: "0x15B884D0100EfaAc2d6B4572354f0612092Be5F9",
    BaseOrderUtils: "0x44A748f3C3E96e86DD1a556F52E482A0dad5E2B0",
    CallbackUtils: "0x84b7f2d4738bd6Df38eaEc69fbfE9bd907A85492",
    ChainReader: "0xFA82fBBcd7F5FaC287d92E85D6710360B8e5978B",
    ChainlinkDataStreamProvider: "0x7fD07a690452022Ca3fC5C6DC8F775Fd7b3fF667",
    ChainlinkPriceFeedProvider: "0x30167Ed1928a95d8AfA695A90Cfc2b5641dBC419",
    Config: "0x78AE3e2ad6d5Da3F79a73933C3d968DAdF6F3136",
    ConfigSyncer: "0xdeaC9ea3c72C102f2a9654b8E1A14Ef86Cdd3146",
    ConfigTimelockController: "0x6019F88623BE943A832384AE225C36B9C308d2C6",
    ConfigUtils: "0x2f1F0567Ac3279536478494f63B6436B6BbAfb90",
    DataStore: "0xB558f529F97a405178E2437737F97Bb10eFadAfE",
    DecreaseOrderUtils: "0xF0D56D24E88C711BC475dA6534F32BbaF63e3Ff4",
    DecreasePositionCollateralUtils: "0xcBF1f3bF510485812094f727EFeD6cbBb162c0Be",
    DecreasePositionSwapUtils: "0xECc0aDA256481E4BEa3Ec663599420B807544D06",
    DecreasePositionUtils: "0xba5E828427Ff90aa9495CC0A3003d9B41aDe9687",
    DepositEventUtils: "0x5DC01E477c3dd105B25B48C5f645B8e7FDE9aa5E",
    DepositHandler: "0x0E1b43919eF5dDAdD7b6458BdbfF2baF16029A5A",
    DepositStoreUtils: "0x9C1E954F5947b326B976591d5deca4F9804feC6C",
    DepositUtils: "0x4092cC8E8dC0893f93f35f5998585a6109d91a46",
    DepositVault: "0x971f55686a9bb62a41D8cB6B4f7e75215341cD56",
    EventEmitter: "0x3Ab21B44cffFD87a69F909f40dD2335ff68945A8",
    ExchangeRouter: "0xf82Cc6EB57F8FF86bc5c5e90B8BA83DbBFB517eE",
    ExecuteDepositUtils: "0x2C6EadA1f2bbDbE203141a18A855fF3094cbBEc8",
    ExecuteGlvDepositUtils: "0x8a0Eb4d60114f0B6585DfdBA024AFe4944d9d716",
    ExecuteOrderUtils: "0xAB8926bBE4D22360400C73059A64713CEc42A765",
    ExecuteWithdrawalUtils: "0x18e61A8934e6f2E3412eB6f462e7a322441cA115",
    ExternalHandler: "0xfd056C9432F9f1d1AD7835Ae7d021c8ba27A19DC",
    FeeHandler: "0x89D2Ab4D3Cb3b39AB7c511672068837e7f5e4b96",
    FeeUtils: "0x96b2004d52d30b21385E6757b1EEbd1565864f6A",
    GasUtils: "0x5FC0C693D97Cb373E646D02DC5B6558E1f372E29",
    GelatoRelayRouter: "0x6C8a318872AE1BaF1742a56e87ffEe82FC3994D8",
    GlvDepositCalc: "0x239CE29D9c09cA72132C47837d292035Ce632eCF",
    GlvDepositEventUtils: "0x0A33200Ad7fdD6FA061203712128357F1b10A9fB",
    GlvDepositStoreUtils: "0xD5EE3ECAF5754CE5Ff74847d0caf094EBB12ed5e",
    GlvDepositUtils: "0x415EEE291B4a69F802f84c64b52d12b9413FA7f4",
    GlvFactory: "0x338e24962709F9b79d27eaa0eA90eaB222496DF1",
    GlvHandler: "0xd2540f69bcd303953809B10eF3224728a11D132E",
    GlvReader: "0xf4d496D3811d37ae4b4Fcd5Ce0A67B43d865aBE6",
    GlvRouter: "0x4e1fB0F05732A63d2942cc50Ab32a876c1c717eC",
    GlvShiftEventUtils: "0xb2396EB908C71794343854eEE2F7bfDbef543C34",
    GlvShiftStoreUtils: "0x8D4b4cdb52038007eF84337CDECCA14aA039b8cc",
    GlvShiftUtils: "0xe33EcFfD2CBA67FC7234bAe25B268dA794dF99df",
    GlvStoreUtils: "0xEE26351BF40AAd1b200E008B98e706aDF9DaaBC9",
    GlvUtils: "0x5C5a430B7680C69e9Fbc772E27E42b77602E0bE4",
    GlvVault: "0x2A1D40607D5F758f5633585E354cB89b9371c5A5",
    GlvWithdrawalEventUtils: "0x06Dd978511f1117e1a9879543b5CD66Ae933AfF8",
    GlvWithdrawalStoreUtils: "0x6cdc8436498C7B8dAb46276e54dC012335C0eA6c",
    GlvWithdrawalUtils: "0xdb267Ed11340e70fB119032fEc6068cC26EE0676",
    GmOracleProvider: "0x192e82A18a4ab446dD9968f055431b60640B155D",
    GovTimelockController: "0x8fC16f86C8bd9F7715e81025A61940168225ee53",
    GovToken: "0x6E9B636428d39EEb7b9444767E1Eda5cb203d557",
    IncreaseOrderUtils: "0xc120bD6756171691fC2e2D5EE876ae79526412c1",
    IncreasePositionUtils: "0xc67378a92fac800fEa1702D8C65627BA9532eE03",
    LayerZeroProvider: "0x7A686280e65b4f6a7f657FDA2403dcFfF4b031B8",
    LiquidationHandler: "0xF42032E28Fd50A36C932eB53b0bFC5EbDA9A332C",
    LiquidationUtils: "0x82AA12C60cb25ee33Fc817F170A9bB32eb4c2924",
    MarketEventUtils: "0x324C13973752346f9924fd4660BE22a5E4d44e0A",
    MarketFactory: "0xbE4fc91B79cAAF0A497884B67506D95Cb0fa6209",
    MarketPositionImpactPoolUtils: "0xfEA2cd85Fe4C95cf6b72C6B9FfBD0d6f13Ebd82e",
    MarketStoreUtils: "0x2c9D0eEB29729F262606a60C7Ae66550DF9E3a60",
    MarketUtils: "0x6076240e5BA3D1fF6b72F05CC495B154AaeD3027",
    MockPriceFeed: "0x74a4b0677cc68C8D7d2B20f1DfdF73f52B41aA23",
    Multicall3: "0x5AB1ee8913415bCF4865728cAd78aA96E95DC531",
    MultichainClaimsRouter: "0x018D223310977D37728b1dA2fB11aCdeb30Bb460",
    MultichainGlvRouter: "0xBA46e0091552d370cd4297d685BD00ffA8cE6645",
    MultichainGmRouter: "0x386077A200cDff2B2CAAD9b18410515CA245Bf03",
    MultichainOrderRouter: "0xA3064796Fb41D0Dc0b32dc13AD927be703119CF9",
    MultichainOrderRouterUtils: "0x45BF1D45B07CEDCf86f90386cdE807B806191996",
    MultichainTransferRouter: "0x243eb1CA4787DA69910c65E149B5acF34FE22eDc",
    MultichainUtils: "0xC3413710233301978376C4b8484f5753ac854853",
    MultichainVault: "0x9ad366B9157322d3CC7abeD4242FA4D73e7FFb51",
    Oracle: "0x612aF8be55b46676A7034B80c70baadC62fdddb4",
    OracleStore: "0x34EEf098620a6A24303AF7f61FE9f144ba37670F",
    OrderEventUtils: "0x70CfB1C24850ae8DE824aed4D688C996E9334b2f",
    OrderHandler: "0x9D16Ec2BEB7A9D242330C37F5E0360cAf792F81c",
    OrderStoreUtils: "0x51C651B65933958DB6775295C78671E510dB37F2",
    OrderUtils: "0xc039578b11A47E42e96c6D1241754ec9C5D029e8",
    OrderVault: "0xD2A2044f62D7cD77470AC237408f9f59AcB5965E",
    PositionEventUtils: "0xB00ed2A3E806616a0c8554895fEF76D33a21522C",
    PositionPricingUtils: "0xEDb5F6ed23262baCA41D540E0A7c180B86EB262f",
    PositionStoreUtils: "0x3ECAfEEdb3e644054EB3E7a66D3014F981e7F88D",
    PositionUtils: "0x732601695aF10A0824d28526F49e15201bDf8035",
    Printer: "0x2579A3aabF98aF7837AeA56150db7AcCd2D4D510",
    ProtocolGovernor: "0x8fFa237F5288926341d94E36281b38E2DB96b129",
    // Technically it is just Reader
    SyntheticsReader: "0xd33C20A3a74c8ac12a531F9dDe8196A767f64438",
    ReaderDepositUtils: "0xFf35aF60969523b40240ace7F24E8F44487C22a8",
    ReaderPositionUtils: "0xef6f9C657d78BA1aa331b2f0Fe256C59c6fc46Fe",
    ReaderPricingUtils: "0xCeEd5Afb37e19184d4BF9Fea9452Ab9eEF94d47F",
    ReaderUtils: "0x53d7519aCA592E3BcCeC08Bf5136B63576957dEF",
    ReaderWithdrawalUtils: "0x59AeB1edB4bf3359f944D77b3e42945fc5b84ea5",
    ReferralEventUtils: "0xe12Cbf833fC27cdF70f4BC95AD3ea963BE85E90e",
    ReferralStorage: "0x0d7dc71C86916FdeE09dE34c68139Eb5a233610c",
    ReferralUtils: "0xff9df6f06AeA0097297d1Ee823e3b1e7697bC085",
    RelayUtils: "0xdD630467F18933b7189bE6D6241C37af60168e8a",
    RoleStore: "0xB0681d729Fc85C93b442Eaf110A847dB8d3cF28F",
    // Technically it is just Router
    SyntheticsRouter: "0xd15B8b178981BFEF71f54BD5C9c4992424a73E5A",
    ShiftEventUtils: "0x28EF80679569E165acadF7a6DA47c3ef43101e14",
    ShiftHandler: "0x3C91063d31931E92BF33708553E62fDb2A12FA6D",
    ShiftStoreUtils: "0x91F4288ff3f307a6880C8d57Ab1ead0548F5fF53",
    ShiftUtils: "0xf54CA3999b2E5A14B91cb4Ee6683E2AD98ECa845",
    ShiftVault: "0x2937Fd7b9afb8Cc3B793FB7606dFe7Dbb16fEe25",
    SubaccountGelatoRelayRouter: "0x65F9969993055b639041272fCaD59A85157F67b3",
    SubaccountRouter: "0xbcFEBa63C834a7Fdf30c5f8fFAD91Eeac03Ec72e",
    SubaccountUtils: "0x921Fd1087350B87fB017361CE8A07d6b0f53d92f",
    SwapHandler: "0xEa32Bc218feeE75C00d6E6181fc352DE64Bc72BB",
    SwapOrderUtils: "0x0a458C96Ac0B2a130DA4BdF1aAdD4cb7Be036d11",
    SwapPricingUtils: "0xA9E457052F9F1Eed165E474018e6c635c1d429de",
    SwapUtils: "0xa68992f355d397Dc7f0e403Df622C27de3DFDA77",
    Timelock: "0x386a7fe1Ee4c647bE6764a8943B75AD8fe17013d",
    TimelockConfig: "0xf495eD65fCbC911c9FCE11c5fb4F63EE2CE09cB0",
    TimestampInitializer: "0xa89ecf80Db5B4058999F9bE7eB4350890325Bc9a",
    WithdrawalEventUtils: "0xd0c59a43926A2BaFFdB6c178eE5f7D1857dfA938",
    WithdrawalHandler: "0xa51181CC37D23d3a4b4B263D2B54e1F34B834432",
    WithdrawalStoreUtils: "0x045D441a2019c6b18114e796285978BCc623e7ee",
    WithdrawalUtils: "0x1064c97A941AE1DA341f7C296e8418e993629594",
    WithdrawalVault: "0xA9337AeE9360DaeC439830A69b23877c00972a25",

    Multicall: "0xA115146782b7143fAdB3065D86eACB54c169d092",
    NATIVE_TOKEN: "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73",
    GLP: zeroAddress,
    GMX: zeroAddress,
    ES_GMX: zeroAddress,
    BN_GMX: zeroAddress,
    USDG: zeroAddress,
    ES_GMX_IOU: zeroAddress,
    OpenOceanRouter: zeroAddress,
    Vault: zeroAddress,
    PositionRouter: zeroAddress,
    RewardRouter: zeroAddress,
    StakedGmxTracker: zeroAddress,
    BonusGmxTracker: zeroAddress,
    FeeGmxTracker: zeroAddress,
    StakedGlpTracker: zeroAddress,
    FeeGlpTracker: zeroAddress,
    ExtendedGmxTracker: zeroAddress,
    StakedGmxDistributor: zeroAddress,
    StakedGlpDistributor: zeroAddress,
    GmxVester: zeroAddress,
    GlpVester: zeroAddress,
    AffiliateVester: zeroAddress,
    Router: zeroAddress,
    VaultReader: zeroAddress,
    Reader: zeroAddress,
    GlpManager: zeroAddress,
    RewardReader: zeroAddress,
    GlpRewardRouter: zeroAddress,
  },
};

export function getContract(chainId: number, name: string): Address {
  if (!CONTRACTS[chainId]) {
    throw new Error(`Unknown chainId ${chainId}`);
  }

  if (!CONTRACTS[chainId][name]) {
    throw new Error(`Unknown contract "${name}" for chainId ${chainId}`);
  }

  return CONTRACTS[chainId][name];
}
