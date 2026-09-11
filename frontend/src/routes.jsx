import { Layout, NotFound, RouteError } from './App.jsx';
import Home from './pages/Home/index.jsx';
import Lobby from './pages/Lobby/index.jsx';
import HistoryPage from './pages/MatchHistory/index.jsx';
import Leaderboard from './pages/Leaderboard/index.jsx';
import MatchPage from './pages/Game/index.jsx';
import SettingsPage from './pages/Settings/index.jsx';
import Login from './pages/Login/index.jsx';
import Register from './pages/Register/index.jsx';
import DeckBuilderPage from './pages/DeckBuilder/index.jsx';
export const routes = [
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/lobby', element: <Lobby /> },
      { path: '/decks', element: <DeckBuilderPage /> },
      { path: '/history', element: <HistoryPage /> },
      { path: '/leaderboard', element: <Leaderboard /> },
      { path: '/match/:gameId', element: <MatchPage /> },
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
];
