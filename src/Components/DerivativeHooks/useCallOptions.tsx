import { useState, useCallback, type RefObject } from "react";
import type { MarketNodeHandles } from "../../Interfaces/MarketStockInterface";
import type { PortfolioStockHandles } from "../../Interfaces/PortfolioStockInterface";
import type { MarketCallOption } from "../../Interfaces/MarketDerivativeInterface";
import { formatMoney } from "../../Utilities/PriceFormatter";
import type { EventNodeHandles } from "../../Interfaces/AnnounceEventInterface";

function useCallOptions(marketRef: RefObject<MarketNodeHandles>, portfolioRef: RefObject<PortfolioStockHandles>, eventChat: RefObject<EventNodeHandles>) {
    const [callOptionOrders, setCallOptionOrders] = useState<MarketCallOption[]>([]);
    const [enactedCallOrder, setEnactedCallOrder] = useState<MarketCallOption | undefined>();

    const purchaseCallOption = useCallback((stockName: string, strikePrice: number, expirationDays: number, sharesPurchaseable: number, optionPrice: number, type: string) => {
        const newCallOption: MarketCallOption = { 
            stockName,
            strikePrice,
            durationDays: expirationDays,
            sharesPurchaseable,
            price: optionPrice,
            type,
        };

        portfolioRef.current.purchaseMiscellanious(optionPrice);
        setCallOptionOrders(prev => [...prev, newCallOption]);

        eventChat.current.announceEvent({
            eventTitle: "Player Action.",
            eventDescription: `You have bought a call option for ${newCallOption.stockName} and for the ability to buy at ${formatMoney(newCallOption.strikePrice)}/share for the next ${newCallOption.durationDays} days at the price of ${formatMoney(newCallOption.price)}!`,
            eventTitleColor: "rgba(87, 179, 255, 1)",
            eventDescriptionColor: "rgba(87, 179, 255, 1)",
            eventBorderColor: "rgba(87, 179, 255, 1)"
        });
    }, [portfolioRef, eventChat]);

    const enactCallOptionPurchase = useCallback((orderName: string, sharesPurchased: number, totalPrice: number) => {
        switch ((enactedCallOrder as MarketCallOption).type) {
            case "Stock":
                marketRef.current.purchaseStock(orderName, sharesPurchased);
                portfolioRef.current.purchaseStock(orderName, sharesPurchased, totalPrice);
                break;
            case "Index Fund":
                marketRef.current.purchaseIndexFund(orderName, sharesPurchased);
                portfolioRef.current.purchaseIndexFund(orderName, sharesPurchased, totalPrice);
                break;
            default:
                break;
        }

        const callOptionIndex = callOptionOrders.findIndex(o => o.stockName === orderName);
        if (callOptionIndex !== -1) {
            const updatedCallOptions = [...callOptionOrders];
            const option = { ...updatedCallOptions[callOptionIndex] };
            option.sharesPurchaseable -= sharesPurchased;

            if (option.sharesPurchaseable <= 0) {
                updatedCallOptions.splice(callOptionIndex, 1);
                setEnactedCallOrder(undefined);
            } else {
                updatedCallOptions[callOptionIndex] = option;
                setEnactedCallOrder(option);
            }

            setCallOptionOrders(updatedCallOptions);
        } else {
            setEnactedCallOrder(undefined);
        }

        eventChat.current.announceEvent({
            eventTitle: "Player Action.",
            eventDescription: `You have enacted a call option for ${orderName} and bought ${sharesPurchased} shares for ${formatMoney(totalPrice)} at a market price of ${formatMoney(sharesPurchased * (marketRef.current.getMarketItem(orderName)?.price as number))}`,
            eventTitleColor: "rgba(87, 179, 255, 1)",
            eventDescriptionColor: "rgba(87, 179, 255, 1)",
            eventBorderColor: "rgba(87, 179, 255, 1)"
        });
  }, [callOptionOrders, marketRef, portfolioRef, enactedCallOrder, eventChat]);

  const passDayCallOptions = useCallback(() => {
    setCallOptionOrders(prevCallOptionOrders => {
        const updatedOrders: MarketCallOption[] = prevCallOptionOrders
            .map(option => ({...option, durationDays: option.durationDays - 1}))
            .filter(option => option.durationDays === undefined || option.durationDays > 0)
        
        if (enactedCallOrder) {
            const updatedEnacted = updatedOrders.find(o => o.stockName === enactedCallOrder.stockName);
            setEnactedCallOrder(updatedEnacted);
        }

        return updatedOrders
    });
  }, [enactedCallOrder]);

  return {
    callOptionOrders,
    setCallOptionOrders,

    enactedCallOrder,
    setEnactedCallOrder,

    purchaseCallOption,
    enactCallOptionPurchase,

    passDayCallOptions
  };
}

export { useCallOptions }