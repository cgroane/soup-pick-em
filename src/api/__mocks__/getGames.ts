/** Manual mock — keeps tests off the live CFBD / sportsdata.io endpoints. */
export const getCurrentWeek = jest.fn(async () => undefined);
export const getGames = jest.fn(async () => [] as unknown[]);
export const getCFPGames = jest.fn(async () => [] as unknown[]);
