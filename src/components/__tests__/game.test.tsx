/**
 * Game renders straight off the CFBD matchups payload, which is not validated.
 * A game missing homeTeamData/awayTeamData must still render and stay clickable.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Game from '../Game';
import { SlateDispatchContext } from '../../context/slate/slate-dispatch';
import { makeGame } from '../../test-utils/fixtures';
import { GamesAPIResult } from '../../model';

const renderGame = (game: GamesAPIResult, dispatch: jest.Mock) =>
  render(
    <SlateDispatchContext.Provider value={dispatch}>
      <Game game={game} addedToSlate={false} hideCheckbox={false} canEdit />
    </SlateDispatchContext.Provider>
  );

test('renders a well-formed game and dispatches ADD_REMOVE on toggle', async () => {
  const game = makeGame(1);
  const dispatch = jest.fn();
  renderGame(game, dispatch);

  await userEvent.click(screen.getByLabelText('Add to slate'));
  expect(dispatch).toHaveBeenCalledWith({ type: 'ADD_REMOVE', payload: game });
});

test('renders a game with no team data instead of crashing', () => {
  const sparse = {
    id: 42,
    startDate: new Date().toISOString(),
    homeTeam: 'Home 42',
    awayTeam: 'Away 42',
    pointSpread: -3,
  } as unknown as GamesAPIResult;

  expect(() => renderGame(sparse, jest.fn())).not.toThrow();
  expect(screen.getByAltText('Home 42')).toBeInTheDocument();
  expect(screen.getByLabelText('Add to slate')).toBeInTheDocument();
});

test('hides the control when the viewer cannot edit', () => {
  render(
    <SlateDispatchContext.Provider value={jest.fn()}>
      <Game game={makeGame(1)} addedToSlate={false} hideCheckbox={false} canEdit={false} />
    </SlateDispatchContext.Provider>
  );
  expect(screen.queryByLabelText('Add to slate')).not.toBeInTheDocument();
});
