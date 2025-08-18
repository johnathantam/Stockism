import { useState } from "react";
import "./GameGuideNode.css";

const GameGuide = () => {

    const [enabled, setEnabled] = useState<boolean>(true);
    const [guideTextNumber, setGuideTextNumber] = useState<number>(0);
    const guideTexts: string[] = [
        "You have taken a loan of $100,000 hoping to hit big on the recently created stock exchange. You either pay off your debt, or die.",
        "Rumors swirl of a volatile tech sector — overnight millionaires, and just as many ruined investors.",
        "You have until day 60 when the debt collectors come knocking. Every decision will count.",
        "The market is unpredictable, but whispers of insider tips and shady dealings might just tip the scales in your favor.",
        "Good luck, trader. Your fate is now in your own hands."
    ];

    const disableGameGuide = () => {
        setEnabled(false);
    }

    const triggerNextText = () => {
        if (guideTextNumber == guideTexts.length - 1) {
            disableGameGuide();
            return;
        }

        setGuideTextNumber(prevGuideTextNumber => prevGuideTextNumber + 1);
    }

    return (enabled) ? (
        <>
            <div className="game-guide-background">
                <div className="game-guide-container">
                    <button className="game-guide-exit-button" onClick={disableGameGuide}></button>
                    <h1 className="game-guide-title">Welcome to StockSim!</h1>
                    <p className="game-guide-description">{guideTexts[guideTextNumber]}</p>
                    <p className="game-guide-page-tracker">[{guideTextNumber + 1}/{guideTexts.length}]</p>
                    <button className="game-guide-next-button" onClick={triggerNextText}>Next</button>
                </div>
            </div>
        </>
    ) : null;
}

export { GameGuide }