import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Clock,
  Flame,
  Heart,
  Layers3,
  Leaf,
  Moon,
  Shield,
  Sparkles,
  Sun,
  Swords,
  Target,
  Wind,
} from 'lucide-react';
import { catalogResponseSchema, deckListSchema } from '@mythic/shared';
import { useApi } from '../../hooks/api-context.jsx';
import { Button, Skeleton, StatusBanner } from '../../components/index.jsx';
import PageHeading from '../../components/PageHeading.jsx';
import BattleBoard from '../../features/game/BattleBoard.jsx';
import { createPracticeTransport } from '../../services/practice.js';
import '../../styles/battle.css';

export default function Practice() {
  const api = useApi();
  const user = useSelector((state) => state.session.user);
  const [params] = useSearchParams();
  const deckId = params.get('deck');
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState({ status: 'loading' });
  const [transport, setTransport] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCards() {
      try {
        if (!api)
          throw new Error(
            'Practice needs the card catalog. Open the app with its API running.',
          );
        const cards = catalogResponseSchema
          .parse(await api.request('/cards'))
          .cards.map((entry) => entry.definition);
        let cardIds;
        let deckName = null;
        if (deckId) {
          const decks = deckListSchema.parse(await api.request('/decks')).decks;
          const found = decks.find((deck) => deck.id === deckId);
          cardIds = found?.cardIds;
          deckName = found?.name;
          if (!cardIds)
            throw new Error(
              'That deck is unavailable. Return to the lobby and choose one of your decks.',
            );
        }
        if (!cancelled) setLoad({ status: 'ready', cards, cardIds, deckName });
      } catch (error) {
        if (!cancelled) setLoad({ status: 'error', error: error.message });
      }
    }
    void loadCards();
    return () => {
      cancelled = true;
    };
  }, [api, deckId, attempt]);

  useEffect(() => () => transport?.dispose(), [transport]);

  function start() {
    try {
      setTransport(
        createPracticeTransport({
          cards: load.cards,
          cardIds: load.cardIds,
          seed: crypto.randomUUID(),
        }),
      );
    } catch (error) {
      setLoad({ ...load, status: 'error', error: error.message });
    }
  }

  if (transport)
    return (
      <div className="page practice-page">
        <BattleBoard
          key={transport.getSnapshot().snapshot.gameId}
          transport={transport}
          catalog={load.cards}
          onRestart={start}
        />
      </div>
    );

  return (
    <div className="page practice-page">
      <PageHeading eyebrow="LEARN YOUR LEGENDS" title="Practice grounds">
        A quiet sanctuary to test card synergies and sharpen tactical foresight against the arena apprentice.
      </PageHeading>

      <div className="practice-setup-container">
        {/* Matchup Showdown Hero */}
        <div className="content-panel practice-matchup-hero">
          {/* Player Combatant */}
          <div className="matchup-combatant player">
            <div className="combatant-avatar player">
              <Shield size={32} />
            </div>
            <div className="combatant-info">
              <span className="combatant-label">YOUR HERO</span>
              <h2 className="combatant-name">{user?.displayName || 'Challenger'}</h2>
              <div className="combatant-meta">
                <span className="hp-badge">
                  <Heart size={12} /> 20 HP
                </span>
                <span className="deck-badge">
                  <Layers3 size={12} /> {load.deckName || 'Balanced Starter Deck'}
                </span>
              </div>
            </div>
          </div>

          {/* VS Center Emblem */}
          <div className="matchup-vs-seal">
            <div className="vs-circle">
              <Swords size={24} />
            </div>
            <span className="vs-label">LOCAL SPAR</span>
            <span className="vs-sub">Zero Rank Penalty</span>
          </div>

          {/* Opponent Combatant */}
          <div className="matchup-combatant opponent">
            <div className="combatant-avatar apprentice">
              <Bot size={32} />
            </div>
            <div className="combatant-info">
              <span className="combatant-label">OPPOSING CHAMPION</span>
              <h2 className="combatant-name">Arena Apprentice</h2>
              <div className="combatant-meta">
                <span className="hp-badge">
                  <Heart size={12} /> 20 HP
                </span>
                <span className="deck-badge">
                  <Target size={12} /> Adaptive Bot AI
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Card Tactical Briefing Grid */}
        <div className="practice-briefing-grid">
          <div className="briefing-card">
            <div className="briefing-icon gold">
              <Swords size={20} />
            </div>
            <h3>Hero Elimination</h3>
            <p>
              Both heroes start with 20 HP. Summon units, cast spells, and reduce the opposing apprentice to zero to claim victory.
            </p>
          </div>

          <div className="briefing-card">
            <div className="briefing-icon violet">
              <Clock size={20} />
            </div>
            <h3>Turn Flow & Timing</h3>
            <p>
              Rounds alternate with 30-second timers. Newly summoned units prepare for 1 turn before they can strike the board.
            </p>
          </div>

          <div className="briefing-card">
            <div className="briefing-icon cyan">
              <Shield size={20} />
            </div>
            <h3>Guard & Shielding</h3>
            <p>
              Guard units force enemies to attack them first. Shield keywords absorb the next incoming damage instance entirely.
            </p>
          </div>

          <div className="briefing-card">
            <div className="briefing-icon gold">
              <Sparkles size={20} />
            </div>
            <h3>Sandbox Freedom</h3>
            <p>
              Practice runs completely in this tab. Explore complex synergies and experimental card plays with no risk to your record.
            </p>
          </div>
        </div>

        {/* Factions Ribbon */}
        <div className="factions-ribbon">
          <span className="faction-pill">
            <Wind size={14} /> <strong>Norse</strong> Strength & Frost
          </span>
          <span className="faction-pill">
            <Sun size={14} /> <strong>Greek</strong> Solar Radiance
          </span>
          <span className="faction-pill">
            <Flame size={14} /> <strong>Egyptian</strong> Sand & Pyre
          </span>
          <span className="faction-pill">
            <Moon size={14} /> <strong>Japanese</strong> Blade & Shadow
          </span>
          <span className="faction-pill">
            <Leaf size={14} /> <strong>Celtic</strong> Wild Growth
          </span>
        </div>

        {/* Action Panel */}
        <div className="content-panel practice-action-panel">
          <div className="action-panel-text">
            <h3>Ready to take the board?</h3>
            <p>
              {load.deckName
                ? `Deploying with your custom deck: ${load.deckName}.`
                : 'A balanced 30-card starter deck is loaded and prepared.'}
            </p>
          </div>

          <div className="action-panel-buttons">
            {load.status === 'loading' ? (
              <Skeleton label="Loading practice cards" />
            ) : load.status === 'error' ? (
              <StatusBanner
                kind="error"
                action={
                  <Button
                    onClick={() => {
                      setLoad({ status: 'loading' });
                      setAttempt((n) => n + 1);
                    }}
                  >
                    Try again
                  </Button>
                }
              >
                {load.error}
              </StatusBanner>
            ) : (
              <>
                <Button className="start-practice-btn" onClick={start}>
                  <Swords size={18} /> Start practice <ArrowRight size={16} />
                </Button>
                <Link to="/decks" className="button button-secondary">
                  <Layers3 size={16} /> Build custom deck
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
