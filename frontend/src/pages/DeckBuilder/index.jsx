import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useBlocker, useBeforeUnload } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Copy,
  Flame,
  Layers3,
  Leaf,
  Moon,
  Plus,
  Save,
  Search,
  Shield,
  Sparkles,
  Sun,
  Swords,
  Trash2,
  Wind,
  X,
} from 'lucide-react';
import {
  catalogResponseSchema,
  deckListSchema,
  playableDeckSchema,
} from '@mythic/shared';
import { AccountGate } from '../../features/auth/Account.jsx';
import { useApi } from '../../hooks/api-context.jsx';
import CardReveal, { useCardTilt } from '../../three/CardReveal.jsx';
import {
  Button,
  Dialog,
  Skeleton,
  StatusBanner,
  Toast,
} from '../../components/index.jsx';

const factions = {
  NORSE: { label: 'Norse', Icon: Wind },
  GREEK: { label: 'Greek', Icon: Sun },
  EGYPTIAN: { label: 'Egyptian', Icon: Flame },
  JAPANESE: { label: 'Japanese', Icon: Moon },
  CELTIC: { label: 'Celtic', Icon: Leaf },
};
export function effectText(card) {
  if (card.kind === 'UNIT')
    return card.keywords.length
      ? card.keywords
          .map((key) =>
            key === 'GUARD'
              ? 'Guard: enemies must attack a Guard unit first.'
              : 'Shield: absorb the next damage instance.',
          )
          .join(' ')
      : 'Can attack once per turn, starting on your next turn.';
  if (card.effect.key === 'DAMAGE')
    return `Deal ${card.effect.amount} damage to an enemy hero or unit.`;
  if (card.effect.key === 'HEAL')
    return `Restore ${card.effect.amount} health to a friendly hero or unit.`;
  return 'Give a friendly hero or unit Shield.';
}
function CardFace({ card, onInspect }) {
  const { Icon, label } = factions[card.faction];
  const tilt = useCardTilt();
  return (
    <button
      {...tilt}
      className={`card-face faction-${card.faction.toLowerCase()}`}
      onClick={() => onInspect(card)}
      aria-label={`Inspect ${card.name}`}
    >
      <span className="card-cost" aria-label={`${card.cost} energy`}>
        {card.cost}
      </span>
      <span className="card-art" aria-hidden="true">
        <span className="rune-ring" />
        <Icon size={42} />
        <span className="rune-line" />
      </span>
      <span className="card-faction">
        {label} · {card.kind === 'UNIT' ? 'Unit' : 'Spell'}
      </span>
      <strong>{card.name}</strong>
      <span className="card-effect">{effectText(card)}</span>
      <span className="card-stats">
        {card.kind === 'UNIT' ? (
          <>
            <span>
              <Swords size={13} /> {card.attack} attack
            </span>
            <span>
              <Shield size={13} /> {card.health} health
            </span>
          </>
        ) : (
          <span>
            <Sparkles size={13} /> {card.effect.key.toLowerCase()}
          </span>
        )}
      </span>
    </button>
  );
}
const blank = () => ({
  id: null,
  name: 'Untitled deck',
  cardIds: [],
  revision: null,
});
const editable = (deck) => ({
  id: deck.id,
  name: deck.name,
  cardIds: [...deck.cardIds],
  revision: deck.revision,
});
function readDraft(userId) {
  try {
    const value = JSON.parse(
      sessionStorage.getItem(`mythic.draft.v1.${userId}`),
    );
    if (
      value &&
      typeof value.name === 'string' &&
      value.name.length <= 60 &&
      Array.isArray(value.cardIds) &&
      value.cardIds.length <= 30 &&
      value.cardIds.every(
        (id) => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(id),
      ) &&
      (value.id === null || typeof value.id === 'string') &&
      (value.revision === null || Number.isInteger(value.revision))
    )
      return value;
  } catch {
    /* A corrupt draft must not break the editor. */
  }
  return null;
}
export default function DeckBuilderPage() {
  return (
    <div className="page deck-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            <span className="gold-line" />
            YOUR COLLECTION
          </p>
          <h1>My decks</h1>
          <p className="subtitle">
            Twenty original cards. Your next great strategy.
          </p>
        </div>
        <span className="collection-badge">
          <Layers3 size={16} /> ALL CARDS AVAILABLE
        </span>
      </div>
      <AccountGate>
        <DeckEditor />
      </AccountGate>
    </div>
  );
}
function DeckEditor() {
  const api = useApi();
  const userId = useSelector((state) => state.session.user.id);
  const [catalog, setCatalog] = useState([]);
  const [decks, setDecks] = useState([]);
  const [draft, setDraft] = useState(blank);
  const [baseline, setBaseline] = useState(blank);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [faction, setFaction] = useState('ALL');
  const [kind, setKind] = useState('ALL');
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );
  useBeforeUnload((event) => {
    if (dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  useEffect(() => {
    let active = true;
    Promise.all([api.request('/cards', { auth: false }), api.request('/decks')])
      .then(([cards, saved]) => {
        if (!active) return;
        const definitions = catalogResponseSchema
          .parse(cards)
          .cards.map((entry) => entry.definition);
        const list = deckListSchema.parse(saved).decks;
        setCatalog(definitions);
        setDecks(list);
        const recovered = readDraft(userId);
        const initial = list[0] ? editable(list[0]) : blank();
        if (recovered) {
          const original = list.find((deck) => deck.id === recovered.id);
          setDraft(
            original || !recovered.id
              ? recovered
              : { ...recovered, id: null, revision: null },
          );
          setBaseline(original ? editable(original) : blank());
          setToast('Your unsaved draft has been restored.');
        } else {
          setDraft(initial);
          setBaseline(initial);
        }
        setStatus('ready');
        setError('');
      })
      .catch((failure) => {
        if (active) {
          setStatus('error');
          setError(failure.message);
        }
      });
    return () => {
      active = false;
    };
  }, [api, userId, loadAttempt]);
  useEffect(() => {
    if (status !== 'ready') return;
    try {
      if (dirty)
        sessionStorage.setItem(
          `mythic.draft.v1.${userId}`,
          JSON.stringify(draft),
        );
      else sessionStorage.removeItem(`mythic.draft.v1.${userId}`);
    } catch {
      /* Edits remain in memory if browser storage is unavailable. */
    }
  }, [draft, dirty, status, userId]);
  const byId = useMemo(
    () => new Map(catalog.map((card) => [card.id, card])),
    [catalog],
  );
  const counts = useMemo(
    () =>
      draft.cardIds.reduce(
        (map, id) => map.set(id, (map.get(id) ?? 0) + 1),
        new Map(),
      ),
    [draft.cardIds],
  );
  const visible = catalog.filter(
    (card) =>
      (faction === 'ALL' || card.faction === faction) &&
      (kind === 'ALL' || card.kind === kind) &&
      `${card.name} ${effectText(card)}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const validation = playableDeckSchema.safeParse({
    name: draft.name,
    cardIds: draft.cardIds,
  });
  const missingIds = draft.cardIds.some((id) => !byId.has(id));
  const valid = validation.success && !missingIds;
  function choose(next) {
    setDraft(next);
    setBaseline(next);
    setError('');
  }
  function requestChoose(next) {
    if (dirty) setConfirm({ type: 'switch', next });
    else choose(next);
  }
  function add(id) {
    if (pending || draft.cardIds.length >= 30 || (counts.get(id) ?? 0) >= 2)
      return;
    setDraft((old) => ({ ...old, cardIds: [...old.cardIds, id] }));
  }
  function remove(id) {
    if (pending) return;
    setDraft((old) => {
      const index = old.cardIds.indexOf(id);
      return index < 0
        ? old
        : { ...old, cardIds: old.cardIds.filter((_, i) => i !== index) };
    });
  }
  function starter() {
    const units = catalog.filter((card) => card.kind === 'UNIT');
    const spells = catalog.filter((card) => card.kind === 'SPELL').slice(0, 5);
    setDraft((old) => ({
      ...old,
      cardIds: [...units, ...spells].flatMap((card) => [card.id, card.id]),
    }));
    setConfirm(null);
  }
  async function save(asCopy = false) {
    if (!valid || pending) return;
    setPending(true);
    setError('');
    try {
      const body = {
        name: asCopy ? `${draft.name.slice(0, 55)} copy` : draft.name,
        cardIds: draft.cardIds,
        ...(!asCopy && draft.id ? { expectedRevision: draft.revision } : {}),
      };
      const { deck } = await api.request(
        !asCopy && draft.id ? `/decks/${draft.id}` : '/decks',
        { method: !asCopy && draft.id ? 'PATCH' : 'POST', body },
      );
      setDecks((old) => [deck, ...old.filter((item) => item.id !== deck.id)]);
      choose(editable(deck));
      setToast(
        asCopy
          ? 'A copy of your deck has been saved.'
          : 'Deck saved. Your strategy is ready to return to.',
      );
    } catch (failure) {
      setError(failure.message);
    } finally {
      setPending(false);
    }
  }
  async function deleteDeck() {
    if (!draft.id || pending) return;
    setPending(true);
    setError('');
    try {
      await api.request(`/decks/${draft.id}`, {
        method: 'DELETE',
        body: { expectedRevision: draft.revision },
      });
      const remaining = decks.filter((deck) => deck.id !== draft.id);
      setDecks(remaining);
      choose(remaining[0] ? editable(remaining[0]) : blank());
      setConfirm(null);
      setToast('Deck deleted.');
    } catch (failure) {
      setConfirm(null);
      setError(failure.message);
    } finally {
      setPending(false);
    }
  }
  async function reloadSaved() {
    setPending(true);
    try {
      const list = deckListSchema.parse(await api.request('/decks')).decks;
      setDecks(list);
      const current = list.find((deck) => deck.id === draft.id);
      choose(current ? editable(current) : blank());
      setConfirm(null);
    } catch (failure) {
      setError(failure.message);
      setConfirm(null);
    } finally {
      setPending(false);
    }
  }
  if (status === 'loading')
    return <Skeleton label="Loading your cards and decks" />;
  if (status === 'error')
    return (
      <StatusBanner
        kind="error"
        action={
          <Button
            onClick={() => {
              setStatus('loading');
              setLoadAttempt((value) => value + 1);
            }}
          >
            Try again
          </Button>
        }
      >
        {error}
      </StatusBanner>
    );
  return (
    <>
      <div className="deck-workspace">
        <aside className="deck-library">
          <div className="deck-library-heading">
            <h2>Your decks</h2>
            <span>{decks.length}</span>
          </div>
          <Button
            variant="secondary"
            onClick={() => requestChoose(blank())}
            disabled={pending}
          >
            <Plus size={16} /> New deck
          </Button>
          {decks.length === 0 && (
            <p className="muted library-empty">
              Your first deck starts here. Pick 30 cards or use the starter
              list.
            </p>
          )}
          <div className="saved-decks">
            {decks.map((deck) => (
              <button
                key={deck.id}
                className={`saved-deck ${draft.id === deck.id ? 'selected' : ''}`}
                onClick={() => requestChoose(editable(deck))}
                disabled={pending}
              >
                <Layers3 size={17} />
                <span>
                  <strong>{deck.name}</strong>
                  <small>30 cards · saved</small>
                </span>
                {draft.id === deck.id && <Check size={14} />}
              </button>
            ))}
          </div>
          <div className="deck-note">
            <Shield size={16} />
            <p>
              Two copies per card.
              <br />
              Thirty cards per deck.
              <br />
              Every card is yours to use.
            </p>
          </div>
        </aside>
        <section className="deck-editor" aria-label="Deck editor">
          <div className="editor-toolbar">
            <div>
              <label htmlFor="deck-name">DECK NAME</label>
              <input
                id="deck-name"
                value={draft.name}
                maxLength={60}
                onChange={(event) =>
                  setDraft((old) => ({ ...old, name: event.target.value }))
                }
                disabled={pending}
              />
            </div>
            <div className="editor-actions">
              <span
                className={`deck-counter ${valid ? 'complete' : ''}`}
                aria-label="Deck card count"
              >
                {draft.cardIds.length}
                <span> / 30</span>
              </span>
              <Button
                onClick={() => save()}
                disabled={!valid || pending || (!dirty && !!draft.id)}
              >
                <Save size={15} />
                {pending ? 'Saving…' : 'Save deck'}
              </Button>
            </div>
          </div>
          <div className="deck-tools">
            <span className={dirty ? 'unsaved' : 'saved'}>
              {dirty
                ? 'Unsaved changes'
                : draft.id
                  ? 'All changes saved'
                  : 'New deck draft'}
            </span>
            <button
              onClick={() =>
                draft.cardIds.length
                  ? setConfirm({ type: 'starter' })
                  : starter()
              }
              disabled={pending}
            >
              Use starter list
            </button>
            <button onClick={() => save(true)} disabled={!valid || pending}>
              <Copy size={13} /> Save a copy
            </button>
            <button
              onClick={() => setConfirm({ type: 'delete' })}
              disabled={!draft.id || pending}
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
          {error && (
            <StatusBanner
              kind="error"
              action={
                draft.id ? (
                  <Button
                    variant="secondary"
                    onClick={() => setConfirm({ type: 'reload' })}
                  >
                    Reload saved deck
                  </Button>
                ) : undefined
              }
            >
              {error} Your draft is preserved.
            </StatusBanner>
          )}
          <div className="deck-validation" role="status">
            {valid ? (
              <>
                <Check size={15} /> Complete deck · ready for practice.
              </>
            ) : (
              <>
                <Layers3 size={15} />
                {!draft.name.trim()
                  ? 'Give your deck a name.'
                  : missingIds
                    ? 'Remove cards that are no longer available.'
                    : `${Math.max(0, 30 - draft.cardIds.length)} more cards needed before saving. Maximum two of each.`}
              </>
            )}
          </div>
          <div className="card-filters">
            <div className="search-field">
              <Search size={16} />
              <input
                aria-label="Search cards"
                placeholder="Search cards or effects…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <select
              aria-label="Filter by faction"
              value={faction}
              onChange={(event) => setFaction(event.target.value)}
            >
              <option value="ALL">All factions</option>
              {Object.entries(factions).map(([value, item]) => (
                <option key={value} value={value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by card type"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
            >
              <option value="ALL">All card types</option>
              <option value="UNIT">Units</option>
              <option value="SPELL">Spells</option>
            </select>
          </div>
          <div className="catalog-heading">
            <h2>Card collection</h2>
            <span>
              {visible.length} of {catalog.length} cards
            </span>
          </div>
          <div className="catalog-grid">
            {visible.map((card) => (
              <article key={card.id} className="catalog-card">
                <CardFace card={card} onInspect={setDetail} />
                <div className="card-controls">
                  <button
                    onClick={() => remove(card.id)}
                    disabled={pending || !counts.get(card.id)}
                    aria-label={`Remove ${card.name}`}
                  >
                    −
                  </button>
                  <span aria-label={`${card.name} copies`}>
                    {counts.get(card.id) ?? 0} / 2
                  </span>
                  <button
                    onClick={() => add(card.id)}
                    disabled={
                      pending ||
                      (counts.get(card.id) ?? 0) >= 2 ||
                      draft.cardIds.length >= 30
                    }
                    aria-label={`Add ${card.name}`}
                  >
                    +
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!visible.length && (
            <div className="no-cards">
              <Search size={22} />
              <p>No cards match those filters.</p>
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery('');
                  setFaction('ALL');
                  setKind('ALL');
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </section>
        <aside className="deck-contents">
          <h2>
            In your deck <span>{draft.cardIds.length}</span>
          </h2>
          {!draft.cardIds.length && (
            <p className="muted">Add cards from the collection to begin.</p>
          )}
          <div className="deck-card-list">
            {[...counts].map(([id, amount]) => (
              <div className="deck-card-row" key={id}>
                <span className="mini-cost">{byId.get(id)?.cost ?? '?'}</span>
                <button
                  className="deck-card-name"
                  onClick={() => byId.get(id) && setDetail(byId.get(id))}
                >
                  {byId.get(id)?.name ?? 'Unavailable card'}
                </button>
                <span>×{amount}</span>
                <button
                  className="remove-card"
                  onClick={() => remove(id)}
                  disabled={pending}
                  aria-label={`Remove one ${byId.get(id)?.name ?? id}`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </aside>
      </div>
      {toast && <Toast message={toast} onDismiss={() => setToast('')} />}
      <Dialog
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.name ?? 'Card details'}
      >
        {detail && (
          <CardReveal card={detail}>
            <div className="card-detail">
              <CardFace card={detail} onInspect={() => {}} />
              <p>{effectText(detail)}</p>
              <p className="muted">
                {factions[detail.faction].label} · {detail.rarity.toLowerCase()}{' '}
                · {detail.cost} energy
              </p>
              <p className="muted">
                Ready for practice and casual online battles. Select a card,
                then choose a legal target during your turn.
              </p>
            </div>
          </CardReveal>
        )}
      </Dialog>
      <Dialog
        open={!!confirm}
        onClose={() => !pending && setConfirm(null)}
        title={
          confirm?.type === 'delete'
            ? 'Delete this deck?'
            : confirm?.type === 'starter'
              ? 'Use the starter list?'
              : 'Discard unsaved changes?'
        }
      >
        <p>
          {confirm?.type === 'delete'
            ? `“${draft.name}” will be permanently removed from your saved decks.`
            : confirm?.type === 'starter'
              ? 'Replace the current card list with a balanced starting point of 30 cards. You can edit it before saving.'
              : 'Your current unsaved edits will be replaced. Save a copy first if you want to keep them.'}
        </p>
        <div className="dialog-actions">
          <Button
            variant="secondary"
            onClick={() => setConfirm(null)}
            disabled={pending}
          >
            Keep editing
          </Button>
          <Button
            onClick={() => {
              if (confirm.type === 'delete') return deleteDeck();
              if (confirm.type === 'starter') return starter();
              if (confirm.type === 'reload') return reloadSaved();
              choose(confirm.next);
              setConfirm(null);
            }}
            disabled={pending}
          >
            {confirm?.type === 'delete'
              ? 'Delete deck'
              : confirm?.type === 'starter'
                ? 'Use starter list'
                : 'Discard changes'}
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Leave your unsaved deck?"
      >
        <p>
          Your unsaved draft is kept on this tab where browser storage is
          available. Stay here to save it before leaving.
        </p>
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => blocker.reset?.()}>
            Keep editing
          </Button>
          <Button onClick={() => blocker.proceed?.()}>
            Leave page <ArrowRight size={15} />
          </Button>
        </div>
      </Dialog>
    </>
  );
}
