
// var graph = graphql("https://api.thegraph.com/subgraphs/name/graphitetools/compound", {
//   method: 'POST'
// });

// var a = graph.query(`cTokens(first: 5) {
//     id
//     symbol
//     borrowRate
//     supplyRate
//   }`)
// a().then(function (response) {
//   // response is originally response.data of query result
//   console.log(response)
// }).catch(function (error) {
//   // response is originally response.errors of query result
//   console.log(error)
// });
const TOKEN_DECIMALS = {
  'dai': 18,
  'usdc': 18
}

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));


async function getCompoundApr() {
  const daiAddress = "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643";
  const usdcAddress = "0x39aa39c021dfbae8fac545936693ac917d5e7563";
  const data = await fetch('https://api.thegraph.com/subgraphs/name/graphitetools/compound', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query: `query ($id_dai: ID!, $id_usdc: ID!)
        {
          dai: cToken(id: $id_dai) {
            id
            symbol
            borrowRate
            supplyRate
          }
          
          usdc: cToken(id: $id_usdc) {
            id
            symbol
            borrowRate
            supplyRate
          }
      }`,
      variables: {
        id_dai: daiAddress,
        id_usdc: usdcAddress
      }
    })
  })
    .then(r => r.json());
  return {
    supply: {
      "dai": {
        "supply_rate": blockRateToApr(data.data["dai"].supplyRate, TOKEN_DECIMALS["dai"]),
        "supply_30d_apr": 0
      },
      "usdc": {
        "supply_rate": blockRateToApr(data.data["usdc"].supplyRate, TOKEN_DECIMALS["usdc"]),
        "supply_30d_apr": 0
      }
    },
    borrow: {
      "dai": {
        "borrow_rate": blockRateToApr(data.data["dai"].borrowRate, TOKEN_DECIMALS["dai"]),
        "borrow_30d_apr": 0
      },
      "usdc": {
        "borrow_rate": blockRateToApr(data.data["usdc"].borrowRate, TOKEN_DECIMALS["usdc"]),
        "borrow_30d_apr": 0
      }
    }
  }
}

async function getDydxApr() {
  const daiAddress = "0x3";
  const usdcAddress = "0x2";
  const data = await fetch('https://api.thegraph.com/subgraphs/name/graphitetools/dydx', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query: `query ($id_dai: ID!, $id_usdc: ID!)
        {
          dai: market(id: $id_dai) {
            borrowRate
            supplyRate
          }
          
          usdc: market(id: $id_usdc) {
            borrowRate
            supplyRate
          }
      }`,
      variables: {
        id_dai: daiAddress,
        id_usdc: usdcAddress
      }
    })
  })
    .then(r => r.json());
  return {
    supply: {
      "dai": {
        "supply_rate": data.data["dai"].supplyRate / 10 ** 18 * 100,
        "supply_30d_apr": 0
      },
      "usdc": {
        "supply_rate": data.data["usdc"].supplyRate / 10 ** 18 * 100,
        "supply_30d_apr": 0
      }
    },
    borrow: {
      "dai": {
        "borrow_rate": data.data["dai"].borrowRate / 10 ** 18 * 100,
        "borrow_30d_apr": 0
      },
      "usdc": {
        "borrow_rate": data.data["usdc"].borrowRate / 10 ** 18 * 100,
        "borrow_30d_apr": 0
      }
    }
  }
}
async function getAaveApr() {
  const daiAddress = "0x6b175474e89094c44da98b954eedeac495271d0f";
  const usdcAddress = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
  const data = await fetch('https://api.thegraph.com/subgraphs/name/aave/protocol', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query: `query ($id_dai: ID!, $id_usdc: ID!)
        {
          dai: reserve(id: $id_dai) {symbol
            id
            liquidityRate
            variableBorrowRate
            stableBorrowRate
          }
          
          usdc: reserve(id: $id_usdc) {symbol
            id
            liquidityRate
            variableBorrowRate
            stableBorrowRate
          }
      }`,
      variables: {
        id_dai: daiAddress,
        id_usdc: usdcAddress
      }
    })
  })
    .then(r => r.json());
  return {
    aave: {
      supply: {
        "dai": {
          "supply_rate": data.data["dai"].liquidityRate * 100,
          "supply_30d_apr": 0
        },
        "usdc": {
          "supply_rate": data.data["usdc"].liquidityRate * 100,
          "supply_30d_apr": 0
        }
      },
      borrow: {
        "dai": {
          "borrow_rate": data.data["dai"].variableBorrowRate * 100,
          "borrow_30d_apr": 0
        },
        "usdc": {
          "borrow_rate": data.data["usdc"].variableBorrowRate * 100,
          "borrow_30d_apr": 0
        }
      }
    },
    aave_fixed: {
      "dai": {
        "borrow_rate": data.data["dai"].stableBorrowRate * 100
      },
      "usdc": {
        "borrow_rate": data.data["usdc"].stableBorrowRate * 100
      }

    }
  }
}

async function getAPRData() {

  const currentBlockNumber = await web3.eth.getBlockNumber();

}


const api = "https://defiportfolio-backend.herokuapp.com/api/v1";
const old_api = "https://api-rates.defiprime.com";

const SEC_PER_DAY = 60 * 60 * 24;

const SEC_PER_YEAR = SEC_PER_DAY * 365;
const SEC_PER_BLOCK = 13;

const markets = ["compound_v2", "fulcrum", "dydx"];
const tokens = ["dai", "usdc"];

const chartContainer = document.getElementById("tv-chart-container");

const seriesOptions = {
  "dai": {
    topColor: '#FFBD70',
    bottomColor: 'rgba(255, 189, 112, 0)',
    lineColor: "#FF961C",
    lineWidth: 3,
  },
  "usdc": {
    topColor: '#1AF3FF',
    bottomColor: 'rgba(26, 243, 255, 0)',
    lineColor: "rgba(0, 199, 204, 1)",
    lineWidth: 3,
  }
}

const daiSeriesOptions = {
  topColor: '#FFBD70',
  bottomColor: 'rgba(255, 189, 112, 0)',
  lineColor: "#FF961C",
  lineWidth: 3,
}
const usdcSeriesOptions = {
  topColor: '#1AF3FF',
  bottomColor: 'rgba(26, 243, 255, 0)',
  lineColor: "rgba(0, 199, 204, 1)",
  lineWidth: 3,
}

const timePeriods = [
  {
    id: 0,
    difference: 1000 * 60 * 60 * 24,
    getStartDate: () => new Date() - 1000 * 60 * 60 * 24,
    text: "1 Day",
    unit: "hour"
  },
  {
    id: 1,
    difference: 1000 * 60 * 60 * 24 * 7,
    getStartDate: () => new Date() - 1000 * 60 * 60 * 24 * 7,
    text: "7 Days",
    unit: "day"
  },
  {
    id: 2,
    difference: 1000 * 60 * 60 * 24 * 30,
    getStartDate: () => new Date() - 1000 * 60 * 60 * 24 * 30,
    text: "1 Month",
    unit: "day"
  },
  {
    id: 3,
    difference: 1000 * 60 * 60 * 24 * 31 * 3,
    getStartDate: () => new Date() - 1000 * 60 * 60 * 24 * 31 * 3,
    text: "3 Month",
    unit: "day"
  },
  {
    id: 4,
    difference: 1000 * 60 * 60 * 24 * 365,
    getStartDate: () => new Date() - 1000 * 60 * 60 * 24 * 365,
    text: "1 Year",
    unit: "month"
  },
  {
    id: 5,
    difference: 1000 * 60 * 60 * 24 * 365,
    getStartDate: () => new Date(0),
    text: "All-time",
    unit: "month"
  }];


const requestParams = markets.flatMap(market => {
  return tokens.map(token => {
    return token === "sai" && market === "dydx"
      ? null
      : {
        market: market,
        token: token
      }
  })
}).filter(item => item !== null);

function get(url) {
  return new Promise(function (resolve, reject) {
    var req = new XMLHttpRequest();
    req.open('GET', url);
    req.onload = function () {
      if (req.status == 200) {
        resolve(req.response);
      }
      else {
        reject(Error(req.statusText));
      }
    };
    req.onerror = function () {
      reject(Error("Network Error"));
    };
    req.send();
  });
}

const onTimeScaleChange = (e) => {
  e.preventDefault();
  var timePeriodId = parseInt(e.currentTarget.dataset.period);
  var startDate = timePeriods.find(period => period.id == timePeriodId).getStartDate();
  GetData(startDate).then(responses => {
    renderTradingViewChart(timePeriodId, responses)
  });
}


function renderTradingViewChart(timePeriodId, responses) {
  if (window.tvWidget)
    window.tvWidget.remove();

  window.tvWidget = LightweightCharts.createChart(chartContainer, GetChartOptions(timePeriodId));
  var daiDataset = GetAssetLending("dai", responses, timePeriodId);
  //var saiDataset = GetAssetLending("sai", responses, timePeriodId);
  var usdcDataset = GetAssetLending("usdc", responses, timePeriodId);

  //window.saiSeries = window.tvWidget.addAreaSeries(saiSeriesOptions);
  window.daiSeries = window.tvWidget.addAreaSeries(daiSeriesOptions);
  window.usdcSeries = window.tvWidget.addAreaSeries(usdcSeriesOptions);
  //window.saiSeries.setData(saiDataset);
  window.daiSeries.setData(daiDataset);
  window.usdcSeries.setData(usdcDataset);

  window.tvWidget.timeScale().fitContent();

}

const GetChartOptions = (timePeriodId) => ({
  localization: {
    priceFormatter: function (price) {
      return '' + Number(price).toFixed(2) + '%';
    },
  },
  width: chartContainer.offsetWidth,
  height: chartContainer.offsetHeight,
  priceScale: {
    scaleMargins: {
      top: 0.1,
      bottom: 0.1,
    },
    borderColor: '#E8EEF1'
  },
  timeScale: {
    borderColor: '#E8EEF1',
    fixLeftEdge: true,
    timeVisible: timePeriodId === 0 || timePeriodId === 1,
  },
  layout: {
    backgroundColor: 'transparent',
    textColor: '#8B8BB8',
    fontFamily: "Open Sans",
    fontSize: 14
  },
  grid: {
    vertLines: {
      visible: true,
      color: "#E8EEF1"
    },
    horzLines: {
      color: '#E8EEF1',
    },
  },
  crosshair: {
    vertLine: {
      color: '#292984',
      labelBackgroundColor: '#292984'
    },
    horzLine: {
      color: '#292984',
      labelBackgroundColor: '#292984'

    }
  }

})


const init = () => {
  GetData().then(async responses => {
    var lendingRates = await GetLendingData();
    var borrowingRates = await GetBorrowingData();
    renderLendingRates(lendingRates);
    renderBorrowingRates(borrowingRates)
    renderTradingViewChart(2, responses);
  });
};

const renderLendingRates = (lendingRates) => {
  document.querySelectorAll(".lending-wrapper").forEach((lendingWrapper, index) => {
    var token = lendingWrapper.dataset.token;
    var rates = lendingRates.find(item => item.token === token);
    if (!rates) return;
    lendingWrapper.querySelector(".lending-mean").textContent = rates.mean;
    lendingWrapper.querySelectorAll(".list-crypto .item-crypto").forEach((itemCrypto, index) => {
      var market = itemCrypto.querySelector(".list-crypto-name .value").dataset.market;
      var rate = rates.marketRates.find(item => item.market === market);
      itemCrypto.querySelector(".list-crypto-today").innerHTML = rate && rate.supply_rate !== undefined ? `<span class="value">${rate.supply_rate.toFixed(2)}</span><span class="fw-300">%</span>` : "";
      itemCrypto.querySelector(".list-crypto-month").innerHTML = rate && rate.supply_30d_apr !== undefined ? `<span class="value">${rate.supply_30d_apr.toFixed(2)}</span><span class="fw-300">%</span>` : "";
    });
  });
};
const renderBorrowingRates = (borrowingRates) => {
  document.querySelectorAll(".borrowing-wrapper").forEach((borrowingWrapper, index) => {
    var token = borrowingWrapper.dataset.token;
    var rates = borrowingRates.find(item => item.token === token);
    if (!rates) return;
    borrowingWrapper.querySelector(".borrowing-mean").textContent = rates.mean;
    borrowingWrapper.querySelectorAll(".list-crypto .item-crypto").forEach((itemCrypto, index) => {
      var market = itemCrypto.querySelector(".list-crypto-name .value").dataset.market;
      var rate = rates.marketRates.find(item => item.market === market);
      itemCrypto.querySelector(".list-crypto-today").innerHTML = rate && rate.borrow_rate !== undefined ? `<span class="value">${rate.borrow_rate.toFixed(2)}</span><span class="fw-300">%</span>` : "";
      itemCrypto.querySelector(".list-crypto-month").innerHTML = rate && rate.borrow_30d_apr !== undefined ? `<span class="value">${rate.borrow_30d_apr.toFixed(2)}</span><span class="fw-300">%</span>` : "";
    });
  });
};

const GetData = (startDate) => {
  document.getElementById("overlay").style.display = "block";
  if (!startDate) {
    startDate = timePeriods.find(item => item.id === 2).getStartDate();
  }
  startDate = parseInt((startDate / 1000).toFixed(0));
  var requests = requestParams.map(param => get(`${api}/markets/${param.market}/${param.token}?start_date=${startDate}`));
  return Promise.all(requests)
    .then(values => {
      document.getElementById("overlay").style.display = "none";
      return response = values.map((value, index) => {
        return {
          market: requestParams[index].market,
          token: requestParams[index].token,
          data: JSON.parse(value)
        }
      });
    });
}

const GetLendingData = async () => {

  // var response = await fetch(`${api}/markets/supply`);
  // var data = await response.json();
  const compoundData = await getCompoundApr();
  const dydxData = await getDydxApr();
  const aaveData = await getAaveApr();
  const data = {
    "compound_v2": compoundData.supply,
    "dydx": dydxData.supply,
    "aave": aaveData.aave.supply
  }
  return tokens.map(token => {
    var marketRates = [];
    Object.entries(data).flatMap(market => {
      var marketName = market[0];
      if (market[1][token])
        marketRates.push(Object.assign({ market: marketName }, market[1][token]));
    });
    var mean = GetMeanBetweenArrayElements(marketRates.map(market => market.supply_rate)).toFixed(2);
    return {
      token,
      marketRates,
      mean
    }
  });
}
const GetBorrowingData = async () => {

  // var response = await fetch(`${api}/markets/borrow`);
  // var data = await response.json();
  const compoundData = await getCompoundApr();
  const dydxData = await getDydxApr();
  const aaveData = await getAaveApr();
  const data = {
    "compound_v2": compoundData.borrow,
    "dydx": dydxData.borrow,
    "aave": aaveData.aave.borrow,
    "aave_fixed": aaveData.aave_fixed,
  }
  return tokens.map(token => {
    var marketRates = [];
    Object.entries(data).flatMap(market => {
      var marketName = market[0];
      if (market[1][token])
        marketRates.push(Object.assign({ market: marketName }, market[1][token]));
    });
    var mean = GetMeanBetweenArrayElements(marketRates.map(market => market.borrow_rate)).toFixed(2);
    return {
      token,
      marketRates,
      mean
    }
  });
}

const GetLendingRates = (responses, token) => {
  var data = responses.filter(item => item.token === token);

  var marketRates = markets.flatMap(market =>
    data.filter(item => item.market === market)
      .map(item => {
        return {
          market: market,
          supply_rate: item.data.supply_rate.toFixed(2),
          supply_30d_apr: item.data.supply_30d_apr.toFixed(2),
        }
      })
  )
  return {
    token: token,
    marketRates,
    mean: GetMeanBetweenArrayElements(marketRates.map(market => market.supply_rate)).toFixed(2)
  }

}

const GetAssetLending = (asset, responses, timePeriodId) => {
  let daiData = responses.filter(item => item.token === asset);
  var arrayY = GetArraysMean(daiData.map(item => item.data.chart.map(chartItem => chartItem.supply_rate)))
  var arrayX = daiData[0].data.chart.map(chartItem => chartItem.timestamp);
  return arrayY.map((item, index) => { return { value: new Number(item), time: timePeriodId === 0 || timePeriodId === 1 ? arrayX[index] : formatDate(arrayX[index] * 1000) } });
};


const GetArraysMean = (arrays) => {
  let result = [];

  for (var i = 0; i < arrays[0].length; i++) {
    var num = 0;
    //still assuming all arrays have the same amount of numbers
    for (var j = 0; j < arrays.length; j++) {
      num += arrays[j][i];
    }
    result.push((num / arrays.length).toFixed(2));
  }

  return result
}

const GetMeanBetweenArrayElements = (array) => {
  var sum = array.reduce((a, b) => parseFloat(a) + parseFloat(b), 0);
  return (sum / array.length) || 0;
}

window.addEventListener("load", function (e) {
  init();
  document.querySelectorAll(".period-button").forEach(item => item.addEventListener("click", onTimeScaleChange));
});
window.addEventListener("resize", function (e) {
  if (!window.tvWidget) return;
  window.tvWidget.resize(chartContainer.offsetHeight, chartContainer.offsetWidth);
});

var liquidity_xhr = new XMLHttpRequest();
liquidity_xhr.open("GET", old_api + "/getMinInterest", true);
liquidity_xhr.onreadystatechange = function () {
  if (liquidity_xhr.status == 200 && liquidity_xhr.readyState == 4) {
    var liquidityData = JSON.parse(liquidity_xhr.responseText);
    document.querySelector(".sai-eth .list-liquidity .list-liquidity-value .value").textContent = liquidityData[0].providerDAI;
    document.querySelector(".sai-eth .list-liquidity .list-liquidity-name").href = liquidityData[0].providerLink;
    document.querySelector(".usdc-eth .list-liquidity .list-liquidity-name").href = liquidityData[0].providerLink;
    document.querySelector(".usdc-eth .list-liquidity .list-liquidity-value .value").textContent = liquidityData[0].providerUSDC;
  }
}
liquidity_xhr.send();

function formatDate(date) {
  var d = new Date(date),
    month = '' + (d.getMonth() + 1),
    day = '' + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2)
    month = '0' + month;
  if (day.length < 2)
    day = '0' + day;

  return [year, month, day].join('-');
}

function blockRateToApr(rate, decimals) {

  return 100 * rate * SEC_PER_YEAR / SEC_PER_BLOCK / (10 ** decimals)
}