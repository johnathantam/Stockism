export interface EventInterface {
    eventTitle: string;
    eventDescription: string;
    eventTitleColor: string;
    eventDescriptionColor: string;

    eventBorderColor: string
}

export interface EventNodeHandles {
    announceEvent: (action: EventInterface) => void;
}