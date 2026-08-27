/**
 * SelectWeek renders before seasonData resolves, when both dropdowns have
 * nothing to select yet. Radix reads a `value` of `undefined` as uncontrolled,
 * so the late arrival of seasonData used to flip both Selects controlled and
 * warn. It also used to index `weeks[-1]` while the week list was still empty.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import SelectWeek from '../SelectWeek';
import { UIStateContext, initialUIState } from '../../context/ui/ui-state';
import { seasonData } from '../../test-utils/fixtures';

const renderAt = (state: typeof initialUIState, vals: { week: string; year: string }) =>
  render(
    <UIStateContext.Provider value={state}>
      <SelectWeek vals={vals} heading={<></>} onChange={jest.fn()} />
    </UIStateContext.Provider>
  );

test('shows placeholders before seasonData arrives without warning', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});

  const { rerender } = renderAt(initialUIState, { week: '', year: '' });
  expect(screen.getByText('Select Week')).toBeInTheDocument();
  expect(screen.getByText('Select Season')).toBeInTheDocument();

  // seasonData resolves: the same Selects now have real values.
  rerender(
    <UIStateContext.Provider value={{ ...initialUIState, seasonData }}>
      <SelectWeek vals={{ week: '5', year: '2024' }} heading={<></>} onChange={jest.fn()} />
    </UIStateContext.Provider>
  );

  expect(await screen.findByText('Week 5')).toBeInTheDocument();
  const controlledWarning = (m: unknown) =>
    typeof m === 'string' && m.includes('changing from uncontrolled to controlled');
  expect(warn.mock.calls.flat().some(controlledWarning)).toBe(false);
  expect(error.mock.calls.flat().some(controlledWarning)).toBe(false);
});

test('does not clamp the week while the week list is still empty', () => {
  // No seasonData yet, so `weeks` holds only the Post Season entry. A week
  // number carried over from a previous selection must not index past the start.
  expect(() => renderAt(initialUIState, { week: '9', year: '2024' })).not.toThrow();
});

test('clamps a week that outruns the loaded season', async () => {
  const onChange = jest.fn();
  // Past seasons expose all 14 weeks; only the in-progress season caps at ApiWeek.
  const thisYear = new Date().getFullYear().toString();
  render(
    <UIStateContext.Provider value={{ ...initialUIState, seasonData }}>
      <SelectWeek vals={{ week: '13', year: thisYear }} heading={<></>} onChange={onChange} />
    </UIStateContext.Provider>
  );
  await waitFor(() => expect(onChange).toHaveBeenCalled());
});
