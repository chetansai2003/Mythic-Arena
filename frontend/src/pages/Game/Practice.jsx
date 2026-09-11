import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { catalogResponseSchema, deckListSchema } from '@mythic/shared';
import { useApi } from '../../hooks/api-context.jsx';
import { Button, Skeleton, StatusBanner } from '../../components/index.jsx';
import BattleBoard from '../../features/game/BattleBoard.jsx';
import { createPracticeTransport } from '../../services/practice.js';
import '../../styles/battle.css';

export default function Practice() {
  const api = useApi();
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
        if (deckId) {
          const decks = deckListSchema.parse(await api.request('/decks')).decks;
          cardIds = decks.find((deck) => deck.id === deckId)?.cardIds;
          if (!cardIds)
            throw new Error(
              'That deck is unavailable. Return to the lobby and choose one of your decks.',
            );
        }
        if (!cancelled) setLoad({ status: 'ready', cards, cardIds });
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
      <p className="eyebrow">LEARN YOUR LEGENDS</p>
      <h1>Practice grounds</h1>
      <div className="content-panel practice-intro">
        <h2>A quiet place to sharpen your strategy.</h2>
        <p>
          Play a complete 2D match against the arena apprentice.{' '}
          {deckId
            ? 'Use your selected saved deck.'
            : 'A balanced 30-card starter deck is provided.'}{' '}
          Practice runs locally in this tab and awards no leaderboard wins.
        </p>
        <p>
          Both heroes start with 20 health. Summon units, cast spells, and
          reduce the opposing hero to zero. Units wait a turn before attacking.
          Every turn lasts 30 seconds.
        </p>
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
          <Button onClick={start}>Start practice</Button>
        )}
      </div>
    </div>
  );
}
