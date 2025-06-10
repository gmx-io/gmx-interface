import { type Address, zeroAddress } from "viem";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, BOTANIX, UiSupportedChain } from "./chains";

export const CONTRACTS = {
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

    GelatoRelayRouter: "0x9EB239eDf4c6f4c4fC9d30ea2017F8716d049C8D",
    SubaccountGelatoRelayRouter: "0x5F345B765d5856bC0843cEE8bE234b575eC77DBC",

    ExternalHandler: "0x389CEf541397e872dC04421f166B5Bc2E0b374a5",
    OpenOceanRouter: "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64",

    ChainlinkPriceFeedProvider: "0x527FB0bCfF63C47761039bB386cFE181A92a4701",

    Multicall: "0x842ec2c7d803033edf55e478f461fc547bc54eb2",
    ArbitrumNodeInterface: "0x00000000000000000000000000000000000000C8",
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
    ArbitrumNodeInterface: zeroAddress,
  },
  [BOTANIX]: {
    Vault: zeroAddress,
    AdlHandler: "0xB50eb1e94D5e83E82046F6aEd893CA7Ad7FAE710",
    AdlUtils: "0x2F7D9F60Af66DF003f85E28D86682CC6388b192D",
    AutoCancelSyncer: "0xDDa1982Bf61C4CF4FecF2c3fc9141BB23991cfd0",
    BaseOrderUtils: "0xA6aC2e08C6d6bbD9B237e0DaaEcd7577996f4e84",
    CallbackUtils: "0xc3B5eb9e3400A73c3ededbe3D501c81a3E5aEAa0",
    ChainReader: "0xC35AEd253F3a9Ad948cd511c21E89a92761dF139",
    ChainlinkDataStreamProvider: "0x9d44B89Eb6FB382b712C562DfaFD8825829b422e",
    ChainlinkPriceFeedProvider: "0x8c0dF501394C0fee105f92F5CA59D7B876393B99",
    Config: "0x1302668D7Fd4b5d060e0555c1ADDB6AfC92eFfC7",
    DataStore: "0xA23B81a89Ab9D7D89fF8fc1b5d8508fB75Cc094d",
    DecreaseOrderUtils: "0xdd1ec8B6E9f60a23A2F0C8f72FEa7BE3e040794a",
    DecreasePositionCollateralUtils: "0x12d7eEbE2bFb04B3eDd3716FF63fA9e1098C3855",
    DecreasePositionSwapUtils: "0xe3159Fb1DaB741E27292530d11A4848F25C24BaB",
    DecreasePositionUtils: "0xCd51A27dD1D0a583D083BC65Dcf0e557feE08027",
    DepositEventUtils: "0x4CD60ed65f5b1F1Cc73d817490b087B3bEf4E5CE",
    DepositHandler: "0x712dC0dbAe5f59891cb32451E15C667d06759Bb7",
    DepositStoreUtils: "0xfd2069745B922D1a9FF14b55AE1C54B4ea294505",
    DepositUtils: "0x9c5974E19ea019bb69f3098531384e5D9d4638b9",
    DepositVault: "0x4D12C3D3e750e051e87a2F3f7750fBd94767742c",
    EventEmitter: "0xAf2E131d483cedE068e21a9228aD91E623a989C2",
    ExchangeRouter: "0xC255c70b50623054CADbAD9A02E1CFE73d286666",
    ExecuteDepositUtils: "0x12Ba5C403B286B0394F8593130DecCfb55422a8e",
    ExecuteOrderUtils: "0x3086540b21900fDa472ce8862E8a73582FA5D4b6",
    ExecuteWithdrawalUtils: "0x05dcE1f6de5aa9a71C1B8fe59Ba3Ba726CdE2722",
    ExternalHandler: "0x36b906eA6AE7c74aeEE8cDE66D01B3f1f8843872",
    FeeUtils: "0x13095d11C1E780340340c9ae9797955a040ACDb9",
    GasUtils: "0x7b64562e872bd83C131DaEbb22e312900259AF42",
    GelatoRelayRouter: "0x03338870b117Fc43f0C7365B3d919A0d5127E529",
    GlvDepositEventUtils: "0x087dead08f0b0D4C426D8B684557Af3E5C467cCC",
    GlvDepositStoreUtils: "0x52e4875EB5603d21912d30A1dBA6B0B97192459A",
    GlvDepositUtils: "0x821A38756eB44F725a31d14Ef00a3Dfb488e995B",
    GlvFactory: "0x3e04e6b37B23969F3Ca1c2aAc8568322bd90BA90",
    GlvHandler: "0xA9fA0aD7D12006441cCA29F4741c66A4273AC9d5",
    GlvReader: "0x5AE7478d10C7298E06f38E90cf544dAE28fFE88B",
    GlvRouter: "0x7EF7d01316425de5d7C2EFDf8b802A250c222faB",
    GlvShiftEventUtils: "0xC95B894c91cBF211c33b4083f8893ed8F3c46D62",
    GlvShiftStoreUtils: "0xd4aE0008949F62dEcB1Afa65511288B1072AAf00",
    GlvShiftUtils: "0x79D4ac3B69611097577DB6AABE61B5ca8d7DCbb6",
    GlvStoreUtils: "0x3e5BddAf525e3a8DefB143BA8e534c952dE91A26",
    GlvUtils: "0xf0BFcB1c0C00f40B04D351cF8e4A1c980F9949AB",
    GlvVault: "0xd336087512BeF8Df32AF605b492f452Fd6436CD8",
    GlvWithdrawalEventUtils: "0x0FE484C3a98D9Aa40B3aeeb2AB29ecf24FA0d5Aa",
    GlvWithdrawalStoreUtils: "0x0Ca40ae32Bd2e463C7a3d9aba919d238672651DE",
    GlvWithdrawalUtils: "0x843bC7629476525dCFfb797fA728611C4d8F4019",
    GmOracleProvider: "0x6EEFd9F9D87939A26E91CbC461683aC13279CFcA",
    GovTimelockController: "0x4A5618F1a4287Ecf457860Ce2e9ffBB3A60A64C9",
    GovToken: "0x611640B004719e4843552F60996360Ea6B39E75e",
    IncreaseOrderUtils: "0xDb17B211c34240B014ab6d61d4A31FA0C0e20c26",
    IncreasePositionUtils: "0xA8AF9B86fC47deAde1bc66B12673706615E2B011",
    LiquidationHandler: "0x9aB52A55417Bb1E79A1852648C6565C132A9825B",
    LiquidationUtils: "0x976363dFbA3AeB8Fb10b733baD74e7099cCB558A",
    MarketEventUtils: "0x2473Ee0a1FAffa19243db3d57c09D9605ab55EA5",
    MarketFactory: "0xcb7656751B0f8aFCBe15D135D7aC58727DE06768",
    MarketStoreUtils: "0x98de85C52c876ACac18c5291f9225DD5bD9daCdD",
    MarketUtils: "0x68E1f481f5D515d6EE1D783b6C5547543965678E",
    MockPriceFeed: "0x9c41F854f123a7905907FfcF2578dFB7E47D02E0",
    Multicall: "0x4BaA24f93a657f0c1b4A0Ffc72B91011E35cA46b",
    Oracle: "0xe79118d6D92a4b23369ba356C90b9A7ABf1CB961",
    OracleStore: "0xfFC63573B55B39b75b1e44e54C308e44505E0D28",
    OrderEventUtils: "0x886A083D8611357E5D27AF1Cb96740C1889362f0",
    OrderHandler: "0x5e1C080c5Fef6032d5576a88F50851af0B3841fe",
    OrderStoreUtils: "0x2F5656646d24Bb2b4737ad0B8fc44f12F3ac73b5",
    OrderUtils: "0xe38F0Ed8C69ed38DC383c25f6753087eC257cfdf",
    OrderVault: "0xe52B3700D17B45dE9de7205DEe4685B4B9EC612D",
    PositionEventUtils: "0xC5B23083719e7d6785673A570B8a1789A7bC09e5",
    PositionPricingUtils: "0x140e5Cf0E0ACa9ca251e512e4C6a5D61bCaFF03F",
    PositionStoreUtils: "0x16bc940D4460502d1107cc4433d38EAaEC3a647d",
    PositionUtils: "0xe43592630c8480d8473788A1622692aD88b9bCDE",
    PositionRouter: zeroAddress,
    ReferralStorage: zeroAddress,
    ReferralReader: zeroAddress,
    VaultReader: zeroAddress,
    Reader: zeroAddress,
    GlpManager: zeroAddress,
    RewardRouter: zeroAddress,
    RewardReader: zeroAddress,
    GlpRewardRouter: zeroAddress,
    NATIVE_TOKEN: zeroAddress,
    GLP: zeroAddress,
    GMX: zeroAddress,
    ES_GMX: zeroAddress,
    Printer: "0x0Bca58850cF4e1e1Fd715337B07b3FaBF8de542d",
    ProtocolGovernor: "0xb2BD9CDAe7192dEaB39b1D887d336b4f80ED3C76",
    SyntheticsReader: "0x858922fe3F9871bFA80AEc47D4B1F87D39F9d9d0",
    ReaderDepositUtils: "0x747BC3c881b378d41015EfB347c3D23CF7fDE2b4",
    ReaderPositionUtils: "0x453a1C653805b5B719a75814E60D8258dcEfc451",
    ReaderPricingUtils: "0xDf5D44F9ED476e0D8fcD769d3FD61488d9077ba3",
    ReaderUtils: "0x8f3edA4047698f1314003944Bf50809a82f5b057",
    ReaderWithdrawalUtils: "0x90db4Ef007Af6e9B0fa97432F1b69917A6fDaa7E",
    ReferralEventUtils: "0xC8ee91A54287DB53897056e12D9819156D3822Fb",
    ReferralUtils: "0x3CEB2510CA23D359B19804ce26b8621c6A73E50F",
    RelayUtils: "0xBb54059D79d6E887f17aF86f724Bb1634b2C6758",
    RoleStore: "0x51Aa17ca59E9e9C3cEc3c3c05c2B35f473b35D39",
    SyntheticsRouter: "0x3d472afcd66F954Fe4909EEcDd5c940e9a99290c",
    ShiftEventUtils: "0x6093430E4dF967fD3231C35E25E9fc46f681c7e2",
    ShiftHandler: "0x4988217cE0DDCe37cadA2DCA760846Ba80D32df8",
    ShiftStoreUtils: "0x8231A60862F9b0bA93fFA050c0E94AC902D901d2",
    ShiftUtils: "0xCa62C570D8667a00A56EB989881ECbA4364BFe9e",
    ShiftVault: "0xa7EE2737249e0099906cB079BCEe85f0bbd837d4",
    SubaccountGelatoRelayRouter: "0x801C0F7f82a4a117d0c6695b5519Ce3682ECBB62",
    SubaccountRouter: "0x0a42516de743D87572f5788cac23F0a2c1a39f69",
    SubaccountUtils: "0x2B4906060e7203150B9fe9CF61DbB8266Da6E9f8",
    SwapHandler: "0x40f1988925e44Bc0D93F7FbE997d6D3ac6F40cc1",
    SwapOrderUtils: "0x63EAa3239dF60e621E3eB170DF64c7B8FC8b93c5",
    SwapPricingUtils: "0x0c61106F1aD379175D88b0721DEfD7FC32D467Ec",
    SwapUtils: "0x88C794d2D6be7281406EAB4760Af7D5FA4925265",
    Timelock: "0xca3e30b51A7c3bd40bFc52a61AB0cE57B3Ab3ad8",
    TimestampInitializer: "0x0e5B632dB3da6E4172495b78C622740E00a1e0D0",
    WithdrawalEventUtils: "0xDA6bAE7Cc07911718bb0A03100dBB59993e4C88f",
    WithdrawalHandler: "0x29B0ee91B43EEFD773a131DDC6ED9946B45C9f43",
    WithdrawalStoreUtils: "0x68eF8ef43352E388A477973ae7c3Cf208485BfcC",
    WithdrawalUtils: "0x7d5F99Bab016b831648e278B208579e0eCdb3974",
    WithdrawalVault: "0x46BAeAEdbF90Ce46310173A04942e2B3B781Bf0e",
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

    GelatoRelayRouter: zeroAddress,
    SubaccountGelatoRelayRouter: zeroAddress,

    OpenOceanRouter: zeroAddress,

    ExternalHandler: "0x0d9F90c66C392c4d0e70EE0d399c43729B942512",

    ChainlinkPriceFeedProvider: zeroAddress,

    Multicall: "0x0f53e512b49202a37c81c6085417C9a9005F2196",
    ArbitrumNodeInterface: zeroAddress,
  },
};

type ExtractContractNames<T extends object> = {
  [K in keyof T]: keyof T[K];
}[keyof T];

export type ContractName = ExtractContractNames<typeof CONTRACTS>;

export function getContract(chainId: UiSupportedChain, name: ContractName): Address {
  if (!CONTRACTS[chainId]) {
    throw new Error(`Unknown chainId ${chainId}`);
  }

  if (!CONTRACTS[chainId][name]) {
    throw new Error(`Unknown contract "${name}" for chainId ${chainId}`);
  }

  return CONTRACTS[chainId][name];
}
