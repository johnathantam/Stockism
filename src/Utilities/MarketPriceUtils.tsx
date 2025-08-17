import type { MarketEvent, MarketPressure } from "../Interfaces/MarketEventInterface";
import type { MarketIndexFundInterface, MarketNodeHandles, MarketStockInterface } from "../Interfaces/MarketStockInterface";
import type { EventEngine } from "./MarketEventEngine";
import { gaussianNoise } from "./RandomEngine";

// This function is designed to fluctuate stock prices mimicking what it would look like minute to minute
const fluctuateStockPrices = (marketStocks: MarketStockInterface[], activeEvents: MarketEvent[], fieldPressures: Record<string, MarketPressure>, stockPressures: Record<string, MarketPressure>): MarketStockInterface[] => {
  return marketStocks.map((stock) => {
    const fieldP: MarketPressure = fieldPressures[stock.field] || { drift: 0, turbulence: 1, sentiment: 0 };
    const stockP: MarketPressure = stockPressures[stock.name] || { drift: 0, turbulence: 1, sentiment: 0 };

    let drift: number = fieldP.drift + stockP.drift;
    let turbulence: number = fieldP.turbulence * stockP.turbulence;
    let sentiment: number = fieldP.sentiment + stockP.sentiment;

    activeEvents.forEach(event => {
      const affectsField = event.affectedFields?.includes(stock.field);
      const affectsStock = event.affectedStocks?.includes(stock.name);

      if (affectsField || affectsStock) {
        drift += event.driftDelta ?? 0;
        turbulence *= 1 + (event.turbulenceDelta ?? 0);
        sentiment += event.sentimentDelta ?? 0;
      }
    });

    const volatilityFactor = (stock.riskRating * turbulence) * 0.05; // baseline risk × turbulence
    const sentimentBias = sentiment * 0.0005; // small bias per minute
    const driftBias = drift * 0.001; // very gradual drift from pressures
    const noise = gaussianNoise() * volatilityFactor * 0.2; // stochastic component

    const changeFactor = noise + sentimentBias + driftBias;

    const newPrice = parseFloat((stock.price * (1 + changeFactor)).toFixed(2));

    const newPriceHistory = [...stock.priceHistory];
    const lastEntry = newPriceHistory[newPriceHistory.length - 1];
    newPriceHistory[newPriceHistory.length - 1] = { ...lastEntry, price: newPrice };

    return {
      ...stock,
      price: newPrice,
      trend: Math.round(((newPrice - stock.price) / stock.price) * 10000) / 100,
      priceHistory: newPriceHistory
    };
  });
}

// This function creates a roadmap of prices for the market days in the future with regards to current events
const generateTomorrowsStockPrices = (marketStocks: MarketStockInterface[], activeEvents: MarketEvent[], fieldPressures: Record<string, MarketPressure>, stockPressures: Record<string, MarketPressure>): MarketStockInterface[] => {
  return marketStocks.map((stock: MarketStockInterface) => {

    const fieldP = fieldPressures[stock.field] || { drift: 0.3, turbulence: 1, sentiment: 0 };
    const stockP = stockPressures[stock.name] || { drift: 0.3, turbulence: 1, sentiment: 0 };

    // --- Base pressures ---
    let cumulativeDrift = fieldP.drift + stockP.drift;
    let cumulativeTurbulence = fieldP.turbulence * stockP.turbulence;
    let cumulativeSentiment = fieldP.sentiment + stockP.sentiment;

    activeEvents.forEach((event) => {
      const affectsField = event.affectedFields?.includes(stock.field);
      const affectsStock = event.affectedStocks?.includes(stock.name);

      if (affectsField || affectsStock) {
        cumulativeDrift += event.driftDelta ?? 0;
        cumulativeTurbulence *= 1 + (event.turbulenceDelta ?? 0);
        cumulativeSentiment += event.sentimentDelta ?? 0;
      }
    });

    const volatility = stock.riskRating * cumulativeTurbulence * 0.25; // daily scaling
    const sentimentBias = cumulativeSentiment * 0.005;
    const driftBias = cumulativeDrift * 0.01;
    const randomShock = gaussianNoise() * volatility;

    let newPrice = stock.price * (1 + driftBias + sentimentBias + randomShock);

    // --- Momentum ---
    const momentumWindow = 3;
    const recentPrices = stock.priceHistory.slice(-momentumWindow).map((p) => p.price);
    if (recentPrices.length >= 2) {
      const momentumEffect = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0];
      newPrice *= 1 + momentumEffect * 0.02;
    }

    const recoveryWindow = 7;
    const recoveryPrices = stock.priceHistory.slice(-recoveryWindow).map((p) => p.price);
    if (recoveryPrices.length) {
      const avgRecent = recoveryPrices.reduce((a, b) => a + b, 0) / recoveryPrices.length;
      const deviation = (avgRecent - newPrice) / avgRecent;
      if (deviation > 0.05) newPrice *= 1 + deviation * 0.02;
    }

    newPrice = Math.max(0.01, parseFloat(newPrice.toFixed(2)));

    // --- Update Risk Rating ---
    const nextRisk = Math.min(0.2, Math.max(0.01, stock.riskRating * (1 + gaussianNoise() * 0.02)));

    const nextDay = stock.priceHistory.length - 1;

    return {
      ...stock,
      price: newPrice,
      trend: Math.round(((newPrice - stock.price) / stock.price) * 10000) / 100,
      riskRating: nextRisk,
      priceHistory: stock.priceHistory.concat({ day: nextDay + 1, price: newPrice }),
    };
  })
}

const updateIndexFundPrices = (marketStocks: MarketStockInterface[], indexFunds: MarketIndexFundInterface[], newDay: boolean = false): MarketIndexFundInterface[] => {
  return indexFunds.map((indexFund: MarketIndexFundInterface) => {
    // Get the actual stocks held by this index fund
    const heldStocks = indexFund.stocksHeld
      .map(held => {
        const actualStock = marketStocks.find(s => s.name === held.name);
        return actualStock ? { ...actualStock, sharesHeld: held.sharesHeld } : null;
      })
      .filter((s): s is MarketStockInterface & { sharesHeld: number } => s !== null);

    const totalValue = heldStocks.reduce((sum, s) => sum + s.price * s.sharesHeld, 0);
    const totalShares = heldStocks.reduce((sum, s) => sum + s.sharesHeld, 0);

    let newPrice = indexFund.price;
    if (totalShares > 0) {
      newPrice = parseFloat((totalValue / totalShares).toFixed(2));
    }

    const newPriceHistory = [...indexFund.priceHistory];
    const lastDay = newPriceHistory[newPriceHistory.length - 1]?.day ?? 1;
    if (newDay) {
      // advancing to a new trading day → append a new entry
      newPriceHistory.push({ day: lastDay + 1, price: newPrice });
    } else {
      // intraday fluctuation → update the last entry instead of appending
      newPriceHistory[newPriceHistory.length - 1] = { day: lastDay, price: newPrice };
    }

    const trend = Math.round(((newPrice - indexFund.price) / indexFund.price) * 10000) / 100;

    return {
      ...indexFund,
      price: newPrice,
      priceHistory: newPriceHistory,
      trend,
    };
  })
}

export class MarketPriceEngine {
  private eventEngine: EventEngine | undefined = undefined;
  private market: MarketNodeHandles | undefined = undefined;

  public attachEventEngine(eventEngine: EventEngine): void {
    this.eventEngine = eventEngine;
  }

  public attachMarket(market: MarketNodeHandles): void {
    this.market =  market;
  }

  public fluctuateMarketPricesByMinute(): void {
    if (this.market == undefined || this.eventEngine == undefined) {
      return;
    }

    // Fluctuate the market each minute
    const fluctuatedMarketStocks = fluctuateStockPrices(this.market.getMarketStocks(), this.eventEngine.getActiveEvents(), this.eventEngine.getFieldPressures(), this.eventEngine.getStockPressures());
    const fluctuatedIndexFunds = updateIndexFundPrices(fluctuatedMarketStocks, this.market.getMarketIndexFunds());

    this.market.setMarket(fluctuatedMarketStocks);
    this.market.setMarketIndexFunds(fluctuatedIndexFunds);
  }

  public fluctuateMarketPricesByDays(daysPassed: number = 1): void {
    if (this.market == undefined || this.eventEngine == undefined) {
      return;
    }

    let updatedMarketStocks: MarketStockInterface[] = this.market.getMarketStocks();
    let updatedIndexFunds: MarketIndexFundInterface[] = this.market.getMarketIndexFunds();
    for (let i = 0; i < daysPassed; i++) {
      updatedMarketStocks = generateTomorrowsStockPrices(updatedMarketStocks, this.eventEngine.getActiveEvents(), this.eventEngine.getFieldPressures(), this.eventEngine.getStockPressures());
      updatedIndexFunds = updateIndexFundPrices(updatedMarketStocks, updatedIndexFunds, true);
    }

    this.market.setMarket(updatedMarketStocks);
    this.market.setMarketIndexFunds(updatedIndexFunds);
  }



}

export { 
  fluctuateStockPrices, 
  generateTomorrowsStockPrices, 
  updateIndexFundPrices,
}