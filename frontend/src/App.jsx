import { useEffect, useState } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useRouteError,
} from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  ChevronRight,
  CircleHelp,
  Crown,
  Flame,
  History,
  Layers3,
  LayoutDashboard,
  LockKeyhole,
  Settings2,
  Shield,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Volume2,
  WandSparkles,
  Wifi,
} from 'lucide-react';
import {
  Button,
  Dialog,
  EmptyState,
  Field,
  Skeleton,
  StatusBanner,
  Toast,
} from './components/index.jsx';
import ArenaArt from './three/ArenaArt.jsx';
import LobbyDecks from './features/decks/LobbyDecks.jsx';
import PageHeading from './components/PageHeading.jsx';

const navigation = [
  { to: '/lobby', label: 'The arena', icon: LayoutDashboard },
  { to: '/decks', label: 'My decks', icon: Layers3 },
  { to: '/history', label: 'Match history', icon: History },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];
export function Layout() {
  const [rulesOpen, setRulesOpen] = useState(false);
  const prefs = useSelector((state) => state.preferences);
  const user = useSelector((state) => state.session.user);
  const location = useLocation();
  useEffect(() => {
    document.documentElement.dataset.motion = prefs.reduceMotion
      ? 'reduced'
      : 'system';
    document.documentElement.dataset.graphics = prefs.graphics;
  }, [prefs.reduceMotion, prefs.graphics]);
  useEffect(() => {
    const heading = document.querySelector('h1');
    document.title = `${heading?.textContent || 'Welcome'} · Mythic Arena`;
  }, [location.pathname]);
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link to="/" className="brand" aria-label="Mythic Arena home">
          <div className="brand-mark">
            <Swords size={23} />
          </div>
          <span>
            MYTHIC<span className="brand-sub">A R E N A</span>
          </span>
        </Link>
        <div className="nav-label">YOUR JOURNEY</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              to={to}
              aria-label={label}
              key={to}
            >
              <Icon size={19} />
              <span>{label}</span>
              <ChevronRight size={14} className="nav-chevron" />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Sparkles size={19} />
            <strong>A legend starts here.</strong>
            <p>A new world of myth and strategy is taking shape.</p>
            <span className="small-tag">COLLECTION PREVIEW</span>
          </div>
          <NavLink className="nav-link" to="/settings">
            <Settings2 size={19} />
            Settings
          </NavLink>
          <button className="nav-link" onClick={() => setRulesOpen(true)}>
            <CircleHelp size={19} />
            How to play
          </button>
          <div className="sidebar-footer">
            <span className="status-dot" />
            VERSION 0.4 <span>PART 04</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            MYTHIC ARENA <ChevronRight size={12} />
            <span>
              {location.pathname === '/'
                ? 'Welcome'
                : location.pathname
                    .split('/')[1]
                    .replace('leaderboard', 'Leaderboard')}
            </span>
          </div>
          <div className="topbar-actions">
            <span className="preview-pill">
              <span />
              EARLY PREVIEW
            </span>
            <Link className="profile-link" to="/login">
              <span className="avatar">
                <Shield size={17} />
              </span>
              <span className="profile-name">
                {user?.displayName ?? 'Guest explorer'}
              </span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="page-footer">
          <span>
            MYTHIC ARENA <span className="footer-dot">·</span> Built for the
            next great rivalry.
          </span>
          <button onClick={() => setRulesOpen(true)}>
            The rules <ArrowRight size={13} />
          </button>
        </footer>
      </div>
      <Dialog
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title="A battle of choices"
      >
        <p>
          Build a 30-card deck with up to two copies of each card. Both heroes
          begin with 20 health and five cards.
        </p>
        <ol className="rules-list">
          <li>
            <strong>Gather your strength.</strong> Energy grows each turn, up to
            ten.
          </li>
          <li>
            <strong>Choose your move.</strong> Summon units or cast spells.
            Units wait a turn before attacking.
          </li>
          <li>
            <strong>Watch the clock.</strong> Each turn lasts 30 seconds. Reduce
            your rival’s health to zero to win.
          </li>
        </ol>
        <p className="muted">
          Try these rules in Practice grounds. Online matchmaking arrives in the
          next milestone.
        </p>
      </Dialog>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="page">
      <PageHeading
        eyebrow="UNCHARTED TERRITORY"
        title="A path yet undiscovered"
      >
        This page doesn’t exist in the arena.
      </PageHeading>
      <div className="content-panel">
        <EmptyState
          icon={Sparkles}
          title="Let’s find your way back"
          action={
            <Link className="button button-primary" to="/lobby">
              Back to the arena <ArrowRight size={16} />
            </Link>
          }
        >
          The link may be incomplete or the page may have moved.
        </EmptyState>
      </div>
    </div>
  );
}
export function RouteError() {
  useRouteError();
  return (
    <main className="page error-page">
      <h1>The arena needs a moment</h1>
      <StatusBanner kind="error">
        This page could not be displayed. Please reload and try again.
      </StatusBanner>
      <Button onClick={() => window.location.reload()}>Reload page</Button>
      <a className="text-link" href="/lobby">
        Return to lobby
      </a>
    </main>
  );
}
