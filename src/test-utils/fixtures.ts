/**
 * Pure fixture data — no provider or Firebase imports, so component tests can
 * use it without dragging src/firebase/index.ts (and its analytics init) in.
 */
import { GamesAPIResult, GroupMembership, Slate, UserCollectionData } from '../model';
import { SeasonDetailsData } from '../api/schema/sportsDataIO';

export const TEST_GID = 'group-1';
export const TEST_UID = 'user-1';

/** A game far enough in the future that `arePicksLocked` stays false. */
export const makeGame = (id: number, startDate?: string): GamesAPIResult =>
  ({
    id,
    season: 2024,
    seasonType: 'regular',
    week: 5,
    startDate: startDate ?? new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    homeTeam: `Home ${id}`,
    awayTeam: `Away ${id}`,
    homePoints: 0,
    awayPoints: 0,
    pointSpread: -3,
    homeTeamData: { school: `Home ${id}` },
    awayTeamData: { school: `Away ${id}` },
    outcomes: undefined,
  } as unknown as GamesAPIResult);

export const makeGames = (count: number) =>
  Array.from({ length: count }, (_, i) => makeGame(i + 1));

export const seasonData: SeasonDetailsData = {
  Season: 2024,
  StartYear: 2024,
  EndYear: 2025,
  Description: '2024',
  ApiSeason: '2024REG',
  ApiWeek: 5,
  isOffseason: false,
  seasonType: 'regular',
};

export const membership = (roles: string[]): GroupMembership =>
  ({ gid: TEST_GID, roles, name: 'Test Group' } as unknown as GroupMembership);

export const userDoc = (overrides: Partial<UserCollectionData> = {}) =>
  ({
    uid: TEST_UID,
    id: TEST_UID,
    email: 'test@example.com',
    fName: 'Test',
    lName: 'User',
    roles: [],
    record: [],
    pickHistory: [],
    ...overrides,
  } as unknown as UserCollectionData);

export const makeSlate = (games: GamesAPIResult[], uniqueWeek = 'w5-2024'): Slate =>
  ({
    week: 5,
    uniqueWeek,
    games,
    processed: false,
    providedBy: userDoc(),
  } as unknown as Slate);

