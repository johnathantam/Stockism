/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import "./TimeNode.css";

interface TimeNodeProps {
    onMinutePassed: ((minute: number) => void)[];
    onHourPassed: ((hour: number) => void)[];
    onDayPassed: ((day: number) => void)[]
    onTimeSkip: ((daysPassed: number) => void)[];
    onTimeLimitExceeded: () => void;
}

interface Time {
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const TimeNode = ({ onMinutePassed, onHourPassed, onDayPassed, onTimeSkip, onTimeLimitExceeded }: TimeNodeProps) => {
    const [time, setTime] = useState<Time>({ second: 0, minute: 0, hour: 0, day: 29 });
    const [timeSkipAmount, setTimeSkip] = useState<string>("1");
    const [timeMultiplier, setTimeMultiplier] = useState<number>(1);

    const [orderErrorMessage, setOrderErrorMessage] = useState<string>("");

    const timeLimit: number = 120;
    
    useEffect(() => {
        const interval = setInterval(() => {
            setTime(prev => {
                let { day, hour, minute, second } = prev;

                // increment seconds
                second += 1;

                if (second >= 60) {
                    second = 0;
                    minute += 1;
                    queueMicrotask(() => onMinutePassed.forEach(cb => cb(minute)));
                }

                if (minute >= 60) {
                    minute = 0;
                    hour += 1;
                    queueMicrotask(() => onHourPassed.forEach(cb => cb(hour)));
                }

                if (hour >= 24) {
                    hour = 0;
                    day += 1;
                    if (day >= timeLimit) {
                        queueMicrotask(() => onTimeLimitExceeded());
                        clearInterval(interval);
                        return prev; // stop at limit
                    }
                    queueMicrotask(() => onDayPassed.forEach(cb => cb(day)));
                }

                return { day, hour, minute, second };
            });
        }, 100 / timeMultiplier);

        return () => clearInterval(interval);
    }, [timeMultiplier]);

    const sendErrorMessage = (message: string) => {
        setOrderErrorMessage(message);
        setTimeout(() => setOrderErrorMessage(""), 5000);
    }

    const skipDays = () => {
        const daysSkipped: number = Math.abs(parseInt(timeSkipAmount));

        if (isNaN(daysSkipped)) {
            sendErrorMessage("Invalid input.");
            return;
        }

        if (daysSkipped == 0) {
            sendErrorMessage("Cannot skip 0 days");
            return;
        }

        onTimeSkip.forEach(cb => cb(daysSkipped))
        setTime(prevTime => { return { ...prevTime, day: prevTime.day + daysSkipped } });

        if (time.day >= timeLimit || time.day + daysSkipped >= timeLimit)
            queueMicrotask(() => onTimeLimitExceeded());
    }

    return (
        <>
            <div className="timenode-container">
                <div className="timenode-title-container">
                    <p className="timenode-title">Day {time.day}.</p>
                    <p className="timenode-subtitle">{String(time.hour).padStart(2, '0')}:{String(time.minute).padStart(2, '0')}:{String(time.second).padStart(2, '0')}</p>
                </div>
                <div className="time-node-set-skip-container">
                    {[1, 5, 10, 25].map((mult) => (
                        <button
                            key={mult}
                            className="time-node-set-skip-button"
                            onClick={() => setTimeMultiplier(mult)}
                            style={{
                            backgroundColor:
                                timeMultiplier === mult
                                ? "rgba(105, 94, 255, 1)" // highlight active
                                : "rgb(142, 154, 250)",
                            }}
                        >
                            x{mult}
                        </button>
                    ))}
                </div>
                <div className="timenode-input-container">
                    <p className="timenode-input-title">Skip Days:</p>
                    <input type="text" id="order-name" className="timenode-input" value={timeSkipAmount} onChange={(e) => setTimeSkip(e.target.value)}></input>
                </div>
                <p className="timenode-error-text">{orderErrorMessage}</p>
                <button className="timenode-confirm-button" onClick={skipDays}>Skip</button>
            </div>
        </>
    )
}

export { TimeNode };