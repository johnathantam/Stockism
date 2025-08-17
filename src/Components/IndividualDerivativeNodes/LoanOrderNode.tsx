/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import type { MarketLoanOrder } from "../../Interfaces/MarketDerivativeInterface";
import { formatMoney } from "../../Utilities/PriceFormatter";

interface LoanOrderListingNodeProps {
    loanOrder: MarketLoanOrder;
    onClick: () => void;
}

const LoanOrderListing = ({ loanOrder, onClick }: LoanOrderListingNodeProps) => {
    return (
        <div className="derivative-order-container" onClick={onClick}>
            <div className="derivative-order-stat-row">
                <p className="derivative-order-stat-type">
                    Loan Order for {formatMoney(loanOrder.loanAmount)}
                </p>
            </div>
            <div className="derivative-order-stat-row">
                <p className="derivative-order-stat-explanation">
                    You have withdrawn a loan for {formatMoney(loanOrder.loanAmount)} and must pay it off with an interest rate of +%{loanOrder.interestRate.toFixed(2)} or for {formatMoney(loanOrder.loanAmount)} within the next {loanOrder.debtDuration} days.
                </p>
            </div>
        </div>
    );
};

interface EnactedLoanOrderNodeProps {
    onPayBackLoanOrder: (loanOrderId: string, debtAmountPaid: number) => void;
    onCancel: () => void;
    loanOrder: MarketLoanOrder;
}

const EnactedLoanOrderNode = ({ onCancel, onPayBackLoanOrder, loanOrder }: EnactedLoanOrderNodeProps) => {
    const [orderedPayBackAmount, setOrderedPayBackAmount] = useState<string>("");
    const [orderErrorMessage, setOrderErrorMessage] = useState<string>("");

    const sendErrorMessage = (message: string) => {
        setOrderErrorMessage(message);
        setTimeout(() => setOrderErrorMessage(""), 5000);
    };

    const payBackLoanOrder = () => {
        const amount = Math.abs(parseFloat(orderedPayBackAmount));
        if (amount <= 0) {
            sendErrorMessage("Enter a valid payback amount.");
            return;
        }

        onPayBackLoanOrder(loanOrder.id, amount);
    };

    return (
        <>
            <p className="derivatives-explanation-title">Loan order of {formatMoney(loanOrder.loanAmount)}</p>
            <p className="derivatives-explanation">
                You have taken out a loan of {formatMoney(loanOrder.loanAmount)} at an interest rate of {loanOrder.interestRate.toFixed(2)} or a debt of {formatMoney(loanOrder.debt)} and must pay it off within the next {loanOrder.debtDuration} days.
            </p>
            <div className="derivatives-mode-input-container">
                <p className="derivatives-mode-input-title">Amount:</p>
                <input
                    type="number"
                    className="derivatives-mode-input"
                    value={orderedPayBackAmount}
                    onChange={(e) => setOrderedPayBackAmount(e.target.value)}
                />
            </div>
            <p className="derivatives-error-text">{orderErrorMessage}</p>
            <button className="derivatives-confirm-button" onClick={payBackLoanOrder}>
                Pay Back
            </button>
            <button className="derivatives-cancel-button" onClick={onCancel}>
                Cancel
            </button>
        </>
    );
};

interface LoanOrderNodeProps {
    onLoan: (loanAmount: number, interestRate: number, debt: number, debtDuration: number, id: string) => void;
}

const LoanOrderNode = ({ onLoan }: LoanOrderNodeProps) => {
    const [orderedLoanAmount, setOrderedLoanAmount] = useState<string>("");
    const [debtDuration, setDebtDuration] = useState<number>(15);
    const [interestRate, setInterestRate] = useState<number>(0.05); // 5% interest
    const [totalPayback, setTotalPayback] = useState<number>(0);
    const [orderErrorMessage, setOrderErrorMessage] = useState<string>("");

    const sendErrorMessage = (message: string) => {
        setOrderErrorMessage(message);
        setTimeout(() => setOrderErrorMessage(""), 5000);
    };

    const calculateInterestRate = (amount: number, durationDays: number) => {
        const baseRate = 0.02; // 2% minimum
        const amountFactor = Math.min(amount / 10000, 0.1); // +1% per $1k, max +10%
        const durationFactor = Math.min((durationDays / 30) * 0.01, 0.05); // +1% per 30 days, max +5%
        return baseRate + amountFactor + durationFactor;
    };

    const calculateInterest = (amount: number, rate: number) => amount * rate;

    const calculateTotalPayback = (amount: number, rate: number) => amount + calculateInterest(amount, rate);

    const calculateDebtDuration = (amount: number) => Math.min(Math.max(Math.ceil(amount / 500), 5), 60);

    const enactLoan = () => {
        const amount = Math.abs(parseFloat(orderedLoanAmount));
        if (isNaN(amount) || amount <= 0) {
            sendErrorMessage("Enter a valid loan amount.");
            return;
        }
        onLoan(amount, interestRate, totalPayback, debtDuration, Math.random().toString());
    };

    useEffect(() => {
        const amount = Math.abs(parseFloat(orderedLoanAmount));

        if (isNaN(amount) || amount > 0) {
            const newDuration = calculateDebtDuration(amount);
            const newInterestRate = calculateInterestRate(amount, newDuration);
            const newTotalPayback = calculateTotalPayback(amount, newInterestRate);
            setDebtDuration(newDuration);
            setInterestRate(newInterestRate);
            setTotalPayback(newTotalPayback);
        } else {
            setDebtDuration(0);
            setInterestRate(0);
            setTotalPayback(0);
        }
    }, [orderedLoanAmount]);

    return (
        <>
            <p className="derivatives-explanation-title">Take out a loan.</p>
            <p className="derivatives-explanation">
                You can take out a loan in the promise that you will pay back the loan plus interest within a certain date.
            </p>
            <div className="derivatives-mode-input-container">
                <p className="derivatives-mode-input-title">Loan Amount:</p>
                <input
                    type="number"
                    className="derivatives-mode-input"
                    value={orderedLoanAmount}
                    onChange={(e) => setOrderedLoanAmount(e.target.value)}
                />
            </div>
            <p className="derivatives-explanation">
                You must pay this loan with an interest of %{interestRate.toFixed(2)} or at a total of {formatMoney(totalPayback)} within the next {debtDuration} days.
            </p>
            <p className="derivatives-error-text">{orderErrorMessage}</p>
            <button className="derivatives-confirm-button" onClick={enactLoan}>
                Take Out Loan
            </button>
        </>
    );
};

export { LoanOrderNode, EnactedLoanOrderNode, LoanOrderListing };