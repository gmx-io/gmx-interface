import { ethers } from "ethers";
import {
  ARBITRUM,
  ARBITRUM_TESTNET,
  AVALANCHE,
  AVALANCHE_FUJI,
  MAINNET,
  TESTNET,
  SEPOLIA_TESTNET,
  OPTIMISM_GOERLI_TESTNET,
  OPTIMISM_MAINNET,
  BLAST_SEPOLIA_TESTNET,
  MORPH_HOLESKY,
  OPBNB_TESTNET,
  MORPH_MAINNET,
} from "./chains";

const { AddressZero } = ethers.constants;

export const XGMT_EXCLUDED_ACCOUNTS = [
  "0x330eef6b9b1ea6edd620c825c9919dc8b611d5d5",
  "0xd9b1c23411adbb984b1c4be515fafc47a12898b2",
  "0xa633158288520807f91ccc98aa58e0ea43acb400",
  "0xffd0a93b4362052a336a7b22494f1b77018dd34b",
];

const CONTRACTS = {
  [MAINNET]: {
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
  [TESTNET]: {
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
  [ARBITRUM_TESTNET]: {
    // arbitrum testnet
    Vault: "0xBc9BC47A7aB63db1E0030dC7B60DDcDe29CF4Ffb",
    Router: "0xe0d4662cdfa2d71477A7DF367d5541421FAC2547",
    VaultReader: "0xFc371E380262536c819D12B9569106bf032cC41c",
    Reader: "0x2E093c70E3A7E4919611d2555dFd8D697d2fC0a1",
    GlpManager: "0xD875d99E09118d2Be80579b9d23E83469077b498",
    RewardRouter: "0x0000000000000000000000000000000000000000",
    RewardReader: "0x0000000000000000000000000000000000000000",
    NATIVE_TOKEN: "0xB47e6A5f8b33b3F17603C83a0535A9dcD7E32681",
    GLP: "0xb4f81Fa74e06b5f762A104e47276BA9b2929cb27",
    GMX: "0x0000000000000000000000000000000000000000",
    ES_GMX: "0x0000000000000000000000000000000000000000",
    BN_GMX: "0x0000000000000000000000000000000000000000",
    USDG: "0xBCDCaF67193Bf5C57be08623278fCB69f4cA9e68",
    ES_GMX_IOU: "0x0000000000000000000000000000000000000000",
    StakedGmxTracker: "0x0000000000000000000000000000000000000000",
    BonusGmxTracker: "0x0000000000000000000000000000000000000000",
    FeeGmxTracker: "0x0000000000000000000000000000000000000000",
    StakedGlpTracker: "0x0000000000000000000000000000000000000000",
    FeeGlpTracker: "0x0000000000000000000000000000000000000000",

    StakedGmxDistributor: "0x0000000000000000000000000000000000000000",
    StakedGlpDistributor: "0x0000000000000000000000000000000000000000",

    GmxVester: "0x0000000000000000000000000000000000000000",
    GlpVester: "0x0000000000000000000000000000000000000000",

    OrderBook: "0xebD147E5136879520dDaDf1cA8FBa48050EFf016",
    OrderBookReader: "0xC492c8d82DC576Ad870707bb40EDb63E2026111E",

    PositionRouter: "0xB4bB78cd12B097603e2b55D2556c09C17a5815F8",
    PositionManager: "0x168aDa266c2f10C1F37973B213d6178551030e44",

    // UniswapGmxEthPool: "0x80A9ae39310abf666A87C743d6ebBD0E8C42158E",
    ReferralStorage: "0x0000000000000000000000000000000000000000",
    ReferralReader: "0x0000000000000000000000000000000000000000",

    Multicall: "0xcA11bde05977b3631167028862bE2a173976CA11",
  },
  [ARBITRUM]: {
    // arbitrum mainnet
    Vault: "0x489ee077994B6658eAfA855C308275EAd8097C4A",
    Router: "0xaBBc5F99639c9B6bCb58544ddf04EFA6802F4064",
    VaultReader: "0xfebB9f4CAC4cD523598fE1C5771181440143F24A",
    Reader: "0x2b43c90D1B727cEe1Df34925bcd5Ace52Ec37694",
    GlpManager: "0x3963FfC9dff443c2A94f21b129D429891E32ec18",
    RewardRouter: "0xA906F338CB21815cBc4Bc87ace9e68c87eF8d8F1",
    GlpRewardRouter: "0xB95DB5B167D75e6d04227CfFFA61069348d271F5",
    RewardReader: "0x8BFb8e82Ee4569aee78D03235ff465Bd436D40E0",
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

    StakedGmxDistributor: "0x23208B91A98c7C1CD9FE63085BFf68311494F193",
    StakedGlpDistributor: "0x60519b48ec4183a61ca2B8e37869E675FD203b34",

    GmxVester: "0x199070DDfd1CFb69173aa2F7e20906F26B363004",
    GlpVester: "0xA75287d2f8b217273E7FCD7E86eF07D33972042E",

    OrderBook: "0x09f77E8A13De9a35a7231028187e9fD5DB8a2ACB",
    OrderExecutor: "0x7257ac5D0a0aaC04AA7bA2AC0A6Eb742E332c3fB",
    OrderBookReader: "0xa27C20A7CF0e1C68C0460706bB674f98F362Bc21",

    PositionRouter: "0xb87a436B93fFE9D75c5cFA7bAcFff96430b09868",
    PositionManager: "0x75E42e6f01baf1D6022bEa862A28774a9f8a4A0C",

    UniswapGmxEthPool: "0x80A9ae39310abf666A87C743d6ebBD0E8C42158E",
    ReferralStorage: "0xe6fab3f0c7199b0d34d7fbe83394fc0e0d06e99d",
    ReferralReader: "0x8Aa382760BCdCe8644C33e6C2D52f6304A76F5c8",

    Multicall: "0xcA11bde05977b3631167028862bE2a173976CA11",
  },
  [AVALANCHE]: {
    // avalanche
    Vault: "0x9ab2De34A33fB459b538c43f251eB825645e8595",
    Router: "0x5F719c2F1095F7B9fc68a68e35B51194f4b6abe8",
    VaultReader: "0x66eC8fc33A26feAEAe156afA3Cb46923651F6f0D",
    Reader: "0x2eFEE1950ededC65De687b40Fd30a7B5f4544aBd",
    GlpManager: "0xD152c7F25db7F4B95b7658323c5F33d176818EE4",
    RewardRouter: "0x82147C5A7E850eA4E28155DF107F2590fD4ba327",
    GlpRewardRouter: "0xB70B91CE0771d3f4c81D87660f71Da31d48eB3B3",
    RewardReader: "0x04Fc11Bd28763872d143637a7c768bD96E44c1b6",
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

    StakedGmxDistributor: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
    StakedGlpDistributor: "0xDd593Cf40734199afc9207eBe9ffF23dA4Bf7720",

    GmxVester: "0x472361d3cA5F49c8E633FB50385BfaD1e018b445",
    GlpVester: "0x62331A7Bd1dfB3A7642B7db50B5509E57CA3154A",

    OrderBook: "0x4296e307f108B2f583FF2F7B7270ee7831574Ae5",
    OrderExecutor: "0x4296e307f108B2f583FF2F7B7270ee7831574Ae5",
    OrderBookReader: "0xccFE3E576f8145403d3ce8f3c2f6519Dae40683B",

    PositionRouter: "0xffF6D276Bc37c61A23f06410Dce4A400f66420f8",
    PositionManager: "0xA21B83E579f4315951bA658654c371520BDcB866",

    TraderJoeGmxAvaxPool: "0x0c91a070f862666bbcce281346be45766d874d98",
    ReferralStorage: "0x827ed045002ecdabeb6e2b0d1604cf5fc3d322f8",
    ReferralReader: "0x505Ce16D3017be7D76a7C2631C0590E71A975083",

    Multicall: "0xcA11bde05977b3631167028862bE2a173976CA11",
  },

  [AVALANCHE_FUJI]: {
    Vault: AddressZero,
    Router: AddressZero,
    VaultReader: AddressZero,
    Reader: AddressZero,
    GlpManager: AddressZero,
    RewardRouter: AddressZero,
    RewardReader: AddressZero,
    NATIVE_TOKEN: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
    GLP: AddressZero,
    GMX: AddressZero,
    ES_GMX: AddressZero,
    BN_GMX: AddressZero,
    USDG: AddressZero,
    ES_GMX_IOU: AddressZero,

    StakedGmxTracker: AddressZero,
    BonusGmxTracker: AddressZero,
    FeeGmxTracker: AddressZero,
    StakedGlpTracker: AddressZero,
    FeeGlpTracker: AddressZero,

    StakedGmxDistributor: AddressZero,
    StakedGlpDistributor: AddressZero,

    GmxVester: AddressZero,
    GlpVester: AddressZero,

    OrderBook: AddressZero,
    OrderExecutor: AddressZero,
    OrderBookReader: AddressZero,

    PositionRouter: AddressZero,
    PositionManager: AddressZero,

    TraderJoeGmxAvaxPool: AddressZero,
    ReferralStorage: AddressZero,
    ReferralReader: AddressZero,
  },
  [SEPOLIA_TESTNET]: {
    Vault: "0xB8dBb210b7E501eF436693E0ab9dF75114dB0a9f",
    Router: "0x540F02Cb216f0828335aB28467fA66361044D8Cc",
    VaultReader: "0xeBEA904f24E9ccF4E36Bb3bac9fAA42ef5b79861",
    Reader: "0x432069dFB1fb1344B9FbA32b6f140fF9611ab79d",
    GlpManager: "0x45182327566672AAD7109F399A1fec5B0fE33374",
    RewardRouter: "0x1BD2c3CfBe36EbdC2a6159B40Ba43c9871feB090",
    GlpRewardRouter: "0x1BD2c3CfBe36EbdC2a6159B40Ba43c9871feB090",
    RewardReader: "0x107ef75ADbC47B0A24bea95dCe3eBCa848092dEe",
    NATIVE_TOKEN: "0xa62C17D6FBda8Aa177804e02A92A42AB5106b395",
    GLP: "0xa3B355696E9372C8f6D51D6aA1555718b5f48696",
    GMX: "0x3A8dE77a361AE3ab8F975E7Fd0D5af5Cf53CaE91",
    ES_GMX: "0x23dDD4D07CBEfadd660bEa61f4FBD76BD0d4962e",
    BN_GMX: "0x45bD998462c72a6Abc019Bd26A57d2a8C24bEE99",
    USDG: "0xE9FA414A3E2eEF175426b60c441304fc4334f77e",
    ES_GMX_IOU: AddressZero,
    StakedGmxTracker: "0xB9845F054c5a5C9b95D59d5375329DeC23EF8C61",
    BonusGmxTracker: "0x5f16E19dB914EB757a11e1120F03459124f1C2a9",
    FeeGmxTracker: "0x839a36fF5eB9D0De025F1ae9a9dc2294a3f7fD85",
    StakedGlpTracker: "0x18291Cd114026A705f787b2d0f48eE4aa81Dcc58",
    FeeGlpTracker: "0x2E2E0eb0F9fE7Dc657583064F5dC47b60f272FCb",

    StakedGmxDistributor: "0xd38E3975E0cde70f6A31856f5CdE10Dc0794D086",
    StakedGlpDistributor: "0xF00aF2E8aF788A9957E0c1DC041a495a57c68460",

    GmxVester: "0x1a39d58a42D7057992A4052D91a7C600696d3240",
    GlpVester: "0x430b23A844280f40592757dEb7647dc5c9Ec4F74",

    OrderBook: "0x9D3AbF57D024210D1Bb2790b8AdE81d6eA93fB40",
    OrderExecutor: AddressZero,
    OrderBookReader: "0xCD4AE0d14dcd7e1133Cb5858dC5840A2C1743a0f",

    PositionRouter: "0x19f2648716EC73c183ee755486A4A193a7E4db23",
    PositionManager: "0xd6028bE34AB694707d84DDD38497afe73AE91B93",

    UniswapGmxEthPool: AddressZero,
    ReferralStorage: "0x1fC26FE79687E222420d0958d5c294837d3Bf25B",
    ReferralReader: "0x7De737237AE9d8F21e778AFff421aB14D6E89794",

    Multicall: "0xcA11bde05977b3631167028862bE2a173976CA11",
    BatchSender: "0xe0Cca8B13d079B21BD5E6E96EbCD99166592cea1",
  },
  [OPTIMISM_GOERLI_TESTNET]: {
    Vault: "0xBeb44f1b8b45A23bC1dBe4873A1149e6cd012Cc6",
    Router: "0xF507b69770cd935535cf218DfDfE596Cfe37ea5E",
    VaultReader: "0xD0D43d739ACE1F1d568f3e4aEA4ed9cdbc5f61f2",
    Reader: "0x5d8518787d21765Fe0C871B6482764F0F5169758",
    GlpManager: "0xdb302Cf8B566EA4a773ccb89d679b675fC638aDb",
    RewardRouter: "0x4C9693668636C7387f68DEA36aeFB8Cd0EeB3Ae3",
    GlpRewardRouter: "0x4C9693668636C7387f68DEA36aeFB8Cd0EeB3Ae3",
    RewardReader: "0xc403ed0d47cF20f9878f94fD9B6E3d4dCe00F617",
    NATIVE_TOKEN: "0x743E73cAe7E5B9838a5eb2CfAd3A4c8aCf41614d",
    GLP: "0x555253A4724c03c4DD54341efd0aEBCf10c54873",
    GMX: "0xFBCc38760C2149ef62a45D8611Ce3d8F7B94f29C",
    ES_GMX: "0x6C4d0404BE3182b06f3A9f17dcf1bf75bF88A655",
    BN_GMX: "0x0FCa9bA815a41c7BBD5145D5d8a58D7B48E5feEB",
    USDG: "0xeED25Cf3A5322cE77D17cbaa108136c64651ab04",
    ES_GMX_IOU: AddressZero,
    StakedGmxTracker: "0x19A667C2592446dC7a8CdD03C11D7827A27784fd",
    BonusGmxTracker: "0x7569000B023079457c6c1ee882D9CCdc7733C9D1",
    FeeGmxTracker: "0xf62617Db17d1c0e3bA911992f38428234b029319",
    StakedGlpTracker: "0x8828fC7a463cfd9569AbBF3af7c9e6fabAc6381E",
    FeeGlpTracker: "0x496FC1de8c025d17A2b95Dfe135bBeCf3B52a3eC",

    StakedGmxDistributor: "0x6F2752eeB9bf80d60f2B0cE461f54EEC1294a8f9",
    StakedGlpDistributor: "0xBf07436274B7df9bc9aebD54e1a684B98717Ca9C",

    GmxVester: "0x60EF791a99e78c4B358D838cB8F9d8ccFb07920D",
    GlpVester: "0x90D2309EBdd30baD39A6cbCea596317555A85e61",

    OrderBook: "0xC0e269bA0c9A571E26658C09D4f3D42F67f41b66",
    OrderExecutor: AddressZero,
    OrderBookReader: "0x2F99896D06d047037024F5A813865D3b03F95bDE",

    PositionRouter: "0x7B6f6346C7C3c71415F3038780B098c5E7E09F33",
    PositionManager: "0x14981A7663FF4385bEFFc75cc7D6730247fd05fa",

    UniswapGmxEthPool: AddressZero,
    ReferralStorage: "0x44b7F13CA8983120496FAb7b58181467EF8923D6",
    ReferralReader: "0x7c61163698E527F3A9E58B6b24Aa732BEd9A6768",

    Multicall: "0xcA11bde05977b3631167028862bE2a173976CA11",
    BatchSender: "0x2892029E3204747289F0B9931da9316c70485Dde",
  },
  [OPTIMISM_MAINNET]: {
    Vault: "0xE5B3BA78C10c4669c1Dc63B25EdABAE46ce5e8F9",
    Router: "0x55AC1950b1a18d1F22a157aE6E837511925Ceba0",
    VaultReader: "0x7d0ce6D38cf600699d7DaEf1F0898B5603f795ee",
    Reader: "0xf853F762FdcE126930098F2937AE4De58418dE20",
    GlpManager: "0x8F0B3F9d527e78EBE0EFbDe2B1128461FE35B1ac",
    RewardRouter: "0xEF1fA01715BbC88326eD4601dF915C8b50dff84b",
    GlpRewardRouter: "0xEF1fA01715BbC88326eD4601dF915C8b50dff84b",
    RewardReader: "0xcA3c8a5b279885e5541FA3DEF8171Af3688288E7",
    NATIVE_TOKEN: "0x4200000000000000000000000000000000000006",
    GLP: "0x6a3BEC2Af66Cb009f9102F6Fa64bd73C79F2493E",
    GMX: "0x916B0bB4A98a3d72FCB1c2E67eBaCcf7ac47D7f5",
    ES_GMX: "0x6c74436902BEffd447519Cea083Bdae392733275",
    BN_GMX: "0xF9050f4b0666Cc37D1f275001C55fC8f4FF14Fa1",
    USDG: "0xD9c58e82Fc71ed7Cf8593fC94403161072458E43",
    ES_GMX_IOU: AddressZero,
    StakedGmxTracker: "0xe900A7798a0c4685A687238FB92cdD08064b87fE",
    BonusGmxTracker: "0x3501AA0D77C52f31EeBEE00890285E04974C66CB",
    FeeGmxTracker: "0x6b0271eE93F2A55D410f919e8d30491cb81ECF65",
    StakedGlpTracker: "0x6e38FEE01FCF1cADd059cA29964fCCA60E95C888",
    FeeGlpTracker: "0x8EEd06c3c4412328d085e1D287A88189B5170b36",

    StakedGmxDistributor: "0x9229F08E493961dc30Aa1412FECF3c67a10D87d3",
    StakedGlpDistributor: "0x506492026Bfcad69510e2eAc219552f988c5E68f",

    GmxVester: "0xEeca383bef9d902db9CC33b9FBd52B0DC0e2799c",
    GlpVester: "0x9432108B7643706F26e2DD097377aaacb8353AdA",

    OrderBook: "0x5C5EE83069F0a460b8d9ca95aB1E5A120e8CF73E",
    OrderExecutor: AddressZero,
    OrderBookReader: "0x70df36fA4A917A936B7D0d80c8a2F255ED2561d1",

    PositionRouter: "0x045dE6e0a463e62868E0D7c05BFFA735bcaFE510",
    PositionManager: "0x16dF79A8Ed3686c0be44abFB25bdade3BEc7f1B7",

    UniswapGmxEthPool: AddressZero,
    ReferralStorage: "0xc89c9c14358593969fDddA77a586cdDdBE417a20",
    ReferralReader: "0xaCF9b377c21205556B8E2029f29b7FedFdA5C1bB",

    Multicall: "0xcA11bde05977b3631167028862bE2a173976CA11",
    BatchSender: "0x10b53A4409b353B064B29B68094981B703b181A4",
  },
  [BLAST_SEPOLIA_TESTNET]: {
    Vault: "0x12C368F627E8c826ef145fE6D4F0EbEa897AFc6E",
    Router: "0x4cAaC08e313E9415545Be7e7D1c1A10f52dA10cB",
    VaultReader: "0x33D57BcB362d4140bbA23Bdb8CEdc2AACd8bBd1e",
    Reader: "0x1eB733DA495C92CDCaA1F0591895d63C8F028AfC",
    GlpManager: "0xBEDf835766FE1F81B527475a1251f41Abe7DfD1C",
    RewardRouter: "0x0aE01f8a5e3fc86Ce6becE66D9DA9A58A696763C",
    GlpRewardRouter: "0x0aE01f8a5e3fc86Ce6becE66D9DA9A58A696763C",
    RewardReader: "0xC0e269bA0c9A571E26658C09D4f3D42F67f41b66",
    NATIVE_TOKEN: "0xBb2de0A11260112160F5FBD2bC5e1a31963356d2",
    GLP: "0x534bAf0071bD58F0e70399C335041A814115a6d0",
    GMX: "0x012F51CdFe295EC3e41eA6a5A278B9b5dCA6F8a9",
    ES_GMX: "0x7425A9337346b3D2f884acb13C8eaA9530E86cF9",
    BN_GMX: "0x2312F01Ebd611B70D05C73c2699b87414aDE78ff",
    USDG: "0x860C432681c79DD239ac615c2B005050Bc27325e",
    ES_GMX_IOU: AddressZero,
    StakedGmxTracker: "0x188ebB85deb6Eb8fD050FFe789404113A52522aB",
    BonusGmxTracker: "0x9EB835954f2875906632A3BFd6AaCA5f18De8D10",
    FeeGmxTracker: "0xFBCc38760C2149ef62a45D8611Ce3d8F7B94f29C",
    StakedGlpTracker: "0x397A0d9fBE2A0ceAE4eDb4d9328E8860f535B3F2",
    FeeGlpTracker: "0x8b0374412085c7bE0A96A7045D9F4313b8234c0f",
    StakedGmxDistributor: "0xb14d58Ced7047Df5a0ef3296cA64614C8A2Eb4B9",
    StakedGlpDistributor: "0x76361FAd5305a2Ca268d44Fdd189cd5e7151160a",
    GmxVester: "0x496FC1de8c025d17A2b95Dfe135bBeCf3B52a3eC",
    GlpVester: "0x548Be1885BaA33312A4750D98b0BB529aef2a470",
    OrderBook: "0x5852b48DA23D4879eDF70c9322CD16Cd23acC0b6",
    OrderExecutor: AddressZero,
    OrderBookReader: "0xe9877FdEb54Ce53426Ce8640f9451548f81024f0",
    PositionRouter: "0x416e2FCA077296782128A3DE0eF6De7C241f148D",
    PositionManager: "0x779Cd0dCCF4494bD5b8c514f399414a6ae23F1D2",
    UniswapGmxEthPool: AddressZero,
    ReferralStorage: "0xD0D43d739ACE1F1d568f3e4aEA4ed9cdbc5f61f2",
    ReferralReader: "0xb37D5B3De22A98CAf57eFeeeE0206A445DA6A752",
    Multicall: "0xcA11bde05977b3631167028862bE2a173976CA11",
    BatchSender: "0xdb6859F23750e7052F30eF009BCe2A1D23DE8aCc",
  },
  [MORPH_HOLESKY]: {
    Vault: "0xB118AdB7786BF5F1bcf63195591e379647bfb517",
    Router: "0x3cC4Fda9571fa76b687944170C8d8Aa8672Cc099",
    VaultReader: "0x54ea0C906b3DB4EC2dB68C1F06aE8d7d66BE3e25",
    Reader: "0x5970E0df1627DA15806B276E1ABb27A6DBcE58dB",
    GlpManager: "0x2551B57d952F6862B1Ab59A2399FA4Cd20c8e34b",
    RewardRouter: "0x3Bd078cE71EE675FB9fb1d9941b6A524f822f6e4",
    GlpRewardRouter: "0x3Bd078cE71EE675FB9fb1d9941b6A524f822f6e4",
    RewardReader: "0x60EF791a99e78c4B358D838cB8F9d8ccFb07920D",
    NATIVE_TOKEN: "0x57695F4Bc401B6d3755916cF1F74BA7f3b20a9Dc",
    GLP: "0x2D6D32CbA43854072F49Ddb776e850Ca135bb7Be",
    GMX: "0x562411096dAAdA127d71b6B6C03140F4f8baf556",
    ES_GMX: "0x534bAf0071bD58F0e70399C335041A814115a6d0",
    BN_GMX: "0x36978530e6f5AC6c72bbfaD7c3aC318D323f72BD",
    USDG: "0x2020B19063D726a6205736C815108A50581Acf2a",
    ES_GMX_IOU: AddressZero,
    StakedGmxTracker: "0xa0D9b745e5E99ABFd60f01857e90854DAe597e88",
    BonusGmxTracker: "0x3a2642b2348F575b8b88fF2bd687453aEe13E924",
    FeeGmxTracker: "0xeED25Cf3A5322cE77D17cbaa108136c64651ab04",
    StakedGlpTracker: "0xB057a7230D447a151510765bB75F36a909172e23",
    FeeGlpTracker: "0x10F2450fd6c0a7B3319095a3079b6100721c9c61",

    StakedGmxDistributor: "0xBEDf835766FE1F81B527475a1251f41Abe7DfD1C",
    StakedGlpDistributor: "0xf078D4A97d3f15f5AeBA6B5460050cAbD646Ae28",

    GmxVester: "0xFEef69098dAC7D6d4C81c7f54aC73a7b0741C32a",
    GlpVester: "0x69Bc3039c502378bfae4E72A8D78104b57624e80",

    OrderBook: "0x5FBB7b7DaAE21df0bbccc6D193F5F26ea3723429",
    OrderExecutor: AddressZero,
    OrderBookReader: "0x9eB2295650AA27f32293dA8190a3fEbE21DB52A0",

    PositionRouter: "0x6b8e8107dBC6FECCcD53a60D80790B2Ea1F21612",
    PositionManager: "0x3c89c42149440D2B99bd6b9718F1a4f7FaF4f4a1",

    UniswapGmxEthPool: AddressZero,
    ReferralStorage: "0xfCE091cEDfc6CCeD7Cfb5E16F9A5498028f1A514",
    ReferralReader: "0x0cCDB128192B47293695e6892097eD3163Df8Cc8",

    Multicall: "0x729e8d855E9F7F16387814BD616B6d46C69BaB43",
    BatchSender: "0x2569e81870256E6239ef31f8A35D0AB7Ee2A0794",
  },
 
  [MORPH_MAINNET]: {
    Vault: "0xBE62425300DEEf6824c2B4263226788fb7F6123a",
    Router: "0xA250d47EF6DC67Aa791E6950718449392F8208ee",
    VaultReader: "0xE18f81bf52eA1217B4D12EB5DF1a0273dAf1285D",
    Reader: "0x3eBfC3fa0671a6828b0252d64F11BFCEa662280e",
    GlpManager: "0x51794E78821C7d1F33D387E7C45231d8D5507Fa2",
    RewardRouter: "0x679566263806e2dB3A11897422bafF01f7Ed58E8",
    GlpRewardRouter: "0x679566263806e2dB3A11897422bafF01f7Ed58E8",
    RewardReader: "0x157869fF2c1A19207C47009E3d3Fe9f8f3EE5aFD",
    NATIVE_TOKEN: "0x5300000000000000000000000000000000000011",
    GLP: "0x22eb3B06fAC1364C6c624E1feBf57AB87AE389BF",
    GMX: "0x033Ec2082a29FAf4E7c405c05c195A757C6fbC19",
    ES_GMX: "0x2Fa7C5073E3972ED0957d58E26718f436B07Ee02",
    BN_GMX: "0x7640b8d556cD275620658886158743bA47aB9c99",
    USDG: "0x68E8e2932f22b1865b57E404BEF97744A4E4c34a",
    ES_GMX_IOU: AddressZero,
    StakedGmxTracker: "0x9A10B4cd793f24739044B365d8b2BDb19A0a3498",
    BonusGmxTracker: "0xD6797bDaC94BE2D20C8866E51631b753eD6487ce",
    FeeGmxTracker: "0x45bdEdc04e20C0D77391CC37E1ef6E6F5308C93d",
    StakedGlpTracker: "0x53F88CCAe825fD4C970bc714201B7dAb23bB9651",
    FeeGlpTracker: "0x335ef44747A3E2fF873B1C21C76b31a4dD9E6fCF",

    StakedGmxDistributor: "0x545644d2F675404C14511667bEeEFA1282f1E831",
    StakedGlpDistributor: "0x096633E6D82F94a0f1F8823e83B33888390139Ac",

    GmxVester: "0xb030FF9403Bc9F45Fd48484355A8c7fB93Bd51de",
    GlpVester: "0xA5A58eb2E861F21c93714317408F71CB0C63cA8F",

    OrderBook: "0x94eC7d2c7d52193256A69538D5e1bDACeF66A836",
    OrderExecutor: AddressZero,
    OrderBookReader: "0x1e5D25780E36F980767521FBF2320D884Bf265F2",

    PositionRouter: "0x23Cc52517866564085e2BF0C0B29EF7Cd297A8d9",
    PositionManager: "0x04b95da19b532b4cc864b8970d87d8b536DcbC41",

    UniswapGmxEthPool: AddressZero,
    ReferralStorage: "0xf36f861e46AB98Ae13da1419a386c967d81da1E9",
    ReferralReader: "0x94Ac6b4Ac8CDdce9102DeFA954abBdf4bBFE7Cf2",

    Multicall: "0x876A4f6eCF13EEb101F9E75FCeF58f19Ff383eEB",
    BatchSender: "0x44bc69b706b250d4C14B25086765f4C18ACa330b"
  },
  [OPBNB_TESTNET]: {
    Vault: "0xfEE787890dFe5758Dc8012C276F569a089D3C46d",
    Router: "0xE56C6fEd5aE30321DF396c4426F6FC37ECCaFe7A",
    VaultReader: "0x05d3E35772696A59251966b2490Df93Bc81C1E70",
    Reader: "0xf987807BD7C182c1af618f8C9c323DF5338ffD8D",
    GlpManager: "0x97e8d0995D6Ed1D5d7acb0b4af04C657Ae33efd6",
    RewardRouter: "0xB4EA7c5ae4a0985fc69E21a9113e5a684B9Af7d4",
    GlpRewardRouter: "0xB4EA7c5ae4a0985fc69E21a9113e5a684B9Af7d4",
    RewardReader: "0x6eE82a57099abaB729b35d688d8B43E80910D112",
    NATIVE_TOKEN: "0x4555Ed1F6D9cb6CC1D52BB88C7525b17a06da0Dd",
    GLP: "0xeE097274EB5e66cA1975538B69c87BBe0402aCb0",
    GMX: "0x1F27D722791DEFd08f6EB0dd8443991de9b8c678",
    ES_GMX: "0x8C9bd58C99ab7eEbeE911aD81a0A3B8262253e4C",
    BN_GMX: "0x4dcf71658354811d80cDCA3Da32e2471701Fac76",
    USDG: "0x41c1437f1b0D9e123272b8E878b8ecc87D6f8C60",
    ES_GMX_IOU: AddressZero,
    StakedGmxTracker: "0x5C358038EBb276e2A47B2fFe40b115Fd9df40082",
    BonusGmxTracker: "0x2c8DDbBC4e16702801025144A0e27129F08206f4",
    FeeGmxTracker: "0x2545790C1c778f778C6e45bF3574e148187Fa6aC",
    StakedGlpTracker: "0xD0D541bC36A15515B8C8F11A425914cb5E6F6Ef0",
    FeeGlpTracker: "0xe5F8090D5C5f8407fEA2C5552d4dC9101c9F7Eb4",

    StakedGmxDistributor: "0x34993E24bC02eC1d23Ac1A1A01C23e3204aC51E9",
    StakedGlpDistributor: "0x53B01e1c380eFF047276675A94601F4055003192",

    GmxVester: "0xb853B25993E49BF4a2D158F640dAe2A20a3386de",
    GlpVester: "0xc94A2831f729Cdc0a487b765ED4AD51788FA00fc",

    OrderBook: "0x979A4Ae60E0DbE03309e54d3dEEe8198b026526B",
    OrderExecutor: AddressZero,
    OrderBookReader: "0x2bA5179568189fd1A423C324b0b79346982DFa10",

    PositionRouter: "0xAEd7152c7F947cC12b9b6f4f6ebf173021A64C4C",
    PositionManager: "0xc8F83DB7618D3950Cfea172C1cdF57c64d91Cca6",

    UniswapGmxEthPool: AddressZero,
    ReferralStorage: "0x9FA9DaA41e074731EAd4685a77B2cF7396231E77",
    ReferralReader: "0xd217F6271F9ed44CeaE8207ed86ecEb8A0d14C50",

    Multicall: "0xcA11bde05977b3631167028862bE2a173976CA11",
    BatchSender: "0xa0BfD360EE88C79f3F9de05D17Ae04E9307BAdf6",
  },
};

export function getContract(chainId: number, name: string): string {
  if (!CONTRACTS[chainId]) {
    throw new Error(`Unknown chainId ${chainId}`);
  }

  if (!CONTRACTS[chainId][name]) {
    throw new Error(`Unknown contract "${name}" for chainId ${chainId}`);
  }

  return CONTRACTS[chainId][name];
}
