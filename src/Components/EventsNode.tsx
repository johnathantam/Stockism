import { useState, forwardRef, useImperativeHandle, useRef, useEffect } from "react";
import type { EventInterface, EventNodeHandles } from "../Interfaces/AnnounceEventInterface";
import "./EventsNode.css";

const EventsNode = forwardRef<EventNodeHandles>((_props, ref) => {

    const [events, setEvents] = useState<(EventInterface)[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
        announceEvent(action: EventInterface) {
            setEvents(prevEvents => [...prevEvents, action]);
        },
    }))

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: "nearest", inline: "nearest" });
    }, [events]);

    const ActionEvent = ({ action }: { action: EventInterface }) => {
        return (
            <>
                <div className="event-item-container" style={{ borderColor: action.eventBorderColor }}>
                    <div className="event-item-title-wrapper">
                        <p className="event-item-title" style={{ backgroundColor: action.eventTitleColor}}>{action.eventTitle}</p>
                    </div>
                    <div className="event-item-text-wrapper">
                        <p className="event-item-text" style={{ backgroundColor: action.eventDescriptionColor}}>{action.eventDescription}</p>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <div className="events-node-container">
                <p className="events-node-title">Latest News</p>
                <div className="events-container">
                    <div className="event-item-container">
                        <div className="event-item-title-wrapper">
                            <p className="event-item-title">Your first day.</p>
                        </div>
                        <div className="event-item-text-wrapper">
                            <p className="event-item-text">
                                The Martian Stock Exchange has been open for weeks, and today you join the floor. 
                                You know little about these companies, but you do know this: each day carries the chance of an event that can shift the market. 
                                Trade wisely, or skip carefully, every choice could make or break your fortune.
                            </p>
                        </div>
                    </div>
                    {
                        events.map((event: EventInterface) => (
                            <ActionEvent action={event} key={Math.random()}></ActionEvent>
                        ))
                    }

                    <div ref={bottomRef}></div>
                </div>
            </div>
        </>
    )
})

export { EventsNode };