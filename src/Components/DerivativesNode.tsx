import { forwardRef, useState, type RefObject, useImperativeHandle } from "react";
import type { MarketNodeHandles } from "../Interfaces/MarketStockInterface";
import type { EventNodeHandles } from "../Interfaces/AnnounceEventInterface";
import type { PortfolioStockHandles } from "../Interfaces/PortfolioStockInterface";
import { type MarketShortOrder, type MarketCallOption, type MarketPutOption } from "../Interfaces/MarketDerivativeInterface";
import type { DerivativeNodeHandles, MarketLoanOrder } from "../Interfaces/MarketDerivativeInterface";
import { CallOptionOrderNode, EnactedCallOptionOrderNode, CallOrderListingNode } from "./IndividualDerivativeNodes/CallOptionsOrderNode";
import { PutOptionOrderNode, EnactedPutOptionOrderNode, PutOrderListing } from "./IndividualDerivativeNodes/PutOptionsOrderNode";
import { EnactedShortOrderNode, ShortOrderNode, ShortOrderListingNode } from "./IndividualDerivativeNodes/ShortOrderNode";
import { LoanOrderNode, EnactedLoanOrderNode, LoanOrderListing } from "./IndividualDerivativeNodes/LoanOrderNode";
import { EmptyDerivativeListingNode } from "./IndividualDerivativeNodes/EmptyDerivativeOrderNode";
import { useCallOptions } from "./DerivativeHooks/useCallOptions";
import { usePutOptions } from "./DerivativeHooks/usePutOptions";
import { useShortOrders } from "./DerivativeHooks/useShortOrders";
import { useLoanOrders } from "./DerivativeHooks/useLoanOrders";
import "./DerivativesNode.css";

const DERIVATIVE_CONTENT = {
    "Call Options": {
        explanation: "A call option is a contract that gives you the right (but not the obligation) to buy a stock (or other asset) at a specific price, called the strike price, before or on a certain date (expiration).",
    },
    "Put Options": {
        explanation: "A put option gives you the right (but not the obligation) to sell a stock (or other asset) at a specific price, within a specified time frame. It's often used to hedge against a decline in the asset's value.",
    },
    "Short Orders": {
        explanation: "A short order (or short selling) is a trading strategy where you borrow a stock and sell it with the intention of buying it back later at a lower price. It's used to profit from a decline in the stock’s value, but carries the risk of unlimited losses if the price rises instead.",
    },
    "Loans": {
        explanation: "Margin trading allows you to borrow money from your broker to buy more stock than you could with your own cash alone. It increases your buying power, but also magnifies both potential gains and losses. If the value of your account falls too low, you may face a margin call and be required to deposit more funds or sell assets to cover the loan.",
    }
};

interface DerivativesNodeProps {
    marketRef: RefObject<MarketNodeHandles>;
    portfolioRef: RefObject<PortfolioStockHandles>;
    eventChat: RefObject<EventNodeHandles>;
}

const DerivativesNode = forwardRef<DerivativeNodeHandles, DerivativesNodeProps>((props, ref) => {

    const [buyMode, setBuyMode] = useState<string>("Call Options");
    const [buyModeExplanation, setBuyModeExplanation] = useState<string>(DERIVATIVE_CONTENT["Call Options"].explanation);

    const {callOptionOrders,  enactedCallOrder, setEnactedCallOrder, purchaseCallOption, enactCallOptionPurchase, passDayCallOptions} = useCallOptions(props.marketRef, props.portfolioRef, props.eventChat);
    const {putOptionOrders,  enactedPutOrder, setEnactedPutOrder, purchasePutOption, enactPutOptionPurchase, passDayPutOptions} = usePutOptions(props.marketRef, props.portfolioRef, props.eventChat);
    const {shortOrders,  enactedShortOrder, setEnactedShortOrder, shortMarketAsset, enactShortDebt, passDayShortOrders} = useShortOrders(props.marketRef, props.portfolioRef, props.eventChat);
    const {loanOrders, enactedLoanOrder, setEnactedLoanOrder, loanAsset, enactLoanDebt, passDayLoanOrders} = useLoanOrders(props.portfolioRef, props.eventChat);

    useImperativeHandle(ref, () => ({
        getCallOption(name) {
            return callOptionOrders.find((callOption: MarketCallOption) => callOption.stockName == name);
        },
        getCallOptions() {
            return callOptionOrders;
        },
        passDay() {
            passDayCallOptions();
            passDayPutOptions();
            passDayShortOrders();
            passDayLoanOrders();
        },
        passDays(daysPassed: number) {
            for (let i = 0; i < daysPassed; i++) {
                passDayCallOptions();
                passDayPutOptions();
                passDayShortOrders();
                passDayLoanOrders();
            }
        }
    }))

    const switchBuyMode = (newBuyMode: "Call Options" | "Put Options" | "Short Orders" | "Loans") => {
        setBuyMode(newBuyMode);
        setBuyModeExplanation(DERIVATIVE_CONTENT[newBuyMode].explanation)
    }

    const cleanEnactedOrders = () => {
        setEnactedCallOrder(undefined);
        setEnactedPutOrder(undefined);
        setEnactedShortOrder(undefined);
        setEnactedLoanOrder(undefined);
    }

    return (
        <>
            <div className="derivatives-node-container">
                <div className="derivatives-header-container">
                    <p className="derivatives-node-title">Derivatives</p>
                    <div className="derivatives-mode-control-container">
                        <button className="derivatives-mode-control-button" style={{ backgroundColor: (buyMode == "Call Options") ? "" : "transparent" }} onClick={() =>  switchBuyMode("Call Options")}>Call Options</button>
                        <button className="derivatives-mode-control-button" style={{ backgroundColor: (buyMode == "Put Options") ? "" : "transparent" }} onClick={() => switchBuyMode("Put Options")}>Put Options</button>
                        <button className="derivatives-mode-control-button" style={{ backgroundColor: (buyMode == "Short Orders") ? "" : "transparent" }} onClick={() => switchBuyMode("Short Orders")}>Shorts</button>
                        <button className="derivatives-mode-control-button" style={{ backgroundColor: (buyMode == "Loans") ? "" : "transparent" }} onClick={() => switchBuyMode("Loans")}>Loans</button>
                    </div>
                </div>
                <div className="derivatives-order-container">
                    <div className="derivatives-left-half-container">
                        {
                            (enactedCallOrder || enactedPutOrder || enactedShortOrder || enactedLoanOrder) ? (
                                <>
                                    {enactedCallOrder ? <EnactedCallOptionOrderNode onPurchase={enactCallOptionPurchase} onCancel={() => cleanEnactedOrders()} marketRef={props.marketRef} portfolioRef={props.portfolioRef} callOption={enactedCallOrder}></EnactedCallOptionOrderNode> : null}
                                    {enactedPutOrder ? <EnactedPutOptionOrderNode onPurchase={enactPutOptionPurchase} onCancel={() => cleanEnactedOrders()} marketRef={props.marketRef} portfolioRef={props.portfolioRef} putOption={enactedPutOrder}></EnactedPutOptionOrderNode> : null}
                                    {enactedShortOrder ? <EnactedShortOrderNode onpayBackShortOrder={enactShortDebt} onCancel={() => cleanEnactedOrders()} marketRef={props.marketRef} portfolioRef={props.portfolioRef} shortOrder={enactedShortOrder}></EnactedShortOrderNode> : null}
                                    {enactedLoanOrder ? <EnactedLoanOrderNode onPayBackLoanOrder={enactLoanDebt} onCancel={() => cleanEnactedOrders()} loanOrder={enactedLoanOrder}></EnactedLoanOrderNode> : null}
                                </>
                            ) : (
                                <>
                                    {(buyMode == "Call Options") ? <CallOptionOrderNode onPurchase={purchaseCallOption} marketRef={props.marketRef} portfolioRef={props.portfolioRef}></CallOptionOrderNode> : null}
                                    {(buyMode == "Put Options") ? <PutOptionOrderNode onPurchase={purchasePutOption} marketRef={props.marketRef} portfolioRef={props.portfolioRef}></PutOptionOrderNode> : null}
                                    {(buyMode == "Short Orders") ? <ShortOrderNode onShort={shortMarketAsset} marketRef={props.marketRef} portfolioRef={props.portfolioRef}></ShortOrderNode> : null}
                                    {(buyMode == "Loans") ? <LoanOrderNode onLoan={loanAsset}></LoanOrderNode> : null}
                                </>
                            )
                        }
                    </div>
                    <div className="derivatives-right-half-container">
                        <p className="derivatives-explanation-title">What are {buyMode}?</p>
                        <p className="derivatives-explanation">{buyModeExplanation}</p>
                        <p className="derivative-active-orders-title">Your Active Orders</p>
                        
                        {
                            (buyMode === "Call Options") ? (() => {
                                const callOrders = callOptionOrders.map((callOption: MarketCallOption) => {
                                    const marketItem = props.marketRef.current.getMarketItem(callOption.stockName);
                                    if (!marketItem) 
                                        return null;
                                    return <CallOrderListingNode callOption={callOption} marketItem={marketItem} onClick={() => {cleanEnactedOrders(); setEnactedCallOrder(callOption)}}></CallOrderListingNode>
                                })

                                if (callOrders.length > 0)
                                    return callOrders;

                                return <EmptyDerivativeListingNode title="You have no ongoing call orders" description="Buy a call order and click here to enact it."></EmptyDerivativeListingNode>
                            })() : null
                        }

                        {
                            (buyMode === "Put Options") ? (() => {
                                const putOrders = putOptionOrders.map((putOption: MarketPutOption) => {
                                    const marketItem = props.marketRef.current.getMarketItem(putOption.stockName);
                                    if (!marketItem) 
                                        return null;
                                    return <PutOrderListing putOption={putOption} marketItem={marketItem} onClick={() => {cleanEnactedOrders(); setEnactedPutOrder(putOption)}}></PutOrderListing>
                                })

                                if (putOrders.length > 0)
                                    return putOrders;

                                return <EmptyDerivativeListingNode title="You have no ongoing put orders" description="Buy a put order and click here to enact it."></EmptyDerivativeListingNode>
                            })() : null
                        }

                        {
                            (buyMode === "Short Orders") ? (() => {
                                const shorts = shortOrders.map((shortOrder: MarketShortOrder) => {
                                    const marketItem = props.marketRef.current.getMarketItem(shortOrder.stockName);
                                    if (!marketItem) 
                                        return null;
                                    return <ShortOrderListingNode shortOrder={shortOrder} marketItem={marketItem} onClick={() => {cleanEnactedOrders(); setEnactedShortOrder(shortOrder)}}></ShortOrderListingNode>
                                })

                                if (shorts.length > 0)
                                    return shorts;

                                return <EmptyDerivativeListingNode title="You have no ongoing shorts" description="Buy a short order and click here to enact it."></EmptyDerivativeListingNode>
                            })() : null
                        }

                        {
                            (buyMode === "Loans") ? (() => {
                                const loans = loanOrders.map((loanOrder: MarketLoanOrder) => {
                                    return <LoanOrderListing loanOrder={loanOrder} onClick={() => {cleanEnactedOrders(); setEnactedLoanOrder(loanOrder)}}></LoanOrderListing>
                                })

                                if (loans.length > 0)
                                    return loans;

                                return <EmptyDerivativeListingNode title="You have no ongoing loans" description="Take out a loan and click here to enact it."></EmptyDerivativeListingNode>
                            })() : null
                        }
                    </div>
                </div>
            </div>
        </>
    )
})

export { DerivativesNode }