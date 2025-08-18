import { useState, useImperativeHandle, forwardRef, type RefObject } from "react";
import type { PortfolioStockHandles } from "../Interfaces/PortfolioStockInterface";
import { formatMoney } from "../Utilities/PriceFormatter";
import "./GameEndedNode.css";

export interface GameEndedHandles {
    endGame: () => void;
}

interface GameEndedNodeProps {
    portfolioRef: RefObject<PortfolioStockHandles>;
}

const GameEndedNode = forwardRef<GameEndedHandles, GameEndedNodeProps>(({ portfolioRef }, ref) => {
    const [isGameOver, setIsGameOver] = useState<boolean>(false);
    const [finalProfit, setFinalProfit] = useState<number>(0);
    const [hasWon, setHasWon] = useState<boolean>(false);

    const calculateFinalProfit = () => {
        const liquidBalance = portfolioRef.current?.getLiquidBalance() ?? 0;
        const portfolioBalance = portfolioRef.current?.getPortfolioBalance() ?? 0;
        console.log(liquidBalance, portfolioBalance)
        return liquidBalance + portfolioBalance - 100000; // assuming 100k start
    };

    useImperativeHandle(ref, () => ({
        endGame() {
            const profit = calculateFinalProfit();
            setFinalProfit(profit);
            setHasWon(profit > 0);
            setIsGameOver(true);
        },
    }));

    return isGameOver ? (
        <div className="game-end-background">
            <div className="game-end-container">
                <h1 className="game-end-title">{hasWon ? "Victory!" : "Defeat."}</h1>
                <p className="game-end-description">
                    You have {hasWon ? "won" : "lost"} with a final {finalProfit >= 0 ? "profit" : "loss"} of{" "}
                    {formatMoney(finalProfit)} .
                </p>
                <button 
                    className="game-end-exit-button"
                    onClick={() => window.location.reload()}
                >
                    Play Again
                </button>
            </div>
        </div>
    ) : null;
});

export { GameEndedNode };