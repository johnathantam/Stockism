import { useState, type RefObject } from "react";
import type { PortfolioStockHandles, PortfolioAssetInterface } from "../Interfaces/PortfolioStockInterface";
import type { MarketIndexFundInterface, MarketNodeHandles, MarketStockInterface } from "../Interfaces/MarketStockInterface";
import type { EventNodeHandles } from "../Interfaces/AnnounceEventInterface";
import type { DerivativeNodeHandles } from "../Interfaces/MarketDerivativeInterface";
import "./OrderNode.css";
import { formatMoney } from "../Utilities/PriceFormatter";

interface OrderNodeProps {
    marketRef: RefObject<MarketNodeHandles>;
    derivativesRef: RefObject<DerivativeNodeHandles>;
    portfolioRef: RefObject<PortfolioStockHandles>;
    eventChat: RefObject<EventNodeHandles>;
}

const OrderNode = ({ marketRef, portfolioRef, eventChat }: OrderNodeProps) => {

    const [isBuyMode, setBuyMode] = useState<boolean>(true);
    const [orderName, setOrderName] = useState<string>("");
    const [orderAmount, setOrderAmount] = useState<string>("");
    const [orderQuantityAmount, setOrderQuantityAmount] = useState<string>("");
    const [orderErrorMessage, setOrderErrorMessage] = useState<string>("");

    const switchMode = (buyMode: boolean) => {
        setBuyMode(buyMode);
    }

    const sendErrorMessage = (message: string) => {
        setOrderErrorMessage(message);
        setTimeout(() => setOrderErrorMessage(""), 5000);
    }

    const purchaseShares = () => {
        const marketStockToPurchase: MarketStockInterface | undefined = marketRef.current.getMarketStock(orderName);

        if (marketStockToPurchase == undefined) {
            sendErrorMessage("Stock does not exist!");
            return;
        }

        const sharesPurchased = Math.abs(parseFloat(orderQuantityAmount));
        const totalPrice = sharesPurchased * marketStockToPurchase.price;
        const currentBalance: number = portfolioRef.current.getLiquidBalance();

        if (isNaN(totalPrice) || isNaN(sharesPurchased)) {
            sendErrorMessage("Field is missing.");
            return;
        }

        if (
            !Number.isFinite(totalPrice) || totalPrice === 0 ||
            !Number.isFinite(sharesPurchased) || sharesPurchased === 0
        ) {
            sendErrorMessage("Values cannot be zero or invalid");
            return;
        }

        if (totalPrice > currentBalance) {
            sendErrorMessage("Insufficient balance.");
            return;
        }

        eventChat.current.announceEvent({
            eventTitle: "Player Action",
            eventDescription: `You have purchased ${sharesPurchased} shares of ${marketStockToPurchase.name} for ${formatMoney(totalPrice)}`,
            eventTitleColor: "rgba(119, 104, 255, 1)",
            eventDescriptionColor: "rgba(119, 104, 255, 1)",
            eventBorderColor: "rgba(119, 104, 255, 1)"
        })
        marketRef.current.purchaseStock(orderName, sharesPurchased);
        portfolioRef.current.purchaseStock(orderName, sharesPurchased, totalPrice);
    }

    const sellShares = () => {
        const portfolioStockToSell: PortfolioAssetInterface | undefined = portfolioRef.current.getPortfolioAsset(orderName);
        const portfolioStockOnMarket: MarketStockInterface | undefined = marketRef.current.getMarketStock(orderName);

        if (portfolioStockToSell == undefined || portfolioStockOnMarket == undefined) {
            sendErrorMessage("Stock does not exist!");
            return;
        }           
        
        let sharesSold: number = parseFloat(orderQuantityAmount);
        let totalPrice = sharesSold * portfolioStockOnMarket.price;
    
        if (isNaN(totalPrice) || isNaN(sharesSold)) {
            sendErrorMessage("Field is missing.");
            return;
        }

        if (
            !Number.isFinite(totalPrice) || totalPrice === 0 ||
            !Number.isFinite(sharesSold) || sharesSold === 0
        ) {
            sendErrorMessage("Values cannot be zero or invalid");
            return;
        }

        // Lock constraints to stock availability
        sharesSold = Math.abs(Math.min(sharesSold, portfolioStockToSell.quantityOwned));
        totalPrice = Math.abs(Math.min(totalPrice, sharesSold * portfolioStockOnMarket.price));

        eventChat.current.announceEvent({
            eventTitle: "Player Action",
            eventDescription: `You have sold ${sharesSold} shares of ${portfolioStockOnMarket.name} for ${formatMoney(totalPrice)}`,
            eventTitleColor: "rgba(119, 104, 255, 1)",
            eventDescriptionColor: "rgba(119, 104, 255, 1)",
            eventBorderColor: "rgba(119, 104, 255, 1)"
        })
        
        marketRef.current.sellStock(orderName, sharesSold);
        portfolioRef.current.sellStock(orderName, sharesSold, totalPrice);
    }

    const purchaseIndexFunds = () => { // WORK ON THIS
        const marketIndexFundToPurchase: MarketIndexFundInterface | undefined = marketRef.current.getMarketIndexFund(orderName);

        if (marketIndexFundToPurchase == undefined) {
            sendErrorMessage("Index Fund does not exist!");
            return;
        }

        const sharesPurchased = Math.abs(parseFloat(orderQuantityAmount));
        const totalPrice = sharesPurchased * marketIndexFundToPurchase.price;
        const currentBalance: number = portfolioRef.current.getLiquidBalance();

        if (isNaN(totalPrice) || isNaN(sharesPurchased)) {
            sendErrorMessage("Field is missing.");
            return;
        }

        if (
            !Number.isFinite(totalPrice) || totalPrice === 0 ||
            !Number.isFinite(sharesPurchased) || sharesPurchased === 0
        ) {
            sendErrorMessage("Values cannot be zero or invalid");
            return;
        }

        if (totalPrice > currentBalance) {
            sendErrorMessage("Insufficient balance.");
            return;
        }

        eventChat.current.announceEvent({
            eventTitle: "Player Action",
            eventDescription: `You have purchased ${sharesPurchased} shares of ${marketIndexFundToPurchase.name} for ${formatMoney(totalPrice)}`,
            eventTitleColor: "rgba(124, 88, 197, 1)",
            eventDescriptionColor: "rgba(124, 88, 197, 1)",
            eventBorderColor: "rgba(119, 104, 255, 1)"
        })
        marketRef.current.purchaseIndexFund(orderName, sharesPurchased);
        portfolioRef.current.purchaseIndexFund(orderName, sharesPurchased, totalPrice);
    }

    const sellIndexFunds = () => {
        const portfolioIndexFundToSell: PortfolioAssetInterface | undefined = portfolioRef.current.getPortfolioAsset(orderName);
        const marketIndexFundToSell: MarketIndexFundInterface | undefined = marketRef.current.getMarketIndexFund(orderName);

        if (portfolioIndexFundToSell == undefined || marketIndexFundToSell == undefined) {
            sendErrorMessage("Index Fund does not exist!");
            return;
        }
        
        let sharesSold: number = parseFloat(orderQuantityAmount);
        let totalPrice = sharesSold * marketIndexFundToSell.price;

        if (isNaN(totalPrice) || isNaN(sharesSold)) {
            sendErrorMessage("Field is missing.");
            return;
        }

        if (
            !Number.isFinite(totalPrice) || totalPrice === 0 ||
            !Number.isFinite(sharesSold) || sharesSold === 0
        ) {
            sendErrorMessage("Values cannot be zero or invalid");
            return;
        }

        // Lock constraints to available shares
        sharesSold = Math.abs(Math.min(sharesSold, portfolioIndexFundToSell.quantityOwned));
        totalPrice = Math.abs(Math.min(totalPrice, sharesSold * marketIndexFundToSell.price));

        eventChat.current.announceEvent({
            eventTitle: "Player Action.",
            eventDescription: `You have sold ${sharesSold} shares of ${marketIndexFundToSell.name} for ${formatMoney(totalPrice)}`,
            eventTitleColor: "rgba(119, 104, 255, 1)",
            eventDescriptionColor: "rgba(119, 104, 255, 1)",
            eventBorderColor: "rgba(119, 104, 255, 1)"
        });

        marketRef.current.sellIndexFund(orderName, sharesSold);
        portfolioRef.current.sellIndexFund(orderName, sharesSold, totalPrice);
    };

    const confirmOrder = () => {
        const orderItem: MarketStockInterface | MarketIndexFundInterface | undefined = marketRef.current.getMarketItem(orderName);

        if (orderItem != undefined) {
            // Update UI prices to the latest version if updates have passed
            handleQuantityChange(orderQuantityAmount);

            const orderType: string = orderItem.type;

            if (orderType == "Stock") {
                if (isBuyMode) {
                    purchaseShares();
                    return
                }
                sellShares();
            } else if (orderType == "Index Fund") {
                if (isBuyMode) {
                    purchaseIndexFunds();
                    return;
                }
                sellIndexFunds();
            }
        }   
    }

    const handleQuantityChange = (value: string) => {
        setOrderQuantityAmount(value);

        const quantity = parseFloat(value);

        const marketItem = marketRef.current?.getMarketItem(orderName);
        if (marketItem) {
            setOrderAmount((quantity * marketItem.price).toFixed(2));
        } else {
            setOrderAmount("");
        }
    };

    const handleAmountChange = (value: string) => {
        setOrderAmount(value);

        const amount = parseFloat(value);

        const marketItem = marketRef.current?.getMarketItem(orderName);
        if (marketItem) {
            setOrderQuantityAmount((amount / marketItem.price).toFixed(2));
        } else {
            setOrderQuantityAmount("");
        }
    };

    return (
        <>
            <div className="node-container">
                <div className="order-mode-control-container">
                    <button className="order-mode-control-button" style={{ backgroundColor: isBuyMode ? "" : "transparent" }} onClick={() => switchMode(true)}>Buy Stock</button>
                    <button className="order-mode-control-button" style={{ backgroundColor: isBuyMode ? "transparent" : "" }} onClick={() => switchMode(false)}>Sell Stock</button>
                </div>
                <div className="order-mode-input-container">
                    <p className="order-mode-input-title">Stock Name:</p>
                    <input type="text" id="order-name" className="order-mode-input" value={orderName} onChange={(e) => setOrderName(e.target.value)}></input>
                </div>
                <div className="order-mode-quantities-input-container">
                    <div className="order-mode-individual-quantity-input-container">
                        <p className="order-mode-individual-quantity-subtitle">Quantity</p>
                        <input type="number" className="order-mode-individual-quantity-input" value={orderQuantityAmount} onChange={(e) => handleQuantityChange(e.target.value)}></input>
                    </div>
                    <i className="order-mode-quantities-middle-icon"></i>
                    <div className="order-mode-individual-quantity-input-container">
                        <p className="order-mode-individual-quantity-subtitle">Amount</p>
                        <input type="number" className="order-mode-individual-quantity-input" value={orderAmount} onChange={(e) => handleAmountChange(e.target.value)}></input>
                    </div>
                </div>
                <p className="order-error-text">{orderErrorMessage}</p>
                <button className="order-confirm-button" onClick={confirmOrder}>{isBuyMode ? "Purchase Stock" : "Sell Stock"}</button>
            </div>
        </>
    )
}

export { OrderNode }