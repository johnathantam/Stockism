export interface PortfolioAssetInterface {
    name: string;
    quantityOwned: number;
    type: string;
}

export interface PortfolioStockHandles {
    getPortfolioAssets: () => PortfolioAssetInterface[];
    getPortfolioAsset: (name: string) => PortfolioAssetInterface | undefined;

    getPortfolioBalance: () => number;
    getLiquidBalance: () => number;

    purchaseStock: (name: string, sharesPurchased: number, totalPrice: number) => void;
    sellStock: (name: string, sharesSold: number, totalPrice: number) => void;
    purchaseIndexFund: (name: string, sharesPurchased: number, totalPrice: number) => void;
    sellIndexFund: (name: string, sharesSold: number, totalPrice: number) => void;

    purchaseMiscellanious: (totalPrice: number) => void;
    earnMiscellanious: (totalPrice: number) => void;

    updatePortfolio: () => void;
}