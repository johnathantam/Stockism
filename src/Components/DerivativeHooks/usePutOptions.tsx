import { type RefObject, useCallback, useState } from "react";
import type { MarketPutOption } from "../../Interfaces/MarketDerivativeInterface";
import type { MarketNodeHandles } from "../../Interfaces/MarketStockInterface";
import type { PortfolioStockHandles } from "../../Interfaces/PortfolioStockInterface";
import type { EventNodeHandles } from "../../Interfaces/AnnounceEventInterface";
import { formatMoney } from "../../Utilities/PriceFormatter";

function usePutOptions(marketRef: RefObject<MarketNodeHandles>, portfolioRef: RefObject<PortfolioStockHandles>, eventChat: RefObject<EventNodeHandles>) {
    const [putOptionOrders, setPutOptionOrders] = useState<MarketPutOption[]>([]);
    const [enactedPutOrder, setEnactedPutOrder] = useState<MarketPutOption | undefined>();

    const purchasePutOption = useCallback((stockName: string, strikePrice: number, expirationDays: number, sharesPurchaseable: number, optionPrice: number, type: string) => {
        const newPutOption: MarketPutOption = {
            stockName,
            strikePrice,
            durationDays: expirationDays,
            sharesPurchaseable,
            price: optionPrice,
            type,
        };

        portfolioRef.current.purchaseMiscellanious(optionPrice);
        setPutOptionOrders(prev => [...prev, newPutOption]);

        eventChat.current.announceEvent({
            eventTitle: "Player Action.",
            eventDescription: `You have bought a put option for ${newPutOption.stockName} and for the ability to sell at ${formatMoney(newPutOption.strikePrice)}/share for the next ${newPutOption.durationDays} days at the price of ${formatMoney(newPutOption.price)}`,
            eventTitleColor: "rgba(255, 252, 104, 1)",
            eventDescriptionColor: "rgba(255, 252, 104, 1)",
            eventBorderColor: "rgba(233, 186, 1, 1)"
        });
    }, [portfolioRef, eventChat]);

    const enactPutOptionPurchase = useCallback((orderName: string, sharesSold: number, totalPrice: number) => {
        switch ((enactedPutOrder as MarketPutOption).type) {
            case "Stock":
                marketRef.current.sellStock(orderName, sharesSold);
                portfolioRef.current.sellStock(orderName, sharesSold, totalPrice);
                break;
            case "Index Fund":
                marketRef.current.sellIndexFund(orderName, sharesSold);
                portfolioRef.current.sellIndexFund(orderName, sharesSold, totalPrice);
                break;
            default:
                break;
        }

        const putOptionIndex = putOptionOrders.findIndex(o => o.stockName === orderName);
        if (putOptionIndex !== -1) {
            const updatedPutOptions = [...putOptionOrders];
            const option = { ...updatedPutOptions[putOptionIndex] };

            option.sharesPurchaseable -= sharesSold;

            if (option.sharesPurchaseable <= 0) {
                updatedPutOptions.splice(putOptionIndex, 1);
                setEnactedPutOrder(undefined);
            } else {
                updatedPutOptions[putOptionIndex] = option;
                setEnactedPutOrder(option);
            }

            setPutOptionOrders(updatedPutOptions);
        } else {
            setEnactedPutOrder(undefined);
        }

        eventChat.current.announceEvent({
            eventTitle: "Player Action.",
            eventDescription: `You have enacted a put option for ${orderName} and sold ${sharesSold} shares for ${formatMoney(totalPrice)} at a market price of ${sharesSold * (marketRef.current.getMarketItem(orderName)?.price as number)}`,
            eventTitleColor: "rgba(255, 252, 104, 1)",
            eventDescriptionColor: "rgba(255, 252, 104, 1)",
            eventBorderColor: "rgba(233, 186, 1, 1)"
        });
    }, [putOptionOrders, marketRef, portfolioRef, enactedPutOrder, eventChat]);

    const passDayPutOptions = useCallback(() => {
        setPutOptionOrders(prevPutOptionOrders =>
            prevPutOptionOrders
                .map(option => ({...option, durationDays: option.durationDays - 1}))
                .filter(option => option.durationDays === undefined || option.durationDays > 0)
        );
    }, []);

    return {
        putOptionOrders,
        setPutOptionOrders,

        enactedPutOrder,
        setEnactedPutOrder,

        purchasePutOption,
        enactPutOptionPurchase,

        passDayPutOptions
    };
}

export { usePutOptions };