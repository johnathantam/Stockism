import { useState, useImperativeHandle, type RefObject, forwardRef } from "react";
import type { PortfolioAssetInterface } from "../Interfaces/PortfolioStockInterface";
import type { PortfolioStockHandles } from "../Interfaces/PortfolioStockInterface";
import type { MarketIndexFundInterface, MarketNodeHandles, MarketStockInterface } from "../Interfaces/MarketStockInterface";
import { formatMoney } from "../Utilities/PriceFormatter";
import "./PortfolioNode.css";

interface PortfolioNodeProps {
  marketRef: RefObject<MarketNodeHandles>;
}

const PortfolioNode = forwardRef<PortfolioStockHandles, PortfolioNodeProps>(({ marketRef }, ref) => {
    const [portfolioStocks, setPortfolioStocks] = useState<PortfolioAssetInterface[]>([]);
    const [portfolioIndexFunds, setPortfolioIndexFunds] = useState<PortfolioAssetInterface[]>([]);

    const [initialPortfolioValue, setInitialPortfolioValue] = useState<number>(0);
    const [currentPortfolioValue, setCurrentPortfolioValue] = useState<number>(0);
    const [liquidBalance, setLiquidBalance] = useState<number>(100000);

    useImperativeHandle(ref, () => ({
        getPortfolioAssets() {
            return portfolioStocks;
        },
        getLiquidBalance() {
            return liquidBalance;
        },
        getPortfolioBalance() {
            const balance: number = portfolioStocks.reduce((acc, stock) => {
                const portfolioStock: MarketStockInterface | undefined = marketRef.current.getMarketStock(stock.name);
                return (portfolioStock) ? acc + stock.quantityOwned * portfolioStock.price : 0;
            }, 0);

            return balance;
        },
        getPortfolioAsset(name: string) {
            return portfolioStocks.find(stock => stock.name === name);
        },
        purchaseStock(name: string, sharesPurchased: number, totalPrice: number) {
            const updatedStocks: PortfolioAssetInterface[] = [...portfolioStocks];
            const purchasedStockIndex: number | undefined = updatedStocks.findIndex(stock => stock.name === name);
            if (purchasedStockIndex != undefined) {

                // If stock isn't found -- then create a new profile for the stock
                if (purchasedStockIndex == -1) {
                    const newlyPurchasedStock: PortfolioAssetInterface = { name: name, quantityOwned: sharesPurchased, type: "Stock" };
                    updatedStocks.push(newlyPurchasedStock);
                } else {
                    updatedStocks[purchasedStockIndex].quantityOwned += sharesPurchased;
                }

                setInitialPortfolioValue(prevInitialValue => prevInitialValue + totalPrice);
                setLiquidBalance(previousLiquidBalance => previousLiquidBalance - totalPrice);
                setPortfolioStocks(updatedStocks);
            }
        },
        sellStock(name, sharesSold, totalPrice) {
            const updatedStocks: PortfolioAssetInterface[] = [...portfolioStocks];
            const soldStockIndex: number | undefined = updatedStocks.findIndex(stock => stock.name === name);
            if (soldStockIndex != undefined) {
                updatedStocks[soldStockIndex].quantityOwned -= sharesSold;

                if (updatedStocks[soldStockIndex].quantityOwned <= 0)
                    updatedStocks.splice(soldStockIndex, 1);
                
                setInitialPortfolioValue(prevInitialValue => prevInitialValue - totalPrice);
                setLiquidBalance(prevLiquidBalance => prevLiquidBalance += totalPrice);
                setPortfolioStocks(updatedStocks);
            }
        },
        purchaseIndexFund(name, sharesPurchased, totalPrice) {
            const updatedPortfolioIndexFunds: PortfolioAssetInterface[] = [...portfolioIndexFunds];
            const purchasedFundIndex: number= updatedPortfolioIndexFunds.findIndex(fund => fund.name === name);

            // If stock isn't found -- then create a new profile for the stock
            if (purchasedFundIndex == -1) {
                const newlyPurchasedStock: PortfolioAssetInterface = { name: name, quantityOwned: sharesPurchased, type: "Stock" };
                updatedPortfolioIndexFunds.push(newlyPurchasedStock);
            } else {
                updatedPortfolioIndexFunds[purchasedFundIndex].quantityOwned += sharesPurchased;
            }

            setInitialPortfolioValue(prevInitialValue => prevInitialValue + totalPrice);
            setLiquidBalance(previousLiquidBalance => previousLiquidBalance - totalPrice);
            setPortfolioIndexFunds(updatedPortfolioIndexFunds);

        },
        sellIndexFund(name, sharesSold, totalPrice) {
            const updatedPortfolioIndexFunds: PortfolioAssetInterface[] = [...portfolioIndexFunds];
            const soldFundIndex: number | undefined = updatedPortfolioIndexFunds.findIndex(fund => fund.name === name);
            if (soldFundIndex != -1) {
                updatedPortfolioIndexFunds[soldFundIndex].quantityOwned -= sharesSold;

                if (updatedPortfolioIndexFunds[soldFundIndex].quantityOwned <= 0)
                    updatedPortfolioIndexFunds.splice(soldFundIndex, 1);
                
                setInitialPortfolioValue(prevInitialValue => prevInitialValue - totalPrice);
                setLiquidBalance(prevLiquidBalance => prevLiquidBalance += totalPrice);
                setPortfolioIndexFunds(updatedPortfolioIndexFunds);
            }
        },
        purchaseMiscellanious(totalPrice) {
            setLiquidBalance(prevLiquidBalance => prevLiquidBalance - totalPrice);
        },
        earnMiscellanious(totalPrice) {
            setLiquidBalance(prevLiquidBalance => prevLiquidBalance + totalPrice);
        },
        updatePortfolio() {
            setCurrentPortfolioValue(calculatePortfolioValue());
        },
    }));

    const calculatePortfolioValue = () => {
        let value = 0;

        // Stocks
        for (let i = 0; i < portfolioStocks.length; i++) {
            const portfolioStock: PortfolioAssetInterface = portfolioStocks[i];
            const marketStock: MarketStockInterface | undefined = marketRef.current.getMarketStock(portfolioStock.name);
            value += (marketStock ? marketStock.price * portfolioStock.quantityOwned : 0);
        }

        // Index Funds
        for (let i = 0; i < portfolioIndexFunds.length; i++) {
            const portfolioIndexFund: PortfolioAssetInterface = portfolioIndexFunds[i];
            const marketIndexFund: MarketIndexFundInterface | undefined = marketRef.current.getMarketIndexFund(portfolioIndexFund.name);
            value += (marketIndexFund ? marketIndexFund.price * portfolioIndexFund.quantityOwned : 0);
        }

        return value;
    }

    const PortfolioStock = (stock: PortfolioAssetInterface) => {

        const marketStock: MarketStockInterface | undefined = marketRef.current.getMarketStock(stock.name);

        return (marketStock) ? (
            <>
                <div className="portfolio-stock-container" style={ { borderColor: (marketStock.trend < 0) ? "rgba(148, 4, 4, 1)" : "rgba(18, 227, 18, 1)" }}>
                    <div className="portfolio-stock-stat-row">
                        <p>{marketStock?.name}</p>
                        <p>{formatMoney(marketStock.price)}/Qty</p>
                    </div>
                    <div className="portfolio-stock-stat-row">
                        <p>Qty Owned. {stock.quantityOwned}</p>
                        <p style={ { color: marketStock ? (marketStock.trend < 0) ? "rgba(148, 4, 4, 1)" : "rgba(18, 227, 18, 1)" : ""} }>${(marketStock) ? (marketStock?.price * stock.quantityOwned).toFixed(2) : ""}</p>
                    </div>
                </div>
            </>
        ) : null
    }

    const PortfolioIndexFund = (indexFund: PortfolioAssetInterface) => {
        const marketIndexFund: MarketIndexFundInterface | undefined = marketRef.current.getMarketIndexFund(indexFund.name);

        return (marketIndexFund) ? (
            <>
                <div className="portfolio-stock-container" style={ { borderColor: (marketIndexFund.trend < 0) ? "rgba(148, 4, 4, 1)" : "rgba(18, 227, 18, 1)" } }>
                    <div className="portfolio-stock-stat-row">
                        <p>{marketIndexFund?.name}</p>
                        <p>{formatMoney(marketIndexFund?.price)}</p>
                    </div>
                    <div className="portfolio-stock-stat-row">
                        <p>Qty Owned. {indexFund.quantityOwned}</p>
                        <p style={ { color: (marketIndexFund.trend < 0) ? "rgba(148, 4, 4, 1)" : "rgba(18, 227, 18, 1)"} }>{formatMoney(marketIndexFund.price * indexFund.quantityOwned)}</p>
                    </div>
                </div>
            </>
        ) : null
    }

    return (
        <>
            <div className="portfolionode-container">
                <p className="portfolio-title">Your Portfolio.</p>
                <p className="portfolio-stat-subheader">Liquid Balance</p>
                <div className="portfolio-stat-container">
                    <p className="portfolio-stat-value">{formatMoney(liquidBalance)}</p>
                    <div className="portfolio-stat-profit-container">
                        <p className="portfolio-stat-profit-values">Tax Free Sv</p>
                        <p className="portfolio-stat-profit-values">Account 02</p>
                    </div>
                </div>
                <p className="portfolio-stat-subheader">Portfolio Value</p>
                <div className="portfolio-stat-container">
                    <p className="portfolio-stat-value">{formatMoney(currentPortfolioValue)}</p>
                    <div className="portfolio-stat-profit-container">
                        <p className="portfolio-stat-profit-values">Your profit.</p>
                        <p className="portfolio-stat-profit-values">{formatMoney(calculatePortfolioValue() - initialPortfolioValue)}</p>
                    </div>
                </div>

                <div className="portfolio-stock-list-container">
                    {
                        portfolioStocks.map((stock) => (
                            <PortfolioStock key={stock.name} {...stock} />
                        ))
                    }

                    {
                        portfolioIndexFunds.map((indexFund) => (
                            <PortfolioIndexFund key={indexFund.name} {...indexFund}/>
                        ))
                    }
                </div>
            </div>
        </>
    )
})

export { PortfolioNode };