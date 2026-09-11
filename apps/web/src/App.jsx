import { useEffect, useState } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useRouteError,
} from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
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
} from './components.jsx';
import ArenaArt from './ArenaArt.jsx';
import LobbyDecks from './LobbyDecks.jsx';
import { setGraphics, setMuted, setReducedMotion } from './store.js';

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
            VERSION 0.2 <span>PART 02</span>
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
              <span className="profile-name">{user?.displayName ?? 'Guest explorer'}</span>
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
          This is a foundation preview. Playable battles arrive in a later
          milestone.
        </p>
      </Dialog>
    </div>
  );
}

function ServiceStatus() {
  const [state, setState] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timer = setTimeout(() => controller.abort(), 4000);
    fetch('/api/health/ready', { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!cancelled)
          setState(res.ok && body.status === 'ready' ? 'ready' : 'unavailable');
      })
      .catch(() => {
        if (!cancelled) setState('unavailable');
      })
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [attempt]);
  if (state === 'loading')
    return <Skeleton label="Checking service connection" />;
  return (
    <div className={`connection-status ${state}`} role="status">
      <Wifi size={15} />
      <span>
        {state === 'ready'
          ? 'Services connected · online play coming later'
          : 'Services unavailable · you can still explore'}
      </span>
      <button
        onClick={() => {
          setState('loading');
          setAttempt((n) => n + 1);
        }}
      >
        Check again
      </button>
    </div>
  );
}

export function Lobby({ home = false }) {
  return (
    <div className="page lobby-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            <span className="gold-line" />
            THE NEXT CHAPTER IS YOURS
          </p>
          <h1>{home ? 'Welcome to Mythic Arena' : 'Enter the arena'}</h1>
          <p className="subtitle">
            Ancient legends. New rivalries. Every card, a choice.
          </p>
        </div>
        <span className="chapter-tag">
          CHAPTER <strong>01</strong>
        </span>
      </div>
      <section className="hero-panel" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="hero-kicker">
            <Sparkles size={14} /> A WORLD BETWEEN MYTHS
          </span>
          <h2 id="hero-title">
            Choose your legend.
            <br />
            <em>Shape your fate.</em>
          </h2>
          <p>
            Assemble a deck of mythic forces.
            <br className="desktop-break" /> Outthink your rival. Make your
            mark.
          </p>
          <div className="hero-actions">
            <Link to="/decks" className="button button-primary">
              Explore your decks <ArrowRight size={17} />
            </Link>
            <a className="text-link" href="#choose-path">
              Discover the arena <ArrowDown size={14} />
            </a>
          </div>
          <div className="hero-meta">
            <span>
              <Swords size={14} /> 1v1 TACTICAL BATTLES
            </span>
            <span>
              <Shield size={14} /> ORIGINAL MYTHOLOGY
            </span>
          </div>
        </div>
        <ArenaArt />
        <span className="hero-corner">I</span>
      </section>
      <LobbyDecks />
      <section
        id="choose-path"
        className="modes-section"
        aria-labelledby="path-title"
      >
        <div className="section-heading">
          <h2 id="path-title">Choose your path</h2>
          <span>A little preparation. A legendary beginning.</span>
        </div>
        <div className="mode-grid">
          <article className="mode-card featured">
            <div className="mode-top">
              <div className="mode-icon gold">
                <Swords size={23} />
              </div>
              <span className="small-tag">1V1</span>
            </div>
            <h3>Casual battle</h3>
            <p>
              A worthy opponent. A fresh strategy.
              <br /> Your next story starts across the board.
            </p>
            <button className="mode-action" disabled>
              <LockKeyhole size={14} /> Matchmaking coming soon{' '}
              <ArrowRight size={16} />
            </button>
          </article>
          <article className="mode-card">
            <div className="mode-top">
              <div className="mode-icon violet">
                <Target size={23} />
              </div>
              <span className="small-tag">SOLO</span>
            </div>
            <h3>Practice grounds</h3>
            <p>
              Learn your cards. Find your rhythm.
              <br /> Prepare for the battles ahead.
            </p>
            <button className="mode-action" disabled>
              <LockKeyhole size={14} /> Practice coming soon{' '}
              <ArrowRight size={16} />
            </button>
          </article>
          <article className="mode-card">
            <div className="mode-top">
              <div className="mode-icon cyan">
                <Layers3 size={23} />
              </div>
              <span className="small-tag">COLLECTION</span>
            </div>
            <h3>Your arsenal</h3>
            <p>
              Great victories begin with a great deck.
              <br /> Discover where your strategy takes shape.
            </p>
            <Link to="/decks" className="mode-action">
              Visit my decks <ArrowRight size={16} />
            </Link>
          </article>
        </div>
      </section>
      <div className="lobby-bottom">
        <section className="journey-panel">
          <div className="journey-icon">
            <Flame size={21} />
          </div>
          <div>
            <span className="eyebrow">THE FIRST SPARK</span>
            <h3>Your story is yet to be written.</h3>
            <p>
              Your cards are ready. Build a deck today, and return for the arena’s
              foundation today.
            </p>
          </div>
          <Link
            to="/settings"
            className="icon-button"
            aria-label="Personalize your experience"
          >
            <ArrowRight size={19} />
          </Link>
        </section>
        <ServiceStatus />
      </div>
    </div>
  );
}

function PageHeading({ eyebrow, title, children }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">
          <span className="gold-line" />
          {eyebrow}
        </p>
        <h1>{title}</h1>
        <p className="subtitle">{children}</p>
      </div>
    </div>
  );
}

export function HistoryPage() {
  return (
    <div className="page">
      <PageHeading eyebrow="THE CHRONICLES" title="Match history">
        A record of every hard-fought battle.
      </PageHeading>
      <div className="content-panel">
        <EmptyState icon={History} title="Your chronicle awaits">
          Completed matches will appear here once online play is available. No
          matches have been played in this preview.
        </EmptyState>
      </div>
    </div>
  );
}
export function Leaderboard() {
  return (
    <div className="page">
      <PageHeading eyebrow="HALL OF LEGENDS" title="Leaderboard">
        Earn your place, one victory at a time.
      </PageHeading>
      <div className="content-panel">
        <EmptyState icon={Crown} title="The first legends are yet to rise">
          The release leaderboard will count wins in casual online matches.
          Rankings become available with completed match results.
        </EmptyState>
      </div>
    </div>
  );
}
export function MatchPage() {
  return (
    <div className="page">
      <PageHeading eyebrow="THE BATTLEFIELD" title="Battle arena">
        Clarity in every turn. Purpose in every move.
      </PageHeading>
      <div className="content-panel">
        <EmptyState
          icon={Swords}
          title="No active match"
          action={
            <Link className="button button-primary" to="/lobby">
              Return to lobby <ArrowRight size={16} />
            </Link>
          }
        >
          Playable matches arrive after the game engine and multiplayer
          milestones. This link does not connect to a live game.
        </EmptyState>
      </div>
    </div>
  );
}
export function SettingsPage() {
  const prefs = useSelector((state) => state.preferences);
  const dispatch = useDispatch();
  const [message, setMessage] = useState('');
  function update(action) {
    dispatch(action);
    setMessage('Preference updated for this device.');
  }
  return (
    <div className="page">
      <PageHeading eyebrow="MAKE IT YOURS" title="Settings">
        A comfortable arena is a better arena.
      </PageHeading>
      <div className="settings-panel content-panel">
        <div className="settings-header">
          <WandSparkles size={22} />
          <div>
            <h2>Your experience</h2>
            <p>Preferences apply on this device. No account needed.</p>
          </div>
        </div>
        <div className="setting-row">
          <div>
            <h3>Graphics quality</h3>
            <p>
              Low removes ambient scenery motion. Future 3D scenes will respect
              this choice.
            </p>
          </div>
          <select
            aria-label="Graphics quality"
            value={prefs.graphics}
            onChange={(e) => update(setGraphics(e.target.value))}
          >
            <option value="high">High</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="setting-row">
          <div>
            <h3>Reduce motion</h3>
            <p>
              Use a calmer, still experience. Your system’s reduced-motion
              setting is always respected.
            </p>
          </div>
          <input
            className="switch"
            type="checkbox"
            role="switch"
            aria-label="Reduce motion"
            checked={prefs.reduceMotion}
            onChange={(e) => update(setReducedMotion(e.target.checked))}
          />
        </div>
        <div className="setting-row">
          <div>
            <h3>
              <Volume2 size={16} /> Mute sound
            </h3>
            <p>
              Sound is off by default. Audio effects will arrive in a later
              milestone.
            </p>
          </div>
          <input
            className="switch"
            type="checkbox"
            role="switch"
            aria-label="Mute sound"
            checked={prefs.muted}
            onChange={(e) => update(setMuted(e.target.checked))}
          />
        </div>
      </div>
      {message && <Toast message={message} onDismiss={() => setMessage('')} />}
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
