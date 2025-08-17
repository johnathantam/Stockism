import { type RefObject, useState, useEffect } from "react";
import type { MarketPutOption } from "../../Interfaces/MarketDerivativeInterface";
import type { MarketNodeHandles, MarketStockInterface } from "../../Interfaces/MarketStockInterface";
import type { PortfolioStockHandles, PortfolioAssetInterface } from "../../Interfaces/PortfolioStockInterface";
import { calculatePutOptionPrice } from "../../Utilities/MarketDerivativesUtils";
import { formatMoney } from "../../Utilities/PriceFormatter";

interface PutOrderListingNodeProps {
  putOption: MarketPutOption;
  marketItem: MarketStockInterface;
  onClick: () => void;
}

const PutOrderListing = ({putOption, marketItem, onClick}: PutOrderListingNodeProps) => {
    return (
        <>
            <div className={`derivative-order-container`} key={Math.random()} onClick={onClick}>
                <div className="derivative-order-stat-row">
                    <p className="derivative-order-stat-type">Put option on {putOption.stockName}</p>
                    <p className="derivative-order-stat-price">{formatMoney(marketItem?.price)}</p>
                </div>
                <div className="derivative-order-stat-row">
                    <p className="derivative-order-stat-explanation">Right to sell at {formatMoney(putOption.strikePrice)}/share within the next {putOption.durationDays} days</p>
                    <p className="derivative-order-stat-trend">%{marketItem?.trend}</p>
                </div>
            </div>
        </>
    )
}

interface EnactPutOptionOrderNodeProps {
    onCancel: () => void;
    onPurchase: (orderName: string, sharesPurchased: number, totalPrice: number) => void;
    putOption: MarketPutOption;
    marketRef: RefObject<MarketNodeHandles>;
    portfolioRef: RefObject<PortfolioStockHandles>;
}

const EnactedPutOptionOrderNode = ({ putOption, onPurchase, onCancel, portfolioRef, marketRef }: EnactPutOptionOrderNodeProps) => {

    const [orderedSellAmount, setOrderedSellAmount] = useState<string>("");
    const [orderedSellQuantityAmount, setOrderedSellQuantityAmount] = useState<string>("");
    const [orderErrorMessage, setOrderErrorMessage] = useState<string>("");

    const sendErrorMessage = (message: string) => {
        setOrderErrorMessage(message);
        setTimeout(() => setOrderErrorMessage(""), 5000);
    }

    const enactPutOptionPurchase = () => {
        const orderedSharesToSell = Math.abs(parseFloat(orderedSellQuantityAmount));
        const portfolioStockToSell: PortfolioAssetInterface | undefined = portfolioRef.current.getPortfolioAsset(putOption.stockName);
        const marketStockToSell: MarketStockInterface | undefined = marketRef.current.getMarketItem(putOption.stockName);

        if (!marketStockToSell || !portfolioStockToSell) {
            sendErrorMessage("You do not own this stock or stock does not exist.");
            return;
        }

        if (isNaN(orderedSharesToSell)) {
            sendErrorMessage("Invalid inputs, try a number.");
            return;
        }

        if (!Number.isFinite(orderedSharesToSell) || orderedSharesToSell === 0) {
            sendErrorMessage("Values cannot be zero or invalid");
            return;
        }

        const maxSharesAvailable = Math.min(marketStockToSell.sharesOutstanding, putOption.sharesPurchaseable);
        const sharesToSell = Math.min(orderedSharesToSell, maxSharesAvailable);
        const totalPrice = sharesToSell * putOption.strikePrice;

        onPurchase(putOption.stockName, sharesToSell, totalPrice);
    }

    const handleQuantityChange = (value: string) => {
        setOrderedSellQuantityAmount(value);

        const quantity = parseFloat(value);
        if (!isNaN(quantity)) {
            const marketItem = marketRef.current?.getMarketItem(putOption.stockName);
            if (marketItem) {
                setOrderedSellAmount((quantity * putOption.strikePrice).toFixed(2));
            }
        } else {
            sendErrorMessage("Invalid quantity, try a number.")
            setOrderedSellAmount("");
        }
    };

    const handleAmountChange = (value: string) => {
        setOrderedSellAmount(value);

        const amount = parseFloat(value);
        if (!isNaN(amount)) {
            const marketItem = marketRef.current?.getMarketItem(putOption.stockName);
            if (marketItem) {
                setOrderedSellQuantityAmount((amount / putOption.strikePrice).toFixed(2));
            }
        } else {
            sendErrorMessage("Invalid amount, try a number.")
            setOrderedSellQuantityAmount("");
        }
    };
    
    return (
        <>  
            <p className="derivatives-explanation-title">Enact Put Option.</p>
            <p className="derivatives-explanation">Sell {putOption.stockName} for {formatMoney(putOption.strikePrice)}/share with a {putOption.sharesPurchaseable} shares limit.</p>
            <div className="derivatives-order-mode-quantities-input-container">
                <div className="derivatives-order-mode-individual-quantity-input-container">
                    <p className="derivatives-order-mode-individual-quantity-subtitle">Quantity</p>
                    <input type="number" className="derivatives-order-mode-individual-quantity-input" value={orderedSellQuantityAmount} onChange={(e) => handleQuantityChange(e.target.value)}></input>
                </div>
                <i className="derivatives-order-mode-quantities-middle-icon"></i>
                <div className="derivatives-order-mode-individual-quantity-input-container">
                    <p className="derivatives-order-mode-individual-quantity-subtitle">Amount</p>
                    <input type="number" className="derivatives-order-mode-individual-quantity-input" value={orderedSellAmount} onChange={(e) => handleAmountChange(e.target.value)}></input>
                </div>
            </div>
            <p className="derivatives-error-text">{orderErrorMessage}</p>
            <button className="derivatives-confirm-button" onClick={enactPutOptionPurchase}>Sell Stocks</button>
            <button className="derivatives-cancel-button" onClick={onCancel}>Cancel.</button>
        </>
    )
}

interface PutOptionOrderNodeProps {
    onPurchase: (stockName: string, strikePrice: number, expirationDays: number, sharesPurchaseable: number, optionPrice: number, type: string) => void;
    marketRef: RefObject<MarketNodeHandles>;
    portfolioRef: RefObject<PortfolioStockHandles>;
}

const PutOptionOrderNode = ({ onPurchase, marketRef, portfolioRef }: PutOptionOrderNodeProps) => {
    const [orderedStockName, setOrderedStockName] = useState<string>("");
    const [orderedStrikePrice, setOrderedStrikePrice] = useState<string>("");
    const [orderedExpirationDays, setOrderedExpirationDays] = useState<string>("");
    const [orderedSharesPurchaseable, setOrderedSharesPurchaseable] = useState<string>("");
    const [optionPrice, setOptionPrice] = useState<number>(0);

    const [orderErrorMessage, setOrderErrorMessage] = useState<string>("");

    const sendErrorMessage = (message: string) => {
        setOrderErrorMessage(message);
        setTimeout(() => setOrderErrorMessage(""), 5000);
    }

    const purchasePutOption = () => {
        try {
            if (orderedStockName == "" || orderedStrikePrice == "" || orderedExpirationDays == "" || orderedSharesPurchaseable == "") {
                throw new Error("Missing a field");
            }

            const orderedStock: MarketStockInterface | undefined = marketRef.current.getMarketStock(orderedStockName);
            const strikePrice: number = Math.abs(parseFloat(parseFloat(orderedStrikePrice).toFixed(2)));
            const expirationDays: number = Math.abs(parseInt(orderedExpirationDays));
            const sharesPurchaseable: number = Math.abs(parseFloat(orderedSharesPurchaseable));

            if (orderedStock == undefined) {
                throw new Error("Stock does not exist!");
            }

            if (isNaN(strikePrice) || isNaN(expirationDays) || isNaN(sharesPurchaseable)) {
                throw new Error("Invalid inputs, try a number");
            }

            if (
                !Number.isFinite(strikePrice) || strikePrice === 0 ||
                !Number.isFinite(expirationDays) || expirationDays === 0 ||
                !Number.isFinite(sharesPurchaseable) || sharesPurchaseable === 0
            ) {
                sendErrorMessage("Values cannot be zero or invalid");
                return;
            }

            if (portfolioRef.current.getLiquidBalance() < optionPrice) {
                throw new Error("Not enough liquid money");
            }

            const orderedType: string = orderedStock.type;

            onPurchase(orderedStockName, strikePrice, expirationDays, sharesPurchaseable, optionPrice, orderedType);
        } catch (error) {
            if (error instanceof Error) {
                sendErrorMessage(error.message);
            } else {
                sendErrorMessage(String(error));
            }
        }
    }

    useEffect(() => {
        try {
            const orderedStock: MarketStockInterface | undefined = marketRef.current.getMarketStock(orderedStockName);
            const strikePrice: number = parseFloat(parseFloat(orderedStrikePrice).toFixed(2));
            const expirationDays: number = parseInt(orderedExpirationDays);
            const sharesPurchaseable: number = parseFloat(orderedSharesPurchaseable);

            if (orderedStock == undefined) {
                return;
            }

            if (
                !Number.isFinite(strikePrice) || strikePrice === 0 ||
                !Number.isFinite(expirationDays) || expirationDays === 0 ||
                !Number.isFinite(sharesPurchaseable) || sharesPurchaseable === 0
            ) {
                sendErrorMessage("Values cannot be zero or invalid");
                return;
            }

            setOptionPrice(calculatePutOptionPrice(orderedStock, strikePrice, expirationDays, sharesPurchaseable))
        } catch (error) {
            if (error instanceof Error) {
                sendErrorMessage(error.message);
            } else {
                sendErrorMessage(String(error));
            }
        }
    }, [orderedStrikePrice, orderedExpirationDays, orderedStockName, orderedSharesPurchaseable, marketRef])

    return (
        <>
            <p className="derivatives-mode-title">Purchase Puts: ${optionPrice.toFixed(2)}</p>
            <div className="derivatives-mode-input-container">
                <p className="derivatives-mode-input-title">Stock Name:</p>
                <input type="text" id="order-name" className="derivatives-mode-input" value={orderedStockName} onChange={(e) => setOrderedStockName(e.target.value)}></input>
            </div>
            <div className="derivatives-mode-input-container">
                <p className="derivatives-mode-input-title">Strike Price:</p>
                <input type="text" id="order-name" className="derivatives-mode-input" value={orderedStrikePrice} onChange={(e) => setOrderedStrikePrice(e.target.value)}></input>
            </div>
            <div className="derivatives-mode-input-container">
                <p className="derivatives-mode-input-title">Shares Purchaseable:</p>
                <input type="text" id="order-name" className="derivatives-mode-input" value={orderedSharesPurchaseable} onChange={(e) => setOrderedSharesPurchaseable(e.target.value)}></input>
            </div>
            <div className="derivatives-mode-input-container">
                <p className="derivatives-mode-input-title">Expiration:</p>
                <input type="number" id="order-amount" className="derivatives-mode-input" value={orderedExpirationDays} onChange={(e) => setOrderedExpirationDays(e.target.value)}></input>
            </div>
            <p className="derivatives-error-text">{orderErrorMessage}</p>
            <button className="derivatives-confirm-button" onClick={purchasePutOption}>Purchase Option</button>
        </>
    )
}

export {
    PutOptionOrderNode,
    EnactedPutOptionOrderNode,
    PutOrderListing
}