import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from './routes.jsx';
import { createAppStore } from './store/index.js';
import { Skeleton, StatusBanner } from './components/index.jsx';

function renderRoute(path) {
  render(
    <Provider store={createAppStore(undefined)}>
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: [path] })}
      />
    </Provider>,
  );
}
describe('route shell', () => {
  it.each([
    ['/decks', 'My decks'],
    ['/history', 'Match history'],
    ['/leaderboard', 'Leaderboard'],
    ['/match/example', 'Battle arena'],
    ['/login', 'Welcome back'],
    ['/register', 'Create an account'],
    ['/settings', 'Settings'],
    ['/unknown', 'A path yet undiscovered'],
  ])('renders %s', (path, title) => {
    renderRoute(path);
    expect(
      screen.getByRole('heading', { level: 1, name: title }),
    ).toBeInTheDocument();
  });
  it('updates an actual preference and reports it', async () => {
    renderRoute('/settings');
    await userEvent.click(
      screen.getByRole('switch', { name: 'Reduce motion' }),
    );
    expect(screen.getByRole('switch', { name: 'Reduce motion' })).toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('Preference updated');
  });
  it('renders understandable loading and error states', () => {
    render(
      <>
        <Skeleton label="Loading decks" />
        <StatusBanner kind="error">Unable to load. Try again.</StatusBanner>
      </>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Loading decks');
    expect(screen.getByRole('alert')).toHaveTextContent('Try again');
  });
});
