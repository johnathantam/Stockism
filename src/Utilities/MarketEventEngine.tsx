import type { MarketEvent, MarketPressure } from "../Interfaces/MarketEventInterface";
import type { MarketNodeHandles } from "../Interfaces/MarketStockInterface";
import type { EventNodeHandles } from "../Interfaces/AnnounceEventInterface";
import { ExtremeMarketEvents, MildMarketEvents } from "../Data/MarketEventTemplates";
import { randomPick, randomRange, pickMultipleWeighted, shiftColor } from "./RandomEngine";
import { STOCK_FIELDS } from "./MarketGeneratorUtils";

export class EventEngine {
    private eventChat!: EventNodeHandles;
    private market!: MarketNodeHandles;

    private activeEvents: MarketEvent[] = [];

    private fieldPressures: Record<string, MarketPressure> = {};
    private stockPressures: Record<string, MarketPressure> = {};

    public attachEventChat(eventChat: EventNodeHandles) {
        this.eventChat = eventChat;
    }

    public attachMarket(market: MarketNodeHandles) {
        this.market =  market;
        this.fieldPressures = Object.fromEntries(STOCK_FIELDS.map(f => [f, { drift: 0, turbulence: 1, sentiment: 0 }]));
        this.stockPressures = Object.fromEntries(this.market.getMarketStocks().map(f => [f.name, { drift: 0, turbulence: 1, sentiment: 0 }]));
    }

    public getActiveEvents(): MarketEvent[] {
        return this.activeEvents;
    }

    public getFieldPressures(): Record<string, MarketPressure> {
        return this.fieldPressures;
    }

    public getStockPressures(): Record<string, MarketPressure> {
        return this.stockPressures;
    }

    private generateRandomEvent(events: MarketEvent[]) { // Chance (0-1)

        // Spawn event based on pressures
        const eventToSpawn = this.selectEventBasedOnPressure(events);

        // Assign stocks to the event
        this.assignStocksToEvent(eventToSpawn);
        
        // Apply the pressures of the event
        this.applyEventPressures(eventToSpawn);

        // Unlease the event
        this.activeEvents.push(eventToSpawn);
        this.eventChat.announceEvent({ 
            eventTitle: "Market Event [" + eventToSpawn.eventType + "]", 
            eventDescription: eventToSpawn.title + "—" + eventToSpawn.description, 
            eventTitleColor: shiftColor((eventToSpawn.sentimentDelta > 0) ? "#04d569ff" : "#e2522eff", 30), 
            eventDescriptionColor: shiftColor((eventToSpawn.sentimentDelta > 0) ? "#04d569ff" : "#e2522eff", 30),
            eventBorderColor: shiftColor((eventToSpawn.sentimentDelta > 0) ? "#04d569ff" : "#e2522eff", 30)
        })
    }

    public passMinute() {
        // Run chance to generate a mild event within a day
        this.spawnEventByChance(MildMarketEvents);
    }

    public passDay() { // pass 1 day
        this.decreaseActiveEventDurations(1);
        this.spawnEventByChance(ExtremeMarketEvents)
        this.filterActiveEvents();
    }

    public passDays(daysPassed: number) {
        for (let i = 0; i < daysPassed; i++)
            this.passDay();
    }

    private selectEventBasedOnPressure(events: MarketEvent[]): MarketEvent {
        // Find events with a stressed field
        const stressedFields = Object.entries(this.fieldPressures)
            .filter(([, p]) => p.drift + p.sentiment + (p.turbulence - 1) * 10 > 0)
            .map(([field]) => field);

        const relevantEvents = events.filter(event =>
            !event.affectedFields?.length || event.affectedFields.some(f => stressedFields.includes(f))
        );

        return randomPick(relevantEvents.length ? relevantEvents : events);
    }

    private assignStocksToEvent(event: MarketEvent): void {
        const allStocks = this.market.getMarketStocks();

        // Get stocks within the event's affected fields
        let candidateStocks = allStocks.filter(stock =>
            event.affectedFields?.includes(stock.field)
        );

        if (candidateStocks.length === 0) {
            // fallback to all stocks if no field match
            candidateStocks = allStocks;
        }

        // Compute stress weights
        const weights = candidateStocks.map(stock => {
            const p = this.stockPressures[stock.name];
            const stress = p ? Math.max(0, p.drift + p.sentiment + (p.turbulence - 1) * 10) : 0;
            return 1 + stress; // base weight 1, add stress for bias
        });

        // Pick 1-5 stocks weighted by stress
        const count = Math.min(candidateStocks.length, randomRange(1, 5));
        event.affectedStocks = pickMultipleWeighted(candidateStocks.map(s => s.name), weights, count);
    }

    private applyEventPressures(event: MarketEvent) {
        // Apply pressures from each event
        event.affectedFields?.forEach(field => {
            const p = this.fieldPressures[field];
            if (!p) return;
            p.drift += event.driftDelta ?? 0;
            p.turbulence *= 1 + (event.turbulenceDelta ?? 0);
            p.sentiment += event.sentimentDelta ?? 0;
        });

        event.affectedStocks?.forEach(stock => {
            const p = this.stockPressures[stock];
            if (!p) return;
            p.drift += event.driftDelta ?? 0;
            p.turbulence *= 1 + (event.turbulenceDelta ?? 0);
            p.sentiment += event.sentimentDelta ?? 0;
        });
    }

    private decreaseActiveEventDurations(amountDecreased: number) {
        for (let i = 0; i < this.activeEvents.length; i++) {
            const event: MarketEvent = this.activeEvents[i];
            if (event.durationDays != undefined) 
                event.durationDays -= amountDecreased;
        }
    }

    private filterActiveEvents() {
        // Make sure no event with a negative duration is allowed!
        this.activeEvents = this.activeEvents.filter(event => event.durationDays === undefined || event.durationDays > 0);
    }

    private spawnEventByChance(eventsToChooseFrom: MarketEvent[]) {
        const activeCount = this.activeEvents.length;
        const baseChance = 0.4;
        const adjustedChance = Math.max(0.05, baseChance - activeCount * 0.05);

        if (Math.random() <= adjustedChance) 
            this.generateRandomEvent(eventsToChooseFrom);
    }
}