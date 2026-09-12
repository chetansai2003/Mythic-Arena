import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  Flame,
  Layers3,
  Shield,
  Sparkles,
  Swords,
  Target,
  Wifi,
} from 'lucide-react';
import { Skeleton } from '../../components/index.jsx';
import LobbyArena from '../../three/LobbyArena.jsx';
import LobbyDecks from '../../features/decks/LobbyDecks.jsx';
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
          ? 'Services connected · casual battles available'
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

export default function Lobby({ home = false }) {
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
        <LobbyArena />
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
            <a className="mode-action" href="#online-queue">
              <Swords size={14} /> Choose a deck to find an opponent{' '}
              <ArrowRight size={16} />
            </a>
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
            <Link className="mode-action" to="/practice">
              <Target size={14} /> Start practice <ArrowRight size={16} />
            </Link>
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
              Your cards are ready. Build a deck today, and prepare for the
              battles ahead.
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
