import { formatAmountHuman } from "lib/numbers";
import { useState } from "react";

import React from "react";
import { DepthChart } from "components/Synthetics/TVChart/DepthChart.1";

export const ChartPlayground = React.memo(function ChartPlayground() {
  const [longOpenInterest, setLongOpenInterest] = useState(30000000n);
  const [shortOpenInterest, setShortOpenInterest] = useState(29000000n);
  const [impactExponent, setImpactExponent] = useState(2n);
  const [positiveImpactFactor, setPositiveImpactFactor] = useState(30000n); // 10**15
  const [negativeImpactFactor, setNegativeImpactFactor] = useState(90000n); // 10**15

  const [marketPrice, setMarketPrice] = useState(245000n);
  const [spreadBps, setSpreadBps] = useState(1n);

  const minPrice = marketPrice - (marketPrice * spreadBps) / 10000n / 2n;
  const maxPrice = marketPrice + (marketPrice * spreadBps) / 10000n / 2n;

  return (
    <div>
      <h2 className="text-24 font-bold">Chart</h2>

      <div className="mb-4 flex items-center">
        <label className="mr-4 w-48">Long Open Interest:</label>
        <input
          type="range"
          min={1000000}
          max={50000000}
          value={longOpenInterest.toString()}
          onChange={(e) => setLongOpenInterest(BigInt(e.target.value))}
          className="flex-grow"
        />
        <span className="ml-4 w-32 text-right">{formatAmountHuman(longOpenInterest, 0)}</span>
      </div>

      <div className="mb-4 flex items-center">
        <label className="mr-4 w-48">Short Open Interest:</label>
        <input
          type="range"
          min={1000000}
          max={50000000}
          value={shortOpenInterest.toString()}
          onChange={(e) => setShortOpenInterest(BigInt(e.target.value))}
          className="flex-grow"
        />
        <span className="ml-4 w-32 text-right">{formatAmountHuman(shortOpenInterest, 0)}</span>
      </div>

      <div className="mb-4 flex items-center">
        <label className="mr-4 w-48">Impact Exponent:</label>
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={Number(impactExponent)}
          onChange={(e) => setImpactExponent(BigInt(Math.round(Number(e.target.value))))}
          className="flex-grow"
        />
        <span className="ml-4 w-32 text-right">{Number(impactExponent).toFixed(2)}</span>
      </div>

      <div className="mb-4 flex items-center">
        <label className="mr-4 w-48">Positive Impact Factor:</label>
        <input
          type="range"
          min={0}
          max={200}
          step={0.1}
          value={Number(positiveImpactFactor) / 10}
          onChange={(e) => setPositiveImpactFactor(BigInt(Math.round(Number(e.target.value) * 10)))}
          className="flex-grow"
        />
        <span className="ml-4 w-32 text-right">{(Number(positiveImpactFactor) / 10).toFixed(1)}</span>
      </div>

      <div className="mb-4 flex items-center">
        <label className="mr-4 w-48">Negative Impact Factor:</label>
        <input
          type="range"
          min={0}
          max={200}
          step={0.1}
          value={Number(negativeImpactFactor) / 10}
          onChange={(e) => setNegativeImpactFactor(BigInt(Math.round(Number(e.target.value) * 10)))}
          className="flex-grow"
        />
        <span className="ml-4 w-32 text-right">{(Number(negativeImpactFactor) / 10).toFixed(1)}</span>
      </div>

      <div className="mb-4 flex items-center">
        <label className="mr-4 w-48">Market Price:</label>
        <input
          type="range"
          min={1000}
          max={6400000}
          value={marketPrice.toString()}
          onChange={(e) => setMarketPrice(BigInt(e.target.value))}
          className="flex-grow"
        />
        <span className="ml-4 w-32 text-right">{(Number(marketPrice) / 100).toFixed(2)}</span>
      </div>

      <div className="mb-4 flex items-center">
        <label className="mr-4 w-48">Spread (bps):</label>
        <input
          type="range"
          min={0}
          max={100}
          value={spreadBps.toString()}
          onChange={(e) => setSpreadBps(BigInt(e.target.value))}
          className="flex-grow"
        />
        <span className="ml-4 w-32 text-right">{spreadBps.toString()}</span>
      </div>

      <div className="mb-4 flex items-center">
        <span className="mr-4 w-48">Min Price:</span>
        <span className="ml-4 w-32 text-right">{(Number(minPrice) / 100).toFixed(2)}</span>
      </div>

      <div className="mb-4 flex items-center">
        <span className="mr-4 w-48">Max Price:</span>
        <span className="ml-4 w-32 text-right">{(Number(maxPrice) / 100).toFixed(2)}</span>
      </div>

      <DepthChart
        longOpenInterest={longOpenInterest}
        shortOpenInterest={shortOpenInterest}
        impactExponent={impactExponent}
        positiveImpactFactor={positiveImpactFactor}
        negativeImpactFactor={negativeImpactFactor}
        minPrice={minPrice}
        marketPrice={marketPrice}
        maxPrice={maxPrice}
      />
    </div>
  );
});
