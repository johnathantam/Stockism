export interface MarketCallOption {
    stockName: string;
    strikePrice: number;
    durationDays: number;
    price: number;
    sharesPurchaseable: number;
    type: string;
}

export interface MarketPutOption {
    stockName: string;
    strikePrice: number;
    durationDays: number;
    price: number;
    sharesPurchaseable: number;
    type: string;
}

export interface MarketShortOrder {
    stockName: string;
    shortAmount: number;
    shortQuantity: number;
    debtDuration: number;
    id: string;
}

export interface MarketLoanOrder {
    loanAmount: number;
    interestRate: number;
    debt: number,
    debtDuration: number;
    id: string;
}

export interface DerivativeNodeHandles {
    getCallOption: (name: string) => MarketCallOption | undefined;
    getCallOptions: () => MarketCallOption[];

    passDay: () => void;
    passDays: (daysPassed: number) => void;
}