import type { MarketStockInterface, MarketIndexFundInterface } from "../Interfaces/MarketStockInterface";
import { pickMultiple } from "./RandomEngine";

const STOCK_FIELDS = [
  "Technology",
  "Healthcare",
  "Finance",
  "Energy",
  "Retail",
  "Biotech",
  "Automotive",
  "Aerospace",
  "Telecom",
  "Entertainment",
  "Cybersecurity",
  "Robotics",
  "Neurotech",
  "AI",
  "Agritech",
  "Nanotech",
  "Virtual Reality",
  "Quantum Computing",
  "Space Mining",
  "Climate Engineering"
];

const generateStockSymbol = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return Array.from({ length: 4 }, () =>
    letters.charAt(Math.floor(Math.random() * letters.length))
  ).join("");
};

const generatePriceHistory = (riskRating: number, days: number, basePrice: number, offset: number = 0): { day: number, price: number }[] => {
  const history: { day: number, price: number }[] = [];
  let currentPrice = basePrice;

  for (let day = 0; day < days; day++) {
    const change = currentPrice * (Math.random() * 2 * riskRating - riskRating); // ±volatility
    currentPrice = parseFloat((currentPrice + change).toFixed(2));
    history.push({ day: day + offset, price: currentPrice });
  }

  return history;
}

const generateMarketStock = (): MarketStockInterface => {
  const basePrice: number = parseFloat((Math.random() * 200 + 10).toFixed(2));
  const field: string = STOCK_FIELDS[Math.floor(Math.random() * STOCK_FIELDS.length)];
  const riskRating: number = ([0.02, 0.05, 0.1])[Math.floor(Math.random() * 3)];
  const priceHistory: { day: number, price: number }[] = generatePriceHistory(riskRating, 30, basePrice);
  const latestPrice: number = priceHistory[priceHistory.length - 1].price;
  const yesterdayPrice: number = priceHistory[priceHistory.length - 2].price;
  const trend: number = parseFloat((latestPrice - yesterdayPrice).toFixed(2));

  return {
    name: generateStockSymbol(),
    price: latestPrice,
    priceHistory,
    sharesOutstanding: Math.floor(Math.random() * 900_000 + 100_000),
    field,
    trend,
    riskRating: riskRating,
    type: "Stock"
  };
};

const generateMarketIndexFund = (marketStocks: MarketStockInterface[], minStockLength: number, maxStockLength: number): MarketIndexFundInterface => {
  const fundStocks: MarketStockInterface[] = pickMultiple(marketStocks, minStockLength, maxStockLength);

  const totalMarketCap: number = marketStocks.reduce(
    (sum, stock) => sum + stock.price * stock.sharesOutstanding,
    0
  );

  // Define a fixed fund value (say $1,000,000)
  const FUND_VALUE = 1_000_000;

  const stocksHeld = fundStocks.map((stock) => {
    const weight = (stock.price * stock.sharesOutstanding) / totalMarketCap;
    const capitalAllocated = FUND_VALUE * weight;
    const sharesHeld = capitalAllocated / stock.price;

    return {
      name: stock.name,
      sharesHeld,
    };
  });

  const totalValue = stocksHeld.reduce((sum, held) => {
    const stock = marketStocks.find(s => s.name === held.name)!;
    return sum + stock.price * held.sharesHeld;
  }, 0);

  const totalShares = stocksHeld.reduce((sum, s) => sum + s.sharesHeld, 0);
  const price = totalValue / totalShares;

  // Build priceHistory consistently
  const days = marketStocks[0].priceHistory.length;
  const priceHistory = Array.from({ length: days }, (_, i) => {
    const dayValue = stocksHeld.reduce((sum, held) => {
      const stock = marketStocks.find(s => s.name === held.name)!;
      return sum + stock.priceHistory[i].price * held.sharesHeld;
    }, 0);
    return { day: i, price: parseFloat((dayValue / totalShares).toFixed(2)) };
  });

  const trend = parseFloat(
    (priceHistory[priceHistory.length - 1].price - priceHistory[priceHistory.length - 2].price).toFixed(2)
  );

  return {
    name: generateStockSymbol(),
    price: parseFloat(price.toFixed(2)),
    priceHistory,
    sharesOutstanding: totalShares,
    field: "Index Fund",
    trend,
    riskRating: 0.01,
    stocksHeld,
    type: "Index Fund"
  };
};

const generateMarketStocks = (numStocks: number) => {
  // Generate stocks
  const stocks: MarketStockInterface[] = [];
  while (stocks.length < numStocks) {
    const stock = generateMarketStock();
    if (!stocks.find((s) => s.name === stock.name)) {
      stocks.push(stock);
    }
  }

  return stocks;
} 

const generateIndexFunds = (marketStocks: MarketStockInterface[], numIndexFunds: number) => {
  const indexFunds: MarketIndexFundInterface[] = [];

  // Generate index funds
  for (let i = 0; i < numIndexFunds; i++) {
    const indexFund: MarketIndexFundInterface = generateMarketIndexFund(marketStocks, 3, 5);
    indexFunds.push(indexFund);
  }

  // Generate a total market index fund
  const totalMarketIndex: MarketIndexFundInterface = generateMarketIndexFund(marketStocks, marketStocks.length, marketStocks.length);
  totalMarketIndex.name = "Total Market Index";
  indexFunds.push(totalMarketIndex);

  return indexFunds;
}

export { 
  STOCK_FIELDS, 
  generateIndexFunds,
  generateMarketStocks
}