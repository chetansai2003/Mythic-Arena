import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Layers3, ArrowRight } from 'lucide-react';
import { deckListSchema } from '@mythic/shared';
import { useApi } from '../../hooks/api-context.jsx';
import { Button, Skeleton, StatusBanner } from '../../components/index.jsx';
import OnlineLobby from '../matchmaking/OnlineLobby.jsx';

export default function LobbyDecks() {
  const user = useSelector((state) => state.session.user);
  const api = useApi();
  const [state, setState] = useState({
    status: 'loading',
    decks: [],
    selected: '',
    error: '',
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!user || !api) return;
    let active = true;
    api
      .request('/decks')
      .then((data) => {
        if (!active) return;
        const decks = deckListSchema.parse(data).decks;
        let preferred;
        try {
          preferred = localStorage.getItem(`mythic.selectedDeck.${user.id}`);
        } catch {
          /* Selection can remain in memory. */
        }
        setState({
          status: 'ready',
          decks,
          selected: decks.some((deck) => deck.id === preferred)
            ? preferred
            : (decks[0]?.id ?? ''),
          error: '',
        });
      })
      .catch((error) => {
        if (active)
          setState({
            status: 'error',
            decks: [],
            selected: '',
            error: error.message,
          });
      });
    return () => {
      active = false;
    };
  }, [user, api, attempt]);
  if (!user)
    return (
      <div className="lobby-deck-selector">
        <Layers3 size={22} />
        <div>
          <h2>Your first deck awaits</h2>
          <p>Sign in to build and save your own 30-card strategy.</p>
        </div>
        <Link to="/login" className="button button-secondary">
          Sign in <ArrowRight size={15} />
        </Link>
      </div>
    );
  if (state.status === 'loading')
    return <Skeleton label="Loading your saved decks" />;
  if (state.status === 'error')
    return (
      <StatusBanner
        kind="error"
        action={
          <Button onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
        }
      >
        {state.error}
      </StatusBanner>
    );
  return (
    <div className="lobby-deck-selector">
      <Layers3 size={22} />
      <div>
        <h2>Your battle deck</h2>
        <p>
          {state.decks.length
            ? 'Saved and ready for the battles ahead.'
            : 'Create your first deck to start your collection.'}
        </p>
      </div>
      {state.decks.length > 0 && (
        <select
          aria-label="Choose your deck"
          value={state.selected}
          onChange={(event) => {
            const selected = event.target.value;
            setState((old) => ({ ...old, selected }));
            try {
              localStorage.setItem(`mythic.selectedDeck.${user.id}`, selected);
            } catch {
              /* Memory fallback. */
            }
          }}
        >
          {state.decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.name} · 30 cards
            </option>
          ))}
        </select>
      )}
      <Link to="/decks" className="button button-secondary">
        {state.decks.length ? 'Edit decks' : 'Build a deck'}
        <ArrowRight size={15} />
      </Link>
      {state.selected && (
        <Link
          to={`/practice?deck=${encodeURIComponent(state.selected)}`}
          className="button button-primary"
        >
          Practice with deck
        </Link>
      )}
      <OnlineLobby deckId={state.selected} />
    </div>
  );
}
