import { ethers } from "ethers";
import { formatAmount } from "lib/numbers";
import getLiquidationPrice from "lib/positions/getLiquidationPrice";

describe("getLiquidationPrice", function () {
  const cases = [
    {
      name: "New Position Long, to trigger 1% Buffer rule",
      isLong: true,
      size: ethers.utils.parseUnits("98712.87", 30),
      collateral: ethers.utils.parseUnits("9871.29", 30),
      averagePrice: ethers.utils.parseUnits("23091.42", 30),
      fundingFee: ethers.utils.parseUnits("0", 30),
      expected: "21013.1914",
    },
    {
      name: "New Position Long, to trigger $5 Buffer rule",
      isLong: true,
      size: ethers.utils.parseUnits("162.50", 30),
      collateral: ethers.utils.parseUnits("16.25", 30),
      averagePrice: ethers.utils.parseUnits("23245.74", 30),
      fundingFee: ethers.utils.parseUnits("0", 30),
      expected: "21659.6652",
    },
    {
      name: "New Position Short, to trigger 1% Buffer rule",
      isLong: false,
      size: ethers.utils.parseUnits("99009.90", 30),
      collateral: ethers.utils.parseUnits("9901.00", 30),
      averagePrice: ethers.utils.parseUnits("23118.40", 30),
      fundingFee: ethers.utils.parseUnits("0", 30),
      expected: "25199.0583",
    },
    {
      name: "Long Position with Positive PnL",
      isLong: true,
      size: ethers.utils.parseUnits("7179585.19", 30),
      collateral: ethers.utils.parseUnits("145919.45", 30),
      averagePrice: ethers.utils.parseUnits("1301.50", 30),
      fundingFee: ethers.utils.parseUnits("55354.60", 30),
      expected: "1288.0630",
    },
  ];

  for (const { name: caseName, expected, ...case_ } of cases) {
    it(`getLiquidationPrice: ${caseName}`, function () {
      const liqPrice = getLiquidationPrice(case_);
      const formattedLiquidationPrice = formatAmount(liqPrice, 30, 4);
      expect(formattedLiquidationPrice).toEqual(expected);
    });
  }
});
