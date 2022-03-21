import React from "react";

import "./ExchangeBanner.css";

export default function ExchangeBanner(props) {
  const { hideBanner } = props;

  return (
    <div className="ExchangeBanner">
      <p className="ExchangeBanner-text">
        Trade on GMX and win <span className="ExchangeBanner-price">$250.000</span> in prizes! Live until November 30th,{" "}
        <a
          href="https://medium.com/@gmx.io/gmx-trading-competition-win-250-000-usd-in-prizes-1346504b96f6"
          target="_blank"
          className="ExchangeBanner-link"
          rel="noreferrer"
        >
          click here
        </a>{" "}
        to learn more.
      </p>
      <span
        className="ExchangeBanner-close"
        onClick={(e) => {
          hideBanner();
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="11.25" height="11.25" viewBox="0 0 11.25 11.25">
          <path
            id="ic_close"
            d="M11-2.565,6.818-6.75,11-10.935a.844.844,0,0,0,0-1.193.844.844,0,0,0-1.193,0L5.625-7.943,1.44-12.128a.844.844,0,0,0-1.193,0,.844.844,0,0,0,0,1.193L4.432-6.75.247-2.565a.844.844,0,0,0,0,1.193.844.844,0,0,0,1.193,0L5.625-5.557,9.81-1.372a.844.844,0,0,0,1.193,0A.844.844,0,0,0,11-2.565Z"
            transform="translate(0 12.375)"
            fill="#fff"
          />
        </svg>
      </span>
    </div>
  );
}
