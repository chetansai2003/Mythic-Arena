import {
  Layout,
  Lobby,
  HistoryPage,
  Leaderboard,
  MatchPage,
  SettingsPage,
  NotFound,
  RouteError,
} from './App.jsx';
import AccountPage from './Account.jsx';
import DeckBuilderPage from './DeckBuilder.jsx';

export const routes = [
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <Lobby home /> },
      { path: '/lobby', element: <Lobby /> },
      { path: '/decks', element: <DeckBuilderPage /> },
      { path: '/history', element: <HistoryPage /> },
      { path: '/leaderboard', element: <Leaderboard /> },
      { path: '/match/:gameId', element: <MatchPage /> },
      { path: '/login', element: <AccountPage key="login" /> },
      { path: '/register', element: <AccountPage key="register" register /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
];
