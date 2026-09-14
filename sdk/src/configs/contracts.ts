import { type Address, zeroAddress } from "viem";

import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, MEGAETH, ContractsChainId } from "./chains";

export const CONTRACTS = {
  [ARBITRUM]: {
    // V1
    Vault: "0x489ee077994B6658eAfA855C308275EAd8097C4A",
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

    PositionRouter: "0xb87a436B93fFE9D75c5cFA7bAcFff96430b09868",

    UniswapGmxEthPool: "0x80A9ae39310abf666A87C743d6ebBD0E8C42158E",
    ReferralStorage: "0xe6fab3F0c7199b0d34d7FbE83394fc0e0D06e99d",

    // Synthetics
    DataStore: "0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8",
    EventEmitter: "0xC8ee91A54287DB53897056e12D9819156D3822Fb",
    SubaccountRouter: "0x9c05880A2AaD7530c69e18e342eDC9E06cc757db",
    ExchangeRouter: "0x7dE39FF2e232A2203196788d37e234cF8F1b83f1",
    DepositVault: "0xF89e77e8Dc11691C9e8757e84aaFbCD8A67d7A55",
    WithdrawalVault: "0x0628D46b5D145f183AdB6Ef1f2c97eD1C4701C55",
    OrderVault: "0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5",
    ShiftVault: "0xfe99609C4AA83ff6816b64563Bdffd7fa68753Ab",
    SyntheticsReader: "0xfA26cBb46e2614609406de08CA1Dc7f70a684184",
    SyntheticsRouter: "0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6",

    SimulationRouter: "0xaD3051cB1aE3a86b335f12A9a41BD4d995a137ea",

    GlvReader: "0x85fcBD684D08053f1efAB302dCb04F22E20E65B1",
    GlvRouter: "0x167540D2DFF14120365CfDDF2F86e3045D4fa712",
    GlvVault: "0x393053B58f9678C9c28c2cE941fF6cac49C3F8f9",

    GelatoRelayRouter: "0x5503b99308dB6923758F9A22d118207D633c4e87",
    SubaccountGelatoRelayRouter: "0xfD0596f708d9D950E0eF7b5d191e5F8e55b8a67f",

    MultichainClaimsRouter: "0x946CC490DFedd6016645F5ce555E0036D116f50e",
    MultichainGlvRouter: "0xA0Ef0Ace6E437458BB4b5F72A7c7bB43a1CdDa8d",
    MultichainGmRouter: "0xFd26a7E3c4A9b75Bd0dce495290Fa33af2bb4b00",
    MultichainOrderRouter: "0xABFC734f7CFc9352AED7a97b1F6a236eae831e8A",
    MultichainSubaccountRouter: "0xAb3EDf0f3eed6804BAe1bD9bF90109ccadFD262e",
    MultichainTransferRouter: "0x3f6772B95423fC03264adf90Efb8A9922B6C8c6e",
    MultichainVault: "0xCeaadFAf6A8C489B250e407987877c5fDfcDBE6E",
    LayerZeroProvider: "0x0B33EBA531e5a5A331a3Ff9F418B8205F01C2869",

    ChainlinkPriceFeedProvider: "0x90218fbb064b1475E4382b041Cc7ccF08AF718B0",
    ClaimHandler: "0xc31E7aC86Cc20FF8D7f4642b5Ed67a43B2AC8426",

    // External
    ExternalHandler: "0x389CEf541397e872dC04421f166B5Bc2E0b374a5",
    KyberSwapRouter: "0x6131B5fae19EA4f9D964eAc0408E4408b66337b5",
    Multicall: "0xe79118d6D92a4b23369ba356C90b9A7ABf1CB961",
    ArbitrumNodeInterface: "0x00000000000000000000000000000000000000C8",
    ArbSys: "0x0000000000000000000000000000000000000064",
    LayerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
    GelatoRelayAddress: "0xaBcC9b596420A9E9172FD5938620E265a0f9Df92",
  },
  [AVALANCHE]: {
    // V1
    Vault: "0x9ab2De34A33fB459b538c43f251eB825645e8595",
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

    PositionRouter: "0xffF6D276Bc37c61A23f06410Dce4A400f66420f8",

    TraderJoeGmxAvaxPool: "0x0c91a070f862666bbcce281346be45766d874d98",
    ReferralStorage: "0x827ed045002ecdabeb6e2b0d1604cf5fc3d322f8",

    // Synthetics
    DataStore: "0x2F0b22339414ADeD7D5F06f9D604c7fF5b2fe3f6",
    EventEmitter: "0xDb17B211c34240B014ab6d61d4A31FA0C0e20c26",
    SubaccountRouter: "0xAda708aFf0f1D784D28cd8Ff4d6D977fF9599e5D",
    ExchangeRouter: "0xc002Db96E682FFF6675966F959677285a0C45Efa",
    DepositVault: "0x90c670825d0C62ede1c5ee9571d6d9a17A722DFF",
    WithdrawalVault: "0xf5F30B10141E1F63FC11eD772931A8294a591996",
    OrderVault: "0xD3D60D22d415aD43b7e64b510D86A30f19B1B12C",
    ShiftVault: "0x7fC46CCb386e9bbBFB49A2639002734C3Ec52b39",
    SyntheticsReader: "0xa34320a507493C71Fe35E982e496F7C5d1a7fa02",
    SyntheticsRouter: "0x820F5FfC5b525cD4d88Cd91aCf2c28F16530Cc68",

    SimulationRouter: "0xaB409fCaCc14Dd4234f6f86a2547f04ACC90a55e",

    GlvReader: "0x321EB66dD95ad33715ee615AAb8dAC6394E7b3F9",
    GlvRouter: "0x603B3D3aB077CA433b888c05fa59c777d5b6dCAD",
    GlvVault: "0x527FB0bCfF63C47761039bB386cFE181A92a4701",

    GelatoRelayRouter: "0x51fe0b7919e1208a717E9B16a097C1C3D70eFbf6",
    SubaccountGelatoRelayRouter: "0xa62BD1cFE2066c5bF4180b4125BBb5116eEA26c9",

    MultichainClaimsRouter: "0xa664B7E894ad5777f3419C2883911Af3692a4569",
    MultichainGlvRouter: "0x206B582F309724dAd259058Bc3289Ca3519F34B1",
    MultichainGmRouter: "0x00205f26BCc52537D12fA9b0eFA5Fcc58F03ab76",
    MultichainOrderRouter: "0x204CC947Fddd11c90e302db2A5ac3865021D1618",
    MultichainSubaccountRouter: "0x4A2826cAee8FF70d9392B171eaF398E0a2B55047",
    MultichainTransferRouter: "0xd4F6C2332b36D1Ccb22C7ac479b270fa0cA26a41",
    MultichainVault: "0x6D5F3c723002847B009D07Fe8e17d6958F153E4e",
    LayerZeroProvider: "0x74eECe8cC29b3d549db97F566a4445F48ed62a0d",

    ChainlinkPriceFeedProvider: "0x86E284921273E1442f32ebd1b567Ce988Cf50dfE",
    ClaimHandler: "0x07d8115676362Cf0d6672Dd71B23A43DB1e69C06",

    // External
    ExternalHandler: "0xD149573a098223a9185433290a5A5CDbFa54a8A9",
    KyberSwapRouter: "0x6131B5fae19EA4f9D964eAc0408E4408b66337b5",
    Multicall: "0x50474CAe810B316c294111807F94F9f48527e7F8",
    ArbitrumNodeInterface: zeroAddress,
    LayerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
    GelatoRelayAddress: "0xaBcC9b596420A9E9172FD5938620E265a0f9Df92",
  },
  [MEGAETH]: {
    // Synthetics
    DataStore: "0xE43C7B694f6b652a9F4A0f275C008d18758Dce35",
    EventEmitter: "0xAf2E131d483cedE068e21a9228aD91E623a989C2",
    SubaccountRouter: "0x03B59961bF30b973fBd793A6C8ad57dA38D4D0a6",
    ExchangeRouter: "0xF68560cA917717639be497BF6283aC08C9Bf0264",
    DepositVault: "0x8231A60862F9b0bA93fFA050c0E94AC902D901d2",
    WithdrawalVault: "0x0Ec53dda9676219dE63eC703212219b07811F33C",
    OrderVault: "0xD5AE04762E2afb1506695b3F36286EBE7B0E6772",
    ShiftVault: "0xC255c70b50623054CADbAD9A02E1CFE73d286666",

    SyntheticsReader: "0x51fe0b7919e1208a717E9B16a097C1C3D70eFbf6",
    SyntheticsRouter: "0x1eAfB14236C489C28845EC04F78DECA5Fb9879Aa",

    SimulationRouter: "0x321EB66dD95ad33715ee615AAb8dAC6394E7b3F9",

    GlvReader: "0x804f206a2ec78F505FD5D397450EAB9E7CBD1b21",
    GlvRouter: "0xef1BA2A3fcf0244361d63FCAe0c4772586Cd1925",
    GlvVault: "0x52e4875EB5603d21912d30A1dBA6B0B97192459A",

    GelatoRelayRouter: "0xbAAA3a693191e2e3E0973DE641C879D1aDD84e04",
    SubaccountGelatoRelayRouter: "0x603B3D3aB077CA433b888c05fa59c777d5b6dCAD",

    MultichainClaimsRouter: "0x6614E9eAfE2FE583049333C03a2D6f9D7F252121",
    MultichainGlvRouter: "0x5F65a3B91923840cD5254489A57c873427bA3A91",
    MultichainGmRouter: "0x5CCD0b91Cfe6B0FBA1c98290dc39E71ff806d9bF",
    MultichainOrderRouter: "0x00205f26BCc52537D12fA9b0eFA5Fcc58F03ab76",
    MultichainSubaccountRouter: "0xDB8906520812840b9835E3B84dE62C826249e20B",
    MultichainTransferRouter: "0x62B1691B067278E5B1167d0443d4c957473611D2",
    MultichainVault: "0xd6922E889cE4CF14e59427F20e7d857ff81A5A9D",
    LayerZeroProvider: "0x8A959d38216ad67AEBBF31F46Cb3cA4D7fe584c8",

    ChainlinkPriceFeedProvider: "0xaD3051cB1aE3a86b335f12A9a41BD4d995a137ea",
    ClaimHandler: "0xf9B01d45B2c5022429c3f745e5A2E700B02cEBeb",

    // External
    ExternalHandler: "0xa7EE2737249e0099906cB079BCEe85f0bbd837d4",
    KyberSwapRouter: "0x6131B5fae19EA4f9D964eAc0408E4408b66337b5",
    Multicall: "0xF516BC01c50eebdBad4d7E506c8f690ae8EAFc52",
    LayerZeroEndpoint: "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B",
    ArbitrumNodeInterface: zeroAddress,
    GelatoRelayAddress: "0xcd565435e0d2109feFde337a66491541Df0D1420",

    Vault: zeroAddress,
    Reader: zeroAddress,
    PositionRouter: zeroAddress,
    ReferralStorage: "0xAd917849372eaEF498E982F90bA6459a43ecbd31",
    VaultReader: zeroAddress,
    GlpManager: zeroAddress,
    RewardRouter: zeroAddress,
    RewardReader: zeroAddress,
    GlpRewardRouter: zeroAddress,
    StakedGmxTracker: zeroAddress,
    FeeGmxTracker: zeroAddress,
    GLP: zeroAddress,
    GMX: zeroAddress,
    ES_GMX: zeroAddress,
    BN_GMX: zeroAddress,
    USDG: zeroAddress,
    BonusGmxTracker: zeroAddress,
    StakedGlpTracker: zeroAddress,
    FeeGlpTracker: zeroAddress,
    ExtendedGmxTracker: zeroAddress,
    StakedGmxDistributor: zeroAddress,
    StakedGlpDistributor: zeroAddress,
    GmxVester: zeroAddress,
    GlpVester: zeroAddress,
    AffiliateVester: zeroAddress,
    Router: zeroAddress,
    GovToken: zeroAddress,
    ES_GMX_IOU: zeroAddress,
    OrderBook: zeroAddress,
    UniswapGmxEthPool: zeroAddress,

    // megaeth specific
    NATIVE_TOKEN: "0x4200000000000000000000000000000000000006",
  },

  [AVALANCHE_FUJI]: {
    // V1
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

    PositionRouter: zeroAddress,

    TraderJoeGmxAvaxPool: zeroAddress,
    ReferralStorage: "0x192e82A18a4ab446dD9968f055431b60640B155D",

    // Synthetics
    DataStore: "0xEA1BFb4Ea9A412dCCd63454AbC127431eBB0F0d4",
    EventEmitter: "0xc67D98AC5803aFD776958622CeEE332A0B2CabB9",
    ExchangeRouter: "0x0a458C96Ac0B2a130DA4BdF1aAdD4cb7Be036d11",
    SubaccountRouter: "0xD5EE3ECAF5754CE5Ff74847d0caf094EBB12ed5e",
    DepositVault: "0x2964d242233036C8BDC1ADC795bB4DeA6fb929f2",
    WithdrawalVault: "0x74d49B6A630Bf519bDb6E4efc4354C420418A6A2",
    OrderVault: "0x25D23e8E655727F2687CC808BB9589525A6F599B",
    ShiftVault: "0x257D0EA0B040E2Cd1D456fB4C66d7814102aD346",
    SyntheticsReader: "0xf82Cc6EB57F8FF86bc5c5e90B8BA83DbBFB517eE",
    SyntheticsRouter: "0x5e7d61e4C52123ADF651961e4833aCc349b61491",

    GlvReader: "0xdeaC9ea3c72C102f2a9654b8E1A14Ef86Cdd3146",
    GlvRouter: "0x6B6595389A0196F882C0f66CB1F401f1D24afEdC",
    GlvVault: "0x76f93b5240DF811a3fc32bEDd58daA5784e46C96",

    GelatoRelayRouter: "0xC2917611f422b1624D7316375690B532c149F54b",
    SubaccountGelatoRelayRouter: "0x9022ADce7c964852475aB0de801932BaDEB0C765",

    MultichainClaimsRouter: "0xa080c3E026467E1fa6E76D29A057Bf1261a4ec86",
    MultichainGlvRouter: "0x5060A75868ca21A54C650a70E96fa92405831b15",
    MultichainGmRouter: "0xe32632F65198eF3080ccDe22A6d23819203dBc42",
    MultichainOrderRouter: "0x6169DD9Bc75B1d4B7138109Abe58f5645BA6B8fE",
    MultichainSubaccountRouter: "0xa51181CC37D23d3a4b4B263D2B54e1F34B834432",
    MultichainTransferRouter: "0x0bD6966B894D9704Ce540babcd425C93d2BD549C",
    MultichainVault: "0xFd86A5d9D6dF6f0cB6B0e6A18Bea7CB07Ada4F79",
    LayerZeroProvider: "0xdaa9194bFD143Af71A8d2cFc8F2c0643094a77C5",

    ChainlinkPriceFeedProvider: "0x2e149AbC99cDC98FB0207d6F184DC323CEBB955B",
    ClaimHandler: "0x01D68cf13B8f67b041b8D565931e1370774cCeBd",

    // External
    KyberSwapRouter: zeroAddress,
    ExternalHandler: "0x0d9F90c66C392c4d0e70EE0d399c43729B942512",
    Multicall: "0x966D1F5c54a714C6443205F0Ec49eEF81F10fdfD",
    ArbitrumNodeInterface: zeroAddress,
    LayerZeroEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
  },

  [ARBITRUM_SEPOLIA]: {
    // Synthetics
    DataStore: "0xCF4c2C4c53157BcC01A596e3788fFF69cBBCD201",
    EventEmitter: "0xa973c2692C1556E1a3d478e745e9a75624AEDc73",
    ExchangeRouter: "0x6B489dD5bB1AAE8df246359d59aA7316760a75d2",
    SubaccountRouter: "0xAFdD3e0B6c162974594AcA157eA642B8847CC5b1",
    DepositVault: "0x809Ea82C394beB993c2b6B0d73b8FD07ab92DE5A",
    WithdrawalVault: "0x7601c9dBbDCf1f5ED1E7Adba4EFd9f2cADa037A5",
    OrderVault: "0x1b8AC606de71686fd2a1AEDEcb6E0EFba28909a2",
    ShiftVault: "0x6b6F9B7B9a6b69942DAE74FB95E694ec277117af",
    SyntheticsReader: "0x92659fEf40582ceCC3CBa4D096d28291C238D358",
    SyntheticsRouter: "0x72F13a44C8ba16a678CAD549F17bc9e06d2B8bD2",

    SimulationRouter: "0x82f1bb43b7E93dE4c38EC3198ed13e33D0904555",

    GlvReader: "0x45356cEE7f8668b7030577c13b4638802D3397Df",
    GlvRouter: "0x792D48B94F430965FE85645cF72527b3343d4BdD",
    GlvVault: "0x40bD50de0977c68ecB958ED4A065E14E1091ce64",

    GelatoRelayRouter: "0x7FB9d059d2F2323115285dAc25a3C66A67AeFAA7",
    SubaccountGelatoRelayRouter: "0xaa174e2fbE98C1EE42009B81ec8b8D9C0Ed075cf",

    MultichainClaimsRouter: "0x2265c65b65ad8336C6Eb41dA1f2BeB5fF7a1CA3F",
    MultichainGlvRouter: "0x666E55DABCDdd29C273B5C03886BcbFBd4FF654e",
    MultichainGmRouter: "0x3224967e564f2e5E2551F0B87Cb759230E3C6908",
    MultichainOrderRouter: "0xb813bf9a4968eb524C07aAf7Dd8c678840854f6C",
    MultichainSubaccountRouter: "0x01ecA08518c90acf2779F5509de74B1C2c590b58",
    MultichainTransferRouter: "0x26493a63B9e4Fd6E94bE8D3d9CfB5bAA90714697",
    MultichainVault: "0xCd46EF5ed7d08B345c47b5a193A719861Aa2CD91",
    LayerZeroProvider: "0x1Bc31F4e57d3A0694049ac6fa829a1B33111e28A",

    ChainlinkPriceFeedProvider: "0xa76BF7f977E80ac0bff49BDC98a27b7b070a937d",
    ReferralStorage: "0xBbCdA58c228Bb29B5769778181c81Ac8aC546c11",
    ClaimHandler: "0x90B3B7a28574e8E623Fdce11D93D85Dffe12398D",

    // External
    Multicall: "0xD84793ae65842fFac5C20Ab8eaBD699ea1FC79F3",
    NATIVE_TOKEN: "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73",
    LayerZeroEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    ArbitrumNodeInterface: "0x00000000000000000000000000000000000000C8",
    ArbSys: "0x0000000000000000000000000000000000000064",
    GelatoRelayAddress: "0xaBcC9b596420A9E9172FD5938620E265a0f9Df92",
    ExternalHandler: zeroAddress,

    GLP: zeroAddress,
    GMX: zeroAddress,
    ES_GMX: zeroAddress,
    BN_GMX: zeroAddress,
    USDG: zeroAddress,
    ES_GMX_IOU: zeroAddress,
    KyberSwapRouter: zeroAddress,
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

type ExtractContractNames<T extends object> = {
  [K in keyof T]: keyof T[K];
}[keyof T];

export type ContractName = ExtractContractNames<typeof CONTRACTS>;

export function getContract(chainId: ContractsChainId, name: ContractName): Address {
  if (!CONTRACTS[chainId]) {
    throw new Error(`Unknown chainId ${chainId}`);
  }

  if (!CONTRACTS[chainId][name]) {
    throw new Error(`Unknown contract "${name}" for chainId ${chainId}`);
  }

  return CONTRACTS[chainId][name];
}

export function tryGetContract(chainId: ContractsChainId, name: ContractName): Address | undefined {
  try {
    return getContract(chainId, name);
  } catch (e) {
    return undefined;
  }
}
