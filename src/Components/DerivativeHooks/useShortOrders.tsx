import { type RefObject, useState, useCallback } from "react";
import type { MarketShortOrder } from "../../Interfaces/MarketDerivativeInterface";
import type { PortfolioStockHandles } from "../../Interfaces/PortfolioStockInterface";
import type { MarketNodeHandles, MarketStockInterface } from "../../Interfaces/MarketStockInterface";
import type { EventNodeHandles } from "../../Interfaces/AnnounceEventInterface";
import { formatMoney } from "../../Utilities/PriceFormatter";

function useShortOrders( marketRef: RefObject<MarketNodeHandles>, portfolioRef: RefObject<PortfolioStockHandles>, eventChat: RefObject<EventNodeHandles>) {
  const [shortOrders, setShortOrders] = useState<MarketShortOrder[]>([]);
  const [enactedShortOrder, setEnactedShortOrder] = useState<MarketShortOrder | undefined>();

    const shortMarketAsset = useCallback((stockName: string, id: string, shortQuantity: number, shortPrice: number, debtDuration: number) => {
        const newShort: MarketShortOrder = {
            stockName,
            shortQuantity,
            shortAmount: shortPrice,
            debtDuration,
            id,
        };

        portfolioRef.current.earnMiscellanious(shortPrice);
        setShortOrders(prev => [...prev, newShort]);

        eventChat.current.announceEvent({
            eventTitle: "Player Action.",
            eventDescription: `You have shorted ${newShort.stockName} for ${formatMoney(newShort.shortAmount)} or in other words, you sold ${newShort.shortQuantity} borrowed shares and you must buy the stock back in the next ${newShort.debtDuration} days!`,
            eventTitleColor: "rgba(255, 94, 134, 1)",
            eventDescriptionColor: "rgba(255, 94, 134, 1)",
            eventBorderColor: "rgba(255, 94, 134, 1)"
        });
    }, [portfolioRef, eventChat]);

    const enactShortDebt = useCallback((shortOrderId: string, debtAmountPaid: number, debtQuantityAmountPaid: number) => {
        const shortOrderIndex = shortOrders.findIndex(short => short.id === shortOrderId);
        if (shortOrderIndex === -1) {
            setEnactedShortOrder(undefined);
            return;
        }

        const updatedShortOrders = [...shortOrders];
        const shortOrder = { ...updatedShortOrders[shortOrderIndex] };
        const shortedMarketItem = marketRef.current.getMarketItem(shortOrder.stockName);

        if (shortedMarketItem == undefined) {
            setEnactedShortOrder(undefined);
            return;
        }

        const debtPaid = Math.min(shortOrder.shortQuantity * shortedMarketItem.price, debtAmountPaid);
        const debtPaidQuantity = Math.min(debtQuantityAmountPaid, shortOrder.shortQuantity);

        shortOrder.shortQuantity -= debtPaidQuantity;
        portfolioRef.current.purchaseMiscellanious(debtPaid);

        if (shortOrder.shortQuantity <= 0) {
            updatedShortOrders.splice(shortOrderIndex, 1);
            setEnactedShortOrder(undefined);
        } else {
            updatedShortOrders[shortOrderIndex] = shortOrder;
            setEnactedShortOrder(shortOrder);
        }

        setShortOrders(updatedShortOrders);

        eventChat.current.announceEvent({
            eventTitle: "Player Action.",
            eventDescription: `You have paid back ${formatMoney(debtPaid)} to the short with the id ${shortOrder.id} and have a ongoing debt of ${formatMoney(shortOrder.shortQuantity * shortedMarketItem.price)} or ${shortOrder.shortQuantity} shares.`,
            eventTitleColor: "rgba(255, 94, 134, 1)",
            eventDescriptionColor: "rgba(255, 94, 134, 1)",
            eventBorderColor: "rgba(255, 94, 134, 1)"
        });
    }, [shortOrders, portfolioRef, eventChat, marketRef]);
    
    const passDayShortOrders = useCallback(() => {
        setShortOrders(prevShortOrders => {
                const updatedShortOrders: MarketShortOrder[] = prevShortOrders
                    .map(order => ({
                        ...order,
                        debtDuration: order.debtDuration - 1
                    }))
                    .filter(order => {
                        if (order.shortAmount > 0 && order.debtDuration <= 0) {
                            const marketItem: MarketStockInterface | undefined = marketRef.current.getMarketItem(order.stockName);
                            if (marketItem == undefined)
                                return;
                            portfolioRef.current.purchaseMiscellanious(order.shortQuantity * marketItem.price);

                            eventChat.current.announceEvent({
                                eventTitle: "Derivatives Action.",
                                eventDescription: `A unpaid short debt was automatically billed at your liquid balance for a value of ${formatMoney(order.shortAmount)}`,
                                eventTitleColor: "rgba(255, 70, 70, 1)",
                                eventDescriptionColor: "rgba(255, 70, 70, 1)",
                                eventBorderColor: "rgba(255, 70, 70, 1)"
                            });
                        }
                        return true;
                    })

                if (enactedShortOrder) {
                    const updatedEnacted = updatedShortOrders.find(o => o.id=== enactedShortOrder.id);
                    setEnactedShortOrder(updatedEnacted);
                }

                return updatedShortOrders
            }
        );
    }, [marketRef, portfolioRef, enactedShortOrder, eventChat]);

    return {
        shortOrders,
        setShortOrders,

        enactedShortOrder,
        setEnactedShortOrder,

        shortMarketAsset,
        enactShortDebt,

        passDayShortOrders
    };
}

export { useShortOrders };