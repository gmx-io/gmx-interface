/*
  This files is used to pre-build data during the build process.
  Avoid adding client-side code here, as it can break the build process.

  However, this files can be a dependency for the client code.
*/

import { parse } from "date-fns";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI } from "./chains";

const p = (date: string) => parse(date, "dd MMM yyyy", new Date());

export const DEFAULT_LISTING = p("01 Jan 1970");

import { MARKETS as SDK_MARKETS } from "sdk/configs/markets";

type MarketUiConfig = {
  enabled: boolean;
  listingDate: Date;
};

/*
  ATTENTION
  When adding new markets, please add them also to the end of the list in ./sortedMarkets.ts
*/
const MARKETS_UI_CONFIGS: Record<number, Record<string, MarketUiConfig>> = {
  [ARBITRUM]: {
    // BTC/USD [WBTC.e-USDC]
    "0x47c031236e19d024b42f8AE6780E44A573170703": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // ETH/USD [WETH-USDC]
    "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // DOGE/USD [WETH-USDC]
    "0x6853EA96FF216fAb11D2d930CE3C508556A4bdc4": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // SOL/USD [SOL-USDC]
    "0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // LTC/USD [WETH-USDC]
    "0xD9535bB5f58A1a75032416F2dFe7880C30575a41": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // UNI/USD [UNI-USDC]
    "0xc7Abb2C5f3BF3CEB389dF0Eecd6120D451170B50": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // LINK/USD [LINK-USDC]
    "0x7f1fa204bb700853D36994DA19F830b6Ad18455C": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // ARB/USD [ARB-USDC]
    "0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // SWAP-ONLY [USDC-USDC.e]
    "0x9C2433dFD71096C435Be9465220BB2B189375eA7": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // SWAP-ONLY [USDC-USDT]
    "0xB686BcB112660343E6d15BDb65297e110C8311c4": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // SWAP-ONLY [USDC-DAI]
    "0xe2fEDb9e6139a182B98e7C2688ccFa3e9A53c665": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // XRP/USD [WETH-USDC]
    "0x0CCB4fAa6f1F1B30911619f1184082aB4E25813c": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // BNB/USD [BNB-USDC]
    "0x2d340912Aa47e33c90Efb078e69E70EFe2B34b9B": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // AAVE [AAVE-USDC]
    "0x1CbBa6346F110c8A5ea739ef2d1eb182990e4EB2": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // ATOM [WETH-USDC]
    "0x248C35760068cE009a13076D573ed3497A47bCD4": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // NEAR [WETH-USDC]
    "0x63Dc80EE90F26363B3FCD609007CC9e14c8991BE": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // AVAX [WAVAX-USDC]
    "0x7BbBf946883a5701350007320F525c5379B8178A": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // OP [OP-USDC]
    "0x4fDd333FF9cA409df583f306B6F5a7fFdE790739": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // BTC/USD [WBTC.e-WBTC.e]
    "0x7C11F78Ce78768518D743E81Fdfa2F860C6b9A77": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // ETH/USD [WETH-WETH]
    "0x450bb6774Dd8a756274E0ab4107953259d2ac541": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // GMX/USD [GMX-USDC]
    "0x55391D178Ce46e7AC8eaAEa50A72D1A5a8A622Da": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // PEPE [PEPE-USDC]
    "0x2b477989A149B17073D9C9C82eC9cB03591e20c6": {
      enabled: true,
      listingDate: p("17 Jul 2024"),
    },
    // WIF [WIF-USDC]
    "0x0418643F94Ef14917f1345cE5C460C37dE463ef7": {
      enabled: true,
      listingDate: p("17 Jul 2024"),
    },
    // ETH/USD [wstETH-USDe]
    "0x0Cf1fb4d1FF67A3D8Ca92c9d6643F8F9be8e03E5": {
      enabled: true,
      listingDate: p("31 Jul 2024"),
    },
    // SWAP-ONLY [wstETH-WETH]
    "0xb56E5E2eB50cf5383342914b0C85Fe62DbD861C8": {
      enabled: true,
      listingDate: p("31 Jul 2024"),
    },
    // SWAP-ONLY [USDe-USDC]
    "0x45aD16Aaa28fb66Ef74d5ca0Ab9751F2817c81a4": {
      enabled: true,
      listingDate: p("31 Jul 2024"),
    },
    // SHIB/USD [WETH-USDC]
    "0xB62369752D8Ad08392572db6d0cc872127888beD": {
      enabled: true,
      listingDate: p("7 Aug 2024"),
    },
    // STX/USD [wBTC-USDC]
    "0xD9377d9B9a2327C7778867203deeA73AB8a68b6B": {
      enabled: true,
      listingDate: p("14 Aug 2024"),
    },
    // ORDI/USD [wBTC-USDC]
    "0x93385F7C646A3048051914BDFaC25F4d620aeDF1": {
      enabled: true,
      listingDate: p("14 Aug 2024"),
    },
    // BTC/USD [tBTC]
    "0xd62068697bCc92AF253225676D618B0C9f17C663": {
      enabled: true,
      listingDate: p("11 Sep 2024"),
    },
    //  EIGEN/USD [WETH-USDC]
    "0xD4b737892baB8446Ea1e8Bb901db092fb1EC1791": {
      enabled: true,
      listingDate: p("10 Oct 2024"),
    },
    //  SATS/USD [WBTC-USDC]
    "0x8ea4Fb801493DaD8724F90Fb2e279534fa591366": {
      enabled: true,
      listingDate: p("10 Oct 2024"),
    },
    // POL/USD [ETH-USDC]
    "0xD0a1AFDDE31Eb51e8b53bdCE989EB8C2404828a4": {
      enabled: true,
      listingDate: p("17 Oct 2024"),
    },
    // AAVE/USD [ETH-USDC]
    "0x77B2eC357b56c7d05a87971dB0188DBb0C7836a5": {
      enabled: true,
      listingDate: p("17 Oct 2024"),
    },
    // PEPE/USD [ETH-USDC]
    "0x0Bb2a83F995E1E1eae9D7fDCE68Ab1ac55b2cc85": {
      enabled: true,
      listingDate: p("17 Oct 2024"),
    },
    // UNI/USD [ETH-USDC]
    "0xD8471b9Ea126272E6d32B5e4782Ed76DB7E554a4": {
      enabled: true,
      listingDate: p("17 Oct 2024"),
    },
    // APE/USD [APE-USDC]
    "0xdAB21c4d1F569486334C93685Da2b3F9b0A078e8": {
      enabled: true,
      listingDate: p("24 Oct 2024"),
    },
    // SUI/USD [WETH-USDC]
    "0x6Ecf2133E2C9751cAAdCb6958b9654baE198a797": {
      enabled: true,
      listingDate: p("24 Oct 2024"),
    },
    // SEI/USD [WETH-USDC]
    "0xB489711B1cB86afDA48924730084e23310EB4883": {
      enabled: true,
      listingDate: p("24 Oct 2024"),
    },
    // APT/USD [WETH-USDC]
    "0x66A69c8eb98A7efE22A22611d1967dfec786a708": {
      enabled: true,
      listingDate: p("31 Oct 2024"),
    },
    // TIA/USD [WETH-USDC]
    "0xBeB1f4EBC9af627Ca1E5a75981CE1AE97eFeDA22": {
      enabled: true,
      listingDate: p("31 Oct 2024"),
    },
    // TRX/USD [WETH-USDC]
    "0x3680D7bFE9260D3c5DE81AEB2194c119a59A99D1": {
      enabled: true,
      listingDate: p("7 Nov 2024"),
    },
    // TON/USD [WETH-USDC]
    "0x15c6eBD4175ffF9EE3c2615c556fCf62D2d9499c": {
      enabled: true,
      listingDate: p("7 Nov 2024"),
    },
    // WLD/USD [WETH-USDC]
    "0x872b5D567a2469Ed92D252eaCB0EB3BB0769e05b": {
      enabled: true,
      listingDate: p("15 Nov 2024"),
    },
    // BONK/USD [WETH-USDC]
    "0xFaC5fF56c269432706d47DC82Ab082E9AE7D989E": {
      enabled: true,
      listingDate: p("15 Nov 2024"),
    },
    // TAO/USD [WBTC-USDC]
    "0xe55e1A29985488A2c8846a91E925c2B7C6564db1": {
      enabled: true,
      listingDate: p("15 Nov 2024"),
    },
    // BOME/USD [WBTC/USDC]
    "0x71237F8C3d1484495A136022E16840b70fF84a69": {
      enabled: true,
      listingDate: p("21 Nov 2024"),
    },
    // FLOKI/USD [WBTC/USDC]
    "0xfD46a5702D4d97cE0164375744c65F0c31A3901b": {
      enabled: true,
      listingDate: p("21 Nov 2024"),
    },
    // MEME/USD [WBTC/USDC]
    "0x6CB901Cc64c024C3Fe4404c940FF9a3Acc229D2C": {
      enabled: true,
      listingDate: p("21 Nov 2024"),
    },
    // MEW/USD [WBTC/USDC]
    "0x71B7fF592a974e2B501D8A7a11f5c42DcD365244": {
      enabled: true,
      listingDate: p("21 Nov 2024"),
    },
    // GMX [GMX]
    "0xbD48149673724f9cAeE647bb4e9D9dDaF896Efeb": {
      enabled: true,
      listingDate: p("22 Nov 2024"),
    },
    // PENDLE/USD [PENDLE/USDC]
    "0x784292E87715d93afD7cb8C941BacaFAAA9A5102": {
      enabled: true,
      listingDate: p("22 Nov 2024"),
    },
    // ADA/USD [WBTC/USDC]
    "0xcaCb964144f9056A8f99447a303E60b4873Ca9B4": {
      enabled: true,
      listingDate: p("28 Nov 2024"),
    },
    // BCH/USD [WBTC/USDC]
    "0x62feB8Ec060A7dE5b32BbbF4AC70050f8a043C17": {
      enabled: true,
      listingDate: p("28 Nov 2024"),
    },
    // DOT/USD [WBTC/USDC]
    "0x7B2D09fca2395713dcc2F67323e4876F27b9ecB2": {
      enabled: true,
      listingDate: p("28 Nov 2024"),
    },
    // ICP/USD [WBTC/USDC]
    "0xdc4e96A251Ff43Eeac710462CD8A9D18Dc802F18": {
      enabled: true,
      listingDate: p("28 Nov 2024"),
    },
    // XLM/USD [WBTC/USDC]
    "0xe902D1526c834D5001575b2d0Ef901dfD0aa097A": {
      enabled: true,
      listingDate: p("29 Nov 2024"),
    },
    // RENDER/USD [WETH/USDC]
    "0x4c505e0062459cf8F60FfF13279c92ea15aE6e2D": {
      enabled: true,
      listingDate: p("29 Nov 2024"),
    },
    // SOL/USD [SOL]
    "0xf22CFFA7B4174554FF9dBf7B5A8c01FaaDceA722": {
      enabled: true,
      listingDate: p("29 Nov 2024"),
    },
    // FIL/USD [WBTC-USDC]
    "0x262B5203f0fe00D9fe86ffecE01D0f54fC116180": {
      enabled: true,
      listingDate: p("12 Dec 2024"),
    },
    // DYDX/USD [WBTC-USDC]
    "0x467C4A46287F6C4918dDF780D4fd7b46419c2291": {
      enabled: true,
      listingDate: p("26 Dec 2024"),
    },
    // INJ/USD [WBTC-USDC]
    "0x16466a03449CB9218EB6A980Aa4a44aaCEd27C25": {
      enabled: true,
      listingDate: p("26 Dec 2024"),
    },
    // TRUMP/USD [ETH-USDC]
    "0xFec8f404FBCa3b11aFD3b3f0c57507C2a06dE636": {
      enabled: true,
      listingDate: p("20 Jan 2025"),
    },
    // MELANIA/USD [WETH-USDC]
    "0x12fD1A4BdB96219E637180Ff5293409502b2951D": {
      enabled: true,
      listingDate: p("23 Jan 2025"),
    },
    // ENA/USD [WETH-USDC]
    "0x9F159014CC218e942E9E9481742fE5BFa9ac5A2C": {
      enabled: true,
      listingDate: p("23 Jan 2025"),
    },
    // AI16Z/USD [WBTC.e-USDC]
    "0xD60f1BA6a76979eFfE706BF090372Ebc0A5bF169": {
      enabled: true,
      listingDate: p("30 Jan 2025"),
    },
    // ANIME/USD [ANIME-USDC]
    "0x5707673D95a8fD317e2745C4217aCD64ca021B68": {
      enabled: true,
      listingDate: p("30 Jan 2025"),
    },
    // FARTCOIN/USD [WBTC.e-USDC]
    "0xe2730Ffe2136aA549327EBce93D58160df7821CB": {
      enabled: true,
      listingDate: p("30 Jan 2025"),
    },
  },
  [AVALANCHE]: {
    // BTC/USD [BTC-USDC]
    "0xFb02132333A79C8B5Bd0b64E3AbccA5f7fAf2937": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // ETH/USD [ETH-USDC]
    "0xB7e69749E3d2EDd90ea59A4932EFEa2D41E245d7": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // DOGE/USD [WAVAX-USDC]
    "0x8970B527E84aA17a33d38b65e9a5Ab5817FC0027": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // SOL/USD [SOL-USDC]
    "0xd2eFd1eA687CD78c41ac262B3Bc9B53889ff1F70": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // LTC/USD [WAVAX-USDC]
    "0xA74586743249243D3b77335E15FE768bA8E1Ec5A": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // AVAX/USD [WAVAX-USDC]
    "0x913C1F46b48b3eD35E7dc3Cf754d4ae8499F31CF": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // SWAP-ONLY [USDC-USDT.e]
    "0xf3652Eba45DC761e7ADd4091627d5Cda21F61613": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // SWAP-ONLY [USDC-USDC.e]
    "0x297e71A931C5825867E8Fb937Ae5cda9891C2E99": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // SWAP-ONLY [USDT-USDT.e]
    "0xA7b768d6a1f746fd5a513D440DF2970ff099B0fc": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // SWAP-ONLY [USDC-DAI.e]
    "0xDf8c9BD26e7C1A331902758Eb013548B2D22ab3b": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // XRP/USD [WAVAX-USDC]
    "0xD1cf931fa12783c1dd5AbB77a0706c27CF352f25": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // BTC/USD [BTC-BTC]
    "0x3ce7BCDB37Bf587d1C17B930Fa0A7000A0648D12": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // ETH/USD [ETH-ETH]
    "0x2A3Cf4ad7db715DF994393e4482D6f1e58a1b533": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // AVAX/USD [AVAX-AVAX]
    "0x08b25A2a89036d298D6dB8A74ace9d1ce6Db15E5": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // TRUMP/USD [WAVAX-USDC]
    "0xfB626c4e3E153947A6A94041814c25E449064dAD": {
      enabled: true,
      listingDate: p("30 Jan 2025"),
    },
    // MELANIA/USD [WAVAX-USDC]
    "0xe19da27Bf9733c429445E289B662bECDCa6ce10b": {
      enabled: true,
      listingDate: p("30 Jan 2025"),
    },
  },
  [AVALANCHE_FUJI]: {
    // AVAX/USD [WAVAX-USDC]
    "0xD996ff47A1F763E1e55415BC4437c59292D1F415": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // ETH/USD [ETH-USDC]
    "0xbf338a6C595f06B7Cfff2FA8c958d49201466374": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // ETH/USD [ETH-DAI]
    "0xDdF708B284C5C26BE67Adf9C51DFa935b5035bF8": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // ETH/USD [USDC]
    "0xe28323955C05B75E25B56C1c996C1354Eb5Aa13D": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // WBTC/USD [WBTC-USDC]
    "0x79E6e0E454dE82fA98c02dB012a2A69103630B07": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // WBTC/USD [WBTC-DAI]
    "0x4b6ccF6E429f038087A26b13DD6ab4304F7E5DF1": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // SOL/USD [ETH-USDC]
    "0xEDF9Be35bE84cD1e39Bda59Bd7ae8A704C12e06f": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // SWAP-ONLY [USDC-USDT]
    "0xeE8827D67C054cAa89C9d6058Fdddccd1C499c74": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // DOGE/USD [ETH-DAI]
    "0xAC2c6C1b0cd1CabF78B4e8ad58aA9d43375318Cb": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // LINK/USD [ETH-DAI]
    "0xeDf53322e288F597436f5d5849771662AEe16A1C": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // BNB/USD [ETH-DAI]
    "0x017de90B0fa830C592805C6148c089191716f04c": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // ADA/USD [ETH-DAI]
    "0x695a07d3DD551b0E77A348cC6A873c1eb183FA98": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // TRX/USD [ETH-DAI]
    "0x927f31364b8836021e4F73B27a5d0EbB35C74679": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // MATIC/USD [ETH-USDC]
    "0x62408de4cB1a499842EC53296EF8dD99A825CcEb": {
      enabled: true,
      listingDate: p("17 Sep 2024"),
    },
    // DOT/USD [ETH-USDC]
    "0xCc6AC193E1d1Ef102eCBBA864BBfE87E414a7A0D": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // UNI/USD [ETH-USDC]
    "0xE446E8f7074c0A97bb7cd448fA2CC3346045F514": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // TEST/USD [ETH-USDC]
    "0x1d9dC405CCEFA78b203BaD9CCe1b1623D2B25D9e": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // WBTC/USD [USDC-USDT]
    "0xd783EB54407d6d3A4D5c94b634eC9BAE3F574098": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // ETH/USD [USDC-DAI]
    "0x6d72D2787107c32a48bbA4687Eb8F9C19FE5e29C": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
    },
    // WBTC/USD [WBTC]
    "0x3b649015Fe0a4d15617e57aA11c0FbbfA03A9e11": {
      enabled: true,
      listingDate: DEFAULT_LISTING,
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
