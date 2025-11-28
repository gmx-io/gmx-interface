import { type Address, zeroAddress } from "viem";

import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, BOTANIX, ContractsChainId } from "./chains";

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
    ReferralStorage: "0xe6fab3f0c7199b0d34d7fbe83394fc0e0d06e99d",
    Timelock: "0xaa50bD556CE0Fe61D4A57718BA43177a3aB6A597",

    // Synthetics
    DataStore: "0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8",
    EventEmitter: "0xC8ee91A54287DB53897056e12D9819156D3822Fb",
    SubaccountRouter: "0xdD00F639725E19a209880A44962Bc93b51B1B161",
    ExchangeRouter: "0x1C3fa76e6E1088bCE750f23a5BFcffa1efEF6A41",
    DepositVault: "0xF89e77e8Dc11691C9e8757e84aaFbCD8A67d7A55",
    WithdrawalVault: "0x0628D46b5D145f183AdB6Ef1f2c97eD1C4701C55",
    OrderVault: "0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5",
    ShiftVault: "0xfe99609C4AA83ff6816b64563Bdffd7fa68753Ab",
    SyntheticsReader: "0x470fbC46bcC0f16532691Df360A07d8Bf5ee0789",
    SyntheticsRouter: "0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6",

    GlvReader: "0x2C670A23f1E798184647288072e84054938B5497",
    GlvRouter: "0x7EAdEE2ca1b4D06a0d82fDF03D715550c26AA12F",
    GlvVault: "0x393053B58f9678C9c28c2cE941fF6cac49C3F8f9",

    GelatoRelayRouter: "0xa9090E2fd6cD8Ee397cF3106189A7E1CFAE6C59C",
    SubaccountGelatoRelayRouter: "0x517602BaC704B72993997820981603f5E4901273",

    MultichainClaimsRouter: "0x277B4c0e8A76Fa927C9881967a4475Fd6E234e95",
    MultichainGlvRouter: "0xabcBbe23BD8E0dDD344Ff5fd1439b785B828cD2d",
    MultichainGmRouter: "0xC6782854A8639cC3b40f9497797d6B33797CA592",
    MultichainOrderRouter: "0xD38111f8aF1A7Cd809457C8A2303e15aE2170724",
    MultichainSubaccountRouter: "0x70AaAd50d53732b2D5534bb57332D00aE20cAd36",
    MultichainTransferRouter: "0xfaBEb65bB877600be3A2C2a03aA56a95F9f845B9",
    MultichainVault: "0xCeaadFAf6A8C489B250e407987877c5fDfcDBE6E",
    LayerZeroProvider: "0x7129Ea01F0826c705d6F7ab01Cf3C06bb83E9397",

    ChainlinkPriceFeedProvider: "0x38B8dB61b724b51e42A88Cb8eC564CD685a0f53B",
    ClaimHandler: "0x8a83F2a71A53d3860a60C9F2E68AB2C46Ff9624e",

    // External
    ExternalHandler: "0x389CEf541397e872dC04421f166B5Bc2E0b374a5",
    OpenOceanRouter: "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64",
    Multicall: "0xe79118d6D92a4b23369ba356C90b9A7ABf1CB961",
    ArbitrumNodeInterface: "0x00000000000000000000000000000000000000C8",
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
    Timelock: "0x8A68a039D555599Fd745f9343e8dE20C9eaFca75",

    // Synthetics
    DataStore: "0x2F0b22339414ADeD7D5F06f9D604c7fF5b2fe3f6",
    EventEmitter: "0xDb17B211c34240B014ab6d61d4A31FA0C0e20c26",
    SubaccountRouter: "0xf43F559774d2cF7882e6E846fCb87BDe183a6Da7",
    ExchangeRouter: "0x8f550E53DFe96C055D5Bdb267c21F268fCAF63B2",
    DepositVault: "0x90c670825d0C62ede1c5ee9571d6d9a17A722DFF",
    WithdrawalVault: "0xf5F30B10141E1F63FC11eD772931A8294a591996",
    OrderVault: "0xD3D60D22d415aD43b7e64b510D86A30f19B1B12C",
    ShiftVault: "0x7fC46CCb386e9bbBFB49A2639002734C3Ec52b39",
    SyntheticsReader: "0x62Cb8740E6986B29dC671B2EB596676f60590A5B",
    SyntheticsRouter: "0x820F5FfC5b525cD4d88Cd91aCf2c28F16530Cc68",

    GlvReader: "0x5C6905A3002f989E1625910ba1793d40a031f947",
    GlvRouter: "0x7E425c47b2Ff0bE67228c842B9C792D0BCe58ae6",
    GlvVault: "0x527FB0bCfF63C47761039bB386cFE181A92a4701",

    GelatoRelayRouter: "0xEE2d3339CbcE7A42573C96ACc1298A79a5C996Df",
    SubaccountGelatoRelayRouter: "0xfaBEb65bB877600be3A2C2a03aA56a95F9f845B9",

    MultichainClaimsRouter: "0xd10B10b816030347ff4E6767d340371B40b9F03D",
    MultichainGlvRouter: "0xEEE61742bC4cf361c60Cd65826864560Bf2D0bB6",
    MultichainGmRouter: "0xA191Bc0B72332e4c2022dB50a9d619079cc6c4fD",
    MultichainOrderRouter: "0xd099565957046a2d2CF41B0CC9F95e14a8afD13b",
    MultichainSubaccountRouter: "0x5872E84e5ea23292b40183BE86D25fb428621fC1",
    MultichainTransferRouter: "0x5A44a3b026d50EC039582fDb3aFDD88e2092E211",
    MultichainVault: "0x6D5F3c723002847B009D07Fe8e17d6958F153E4e",
    LayerZeroProvider: "0xF85Fd576bBe22Bce785B68922C1c9849d62737c0",

    ChainlinkPriceFeedProvider: "0x05d97cee050bfb81FB3EaD4A9368584F8e72C88e",
    ClaimHandler: "0xefCAdA759241D10B45d9Cb6265B19ADec97ceced",

    // External
    ExternalHandler: "0xD149573a098223a9185433290a5A5CDbFa54a8A9",
    OpenOceanRouter: "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64",
    Multicall: "0x50474CAe810B316c294111807F94F9f48527e7F8",
    ArbitrumNodeInterface: zeroAddress,
    LayerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
    GelatoRelayAddress: "0xaBcC9b596420A9E9172FD5938620E265a0f9Df92",
  },
  [BOTANIX]: {
    // Synthetics
    DataStore: "0xA23B81a89Ab9D7D89fF8fc1b5d8508fB75Cc094d",
    EventEmitter: "0xAf2E131d483cedE068e21a9228aD91E623a989C2",
    SubaccountRouter: "0xa1793126B6Dc2f7F254a6c0E2F8013D2180C0D10",
    ExchangeRouter: "0xBCB5eA3a84886Ce45FBBf09eBF0e883071cB2Dc8",
    DepositVault: "0x4D12C3D3e750e051e87a2F3f7750fBd94767742c",
    WithdrawalVault: "0x46BAeAEdbF90Ce46310173A04942e2B3B781Bf0e",
    OrderVault: "0xe52B3700D17B45dE9de7205DEe4685B4B9EC612D",
    ShiftVault: "0xa7EE2737249e0099906cB079BCEe85f0bbd837d4",

    SyntheticsReader: "0x922766ca6234cD49A483b5ee8D86cA3590D0Fb0E",
    SyntheticsRouter: "0x3d472afcd66F954Fe4909EEcDd5c940e9a99290c",

    GlvReader: "0x955Aa50d2ecCeffa59084BE5e875eb676FfAFa98",
    GlvRouter: "0xC92741F0a0D20A95529873cBB3480b1f8c228d9F",
    GlvVault: "0xd336087512BeF8Df32AF605b492f452Fd6436CD8",

    GelatoRelayRouter: "0x98e86155abf8bCbA566b4a909be8cF4e3F227FAf",
    SubaccountGelatoRelayRouter: "0xd6b16f5ceE328310B1cf6d8C0401C23dCd3c40d4",

    MultichainClaimsRouter: "0x421eB756B8f887f036e7332801288BC2bbA600aC",
    MultichainGlvRouter: "0x9C11DFa4DAFA9227Ef172cc1d87D4D5008804C47",
    MultichainGmRouter: "0x6a960F397eB8F2300F9FfA746F11375A613C5027",
    MultichainOrderRouter: "0xbC074fF8b85f9b66884E1EdDcE3410fde96bd798",
    MultichainSubaccountRouter: "0x8138Ce254Bc0AfE40369FDC2D1e46cE90944406d",
    MultichainTransferRouter: "0x844D38f2c3875b8351feB4764718E1c64bD55c46",
    MultichainVault: "0x9a535f9343434D96c4a39fF1d90cC685A4F6Fb20",
    LayerZeroProvider: "0x9E721ef9b908B4814Aa18502692E4c5666d1942e",

    ChainlinkPriceFeedProvider: "0xDc613305e9267f0770072dEaB8c03162e0554b2d",
    ClaimHandler: "0x162e3a5B47C9a45ff762E5b4b23D048D6780C14e",

    // External
    ExternalHandler: "0x36b906eA6AE7c74aeEE8cDE66D01B3f1f8843872",
    OpenOceanRouter: zeroAddress,
    Multicall: "0x4BaA24f93a657f0c1b4A0Ffc72B91011E35cA46b",
    LayerZeroEndpoint: "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B",
    ArbitrumNodeInterface: zeroAddress,
    GelatoRelayAddress: "0x61aCe8fBA7B80AEf8ED67f37CB60bE00180872aD",

    Vault: zeroAddress,
    Reader: zeroAddress,
    PositionRouter: zeroAddress,
    ReferralStorage: zeroAddress,
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

    // botanix specific
    NATIVE_TOKEN: "0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56",
    StBTC: "0xF4586028FFdA7Eca636864F80f8a3f2589E33795",
    PBTC: "0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56",
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
    Timelock: zeroAddress,

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
    OpenOceanRouter: zeroAddress,
    ExternalHandler: "0x0d9F90c66C392c4d0e70EE0d399c43729B942512",
    Multicall: "0x966D1F5c54a714C6443205F0Ec49eEF81F10fdfD",
    ArbitrumNodeInterface: zeroAddress,
    LayerZeroEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
  },

  [ARBITRUM_SEPOLIA]: {
    // Synthetics
    DataStore: "0xCF4c2C4c53157BcC01A596e3788fFF69cBBCD201",
    EventEmitter: "0xa973c2692C1556E1a3d478e745e9a75624AEDc73",
    ExchangeRouter: "0xEd50B2A1eF0C35DAaF08Da6486971180237909c3",
    SubaccountRouter: "0xCF45A7E8bB46738f454eC6766631E5612DA90836",
    DepositVault: "0x809Ea82C394beB993c2b6B0d73b8FD07ab92DE5A",
    WithdrawalVault: "0x7601c9dBbDCf1f5ED1E7Adba4EFd9f2cADa037A5",
    OrderVault: "0x1b8AC606de71686fd2a1AEDEcb6E0EFba28909a2",
    ShiftVault: "0x6b6F9B7B9a6b69942DAE74FB95E694ec277117af",
    SyntheticsReader: "0x4750376b9378294138Cf7B7D69a2d243f4940f71",
    SyntheticsRouter: "0x72F13a44C8ba16a678CAD549F17bc9e06d2B8bD2",

    GlvReader: "0x9B7D08AB020D9c180E4bAc370fB545317124Cf22",
    GlvRouter: "0x21b044Bb4a2Ba667723aA3d15ba7b4bCc628084D",
    GlvVault: "0x40bD50de0977c68ecB958ED4A065E14E1091ce64",

    GelatoRelayRouter: "0xD2f52a70224d3453ea17944ABC12772793987FA6",
    SubaccountGelatoRelayRouter: "0x43947140EEE26b82155baA18FDB746A05C700DCE",

    MultichainClaimsRouter: "0x0896f77B7dcE6923c58Ab1a1A91fFF617606E30b",
    MultichainGlvRouter: "0x10f3D7c30cabe91Cdd2785E5af37374842a1089C",
    MultichainGmRouter: "0x94dB1F9CAa86E86cD90F231411D31E5a3815bced",
    MultichainOrderRouter: "0xc9670CCD86d150C91f1f154813786f1Ec809Ae08",
    MultichainSubaccountRouter: "0x2E883D945AB36DC8491693c8870648a232b540a1",
    MultichainTransferRouter: "0xEaba39494d17e722f2Ef49929656b82d561b4460",
    MultichainVault: "0xCd46EF5ed7d08B345c47b5a193A719861Aa2CD91",
    LayerZeroProvider: "0x2E3d6B4c471C50983F21b54d3Ed8e3dAC7dAFF2e",

    ChainlinkPriceFeedProvider: "0xa76BF7f977E80ac0bff49BDC98a27b7b070a937d",
    ReferralStorage: "0xBbCdA58c228Bb29B5769778181c81Ac8aC546c11",
    ClaimHandler: "0xdB980712cCB142A11296c1b9cf70C24E1e90002A",

    // External
    Multicall: "0xD84793ae65842fFac5C20Ab8eaBD699ea1FC79F3",
    NATIVE_TOKEN: "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73",
    LayerZeroEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    ArbitrumNodeInterface: "0x00000000000000000000000000000000000000C8",
    GelatoRelayAddress: "0xaBcC9b596420A9E9172FD5938620E265a0f9Df92",
    ExternalHandler: zeroAddress,

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
    Timelock: zeroAddress,
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
