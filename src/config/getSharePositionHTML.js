export function getSharePositionHTML(params) {
  let { entryPrice, currentPrice, pnlPercentage, isLong, token } = params;
  let isPnLPositive = parseInt(pnlPercentage || "") > 0;
  return `<html>
    <style>
      html {
        background: url(https://user-images.githubusercontent.com/73279781/155832774-eea34c27-0225-41bc-9b43-72fd3f5124db.jpg) no-repeat center center fixed;
        -webkit-background-size: cover;
        -moz-background-size: cover;
        -o-background-size: cover;
        background-size: cover;
      }
      body {
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      }
      .container {
        max-width: 500px;
        margin: 2rem 1rem;
      }
      .trade-details {
        display: flex;
        margin-top: 2rem;
      }
      .trade-details div{
        margin-right: 10px;
        font-size: 1.25rem;
      }
      .trade-details span{
        margin-right: 15px;
        margin-left: 15px;
      }
      .short {
        color: #eb2626;
      }
      .long {
        color: #51e151;
      }
      .profit {
        font-size: 5rem;
        font-weight: 700;
        margin-top: 2rem;
        color: #51e151;
      }
      .loss {
        font-size: 5rem;
        font-weight: 700;
        margin-top: 2rem;
        color: #eb2626;
      }
      .price {
        margin-top: 2rem;
      }
      .price p{
        opacity: 0.75;
      }
      .price span{
        font-size: 1.5rem;
        color: #21c177;
        font-weight: 800;
        margin-left: 1rem;
      }
    </style>
    <body>
      <div class='container'>
        <img width='200' src="https://github.com/vipineth/gmx-assets/blob/main/PNG/GMX%20LIGHT.png?raw=true" alt="">
        <div class='trade-details'>
          <div class="${isLong ? "long" : "short"}">${isLong ? "LONG" : "SHORT"}</div> <span>
            |
          </span>
          <div>${token} Perpetual</div>
        </div>
        <div class=${isPnLPositive ? "profit" : "loss"}>
          ${pnlPercentage}
        </div>
        <div class='price'>
          <p>Entry Price: <span>${entryPrice}</span></p>
          <p>Current Price: <span>${currentPrice}</span></p>
        </div>
      </div>
    </body>
  </html>
  `;
}
