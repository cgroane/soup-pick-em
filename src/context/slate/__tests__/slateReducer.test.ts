/**
 * Pure coverage for the slate reducer and the deletions derivation.
 *
 * `computeDeletions` returns POSITIONAL indices into the persisted slate's games,
 * because that is what `addSlate` splices against. Deriving them against
 * `selectedGames` instead deletes the wrong rows.
 */
import { slateReducer } from '..';
import { computeDeletions, initialSlateState } from '../slate-state';
import { makeGames } from '../../../test-utils/harness';
import { LoadingState } from '../../ui/ui-state';

jest.mock('../../../firebase/slate/slate');
jest.mock('../../../firebase/user/user');
jest.mock('../../../firebase/group/group');
jest.mock('../../../api/getGames');
jest.mock('firebase/auth');

const GAMES = makeGames(5);

describe('slateReducer', () => {
  test('ADD_REMOVE adds a game that is not selected yet', () => {
    const next = slateReducer(initialSlateState, { type: 'ADD_REMOVE', payload: GAMES[0] });
    expect(next.selectedGames.map((g) => g.id)).toEqual([1]);
  });

  test('ADD_REMOVE removes a game that is already selected', () => {
    const withOne = slateReducer(initialSlateState, { type: 'ADD_REMOVE', payload: GAMES[0] });
    const next = slateReducer(withOne, { type: 'ADD_REMOVE', payload: GAMES[0] });
    expect(next.selectedGames).toHaveLength(0);
  });

  test('ADD_REMOVE only removes the matching game', () => {
    let state = initialSlateState;
    [GAMES[0], GAMES[1], GAMES[2]].forEach((g) => {
      state = slateReducer(state, { type: 'ADD_REMOVE', payload: g });
    });
    const next = slateReducer(state, { type: 'ADD_REMOVE', payload: GAMES[1] });
    expect(next.selectedGames.map((g) => g.id)).toEqual([1, 3]);
  });

  test('ADD_REMOVE normalizes the stored game so undefined fields become defaults', () => {
    const sparse = { id: 99, homeTeam: 'H', awayTeam: 'A' } as never;
    const next = slateReducer(initialSlateState, { type: 'ADD_REMOVE', payload: sparse });
    expect(next.selectedGames[0]).toMatchObject({ id: 99, season: 0, week: 0, pointSpread: 0 });
  });

  test('SET_GAMES, SET_SELECTED_GAMES, SET_FILTER_TEXT and SET_STATUS all apply', () => {
    expect(slateReducer(initialSlateState, { type: 'SET_GAMES', payload: GAMES }).games).toHaveLength(5);
    expect(
      slateReducer(initialSlateState, { type: 'SET_SELECTED_GAMES', payload: GAMES }).selectedGames
    ).toHaveLength(5);
    expect(
      slateReducer(initialSlateState, { type: 'SET_FILTER_TEXT', payload: 'texas' }).filterText
    ).toBe('texas');
    expect(
      slateReducer(initialSlateState, { type: 'SET_STATUS', payload: LoadingState.ERROR }).status
    ).toBe('ERROR');
  });
});

describe('computeDeletions', () => {
  test('is empty when every persisted game is still selected', () => {
    expect(computeDeletions(GAMES, GAMES)).toEqual([]);
  });

  test('returns indices into the persisted slate, not into the selection', () => {
    // Drop the games at positions 1 and 3 of the saved slate.
    const kept = [GAMES[0], GAMES[2], GAMES[4]];
    expect(computeDeletions(GAMES, kept)).toEqual([1, 3]);
  });

  test('newly added games do not shift the indices of removals', () => {
    const kept = [GAMES[0], GAMES[1], GAMES[2], GAMES[3], ...makeGames(2).map((g) => ({ ...g, id: g.id + 100 }))];
    // Only the saved game at index 4 is gone; the two additions are irrelevant.
    expect(computeDeletions(GAMES, kept)).toEqual([4]);
  });

  test('tolerates a missing slate', () => {
    expect(computeDeletions(undefined, GAMES)).toEqual([]);
  });
});
