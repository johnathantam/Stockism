import { type RefObject, useEffect, useState } from "react";
import type { MarketNodeHandles, MarketStockInterface } from "../../Interfaces/MarketStockInterface";
import type { PortfolioStockHandles } from "../../Interfaces/PortfolioStockInterface";
import type { MarketShortOrder } from "../../Interfaces/MarketDerivativeInterface";
import { formatMoney } from "../../Utilities/PriceFormatter";

interface ShortOrderListingNodeProps {
  shortOrder: MarketShortOrder;
  marketItem: MarketStockInterface;
  onClick: () => void;
}

const ShortOrderListingNode = ({shortOrder, marketItem, onClick}: ShortOrderListingNodeProps) => {
    return (
        <>
            <div className={`derivative-order-container`} key={Math.random()} onClick={ onClick }>
                <div className="derivative-order-stat-row">
                    <p className="derivative-order-stat-type">Short order on {shortOrder.stockName}</p>
                    <p className="derivative-order-stat-price">{formatMoney(marketItem?.price)}</p>
                </div>
                <div className="derivative-order-stat-row">
                    <p className="derivative-order-stat-explanation">Sold a borrowed amount of {formatMoney(shortOrder.shortAmount)} or at {shortOrder.shortQuantity} shares. You will be automatically billed within {shortOrder.debtDuration} days or can pay back the debt within that time here.</p>
                    <p className="derivative-order-stat-trend">%{marketItem?.trend}</p>
                </div>
            </div>
        </>
    )
}


interface EnactedShortOrderNodeProps {
    onpayBackShortOrder: (shortOrderId: string, debtAmountPaid: number, debtQuantityAmountPaid: number) => void;
    onCancel: () => void;
    shortOrder: MarketShortOrder;
    marketRef: RefObject<MarketNodeHandles>;
    portfolioRef: RefObject<PortfolioStockHandles>;
}

const EnactedShortOrderNode = ({ onCancel, onpayBackShortOrder, shortOrder, marketRef }: EnactedShortOrderNodeProps) => {

    const [orderedPayBackAmount, setOrderedPayBackAmount] = useState<string>("");
    const [orderedPayBackQuantityAmount, setOrderedPayBackQuantityAmount] = useState<string>("");
    const [orderErrorMessage, setOrderErrorMessage] = useState<string>("");

    const sendErrorMessage = (message: string) => {
        setOrderErrorMessage(message);
        setTimeout(() => setOrderErrorMessage(""), 5000);
    }

    const payBackShortOrder = () => {
        const marketItem = marketRef.current?.getMarketItem(shortOrder.stockName);

        if (marketItem == undefined) {
            return;
        }

        handleQuantityChange(orderedPayBackQuantityAmount);

        const debtQuantityAmountPaid: number = Math.abs(parseFloat(orderedPayBackQuantityAmount));
        const debtAmountPaid: number = debtQuantityAmountPaid * marketItem.price;

        if (isNaN(debtAmountPaid) || isNaN(debtQuantityAmountPaid)) {
            sendErrorMessage("Invalid input.");
            return;
        }

        if (debtAmountPaid <= 0 || debtQuantityAmountPaid <= 0) {
            sendErrorMessage("Cannot pay back less than or equal to 0 dollars");
            return;
        }

        onpayBackShortOrder(shortOrder.id, debtAmountPaid, debtQuantityAmountPaid);
    }

    const handleQuantityChange = (value: string) => {
        setOrderedPayBackQuantityAmount(value);

        const quantity = parseFloat(value);
        const marketItem = marketRef.current?.getMarketItem(shortOrder.stockName);

        if (marketItem == undefined) {
            setOrderedPayBackAmount("");
            sendErrorMessage("Stock does not exist!");
            return;
        }

        if (isNaN(quantity)) {
            setOrderedPayBackAmount("");
            sendErrorMessage("Invalid quantity, try a number");
            return;
        }

        setOrderedPayBackAmount((quantity * marketItem.price).toFixed(2));
    };

    const handleAmountChange = (value: string) => {
        setOrderedPayBackAmount(value);

        const amount = parseFloat(value);
        const marketItem = marketRef.current?.getMarketItem(shortOrder.stockName);

        if (marketItem == undefined) {
            setOrderedPayBackAmount("");
            sendErrorMessage("Stock does not exist!");
            return;
        }

        if (isNaN(amount)) {
            sendErrorMessage("Invalid amount, try a number");
            return;
        }

        setOrderedPayBackQuantityAmount((amount / marketItem.price).toFixed(2));
    };

    return (
        <>
            <p className="derivatives-explanation-title">Short order on {shortOrder.stockName}.</p>
            <p className="derivatives-explanation">You have shorted {shortOrder.stockName} for {formatMoney(shortOrder.shortAmount)} or for {shortOrder.shortQuantity} shares and must pay it back within {shortOrder.debtDuration} days.</p>
            <div className="derivatives-order-mode-quantities-input-container">
                <div className="derivatives-order-mode-individual-quantity-input-container">
                    <p className="derivatives-order-mode-individual-quantity-subtitle">Quantity</p>
                    <input type="number" className="derivatives-order-mode-individual-quantity-input" value={orderedPayBackQuantityAmount} onChange={(e) => handleQuantityChange(e.target.value)}></input>
                </div>
                <i className="derivatives-order-mode-quantities-middle-icon"></i>
                <div className="derivatives-order-mode-individual-quantity-input-container">
                    <p className="derivatives-order-mode-individual-quantity-subtitle">Amount</p>
                    <input type="number" className="derivatives-order-mode-individual-quantity-input" value={orderedPayBackAmount} onChange={(e) => handleAmountChange(e.target.value)}></input>
                </div>
            </div>
            <p className="derivatives-error-text">{orderErrorMessage}</p>
            <button className="derivatives-confirm-button" onClick={payBackShortOrder}>Pay Back</button>
            <button className="derivatives-cancel-button" onClick={onCancel}>Cancel.</button>
        </>
    )
}

interface ShortOrderNodeProps {
    onShort: (stockName: string, id: string, shortQuantity: number, shortPrice: number, debtDuration: number) => void;
    marketRef: RefObject<MarketNodeHandles>;
    portfolioRef: RefObject<PortfolioStockHandles>;
}

const ShortOrderNode = ({ onShort, marketRef }: ShortOrderNodeProps) => {

    const [orderedStockName, setOrderedStockName] = useState<string>("");
    const [orderedShortAmount, setOrderedShortAmount] = useState<string>("");
    const [orderedShortQuantityAmount, setOrderedShortQuantityAmount] = useState<string>("");
    const [debtDuration, setDebtDuration] = useState<number>(15);
    const [orderErrorMessage, setOrderErrorMessage] = useState<string>("");

    const sendErrorMessage = (message: string) => {
        setOrderErrorMessage(message);
        setTimeout(() => setOrderErrorMessage(""), 5000);
    }

    const enactShort = () => {
        const marketItem = marketRef.current?.getMarketItem(orderedStockName.trim());

        if (marketItem == undefined) {
            throw new Error("Market Item does not exist");
        }

        // Update UI prices to the latest ones in case the values were inputted before a update.
        handleQuantityChange(orderedShortQuantityAmount);

        const shortQuantity: number = Math.abs(parseFloat(orderedShortQuantityAmount));
        const shortAmount: number = shortQuantity * marketItem.price;
        const id: string = Math.random().toString();

        if (!Number.isFinite(shortAmount) || shortAmount <= 0) {
            sendErrorMessage("Please enter a valid short amount greater than 0.");
            return;
        }

        if (!Number.isFinite(shortQuantity) || shortQuantity <= 0) {
            sendErrorMessage("Please enter a valid short quantity greater than 0.");
            return;
        }
    
        onShort(orderedStockName, id, shortQuantity, shortAmount, debtDuration);
    }

    const handleQuantityChange = (value: string) => {
        setOrderedShortQuantityAmount(value);

        const quantity = parseFloat(value);
        const marketItem = marketRef.current?.getMarketItem(orderedStockName);
        
        if (marketItem) {
            setOrderedShortAmount((quantity * marketItem.price).toFixed(2));
        } else {
            setOrderedShortAmount("");
            sendErrorMessage("Stock does not exist!");
        }
    };

    const handleAmountChange = (value: string) => {
        setOrderedShortAmount(value);

        const amount = parseFloat(value);
        const marketItem = marketRef.current?.getMarketItem(orderedStockName);

        if (marketItem) {
            setOrderedShortQuantityAmount((amount / marketItem.price).toFixed(2));
        } else {
            setOrderedShortQuantityAmount("");
            sendErrorMessage("Stock does not exist!");
        }
    };

    useEffect(() => {
        const calculateShortDebtDuration = () => {
            const marketItem = marketRef.current?.getMarketItem(orderedStockName);
            const pricePerShare = marketItem ? marketItem.price : 50;
            const quantity = Math.abs(parseFloat(orderedShortQuantityAmount));
            const safeQuantity = Number.isFinite(quantity) ? quantity : 0;
            const positionValue = safeQuantity * pricePerShare;
            const baseDuration = 30;

            const duration = baseDuration - Math.floor(positionValue / 1000);
            setDebtDuration(Math.max(5, Math.min(duration, baseDuration)));
        };

        calculateShortDebtDuration();
    }, [marketRef, orderedShortQuantityAmount, orderedStockName])

    return (
        <>  
            <p className="derivatives-explanation-title">Short a stock.</p>
            <p className="derivatives-explanation">By shorting you are promising to sell the inputted amount of borrowed shares and you are automatically charged upon the deadline.</p>
            <div className="derivatives-mode-input-container">
                <p className="derivatives-mode-input-title">Stock Name:</p>
                <input type="text" id="order-name" className="derivatives-mode-input" value={orderedStockName} onChange={(e) => setOrderedStockName(e.target.value)}></input>
            </div>
            <div className="derivatives-order-mode-quantities-input-container">
                <div className="derivatives-order-mode-individual-quantity-input-container">
                    <p className="derivatives-order-mode-individual-quantity-subtitle">Quantity</p>
                    <input type="number" className="derivatives-order-mode-individual-quantity-input" value={orderedShortQuantityAmount} onChange={(e) => handleQuantityChange(e.target.value)}></input>
                </div>
                <i className="derivatives-order-mode-quantities-middle-icon"></i>
                <div className="derivatives-order-mode-individual-quantity-input-container">
                    <p className="derivatives-order-mode-individual-quantity-subtitle">Amount</p>
                    <input type="number" className="derivatives-order-mode-individual-quantity-input" value={orderedShortAmount} onChange={(e) => handleAmountChange(e.target.value)}></input>
                </div>
            </div>
            <p className="derivatives-explanation">You must pay this debt off within the next [{debtDuration}] days.</p>
            <p className="derivatives-error-text">{orderErrorMessage}</p>
            <button className="derivatives-confirm-button" onClick={enactShort}>Short Stock</button>
        </>
    )
}

export {
    ShortOrderNode,
    EnactedShortOrderNode,
    ShortOrderListingNode
}