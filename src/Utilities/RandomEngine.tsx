function randomRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

function randomPick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function pickMultiple<T>(arr: T[], min: number, max: number): T[] {
    const count = Math.floor(randomRange(min, max + 1));
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

function gaussianNoise() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

function pickMultipleWeighted<T>(items: T[], weights: number[], count: number) {
    const selected: T[] = [];
    const pool = [...items];
    const poolWeights = [...weights];

    for (let i = 0; i < count && pool.length; i++) {
        // create cumulative distribution
        let sum = 0;
        const cdf = poolWeights.map(w => sum += w);
        const rand = Math.random() * sum;

        // find selected index
        const index = cdf.findIndex(v => rand <= v);
        selected.push(pool[index]);

        // remove chosen item to avoid duplicates
        pool.splice(index, 1);
        poolWeights.splice(index, 1);
    }

    return selected;
}

function shiftColor(hex: string, amount: number): string {
  // Remove # if present
  const color = hex.replace("#", "");

  // Parse RGB from hex
  let r = parseInt(color.substring(0, 2), 16);
  let g = parseInt(color.substring(2, 4), 16);
  let b = parseInt(color.substring(4, 6), 16);

  // Apply a random shift within ±amount
  const shift = () => Math.min(255, Math.max(0, Math.floor(Math.random() * (amount * 2 + 1)) - amount));
  
  r = Math.min(255, Math.max(0, r + shift()));
  g = Math.min(255, Math.max(0, g + shift()));
  b = Math.min(255, Math.max(0, b + shift()));

  // Convert back to hex
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export { randomRange, randomPick, pickMultiple, gaussianNoise, pickMultipleWeighted, shiftColor }