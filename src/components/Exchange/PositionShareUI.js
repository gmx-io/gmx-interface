function PositionShareUI(props) {
  return (
    <div class="container">
      <img width="200" src="https://github.com/vipineth/gmx-assets/blob/main/PNG/GMX%20LIGHT.png?raw=true" alt="" />
      <div class="trade-details">
        <div class="long">LONG</div> <span>|</span>
        <div>${token} Perpetual</div>
      </div>
      <div class="profit">${pnlPercentage}</div>
      <div class="price">
        <p>
          Entry Price: <span>${entryPrice}</span>
        </p>
        <p>
          Current Price: <span>${currentPrice}</span>
        </p>
      </div>
    </div>
  );
}
