import "../DerivativesNode.css";
import { type RefObject, useState, useEffect } from "react";
import type { MarketCallOption } from "../../Interfaces/MarketDerivativeInterface";
import type { MarketNodeHandles, MarketStockInterface } from "../../Interfaces/MarketStockInterface";
import type { PortfolioStockHandles } from "../../Interfaces/PortfolioStockInterface";
import { calculateCallOptionPrice } from "../../Utilities/MarketDerivativesUtils";
import { formatMoney } from "../../Utilities/PriceFormatter";

interface DerivativeCallOrderProps {
  callOption: MarketCallOption;
  marketItem: MarketStockInterface;
  onClick: () => void;
}

const CallOrderListingNode = ({ callOption, marketItem, onClick }: DerivativeCallOrderProps) => {
    return (
        <>
            <div className={`derivative-order-container`} key={Math.random()} onClick={ onClick }>
                <div className="derivative-order-stat-row">
                    <p className="derivative-order-stat-type">Call option on {callOption.stockName}</p>
                    <p className="derivative-order-stat-price">{formatMoney(marketItem?.price)}</p>
                </div>
                <div className="derivative-order-stat-row">
                    <p className="derivative-order-stat-explanation">Right to buy at {formatMoney(callOption.strikePrice)}/share within the next {callOption.durationDays} days</p>
                    <p className="derivative-order-stat-trend">%{marketItem?.trend}</p>
                </div>
            </div>
        </>
    )
}

interface EnactCallOptionOrderNodeProps {
    onCancel: () => void;
    onPurchase: (orderName: string, sharesPurchased: number, totalPrice: number) => void;
    callOption: MarketCallOption;
    marketRef: RefObject<MarketNodeHandles>;
    portfolioRef: RefObject<PortfolioStockHandles>;
}

const EnactedCallOptionOrderNode = ({ callOption, onPurchase, onCancel, portfolioRef, marketRef }: EnactCallOptionOrderNodeProps) => {

    const [orderedAmount, setOrderedAmount] = useState<string>("");
    const [orderedQuantityAmount, setOrderedQuantityAmount] = useState<string>("");
    const [orderErrorMessage, setOrderErrorMessage] = useState<string>("");

    const sendErrorMessage = (message: string) => {
        setOrderErrorMessage(message);
        setTimeout(() => setOrderErrorMessage(""), 5000);
    }

    const enactCallOptionPurchase = () => {
        try {
            const totalPrice: number = Math.abs(parseFloat(orderedAmount));
            const totalSharesPurchased: number = Math.abs(parseFloat(orderedQuantityAmount));
            const currentBalance: number = portfolioRef.current.getLiquidBalance();
            const marketStockToPurchase: MarketStockInterface | undefined = marketRef.current.getMarketItem(callOption.stockName);

            if (isNaN(totalPrice) || isNaN(totalSharesPurchased)) {
                throw new Error("Invalid inputs, try a number")
            }

            if (
                !Number.isFinite(totalPrice) || totalPrice === 0 ||
                !Number.isFinite(totalSharesPurchased) || totalSharesPurchased === 0
            ) {
                sendErrorMessage("Values cannot be zero or invalid");
                return;
            }

            if (marketStockToPurchase == undefined) {
                throw new Error("Stock does not exist!");
            }

            if (totalPrice > currentBalance) {
                throw new Error("Insufficient balance.");
            }

            const sharesPurchased: number = Math.min(totalSharesPurchased, callOption.sharesPurchaseable);

            onPurchase(callOption.stockName, sharesPurchased, totalPrice);
        } catch (error) {
            if (error instanceof Error) {
                sendErrorMessage(error.message);
            } else {
                sendErrorMessage(String(error));
            }
        }
    }

    const handleQuantityChange = (value: string) => {
        setOrderedQuantityAmount(value);

        const quantity = parseFloat(value);
        if (!isNaN(quantity)) {
            const marketItem = marketRef.current?.getMarketItem(callOption.stockName);
            if (marketItem) {
                setOrderedAmount((quantity * callOption.strikePrice).toFixed(2));
            }
        } else {
            sendErrorMessage("Invalid quantity amount, try a number");
            setOrderedAmount("");
        }
    };

    const handleAmountChange = (value: string) => {
        setOrderedAmount(value);

        const amount = parseFloat(value);
        if (!isNaN(amount)) {
            const marketItem = marketRef.current?.getMarketItem(callOption.stockName);
            if (marketItem) {
                setOrderedQuantityAmount((amount / callOption.strikePrice).toFixed(2));
            }
        } else {
            sendErrorMessage("Invalid amount, try a number");
            setOrderedQuantityAmount("");
        }
    };
    
    return (
        <>  
            <p className="derivatives-explanation-title">Enact Call Option.</p>
            <p className="derivatives-explanation">Buy {callOption.stockName} for {formatMoney(callOption.strikePrice)}/share with a {callOption.sharesPurchaseable} shares limit.</p>
            <div className="derivatives-order-mode-quantities-input-container">
                <div className="derivatives-order-mode-individual-quantity-input-container">
                    <p className="derivatives-order-mode-individual-quantity-subtitle">Quantity</p>
                    <input type="number" className="derivatives-order-mode-individual-quantity-input" value={orderedQuantityAmount} onChange={(e) => handleQuantityChange(e.target.value)}></input>
                </div>
                <i className="derivatives-order-mode-quantities-middle-icon"></i>
                <div className="derivatives-order-mode-individual-quantity-input-container">
                    <p className="derivatives-order-mode-individual-quantity-subtitle">Amount</p>
                    <input type="number" className="derivatives-order-mode-individual-quantity-input" value={orderedAmount} onChange={(e) => handleAmountChange(e.target.value)}></input>
                </div>
            </div>
            <p className="derivatives-error-text">{orderErrorMessage}</p>
            <button className="derivatives-confirm-button" onClick={enactCallOptionPurchase}>Purchase Option</button>
            <button className="derivatives-cancel-button" onClick={onCancel}>Cancel.</button>
        </>
    )
}

interface CallOptionOrderNodeProps {
    onPurchase: (stockName: string, strikePrice: number, expirationDays: number, sharesPurchaseable: number, optionPrice: number, type: string) => void;
    marketRef: RefObject<MarketNodeHandles>;
    portfolioRef: RefObject<PortfolioStockHandles>;
}

const CallOptionOrderNode = ({ onPurchase, marketRef, portfolioRef }: CallOptionOrderNodeProps) => {
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

    const purchaseCallOption = () => {
        const orderedStock: MarketStockInterface | undefined = marketRef.current.getMarketStock(orderedStockName);
        const strikePrice: number = Math.abs(parseFloat((orderedStrikePrice)));
        const expirationDays: number = Math.abs(parseInt(orderedExpirationDays));
        const sharesPurchaseable: number = Math.abs(parseFloat(orderedSharesPurchaseable));

        if (orderedStock == undefined) {
            sendErrorMessage("Stock does not exist!");
            return;
        }

        if (isNaN(strikePrice) || isNaN(expirationDays) || isNaN(sharesPurchaseable)) {
            sendErrorMessage("Invalid inputs, try a number");
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

        if (portfolioRef.current.getLiquidBalance() < optionPrice) {
            sendErrorMessage("Not enough liquid money");
            return;
        }

        const orderedType: string = orderedStock.type;

        onPurchase(orderedStockName, strikePrice, expirationDays, sharesPurchaseable, optionPrice, orderedType);
    }

    useEffect(() => {
        const orderedStock: MarketStockInterface | undefined = marketRef.current.getMarketStock(orderedStockName);
        const strikePrice: number = Math.abs(parseFloat(parseFloat(orderedStrikePrice).toFixed(2)));
        const expirationDays: number = Math.abs(parseInt(orderedExpirationDays));
        const sharesPurchaseable: number = Math.abs(parseFloat(orderedSharesPurchaseable));

        if (orderedStock == undefined) {
            return;
        }

        if (isNaN(strikePrice) || isNaN(expirationDays) || isNaN(sharesPurchaseable)) {
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

        setOptionPrice(calculateCallOptionPrice(orderedStock, strikePrice, expirationDays, sharesPurchaseable))
    }, [orderedStrikePrice, orderedExpirationDays, orderedStockName, orderedSharesPurchaseable, marketRef])

    return (
        <>
            <p className="derivatives-mode-title">Purchase Calls: ${optionPrice.toFixed(2)}</p>
            <div className="derivatives-mode-input-container">
                <p className="derivatives-mode-input-title">Stock Name:</p>
                <input type="text" id="order-name" className="derivatives-mode-input" value={orderedStockName} onChange={(e) => setOrderedStockName(e.target.value)}></input>
            </div>
            <div className="derivatives-mode-input-container">
                <p className="derivatives-mode-input-title">Strike Price:</p>
                <input type="number" id="order-name" className="derivatives-mode-input" value={orderedStrikePrice} onChange={(e) => setOrderedStrikePrice(e.target.value)}></input>
            </div>
            <div className="derivatives-mode-input-container">
                <p className="derivatives-mode-input-title">Shares Purchaseable:</p>
                <input type="number" id="order-name" className="derivatives-mode-input" value={orderedSharesPurchaseable} onChange={(e) => setOrderedSharesPurchaseable(e.target.value)}></input>
            </div>
            <div className="derivatives-mode-input-container">
                <p className="derivatives-mode-input-title">Expiration:</p>
                <input type="number" min="0" id="order-amount" className="derivatives-mode-input" value={orderedExpirationDays} onChange={(e) => setOrderedExpirationDays(e.target.value)}></input>
            </div>
            <p className="derivatives-error-text">{orderErrorMessage}</p>
            <button className="derivatives-confirm-button" onClick={purchaseCallOption}>Purchase Option</button>
        </>
    )
}

export { 
    CallOptionOrderNode,
    EnactedCallOptionOrderNode,
    CallOrderListingNode
}