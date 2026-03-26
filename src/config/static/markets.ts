/*
  This files is used to pre-build data during the build process.
  Avoid adding client-side code here, as it can break the build process.

  However, this files can be a dependency for the client code.
*/
import {
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  AVALANCHE_FUJI,
  BOTANIX,
  MEGAETH,
  ContractsChainId,
} from "sdk/configs/chains";
import { MARKETS as SDK_MARKETS } from "sdk/configs/markets";

type MarketUiConfig = {
  enabled: boolean;
};

/*
  ATTENTION
  When adding new markets, please add them also to the end of the list in ./sortedMarkets.ts
*/
const MARKETS_UI_CONFIGS: Record<ContractsChainId, Record<string, MarketUiConfig>> = {
  [ARBITRUM]: {
    // BTC/USD [WBTC.e-USDC]
    "0x47c031236e19d024b42f8AE6780E44A573170703": {
      enabled: true,
    },
    // ETH/USD [WETH-USDC]
    "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336": {
      enabled: true,
    },
    // DOGE/USD [WETH-USDC]
    "0x6853EA96FF216fAb11D2d930CE3C508556A4bdc4": {
      enabled: true,
    },
    // SOL/USD [SOL-USDC]
    "0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9": {
      enabled: true,
    },
    // LTC/USD [WETH-USDC]
    "0xD9535bB5f58A1a75032416F2dFe7880C30575a41": {
      enabled: true,
    },
    // UNI/USD [UNI-USDC]
    "0xc7Abb2C5f3BF3CEB389dF0Eecd6120D451170B50": {
      enabled: true,
    },
    // LINK/USD [LINK-USDC]
    "0x7f1fa204bb700853D36994DA19F830b6Ad18455C": {
      enabled: true,
    },
    // ARB/USD [ARB-USDC]
    "0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407": {
      enabled: true,
    },
    // SPX6900/USD [WETH-USDC]
    "0x8263bC3766a09f6dD4Bab04b4bf8D45F2B0973FF": {
      enabled: true,
    },
    // MNT/USD [WETH-USDC]
    "0x40dAEAc02dCf6b3c51F9151f532C21DCEF2F7E63": {
      enabled: true,
    },
    // SWAP-ONLY [USDC-USDC.e]
    "0x9C2433dFD71096C435Be9465220BB2B189375eA7": {
      enabled: true,
    },
    // SWAP-ONLY [USDC-USDT]
    "0xB686BcB112660343E6d15BDb65297e110C8311c4": {
      enabled: true,
    },
    // SWAP-ONLY [USDC-DAI]
    "0xe2fEDb9e6139a182B98e7C2688ccFa3e9A53c665": {
      enabled: true,
    },
    // XRP/USD [WETH-USDC]
    "0x0CCB4fAa6f1F1B30911619f1184082aB4E25813c": {
      enabled: true,
    },
    // BNB/USD [BNB-USDC]
    "0x2d340912Aa47e33c90Efb078e69E70EFe2B34b9B": {
      enabled: true,
    },
    // AAVE [AAVE-USDC]
    "0x1CbBa6346F110c8A5ea739ef2d1eb182990e4EB2": {
      enabled: true,
    },
    // ATOM [WETH-USDC]
    "0x248C35760068cE009a13076D573ed3497A47bCD4": {
      enabled: true,
    },
    // NEAR [WETH-USDC]
    "0x63Dc80EE90F26363B3FCD609007CC9e14c8991BE": {
      enabled: true,
    },
    // AVAX [WAVAX-USDC]
    "0x7BbBf946883a5701350007320F525c5379B8178A": {
      enabled: true,
    },
    // OP [OP-USDC]
    "0x4fDd333FF9cA409df583f306B6F5a7fFdE790739": {
      enabled: true,
    },
    // BTC/USD [WBTC.e-WBTC.e]
    "0x7C11F78Ce78768518D743E81Fdfa2F860C6b9A77": {
      enabled: true,
    },
    // ETH/USD [WETH-WETH]
    "0x450bb6774Dd8a756274E0ab4107953259d2ac541": {
      enabled: true,
    },
    // GMX/USD [GMX-USDC]
    "0x55391D178Ce46e7AC8eaAEa50A72D1A5a8A622Da": {
      enabled: true,
    },
    // PEPE [PEPE-USDC]
    "0x2b477989A149B17073D9C9C82eC9cB03591e20c6": {
      enabled: true,
    },
    // WIF [WIF-USDC]
    "0x0418643F94Ef14917f1345cE5C460C37dE463ef7": {
      enabled: true,
    },
    // ETH/USD [wstETH-USDe]
    "0x0Cf1fb4d1FF67A3D8Ca92c9d6643F8F9be8e03E5": {
      enabled: true,
    },
    // SWAP-ONLY [wstETH-WETH]
    "0xb56E5E2eB50cf5383342914b0C85Fe62DbD861C8": {
      enabled: true,
    },
    // SWAP-ONLY [USDe-USDC]
    "0x45aD16Aaa28fb66Ef74d5ca0Ab9751F2817c81a4": {
      enabled: true,
    },
    // SHIB/USD [WETH-USDC]
    "0xB62369752D8Ad08392572db6d0cc872127888beD": {
      enabled: true,
    },
    // STX/USD [wBTC-USDC]
    "0xD9377d9B9a2327C7778867203deeA73AB8a68b6B": {
      enabled: true,
    },
    // ORDI/USD [wBTC-USDC]
    "0x93385F7C646A3048051914BDFaC25F4d620aeDF1": {
      enabled: true,
    },
    // BTC/USD [tBTC]
    "0xd62068697bCc92AF253225676D618B0C9f17C663": {
      enabled: true,
    },
    //  EIGEN/USD [WETH-USDC]
    "0xD4b737892baB8446Ea1e8Bb901db092fb1EC1791": {
      enabled: true,
    },
    //  SATS/USD [WBTC-USDC]
    "0x8ea4Fb801493DaD8724F90Fb2e279534fa591366": {
      enabled: true,
    },
    // POL/USD [ETH-USDC]
    "0xD0a1AFDDE31Eb51e8b53bdCE989EB8C2404828a4": {
      enabled: true,
    },
    // AAVE/USD [ETH-USDC]
    "0x77B2eC357b56c7d05a87971dB0188DBb0C7836a5": {
      enabled: true,
    },
    // PEPE/USD [ETH-USDC]
    "0x0Bb2a83F995E1E1eae9D7fDCE68Ab1ac55b2cc85": {
      enabled: true,
    },
    // UNI/USD [ETH-USDC]
    "0xD8471b9Ea126272E6d32B5e4782Ed76DB7E554a4": {
      enabled: true,
    },
    // APE/USD [APE-USDC]
    "0xdAB21c4d1F569486334C93685Da2b3F9b0A078e8": {
      enabled: true,
    },
    // SUI/USD [WETH-USDC]
    "0x6Ecf2133E2C9751cAAdCb6958b9654baE198a797": {
      enabled: true,
    },
    // SEI/USD [WETH-USDC]
    "0xB489711B1cB86afDA48924730084e23310EB4883": {
      enabled: true,
    },
    // APT/USD [WETH-USDC]
    "0x66A69c8eb98A7efE22A22611d1967dfec786a708": {
      enabled: true,
    },
    // TIA/USD [WETH-USDC]
    "0xBeB1f4EBC9af627Ca1E5a75981CE1AE97eFeDA22": {
      enabled: true,
    },
    // TRX/USD [WETH-USDC]
    "0x3680D7bFE9260D3c5DE81AEB2194c119a59A99D1": {
      enabled: true,
    },
    // TON/USD [WETH-USDC]
    "0x15c6eBD4175ffF9EE3c2615c556fCf62D2d9499c": {
      enabled: true,
    },
    // WLD/USD [WETH-USDC]
    "0x872b5D567a2469Ed92D252eaCB0EB3BB0769e05b": {
      enabled: true,
    },
    // BONK/USD [WETH-USDC]
    "0xFaC5fF56c269432706d47DC82Ab082E9AE7D989E": {
      enabled: true,
    },
    // TAO/USD [WBTC-USDC]
    "0xe55e1A29985488A2c8846a91E925c2B7C6564db1": {
      enabled: true,
    },
    // BOME/USD [WBTC/USDC]
    "0x71237F8C3d1484495A136022E16840b70fF84a69": {
      enabled: true,
    },
    // FLOKI/USD [WBTC/USDC]
    "0xfD46a5702D4d97cE0164375744c65F0c31A3901b": {
      enabled: true,
    },
    // MEME/USD [WBTC/USDC]
    "0x6CB901Cc64c024C3Fe4404c940FF9a3Acc229D2C": {
      enabled: true,
    },
    // MEW/USD [WBTC/USDC]
    "0x71B7fF592a974e2B501D8A7a11f5c42DcD365244": {
      enabled: true,
    },
    // GMX [GMX]
    "0xbD48149673724f9cAeE647bb4e9D9dDaF896Efeb": {
      enabled: true,
    },
    // PENDLE/USD [PENDLE/USDC]
    "0x784292E87715d93afD7cb8C941BacaFAAA9A5102": {
      enabled: true,
    },
    // ADA/USD [WBTC/USDC]
    "0xcaCb964144f9056A8f99447a303E60b4873Ca9B4": {
      enabled: true,
    },
    // BCH/USD [WBTC/USDC]
    "0x62feB8Ec060A7dE5b32BbbF4AC70050f8a043C17": {
      enabled: true,
    },
    // DOT/USD [WBTC/USDC]
    "0x7B2D09fca2395713dcc2F67323e4876F27b9ecB2": {
      enabled: true,
    },
    // ICP/USD [WBTC/USDC]
    "0xdc4e96A251Ff43Eeac710462CD8A9D18Dc802F18": {
      enabled: true,
    },
    // XLM/USD [WBTC/USDC]
    "0xe902D1526c834D5001575b2d0Ef901dfD0aa097A": {
      enabled: true,
    },
    // RENDER/USD [WETH/USDC]
    "0x4c505e0062459cf8F60FfF13279c92ea15aE6e2D": {
      enabled: true,
    },
    // SOL/USD [SOL]
    "0xf22CFFA7B4174554FF9dBf7B5A8c01FaaDceA722": {
      enabled: true,
    },
    // FIL/USD [WBTC-USDC]
    "0x262B5203f0fe00D9fe86ffecE01D0f54fC116180": {
      enabled: true,
    },
    // DYDX/USD [WBTC-USDC]
    "0x467C4A46287F6C4918dDF780D4fd7b46419c2291": {
      enabled: true,
    },
    // INJ/USD [WBTC-USDC]
    "0x16466a03449CB9218EB6A980Aa4a44aaCEd27C25": {
      enabled: true,
    },
    // TRUMP/USD [ETH-USDC]
    "0xFec8f404FBCa3b11aFD3b3f0c57507C2a06dE636": {
      enabled: true,
    },
    // MELANIA/USD [WETH-USDC]
    "0x12fD1A4BdB96219E637180Ff5293409502b2951D": {
      enabled: true,
    },
    // ENA/USD [WETH-USDC]
    "0x9F159014CC218e942E9E9481742fE5BFa9ac5A2C": {
      enabled: true,
    },
    // AI16Z/USD [WBTC.e-USDC]
    "0xD60f1BA6a76979eFfE706BF090372Ebc0A5bF169": {
      enabled: true,
    },
    // ANIME/USD [ANIME-USDC]
    "0x5707673D95a8fD317e2745C4217aCD64ca021B68": {
      enabled: true,
    },
    // FARTCOIN/USD [WBTC.e-USDC]
    "0xe2730Ffe2136aA549327EBce93D58160df7821CB": {
      enabled: true,
    },
    // BERA/USD [WETH-USDC]
    "0x876Ff160d63809674e03f82DC4D3C3Ae8B0acF28": {
      enabled: true,
    },
    // LDO/USD [WETH-USDC]
    "0xE61e608Ba010fF48A7dcE8eDd8B906744263d33E": {
      enabled: true,
    },
    // VIRTUAL/USD [WBTC-USDC]
    "0x75F190E0Be6E8B933A01423EFE398c6C721A5CfF": {
      enabled: true,
    },
    // PENGU/USD [WBTC-USDC]
    "0x0c11Ed89889Fd03394E8d9d685cC5b85be569C99": {
      enabled: true,
    },
    // FET/USD [WETH-USDC]
    "0xa8A455Ed94b315460CfF7d96966d91330f6A3bA0": {
      enabled: true,
    },
    // ONDO/USD [WETH-USDC]
    "0x970e578fF01589Bb470CE38a2f1753152A009366": {
      enabled: true,
    },
    // AIXBT/USD [WETH-USDC]
    "0x04DecfB37e46075189324817df80a32D22b9eD8D": {
      enabled: true,
    },
    // S/USD [WBTC-USDC]
    "0x4d9bA415649c4B3c703562770C8ff3033478Cea1": {
      enabled: true,
    },
    // CAKE/USD [WBTC-USDC]
    "0xdE967676db7b1ccdBA2bD94B01B5b19DE4b563e4": {
      enabled: true,
    },
    // HYPE/USD [WBTC-USDC]
    "0xBcb8FE13d02b023e8f94f6881Cc0192fd918A5C0": {
      enabled: true,
    },
    // JUP/USD [WBTC-USDC]
    "0x7DE8E1A1fbA845A330A6bD91118AfDA09610fB02": {
      enabled: true,
    },
    // MKR/USD [WETH-USDC]
    "0x2aE5c5Cd4843cf588AA8D1289894318130acc823": {
      enabled: true,
    },
    // OM/USD [WBTC-USDC]
    "0x89EB78679921499632fF16B1be3ee48295cfCD91": {
      enabled: true,
    },
    // DOLO/USD [WETH-USDC]
    "0x4D3Eb91efd36C2b74181F34B111bc1E91a0d0cb4": {
      enabled: true,
    },
    // ZRO/USD [WETH-USDC]
    "0x9e79146b3A022Af44E0708c6794F03Ef798381A5": {
      enabled: true,
    },
    // CRV/USD - [WETH-USDC]
    "0x0e46941F9bfF8d0784BFfa3d0D7883CDb82D7aE7": {
      enabled: true,
    },
    // XMR/USD [WBTC-USDC]
    "0x7c54D547FAD72f8AFbf6E5b04403A0168b654C6f": {
      enabled: true,
    },
    // MOODENG/USD [WBTC-USDC]
    "0x2523B89298908FEf4c5e5bd6F55F20926e22058f": {
      enabled: true,
    },
    // PI/USD [WBTC-USDC]
    "0x39AC3C494950A4363D739201BA5A0861265C9ae5": {
      enabled: true,
    },
    // PUMP/USD [WBTC-USDC]
    "0x4C0Bb704529Fa49A26bD854802d70206982c6f1B": {
      enabled: true,
    },
    // ARB/USD [ARB-ARB]
    "0x672fEA44f4583DdaD620d60C1Ac31021F47558Cb": {
      enabled: true,
    },
    // ALGO/USD [WBTC-USDC]
    "0x3B7f4e4Cf2fa43df013d2B32673e6A01d29ab2Ac": {
      enabled: true,
    },
    // CRO/USD [WBTC-USDC]
    "0xa29FfE4152B65A0347512Ae5c6A4Bbc7a3d6d51B": {
      enabled: true,
    },
    // HBAR/USD [WBTC-USDC]
    "0x9f0849FB830679829d1FB759b11236D375D15C78": {
      enabled: true,
    },
    // CVX/USD [WETH-USDC]
    "0x41E3bC5B72384C8B26b559B7d16C2B81Fd36fbA2": {
      enabled: true,
    },
    // KAS/USD [WBTC-USDC]
    "0x4024418592450E4d62faB15e2f833FC03A3447dc": {
      enabled: true,
    },
    // OKB/USD [WETH-USDC]
    "0x2a331e51a3D17211852d8625a1029898450e539B": {
      enabled: true,
    },
    // WIF/USD [WBTC-USDC]
    "0x3f649eab7f4CE4945F125939C64429Be2C5d0cB4": {
      enabled: true,
    },
    // AERO/USD [WETH-USDC]
    "0xfaEaE570B07618D3F10360608E43c241181c4614": {
      enabled: true,
    },
    // BRETT/USD [WETH-USDC]
    "0x6EeE8098dBC106aEde99763FA5F955A5bBc42C50": {
      enabled: true,
    },
    // WLFI/USD [WETH-USDC]
    "0xb3588455858a49D3244237CEe00880CcB84b91Dd": {
      enabled: true,
    },
    // LINK/USD [WETH-USDC]
    "0xF913B4748031EF569898ED91e5BA0d602bB93298": {
      enabled: true,
    },
    // MORPHO/USD [WETH-USDC]
    "0x4De268aC68477f794C3eAC5A419Cbcffc2cD5e02": {
      enabled: true,
    },
    // VVV/USD [WETH-USDC]
    "0x947C521E44f727219542B0f91a85182193c1D2ad": {
      enabled: true,
    },
    // WELL/USD [WETH-USDC]
    "0x2347EbB8645Cc2EA0Ba92D1EC59704031F2fCCf4": {
      enabled: true,
    },
    // KTA/USD [WETH-USDC]
    "0x970b730b5dD18de53A230eE8F4af088dBC3a6F8d": {
      enabled: true,
    },
    // ZORA/USD [WETH-USDC]
    "0xac484106d935f0f20F1485b631fA6F65AeEff550": {
      enabled: true,
    },
    // XPL/USD [WBTC.e-USDC]
    "0x4b67aa8F754b17b1029Ad2DB4fb6a276CCe350c4": {
      enabled: true,
    },
    // ASTER/USD [WBTC-USDC]
    "0x0164B6c847c65e07C9F6226149ADBFA7C1dE40Cf": {
      enabled: true,
    },
    // 0G/USD [WBTC-USDC]
    "0xe024188850A822409F362209C1EF2cFdc7c4DE4C": {
      enabled: true,
    },
    // AVNT/USD [WETH-USDC]
    "0xCEff9D261A96Cb78Df35f9333ba9F2F4CFcb8a68": {
      enabled: true,
    },
    // LINEA/USD [WETH-USDC]
    "0x6d9430A116ed4d4FC6FE1996A5493662d555b07E": {
      enabled: true,
    },
    // SOL/USD [WBTC.e-USDC]
    "0xcf083d35AD306A042d4Fb312fCdd8228b52b82f8": {
      enabled: true,
    },
    // BNB/USD [WBTC.e-USDC]
    "0x065577D05c3D4C11505ed7bc97BBF85d462A6A6f": {
      enabled: true,
    },
    // MON/USD [WETH-USDC]
    "0x66AB9D61A0124b61C8892A4ac687Ac48DbA8ff2c": {
      enabled: true,
    },
    // ZEC/USD [WBTC.e-USDC]
    "0x587759c237acCa739bCE3911647BacF56C876E60": {
      enabled: true,
    },
    // SKY/USD [WETH-USDC]
    "0x00310c6d8A9F821e3FE991f4835f2cA4d87034Cf": {
      enabled: true,
    },
    // AR/USD [WBTC-USDC]
    "0xfa19f7d23a475575BD0270AE7de4FC6852442945": {
      enabled: true,
    },
    // DASH/USD [WBTC-USDC]
    "0x728Ff0679c89267434D6EF1824c8C8eED4aC3DBC": {
      enabled: true,
    },
    // JTO/USD [WBTC-USDC]
    "0x3B4689d69516b9D4b1aaf7545c6fC4d3ED70b70b": {
      enabled: true,
    },
    // SYRUP/USD [WETH-USDC]
    "0x8965e821c7C8c09c6eB3Cb9cCf7Eb6f386441EA2": {
      enabled: true,
    },
    // CHZ/USD [WETH-USDC]
    "0x3600592DdEd7e6E0B05029DfB637fFc5A85D6f6B": {
      enabled: true,
    },
    // XAUT/USD [WBTC-USDC]
    "0xeb28aD1a2e497F4Acc5D9b87e7B496623C93061E": {
      enabled: true,
    },
    // LIT/USD [WETH-USDC]
    "0x044dFE01863CE85f9ECd5639eE5485c90AC320FC": {
      enabled: true,
    },
    // IP/USD [WBTC-USDC]
    "0x5ff52BE1968107D7886a8E9A64874A45c8F5D96a": {
      enabled: true,
    },
    // CC/USD [WBTC-USDC]
    "0x45F0331a6e175B556Bc7d28E0A1c349525006d4E": {
      enabled: true,
    },
    // MET/USD [WBTC-USDC]
    "0xbA30e198CFFeBEf0A84D6943cC8B2e356E324112": {
      enabled: true,
    },
  },
  [AVALANCHE]: {
    // BTC/USD [BTC-USDC]
    "0xFb02132333A79C8B5Bd0b64E3AbccA5f7fAf2937": {
      enabled: true,
    },
    // ETH/USD [ETH-USDC]
    "0xB7e69749E3d2EDd90ea59A4932EFEa2D41E245d7": {
      enabled: true,
    },
    // DOGE/USD [WAVAX-USDC]
    "0x8970B527E84aA17a33d38b65e9a5Ab5817FC0027": {
      enabled: true,
    },
    // SOL/USD [SOL-USDC]
    "0xd2eFd1eA687CD78c41ac262B3Bc9B53889ff1F70": {
      enabled: true,
    },
    // LTC/USD [WAVAX-USDC]
    "0xA74586743249243D3b77335E15FE768bA8E1Ec5A": {
      enabled: true,
    },
    // AVAX/USD [WAVAX-USDC]
    "0x913C1F46b48b3eD35E7dc3Cf754d4ae8499F31CF": {
      enabled: true,
    },
    // SWAP-ONLY [USDC-USDT.e]
    "0xf3652Eba45DC761e7ADd4091627d5Cda21F61613": {
      enabled: true,
    },
    // SWAP-ONLY [USDC-USDC.e]
    "0x297e71A931C5825867E8Fb937Ae5cda9891C2E99": {
      enabled: true,
    },
    // SWAP-ONLY [USDT-USDT.e]
    "0xA7b768d6a1f746fd5a513D440DF2970ff099B0fc": {
      enabled: true,
    },
    // SWAP-ONLY [USDC-DAI.e]
    "0xDf8c9BD26e7C1A331902758Eb013548B2D22ab3b": {
      enabled: true,
    },
    // XRP/USD [WAVAX-USDC]
    "0xD1cf931fa12783c1dd5AbB77a0706c27CF352f25": {
      enabled: true,
    },
    // BTC/USD [BTC-BTC]
    "0x3ce7BCDB37Bf587d1C17B930Fa0A7000A0648D12": {
      enabled: true,
    },
    // ETH/USD [ETH-ETH]
    "0x2A3Cf4ad7db715DF994393e4482D6f1e58a1b533": {
      enabled: true,
    },
    // AVAX/USD [AVAX-AVAX]
    "0x08b25A2a89036d298D6dB8A74ace9d1ce6Db15E5": {
      enabled: true,
    },
    // TRUMP/USD [WAVAX-USDC]
    "0xfB626c4e3E153947A6A94041814c25E449064dAD": {
      enabled: true,
    },
    // MELANIA/USD [WAVAX-USDC]
    "0xe19da27Bf9733c429445E289B662bECDCa6ce10b": {
      enabled: true,
    },
    // PUMP/USD [WAVAX-USDC]
    "0x94cE6F65188a92F297C7f0A5A7B3cAd9013450F8": {
      enabled: true,
    },
    // WLFI/USD [WAVAX-USDC]
    "0x1cb9932CE322877A2B86489BD1aA3C3CfF879F0d": {
      enabled: true,
    },
    // XAUt0/USD [XAUt0-XAUt0]
    "0x1635eF7FBdce68eC80A3672aB710A5a99044f5c9": {
      enabled: true,
    },
    // XAUt0/USD [XAUt0-USDT]
    "0x92d3DA41E166A12e3Ede9e2Dd9A272C5c6FC55E1": {
      enabled: true,
    },
  },
  [AVALANCHE_FUJI]: {
    // AVAX/USD [WAVAX-USDC]
    "0xD996ff47A1F763E1e55415BC4437c59292D1F415": {
      enabled: true,
    },
    // ETH/USD [ETH-USDC]
    "0xbf338a6C595f06B7Cfff2FA8c958d49201466374": {
      enabled: true,
    },
    // ETH/USD [ETH-DAI]
    "0xDdF708B284C5C26BE67Adf9C51DFa935b5035bF8": {
      enabled: true,
    },
    // ETH/USD [USDC]
    "0xe28323955C05B75E25B56C1c996C1354Eb5Aa13D": {
      enabled: true,
    },
    // WBTC/USD [WBTC-USDC]
    "0x79E6e0E454dE82fA98c02dB012a2A69103630B07": {
      enabled: true,
    },
    // WBTC/USD [WBTC-DAI]
    "0x4b6ccF6E429f038087A26b13DD6ab4304F7E5DF1": {
      enabled: true,
    },
    // SOL/USD [ETH-USDC]
    "0xEDF9Be35bE84cD1e39Bda59Bd7ae8A704C12e06f": {
      enabled: true,
    },
    // SWAP-ONLY [USDC-USDT]
    "0xeE8827D67C054cAa89C9d6058Fdddccd1C499c74": {
      enabled: true,
    },
    // DOGE/USD [ETH-DAI]
    "0xAC2c6C1b0cd1CabF78B4e8ad58aA9d43375318Cb": {
      enabled: true,
    },
    // LINK/USD [ETH-DAI]
    "0xeDf53322e288F597436f5d5849771662AEe16A1C": {
      enabled: true,
    },
    // BNB/USD [ETH-DAI]
    "0x017de90B0fa830C592805C6148c089191716f04c": {
      enabled: true,
    },
    // ADA/USD [ETH-DAI]
    "0x695a07d3DD551b0E77A348cC6A873c1eb183FA98": {
      enabled: true,
    },
    // TRX/USD [ETH-DAI]
    "0x927f31364b8836021e4F73B27a5d0EbB35C74679": {
      enabled: true,
    },
    // MATIC/USD [ETH-USDC]
    "0x62408de4cB1a499842EC53296EF8dD99A825CcEb": {
      enabled: true,
    },
    // DOT/USD [ETH-USDC]
    "0xCc6AC193E1d1Ef102eCBBA864BBfE87E414a7A0D": {
      enabled: true,
    },
    // UNI/USD [ETH-USDC]
    "0xE446E8f7074c0A97bb7cd448fA2CC3346045F514": {
      enabled: true,
    },
    // TEST/USD [ETH-USDC]
    "0x1d9dC405CCEFA78b203BaD9CCe1b1623D2B25D9e": {
      enabled: true,
    },
    // WBTC/USD [USDC-USDT]
    "0xd783EB54407d6d3A4D5c94b634eC9BAE3F574098": {
      enabled: true,
    },
    // ETH/USD [USDC-DAI]
    "0x6d72D2787107c32a48bbA4687Eb8F9C19FE5e29C": {
      enabled: true,
    },
    // WBTC/USD [WBTC]
    "0x3b649015Fe0a4d15617e57aA11c0FbbfA03A9e11": {
      enabled: true,
    },
  },
  [ARBITRUM_SEPOLIA]: {
    // ETH/USD [ETH-USDC]
    "0x482Df3D320C964808579b585a8AC7Dd5D144eFaF": {
      enabled: true,
    },
    // BTC/USD [BTC-USDC]
    "0xBb532Ab4923C23c2bfA455151B14fec177a34C0D": {
      enabled: true,
    },
    // ETH/USD [ETH-USDC.SG]
    "0xb6fC4C9eB02C35A134044526C62bb15014Ac0Bcc": {
      enabled: true,
    },
    // BTC/USD [BTC-USDC.SG]
    "0x3A83246bDDD60c4e71c91c10D9A66Fd64399bBCf": {
      enabled: true,
    },
    // CRV/USD [WETH-USDC]
    "0xAde9D177B9E060D2064ee9F798125e6539fDaA1c": {
      enabled: true,
    },
  },
  [BOTANIX]: {
    // BTC/USD [stBTC-stBTC]
    "0x6682BB60590a045A956541B1433f016Ed22E361d": {
      enabled: true,
    },
    // BTC/USD [stBTC-USDC.E]
    "0x2f95a2529328E427d3204555F164B1102086690E": {
      enabled: true,
    },
    // BTC/USD [PBTC-PBTC]
    "0x6bFDD025827F7CE130BcfC446927AEF34ae2a98d": {
      enabled: true,
    },
  },
  [MEGAETH]: {
    // BTC/USD [USDM-USDM]
    "0x31EdCc52bE2Fa55Ba68f50409F9e6b7d9EbF3D59": {
      enabled: true,
    },
    // ETH/USD [USDM-USDM]
    "0x9b1B72720f6D277F3b1e607a0c5fab1B300248b1": {
      enabled: true,
    },
    // SOL/USD [USDM-USDM]
    "0xe8E716F1cddfFD0698B86919D41A8228d701fEe9": {
      enabled: true,
    },
    // SWAP-ONLY [ETH-USDM]
    "0xc5c9B5E23810565763De41144741477eeCB25e2e": {
      enabled: true,
    },
  },
};

export const MARKETS = Object.keys(MARKETS_UI_CONFIGS).reduce(
  (acc, network) => {
    return {
      ...acc,
      [network]: Object.keys(MARKETS_UI_CONFIGS[network]).reduce((acc, address) => {
        return {
          ...acc,
          [address]: {
            ...SDK_MARKETS[network][address],
            ...MARKETS_UI_CONFIGS[network][address],
          },
        };
      }, {}),
    };
  },
  {} as Record<
    number,
    Record<
      string,
      MarketUiConfig & {
        longTokenAddress: string;
        shortTokenAddress: string;
        indexTokenAddress: string;
        marketTokenAddress: string;
      }
    >
  >
);
