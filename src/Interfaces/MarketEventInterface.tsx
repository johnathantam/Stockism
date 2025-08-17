export interface MarketEvent {
  title: string;
  description: string;

  eventType: string;

  affectedFields: string[];
  affectedStocks: string[];

  driftDelta: number,       // lowers daily % drift
  turbulenceDelta: number,   // increases volatility
  sentimentDelta: number,     // decreases sentiment

  // Duration & Timing
  durationDays: number;             // in days (0 = one-time)
}

export interface MarketPressure {
  drift: number;      // long-term bias (% per day)
  turbulence: number; // volatility multiplier
  sentiment: number;  // optimism/pessimism
}