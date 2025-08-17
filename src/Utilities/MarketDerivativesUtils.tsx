import type { MarketStockInterface } from "../Interfaces/MarketStockInterface";

const calculateCallOptionPrice = (marketStock: MarketStockInterface, strikePrice: number, expirationDays: number, sharesPurchaseable: number): number => {
    const { price: currentPrice, riskRating, trend } = marketStock;

    const timeFactor = Math.sqrt(expirationDays / 365); // longer expiration increases value
    const intrinsicValue = Math.max(currentPrice - strikePrice, 0); // for call option
    const riskMultiplier = 1 + (riskRating / 10); // more risky = more expensive option
    const trendMultiplier = 1 + (trend / 100); // upward trend increases value

    const baseVolatilityPremium = 0.1 * currentPrice * timeFactor; // premium for time & volatility

    const optionPricePerShare = (intrinsicValue + baseVolatilityPremium) * riskMultiplier * trendMultiplier;
    const totalPrice = optionPricePerShare * sharesPurchaseable;

    return parseFloat(totalPrice.toFixed(2));
}

const calculatePutOptionPrice = (marketStock: MarketStockInterface, strikePrice: number, expirationDays: number, sharesPurchaseable: number) => {
    const { price: currentPrice, riskRating, trend } = marketStock;

    const timeFactor = Math.sqrt(expirationDays / 365);
    const intrinsicValue = Math.max(strikePrice - currentPrice, 0);
    const riskMultiplier = 1 + (riskRating / 10);
    const trendMultiplier = 1 + (trend / 100);
    const baseVolatilityPremium = 0.1 * currentPrice * timeFactor;

    const optionPricePerShare = (intrinsicValue + baseVolatilityPremium) * riskMultiplier * trendMultiplier;
    const totalPrice = optionPricePerShare * sharesPurchaseable;

    return parseFloat(totalPrice.toFixed(2));
}

const calculateShortOrderPrice = (marketStock: MarketStockInterface, quantityToSell: number): number => {
    return parseFloat((marketStock.price * quantityToSell).toFixed(2));
}

export {
    calculateCallOptionPrice,
    calculatePutOptionPrice,
    calculateShortOrderPrice
}