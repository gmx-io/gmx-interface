const api_root = "https://min-api.cryptocompare.com";
const history = {};

const historyProvider = {
  history: history,

  getBars: function (symbolInfo, resolution, periodParams) {
    var split_symbol = symbolInfo.name.split(/[:/]/);
    const url = resolution === "D" ? "/data/histoday" : resolution >= 60 ? "/data/histohour" : "/data/histominute";
    const qs = {
      e: split_symbol[0],
      fsym: split_symbol[1],
      tsym: split_symbol[2],
      toTs: periodParams.to ? periodParams.to : "",
      limit: periodParams.countBack ? periodParams.countBack : 2000,
      // aggregate: 1//resolution
    };
    // console.log({qs})

    return fetch(`${api_root}${url}?` + new URLSearchParams(qs))
      .then((res) => res.json())
      .then((data) => {
        if (data.Response && data.Response === "Error") {
          console.log("CryptoCompare API error:", data.Message);
          return [];
        }
        if (data.Data.length) {
          console.log(
            `Actually returned: ${new Date(data.TimeFrom * 1000).toISOString()} - ${new Date(
              data.TimeTo * 1000
            ).toISOString()}`
          );
          var bars = data.Data.map((el) => {
            return {
              time: el.time * 1000, //TradingView requires bar time in ms
              low: el.low,
              high: el.high,
              open: el.open,
              close: el.close,
              volume: el.volumefrom,
            };
          });
          if (periodParams.firstDataRequest) {
            var lastBar = bars[bars.length - 1];
            history[symbolInfo.name] = { lastBar: lastBar };
          }

          return bars;
        } else {
          return [];
        }
      });
  },
};

export default historyProvider;
