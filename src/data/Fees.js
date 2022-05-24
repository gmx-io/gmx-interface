const SECONDS_PER_WEEK = 604800;

const FEES = {
  56: [
    {
      from: 1620205889 - SECONDS_PER_WEEK,
      to: 1620205889,
      feeAssets: "0.1603 BTC, 4.4701 ETH, 42.7548 BNB, 13,709.5913 BUSD, 6,134.1901 USDC, 8,134.1596 USDT",
      feeUsd: "79826.79",
    },
    {
      from: 1620786634 - SECONDS_PER_WEEK,
      to: 1620786634,
      feeAssets: "0.0412 BTC, 5.6775 ETH, 39.8377 BNB, 10,228.1919 BUSD, 11,095.6480 USDC, 1,163.4386 USDT",
      feeUsd: "75618.63",
    },
    {
      from: 1621393956 - SECONDS_PER_WEEK,
      to: 1621393956,
      feeAssets: "0.1596 BTC, 8.2261 ETH, 225.1073 BNB, 9,472.8827 BUSD, 66,029.0305 USDC, 15,171.2389 USDT",
      feeUsd: "226885.65",
    },
    {
      from: 1621999187 - SECONDS_PER_WEEK,
      to: 1621999187,
      feeAssets: "0.2624 BTC, 8.7960 ETH, 56.3157 BNB, 25,812.4605 BUSD, 19,202.5132 USDC, 3,233.8975 USDT",
      feeUsd: "103498.60",
    },
    {
      from: 1622594843 - SECONDS_PER_WEEK,
      to: 1622594843,
      feeAssets: "0.0434 BTC, 1.5276 ETH, 29.6398 BNB, 44,034.42733 BUSD, 957.2660 USDC, 6,259.4550 USDT",
      feeUsd: "67466.93",
    },
    {
      from: 1623204440 - SECONDS_PER_WEEK,
      to: 1623204440,
      feeAssets: "0.1210 BTC, 4.7566 ETH, 109.0878 BNB, 79,148.7061 BUSD, 404.5143 USDC, 26,713.8593 USDT",
      feeUsd: "158720.51",
    },
    {
      from: 1623806161 - SECONDS_PER_WEEK,
      to: 1623806161,
      feeAssets: "0.0963 BTC, 1.4782 ETH, 15.1441 BNB, 9,259.8002 BUSD, 444.7038 USDC, 5,332.7327 USDT",
      feeUsd: "27984.96",
    },
    {
      from: 1624416975 - SECONDS_PER_WEEK,
      to: 1624416975,
      feeAssets: "0.1862 BTC, 4.5722 ETH, 38.4881 BNB, 13,157.9102 BUSD, 681.9518 USDC, 20,719.0259 USDT",
      feeUsd: "61211.44",
    },
    {
      from: 1625020792 - SECONDS_PER_WEEK,
      to: 1625020792,
      feeAssets: "0.1994 BTC, 2.9843 ETH, 8.7167 BNB, 4,245.4470 BUSD, 713.8151 USDC, 6,716.4781 USDT",
      feeUsd: "27892.58",
    },
    {
      from: 1625625326 - SECONDS_PER_WEEK,
      to: 1625625326,
      feeAssets: "0.2035 BTC, 2.8036 ETH, 29.0733 BNB, 13,941.9031 BUSD, 4,239.1012 USDC, 1,858.4399 USDT",
      feeUsd: "42810.32",
    },
    {
      from: 1626224461 - SECONDS_PER_WEEK,
      to: 1626224461,
      feeAssets: "0.0525 BTC, 2.9409 ETH, 32.7671 BNB, 11,618.6892 BUSD, 534.9965 USDC, 385.8577 USDT",
      feeUsd: "29759.28",
    },
    {
      from: 1626839577 - SECONDS_PER_WEEK,
      to: 1626839577,
      feeAssets: "0.1188 BTC, 4.8821 ETH, 54.8723 BNB, 10,692.3461 BUSD, 1,349.0441 USDC, 5,857.4312 USDT",
      feeUsd: "45033.49",
    },
    {
      from: 1627440534 - SECONDS_PER_WEEK,
      to: 1627440534,
      feeAssets: "0.1433 BTC, 8.5198 ETH, 35.7903 BNB, 26,835.5473 BUSD, 7,395.7415 USDC, 4,244.9563 USDT",
      feeUsd: "75054.14",
    },
    {
      from: 1628047046 - SECONDS_PER_WEEK,
      to: 1628047046,
      feeAssets: "0.2869 BTC, 2.0402 ETH, 49.8049 BNB, 18,377.8680 BUSD, 4,445.9922 USDC, 200.8252 USDT",
      feeUsd: "55084.02",
    },
    {
      from: 1628648752 - SECONDS_PER_WEEK,
      to: 1628648752,
      feeAssets: "0.0989 BTC, 2.3187 ETH, 44.4530 BNB, 17,996.3197 BUSD, 4,631.1984 USDC, 2,021.0504 USDT",
      feeUsd: "53488.93",
    },
    {
      from: 1629252005 - SECONDS_PER_WEEK,
      to: 1629252005,
      feeAssets: "0.0710 BTC, 1.9880 ETH, 66.6524 BNB, 24,078.5095 BUSD, 8,738.5302 USDC, 846.4301 USDT",
      feeUsd: "69267.72",
    },
  ],
  42161: [
    {
      from: 1630514845 - SECONDS_PER_WEEK,
      to: 1630514845,
      feeUsd: "32.47",
    },
    {
      from: 1631074048 - SECONDS_PER_WEEK,
      to: 1631074048,
      feeUsd: "50681",
    },
    {
      from: 1631677736 - SECONDS_PER_WEEK,
      to: 1631677736,
      feeUsd: "124400.69",
    },
    {
      from: 1632278435 - SECONDS_PER_WEEK,
      to: 1632278435,
      feeUsd: "395299.56",
    },
    {
      from: 1632885416 - SECONDS_PER_WEEK,
      to: 1632885416,
      feeUsd: "348555.88",
    },
    {
      from: 1633507067 - SECONDS_PER_WEEK,
      to: 1633507067,
      feeUsd: "302888.51",
    },
    {
      from: 1634095073 - SECONDS_PER_WEEK,
      to: 1634095073,
      feeUsd: "325532.14",
    },
    {
      from: 1634701754 - SECONDS_PER_WEEK,
      to: 1634701754,
      feeUsd: "524688.53",
    },
    {
      from: 1635301669 - SECONDS_PER_WEEK,
      to: 1635301669,
      feeUsd: "727989.27",
    },
    {
      from: 1635914306 - SECONDS_PER_WEEK,
      to: 1635914306,
      feeUsd: "815838.37",
    },
    {
      from: 1636517248 - SECONDS_PER_WEEK,
      to: 1636517248,
      feeUsd: "1017108.52",
    },
    {
      from: 1637118096 - SECONDS_PER_WEEK,
      to: 1637118096,
      feeUsd: "1195695.02",
    },
    {
      from: 1637728323 - SECONDS_PER_WEEK,
      to: 1637728323,
      feeUsd: "611495.04",
    },
    {
      from: 1638330376 - SECONDS_PER_WEEK,
      to: 1638330376,
      feeUsd: "1002226.96",
    },
    {
      from: 1638931348 - SECONDS_PER_WEEK,
      to: 1638931348,
      feeUsd: "1225801.74",
    },
    {
      from: 1639538283 - SECONDS_PER_WEEK,
      to: 1639538283,
      feeUsd: "638755.06",
    },
    {
      from: 1640135388 - SECONDS_PER_WEEK,
      to: 1640135388,
      feeUsd: "692132.12",
    },
    {
      from: 1640740756 - SECONDS_PER_WEEK,
      to: 1640740756,
      feeUsd: "653857.89",
    },
    {
      from: 1641353998 - SECONDS_PER_WEEK,
      to: 1641353998,
      feeUsd: "932273.45",
    },
    {
      from: 1641954606 - SECONDS_PER_WEEK,
      to: 1641954606,
      feeUsd: "2010194.53",
    },
    {
      from: 1642557002 - SECONDS_PER_WEEK,
      to: 1642557002,
      feeUsd: "1424176.23",
    },
    {
      from: 1643166233 - SECONDS_PER_WEEK,
      to: 1643166233,
      feeUsd: "2131480.58",
    },
    {
      from: 1643765386 - SECONDS_PER_WEEK,
      to: 1643765386,
      feeUsd: "1184435.13",
    },
    {
      from: 1644371345 - SECONDS_PER_WEEK,
      to: 1644371345,
      feeUsd: "1205134.15",
    },
    {
      from: 1644979161 - SECONDS_PER_WEEK,
      to: 1644979161,
      feeUsd: "1206960.25",
    },
    {
      from: 1645579656 - SECONDS_PER_WEEK,
      to: 1645579656,
      feeUsd: "527326.47",
    },
    {
      from: 1646182611 - SECONDS_PER_WEEK,
      to: 1646182611,
      feeUsd: "2007742.56",
    },
    {
      from: 1646788756 - SECONDS_PER_WEEK,
      to: 1646788756,
      feeUsd: "2181383.87",
    },
    {
      from: 1647402638 - SECONDS_PER_WEEK,
      to: 1647402638,
      feeUsd: "1060151.47",
    },
    {
      from: 1648000826 - SECONDS_PER_WEEK,
      to: 1648000826,
      feeUsd: "1386779.30",
    },
    {
      from: 1648611300 - SECONDS_PER_WEEK,
      to: 1648611300,
      feeUsd: "1474852.84",
    },
    {
      from: 1649207110 - SECONDS_PER_WEEK,
      to: 1649207110,
      feeUsd: "1882364.25",
    },
    {
      from: 1649814371 - SECONDS_PER_WEEK,
      to: 1649814371,
      feeUsd: "2225265.28",
    },
    {
      from: 1650420021 - SECONDS_PER_WEEK,
      to: 1650420021,
      feeUsd: "1135279.21",
    },
    {
      from: 1651028602 - SECONDS_PER_WEEK,
      to: 1651028602,
      feeUsd: "716772.48",
    },
    {
      from: 1651635145 - SECONDS_PER_WEEK,
      to: 1651635145,
      feeUsd: "820730.6",
    },
    {
      from: 1652236772 - SECONDS_PER_WEEK,
      to: 1652236772,
      feeUsd: "1833127.03",
    },
    {
      from: 1652840724 - SECONDS_PER_WEEK,
      to: 1652840724,
      feeUsd: "1931425.93",
    },
    {
      from: 1653430967 - SECONDS_PER_WEEK,
      to: 1653430967,
      feeUsd: "877425.89",
    },
  ],
  43114: [
    {
      from: 1641430800 - SECONDS_PER_WEEK,
      to: 1641430800,
      feeUsd: "10",
    },
    {
      from: 1641954606 - SECONDS_PER_WEEK,
      to: 1641954606,
      feeUsd: "506934.29",
    },
    {
      from: 1642557082 - SECONDS_PER_WEEK,
      to: 1642557082,
      feeUsd: "871367.91",
    },
    {
      from: 1643166266 - SECONDS_PER_WEEK,
      to: 1643166266,
      feeUsd: "1416130.81",
    },
    {
      from: 1643765429 - SECONDS_PER_WEEK,
      to: 1643765429,
      feeUsd: "996296.58",
    },
    {
      from: 1644371345 - SECONDS_PER_WEEK,
      to: 1644371345,
      feeUsd: "869493.46",
    },
    {
      from: 1644979198 - SECONDS_PER_WEEK,
      to: 1644979198,
      feeUsd: "644299.54",
    },
    {
      from: 1645579694 - SECONDS_PER_WEEK,
      to: 1645579694,
      feeUsd: "559829.67",
    },
    {
      from: 1646182633 - SECONDS_PER_WEEK,
      to: 1646182633,
      feeUsd: "1041033.13",
    },
    {
      from: 1646788780 - SECONDS_PER_WEEK,
      to: 1646788780,
      feeUsd: "525648.29",
    },
    {
      from: 1647402672 - SECONDS_PER_WEEK,
      to: 1647402672,
      feeUsd: "491566.54",
    },
    {
      from: 1648000896 - SECONDS_PER_WEEK,
      to: 1648000896,
      feeUsd: "523412.47",
    },
    {
      from: 1648611331 - SECONDS_PER_WEEK,
      to: 1648611331,
      feeUsd: "482364.71",
    },
    {
      from: 1649207157 - SECONDS_PER_WEEK,
      to: 1649207157,
      feeUsd: "819772.21",
    },
    {
      from: 1649814371 - SECONDS_PER_WEEK,
      to: 1649814371,
      feeUsd: "536680.30",
    },
    {
      from: 1650420021 - SECONDS_PER_WEEK,
      to: 1650420021,
      feeUsd: "297644.50",
    },
    {
      from: 1651028602 - SECONDS_PER_WEEK,
      to: 1651028602,
      feeUsd: "329239.03",
    },
    {
      from: 1651635172 - SECONDS_PER_WEEK,
      to: 1651635172,
      feeUsd: "344748.08",
    },
    {
      from: 1652236772 - SECONDS_PER_WEEK,
      to: 1652236772,
      feeUsd: "809852.39",
    },
    {
      from: 1652840724 - SECONDS_PER_WEEK,
      to: 1652840724,
      feeUsd: "850963.06",
    },
    {
      from: 1653430967 - SECONDS_PER_WEEK,
      to: 1653430967,
      feeUsd: "306245.8",
    },
  ],
};

export function getFeeHistory(chainId) {
  return FEES[chainId].concat([]).reverse();
}
