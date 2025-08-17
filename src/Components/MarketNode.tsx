/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useImperativeHandle, forwardRef, useEffect, type RefObject, useRef } from "react";
import type { MarketNodeHandles } from "../Interfaces/MarketStockInterface";
import type { MarketStockInterface, MarketIndexFundInterface } from "../Interfaces/MarketStockInterface";
import type { PortfolioStockHandles } from "../Interfaces/PortfolioStockInterface";
import { Line, Label, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import type { EventEngine } from "../Utilities/MarketEventEngine";
import { generateMarketStocks, generateIndexFunds, STOCK_FIELDS } from "../Utilities/MarketGeneratorUtils";
import { formatMoney } from "../Utilities/PriceFormatter";
import "./MarketNode.css";

interface MarketNodeProps {
    portfolioRef: RefObject<PortfolioStockHandles>;
    eventEngine: EventEngine;
}

const MarketNode = forwardRef<MarketNodeHandles, MarketNodeProps>((props, ref) => {

    // Reference Stocks and market items as useImperativeHandle only references a variables starting state
    const marketStocksRef = useRef<MarketStockInterface[]>([]);
    const marketIndexFundsRef = useRef<MarketIndexFundInterface[]>([]);

    // Stocks and market items
    const [marketStocks, setMarketStocks] = useState<MarketStockInterface[]>(generateMarketStocks(20));
    const [marketIndexFunds, setMarketIndexFunds] = useState<MarketIndexFundInterface[]>(generateIndexFunds(marketStocks, 5));

    const [stockListPreview, setStockListPreview] = useState<MarketStockInterface[]>(marketStocks);
    const [stockPreview, setStockPreview] = useState<MarketStockInterface>(marketStocks[0]);
    const [searchQuery, setSearchQuery] = useState<string>("");

    useImperativeHandle(ref, () => ({
        getMarketFields() {
            return STOCK_FIELDS;
        },
        getMarketStocks() {
            return marketStocksRef.current;
        },
        getMarketStock(name: string) {
            return marketStocksRef.current.find((marketStock) => marketStock.name === name);
        },
        getMarketIndexFunds() {
            return marketIndexFundsRef.current;
        },
        getMarketIndexFund(name: string) {
            return marketIndexFundsRef.current.find((indexFund) => indexFund.name === name);
        },
        getMarketItem(name: string) {
            const marketStock: MarketStockInterface | undefined = marketStocksRef.current.find((marketStock: MarketStockInterface) => marketStock.name == name);
            const marketIndexFund: MarketIndexFundInterface | undefined = marketIndexFundsRef.current.find((indexFund: MarketIndexFundInterface) => indexFund.name === name);
            const potentialItems = [marketStock, marketIndexFund];
            for (let i = 0; i < potentialItems.length; i++) {
                const marketItem = potentialItems[i];
                if (marketItem != undefined)
                    return marketItem;
            }
        },
        purchaseStock(name: string, sharesPurchased: number) {
            const purchasedStockIndex: number = marketStocksRef.current.findIndex(stock => stock.name === name);
            if (purchasedStockIndex != -1) {
                const purchasedStock: MarketStockInterface = marketStocksRef.current[purchasedStockIndex];
                const updatedStocks = [...marketStocks];
                updatedStocks[purchasedStockIndex] = {
                    ...purchasedStock,
                    sharesOutstanding: purchasedStock.sharesOutstanding - sharesPurchased,
                };

                setMarketStocks(updatedStocks);
            }
        },
        sellStock(name: string, sharesSold: number) {
            const soldStockIndex: number = marketStocksRef.current.findIndex(stock => stock.name === name);
            if (soldStockIndex != -1) {
                const soldStock = marketStocks[soldStockIndex];
                const updatedStocks = [...marketStocks];
                updatedStocks[soldStockIndex] = {
                    ...soldStock,
                    sharesOutstanding: soldStock.sharesOutstanding + sharesSold,
                };

                setMarketStocks(updatedStocks);
            }
        },
        purchaseIndexFund(name: string, sharesPurchased: number) {
            const purchasedFundIndex: number = marketIndexFundsRef.current.findIndex(fund => fund.name === name);
            if (purchasedFundIndex != -1) {
                const purchasedIndexFund: MarketIndexFundInterface = marketIndexFunds[purchasedFundIndex];
                const updatedIndexFunds = [...marketIndexFunds];
                updatedIndexFunds[purchasedFundIndex] = {
                    ...purchasedIndexFund,
                    sharesOutstanding: purchasedIndexFund.sharesOutstanding - sharesPurchased,
                };

                setMarketIndexFunds(updatedIndexFunds);
            }
        },
        sellIndexFund(name: string, sharesSold: number) {
            const soldFundIndex: number = marketIndexFundsRef.current.findIndex(fund => fund.name === name);
            if (soldFundIndex != -1) {
                const soldIndexFund = marketIndexFunds[soldFundIndex];
                const updatedIndexFunds = [...marketIndexFunds];
                updatedIndexFunds[soldFundIndex] = {
                    ...soldIndexFund,
                    sharesOutstanding: soldIndexFund.sharesOutstanding + sharesSold,
                };

                setMarketIndexFunds(updatedIndexFunds);
            }
        },
        setMarket(newStocks: MarketStockInterface[]) {
            setMarketStocks(newStocks);
        },
        setMarketIndexFunds(newIndexFunds: MarketIndexFundInterface[]) {
            setMarketIndexFunds(newIndexFunds);
        }
    }));

    // Keep refs updated whenever state changes
    useEffect(() => {
        marketStocksRef.current = marketStocks;
        marketIndexFundsRef.current = marketIndexFunds;
    }, [marketStocks, marketIndexFunds]);

    useEffect(() => {
        const marketItems: MarketStockInterface[] = [...marketStocks, ...marketIndexFunds];

        // 1st -- update portfolio given market change
        props.portfolioRef.current.updatePortfolio();

        // 2nd -- update item previewed (selected)
        setStockPreview(prevPreview => {
            if (!prevPreview) return marketItems[0] || null;
            const updated = marketItems.find(s => s.name === prevPreview.name);
            return updated || marketItems[0] || null;
        });
        
        // 3rd -- update the item list preview, respecting current search query
        if (searchQuery.trim() === "") {
            setStockListPreview(marketItems);
        } else {
            const filtered = marketItems.filter((item) =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.field.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setStockListPreview(filtered.length > 0 ? filtered : marketStocks);
        }
    }, [marketStocks, searchQuery])

    const MarketStock = (stock: MarketStockInterface) => {
        return (
            <>
                <div className={`market-stock-container ${stock.name === stockPreview.name ? "market-stock-container-selected" : ""}`} onClick={() => setStockPreview(stock)} style={ { borderColor: (stock.trend < 0) ? "rgb(255, 58, 58)" : "rgb(100, 255, 100)" } }>
                    <div className="market-stock-stat-row">
                        <p className="market-stock-stat-name">{stock.name}</p>
                        <p className="market-stock-stat-price">{formatMoney(stock.price)}</p>
                    </div>
                    <div className="market-stock-stat-row">
                        <p className="market-stock-stat-field">{stock.field}</p>
                        <p className="market-stock-stat-trend" style={ {color: (stock.trend < 0) ? "rgba(148, 4, 4, 1)" : "rgba(18, 227, 18, 1)"} }>%{stock.trend}</p>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <div className="marketnode-container">
                <div className="marketnode-view-container">
                    <div className="marketnode-stock-search-container">
                        <p className="market-stock-search-title">Search:</p>
                        <input type="text" id="market-stock-search-input" className="market-stock-search-input" value={searchQuery} onChange={(e) => {
                            const searchInput: string = e.target.value;
                            setSearchQuery(searchInput);
                        }}></input>
                    </div>
                    <div className="market-stock-list-container">
                        {stockListPreview.map((stock) => (
                            <MarketStock key={stock.name} {...stock} />
                        ))}
                    </div>
                </div>
                <div className="marketnode-view-container">
                    <div className="market-stock-graph-preview-container">
                        <ResponsiveContainer width="90%" height="90%">
                            <AreaChart data={stockPreview.priceHistory}>
                                <CartesianGrid stroke="#00000066" strokeDasharray="5 5" />
                                <XAxis dataKey="day" stroke="#000000ff">
                                    <Label value="Day" offset={-3} fill="#000000ff" style={{ textAnchor: 'middle' }} position="insideBottom" />
                                </XAxis>
                                <YAxis stroke="#000000ff" domain={['auto', 'auto']}>
                                    <Label value="Price ($)" angle={-90} fill="#000000ff" style={{ textAnchor: 'middle' }} position="insideLeft" />
                                </YAxis>
                                <Tooltip />
                                <Area
                                    type="linear"
                                    dataKey="price"
                                    stroke="none"
                                    fill="#000000ff"
                                    tooltipType="none"
                                    fillOpacity={0.2}
                                />
                                <Line
                                    type="linear"
                                    dataKey="price"
                                    stroke="#08086bff"
                                    dot={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    
                    <div className="market-stock-depth-stats-container">
                        <div className="market-stock-depth-stat-row-container">
                            <p className="market-stock-depth-stat-title">Name:</p>
                            <p className="market-stock-depth-stat-subtitle">{stockPreview.name}</p>
                        </div>
                        <div className="market-stock-depth-stat-row-container">
                            <p className="market-stock-depth-stat-title">Price:</p>
                            <p className="market-stock-depth-stat-subtitle">{formatMoney(stockPreview.price)}</p>
                        </div>
                        <div className="market-stock-depth-stat-row-container">
                            <p className="market-stock-depth-stat-title">Shares Avlb:</p>
                            <p className="market-stock-depth-stat-subtitle">{stockPreview.sharesOutstanding}</p>
                        </div>
                        <div className="market-stock-depth-stat-row-container">
                            <p className="market-stock-depth-stat-title">Field:</p>
                            <p className="market-stock-depth-stat-subtitle">{stockPreview.field}</p>
                        </div>
                        <div className="market-stock-depth-stat-row-container">
                            <p className="market-stock-depth-stat-title">Risk:</p>
                            <p className="market-stock-depth-stat-subtitle">{stockPreview.riskRating.toFixed(2)}</p>
                        </div>
                        <div className="market-stock-depth-stat-row-container">
                            <p className="market-stock-depth-stat-title">Trend:</p>
                            <p className="market-stock-depth-stat-subtitle">%{stockPreview.trend.toFixed(2)}</p>
                        </div>
                        <div className="market-stock-depth-stat-row-container">
                            <p className="market-stock-depth-stat-title">Type:</p>
                            <p className="market-stock-depth-stat-subtitle">{stockPreview.type}</p>
                        </div>
                    </div>

                </div>

            </div>
        </>
    )
})

export { MarketNode }