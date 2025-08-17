export interface MarketStockInterface {
    name: string;
    price: number;
    priceHistory: { day: number, price: number }[]; // Price each day according to index
    sharesOutstanding: number; // Available stocks
    field: string;
    trend: number; // Trend since last day
    riskRating: number; // 👈 Add this line
    type: string;
}

export interface MarketIndexFundInterface extends MarketStockInterface {
    stocksHeld: { name: string, sharesHeld: number }[];
}

export interface MarketNodeHandles {
    getMarketFields: () => string[];
    getMarketStocks: () => MarketStockInterface[];
    getMarketStock: (name: string) => MarketStockInterface | undefined;
    getMarketIndexFunds: () => MarketIndexFundInterface[];
    getMarketIndexFund: (name: string) => MarketIndexFundInterface | undefined;
    getMarketItem: (name: string) => MarketStockInterface | MarketIndexFundInterface | undefined;

    purchaseStock: (name: string, amount: number) => void;
    sellStock: (name: string, amount: number) => void;
    purchaseIndexFund: (name: string, amount: number) => void;
    sellIndexFund: (name: string, amount: number) => void;

    setMarket: (newStocks: MarketStockInterface[]) => void;
    setMarketIndexFunds: (newIndexFunds: MarketIndexFundInterface[]) => void;
}