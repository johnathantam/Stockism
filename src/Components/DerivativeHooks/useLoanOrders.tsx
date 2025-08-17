import { useState, useCallback, type RefObject } from "react";
import type { PortfolioStockHandles } from "../../Interfaces/PortfolioStockInterface";
import type { MarketLoanOrder } from "../../Interfaces/MarketDerivativeInterface";
import type { EventNodeHandles } from "../../Interfaces/AnnounceEventInterface";
import { formatMoney } from "../../Utilities/PriceFormatter";

function useLoanOrders(portfolioRef: RefObject<PortfolioStockHandles>, eventChat: RefObject<EventNodeHandles>) {
    const [loanOrders, setLoanOrders] = useState<MarketLoanOrder[]>([]);
    const [enactedLoanOrder, setEnactedLoanOrder] = useState<MarketLoanOrder | undefined>();

    const loanAsset = useCallback((loanAmount: number, interestRate: number, debt: number, debtDuration: number, id: string) => {
        const newLoan: MarketLoanOrder = {
            loanAmount,
            interestRate,
            debt,
            debtDuration,
            id,
        };

        portfolioRef.current.earnMiscellanious(loanAmount);
        setLoanOrders(prev => [...prev, newLoan]);

        eventChat.current.announceEvent({
            eventTitle: "Player Action.",
            eventDescription: `You have taken out a new loan for ${formatMoney(newLoan.loanAmount)} for a interest rate of %${newLoan.interestRate.toFixed(2)} or at a total amount of ${formatMoney(newLoan.debt)} within the next ${newLoan.debtDuration} days`,
            eventTitleColor: "rgba(87, 255, 193, 1)",
            eventDescriptionColor: "rgba(87, 255, 193, 1)",
            eventBorderColor: "rgba(87, 255, 193, 1)"
        });
    }, [portfolioRef, eventChat]);

    const enactLoanDebt = useCallback((loanOrderId: string, debtAmountPaid: number) => {
        const loanIndex = loanOrders.findIndex(loan => loan.id === loanOrderId);
        if (loanIndex === -1) {
            setEnactedLoanOrder(undefined);
            return;
        }

        const updatedLoanOrders = [...loanOrders];
        const loan = { ...updatedLoanOrders[loanIndex] };
        const debtPaid = Math.min(loan.debt, debtAmountPaid);

        loan.debt -= debtPaid;
        portfolioRef.current.purchaseMiscellanious(debtPaid);

        if (loan.debt <= 0) {
            updatedLoanOrders.splice(loanIndex, 1);
            setEnactedLoanOrder(undefined);
        } else {
            updatedLoanOrders[loanIndex] = loan;
            setEnactedLoanOrder(loan);
        }

        setLoanOrders(updatedLoanOrders);

        eventChat.current.announceEvent({
            eventTitle: "Player Action.",
            eventDescription: `You have paid back ${formatMoney(debtPaid)} to the loan with the id ${loan.id} with a ongoing debt of ${loan.debt}`,
            eventTitleColor: "rgba(87, 255, 193, 1)",
            eventDescriptionColor: "rgba(87, 255, 193, 1)",
            eventBorderColor: "rgba(87, 255, 193, 1)"
        });
    }, [loanOrders, portfolioRef, eventChat]);

    const passDayLoanOrders = useCallback(() => {
        setLoanOrders(prevLoanOrders => {
                const updatedLoanOrders: MarketLoanOrder[] = prevLoanOrders
                    .map(order => ({
                        ...order,
                        debtDuration: order.debtDuration - 1
                    }))
                    .filter(order => {
                        if (order.debtDuration <= 0) {
                            // Repay remaining short debt when duration expires
                            if (order.loanAmount > 0) {
                                portfolioRef.current.purchaseMiscellanious(order.debt);
                                eventChat.current.announceEvent({
                                    eventTitle: "Derivatives Action.",
                                    eventDescription: `A unpaid loan debt was automatically billed at your liquid balance for a value of ${formatMoney(order.debt)}`,
                                    eventTitleColor: "rgba(255, 70, 70, 1)",
                                    eventDescriptionColor: "rgba(255, 70, 70, 1)",
                                    eventBorderColor: "rgba(255, 70, 70, 1)"
                                });
                            }
                            return false; // remove this short order
                        }
                        return true;
                    })

                if (enactedLoanOrder) {
                    const updatedEnacted = updatedLoanOrders.find(o => o.id === enactedLoanOrder.id);
                    setEnactedLoanOrder(updatedEnacted);
                }
                
                return updatedLoanOrders;
            }
        );
    }, [portfolioRef, enactedLoanOrder, eventChat]);

    return {
        loanOrders,
        setLoanOrders,

        enactedLoanOrder,
        setEnactedLoanOrder,

        loanAsset,
        enactLoanDebt,

        passDayLoanOrders
    };
}

export { useLoanOrders };