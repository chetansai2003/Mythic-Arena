import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { legalActions } from '@mythic/game-engine';
import { Button, Dialog, StatusBanner } from '../../components/index.jsx';

const sameTarget = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default function BattleBoard({ transport, catalog, onRestart }) {
  const [feed, setFeed] = useState(() => transport.getSnapshot());
  const [selection, setSelection] = useState(null);
  const [surrender, setSurrender] = useState(false);
  const [resultOpen, setResultOpen] = useState(true);
  const [clock, setClock] = useState(Date.now());
  const seenEvents = useRef(new Set());
  const [eventKey, setEventKey] = useState('initial');
  const [lastEvent, setLastEvent] = useState(
    'Match started. Select a card or unit to see your options.',
  );
  useEffect(
    () =>
      transport.subscribe((update) => {
        setFeed(update);
        const event = update.events.at(-1);
        if (event && !seenEvents.current.has(event.eventId)) {
          seenEvents.current.add(event.eventId);
          setEventKey(event.eventId);
          setSelection(null);
          setLastEvent(
            {
              CARD_PLAYED: 'Card played.',
              ATTACK_RESOLVED: 'Attack resolved.',
              TURN_STARTED: 'A new turn begins.',
              MATCH_ENDED: 'Practice complete.',
            }[event.type],
          );
        }
      }),
    [transport],
  );
  useEffect(() => {
    const timer = setInterval(() => {
      transport.tick?.();
      setClock(Date.now());
    }, 250);
    return () => clearInterval(timer);
  }, [transport]);
  const { snapshot: view, connection, error } = feed;
  const busy = connection === 'pending' || connection === 'resyncing';
  const active = view.status === 'ACTIVE';
  const yourTurn = active && view.turn.playerId === view.self.id;
  const definitions = useMemo(
    () => new Map(catalog.map((card) => [card.id, card])),
    [catalog],
  );
  // The legality preview uses only fields present in the player-safe snapshot.
  const actions = legalActions(
    { ...view, players: [view.self, { ...view.opponent, hand: [] }] },
    view.self.id,
  );
  const selectedCard =
    selection?.kind === 'CARD'
      ? view.self.hand.find((c) => c.instanceId === selection.id)
      : null;
  const selectedUnit =
    selection?.kind === 'UNIT'
      ? view.self.board.find((u) => u.instanceId === selection.id)
      : null;
  const options = actions.filter((action) =>
    selectedCard
      ? action.type === 'PLAY_CARD' &&
        action.payload.cardInstanceId === selectedCard.instanceId
      : selectedUnit
        ? action.type === 'ATTACK' &&
          action.payload.attackerId === selectedUnit.instanceId
        : false,
  );
  const canTarget = (target) =>
    !busy &&
    options.some((action) => sameTarget(action.payload.target, target));
  function submit(action) {
    if (busy || !active) return;
    void transport.send({
      ...action,
      gameId: view.gameId,
      expectedVersion: view.version,
      actionId: crypto.randomUUID(),
    });
  }
  function target(targetValue) {
    const action = options.find((candidate) =>
      sameTarget(candidate.payload.target, targetValue),
    );
    if (action) submit(action);
  }
  const cardName = (id) => definitions.get(id)?.name ?? id;
  const outcomeTitle =
    view.outcome?.kind === 'DRAW'
      ? 'A worthy draw'
      : view.outcome?.kind === 'ABORT'
        ? 'Practice ended'
        : view.outcome?.winnerId === view.self.id
          ? 'Victory'
          : 'Defeat';
  const remaining = view.turn
    ? Math.max(0, Math.ceil((view.turn.endsAt - clock) / 1000))
    : 0;
  const instruction = !active
    ? 'Practice is complete.'
    : !yourTurn
      ? 'The apprentice is thinking. You can inspect your cards.'
      : selectedCard
        ? selectedCard.definition.kind === 'UNIT'
          ? options.length
            ? 'Summon this unit into a free slot.'
            : 'Not enough energy, or your board is full.'
          : options.length
            ? 'Choose a highlighted hero or unit.'
            : 'Not enough energy to cast this spell.'
        : selectedUnit
          ? options.length
            ? 'Choose a highlighted enemy. Guard units must be attacked first.'
            : 'This unit must wait until your next turn, or has no legal target.'
          : 'Select a card from your hand or one of your units.';
  function heroPanel(player, own) {
    const aim = { kind: 'HERO', playerId: player.id };
    return (
      <div className={`battle-hero ${own ? 'friendly' : 'enemy'}`}>
        <div>
          <span className="eyebrow">
            {own ? 'YOUR HERO' : 'PRACTICE OPPONENT'}
          </span>
          <h2>{player.displayName}</h2>
        </div>
        <div className="hero-values">
          <strong
            aria-label={`${own ? 'Your' : 'Opponent'} health ${player.health} of ${player.maxHealth}`}
          >
            {player.health} / {player.maxHealth} HP
          </strong>
          <span>
            {player.energy} / {player.maxEnergy} energy
          </span>
          <span>
            {player.deckCount} in deck
            {own ? '' : ` · ${player.handCount} in hand`}
          </span>
          {player.shield && <span>Shield active</span>}
        </div>
        {options.some((action) => action.payload.target) && (
          <button
            className={`battle-target ${canTarget(aim) ? 'legal-target' : ''}`}
            disabled={!canTarget(aim)}
            onClick={() => target(aim)}
          >
            Target {own ? 'your hero' : 'enemy hero'}
          </button>
        )}
      </div>
    );
  }
  function row(player, own) {
    return (
      <section
        tabIndex={0}
        className="unit-row"
        aria-label={own ? 'Your board' : 'Opponent board'}
      >
        {Array.from({ length: 5 }, (_, i) => {
          const unit = player.board[i];
          if (!unit)
            return (
              <div
                key={`empty_${i}`}
                className="unit-slot empty-slot"
                aria-label={`Empty ${own ? 'friendly' : 'enemy'} slot ${i + 1}`}
              >
                Empty slot
              </div>
            );
          const aim = { kind: 'UNIT', instanceId: unit.instanceId };
          const legal = canTarget(aim);
          return (
            <div
              className={`unit-slot ${selection?.id === unit.instanceId ? 'selected' : ''} ${legal ? 'legal-target' : ''}`}
              key={unit.instanceId}
            >
              <strong>{cardName(unit.definitionId)}</strong>
              <span>
                {unit.attack} ATK · {unit.health}/{unit.maxHealth} HP
              </span>
              <span>
                {[unit.guard && 'Guard', unit.shield && 'Shield']
                  .filter(Boolean)
                  .join(' · ') || 'Unit'}
              </span>
              {own && (
                <button
                  aria-pressed={selection?.id === unit.instanceId}
                  onClick={() =>
                    setSelection({ kind: 'UNIT', id: unit.instanceId })
                  }
                >
                  Select {cardName(unit.definitionId)}
                </button>
              )}
              {own && (
                <small>
                  {unit.canAttack && yourTurn ? 'Ready to attack' : 'Waiting'}
                </small>
              )}
              {options.some((action) => action.payload.target) && (
                <button disabled={!legal} onClick={() => target(aim)}>
                  Target {cardName(unit.definitionId)}
                </button>
              )}
            </div>
          );
        })}
      </section>
    );
  }
  return (
    <div className="battle-screen">
      <div className="battle-toolbar">
        <div>
          <p className="eyebrow">LOCAL PRACTICE · NO RANKING CREDIT</p>
          <h1>Battle arena</h1>
        </div>
        <Button
          variant="secondary"
          onClick={() => setSurrender(true)}
          disabled={!active || busy}
        >
          Surrender
        </Button>
      </div>
      <div className="battle-turn">
        <strong>
          {active
            ? yourTurn
              ? 'Your turn'
              : 'Opponent turn'
            : 'Match complete'}
        </strong>
        <span>
          Turn {view.turn?.number ?? '—'} ·{' '}
          <span aria-label="Seconds remaining">{remaining}s</span>
        </span>
        <Button
          onClick={() => submit({ type: 'END_TURN', payload: {} })}
          disabled={!yourTurn || busy}
        >
          End turn
        </Button>
      </div>
      {error && (
        <StatusBanner
          kind="error"
          action={
            <Button onClick={() => void transport.resync()}>
              Restore board
            </Button>
          }
        >
          {error.message}
        </StatusBanner>
      )}
      <p
        key={eventKey}
        className={`battle-announcement ${eventKey !== 'initial' ? 'accepted-move' : ''}`}
        role="status"
      >
        {busy
          ? connection === 'pending'
            ? 'Waiting for the move to resolve…'
            : 'Restoring the board…'
          : lastEvent}
      </p>
      {heroPanel(view.opponent, false)}
      {row(view.opponent, false)}
      <div className="battle-divider">THE FIELD OF LEGENDS</div>
      {row(view.self, true)}
      {heroPanel(view.self, true)}
      <div className="battle-guidance">
        <p>{instruction}</p>
        {selection && (
          <button onClick={() => setSelection(null)}>Clear selection</button>
        )}
        {selectedCard?.definition.kind === 'UNIT' && (
          <Button
            disabled={!options.length || busy}
            onClick={() => submit(options[0])}
          >
            Summon {selectedCard.definition.name}
          </Button>
        )}
      </div>
      <section aria-label="Your hand" className="battle-hand">
        {view.self.hand.map((card) => (
          <button
            key={card.instanceId}
            className={`hand-card ${selection?.id === card.instanceId ? 'selected' : ''}`}
            aria-pressed={selection?.id === card.instanceId}
            onClick={() => setSelection({ kind: 'CARD', id: card.instanceId })}
          >
            <span className="hand-cost">{card.definition.cost} energy</span>
            <strong>{card.definition.name}</strong>
            <span>
              {card.definition.kind === 'UNIT'
                ? `${card.definition.attack} ATK · ${card.definition.health} HP`
                : card.definition.effect.key}
            </span>
            <span>
              {card.definition.kind === 'UNIT'
                ? card.definition.keywords.join(' · ') || 'Unit'
                : card.definition.effect.target === 'ENEMY_CHARACTER'
                  ? 'Enemy target'
                  : 'Friendly target'}
            </span>
          </button>
        ))}
        {!view.self.hand.length && (
          <p>Your hand is empty. End your turn to continue.</p>
        )}
      </section>
      {selectedCard && (
        <div className="battle-card-detail" aria-label="Selected card details">
          <h2>{selectedCard.definition.name}</h2>
          <p>
            {selectedCard.definition.kind === 'UNIT'
              ? 'Units wait until your next turn to attack. Guard forces enemies to attack it first; Shield absorbs the next positive damage instance.'
              : selectedCard.definition.effect.key === 'DAMAGE'
                ? `Deal ${selectedCard.definition.effect.amount} damage to an enemy hero or unit. Spells bypass Guard.`
                : selectedCard.definition.effect.key === 'HEAL'
                  ? `Restore ${selectedCard.definition.effect.amount} health to a friendly hero or unit, up to its starting maximum.`
                  : 'Give a friendly hero or unit Shield. Shield does not stack.'}
          </p>
        </div>
      )}
      <p className="battle-note">
        Practice runs in this tab. Reloading or leaving ends it; no result is
        saved to your account. Use Tab and Enter to select, summon, target, or
        end your turn.
      </p>
      <Dialog
        open={surrender}
        onClose={() => setSurrender(false)}
        title="Surrender this practice match?"
      >
        <p>
          The apprentice wins this practice. Your saved decks and account record
          stay unchanged.
        </p>
        <Button variant="secondary" onClick={() => setSurrender(false)}>
          Keep playing
        </Button>
        <Button
          onClick={() => {
            setSurrender(false);
            submit({ type: 'SURRENDER', payload: {} });
          }}
        >
          Confirm surrender
        </Button>
      </Dialog>
      <Dialog
        open={!active && resultOpen}
        onClose={() => setResultOpen(false)}
        title={outcomeTitle}
      >
        <p>
          {view.outcome?.reason === 'TURN_LIMIT'
            ? 'The 100-turn limit was reached.'
            : view.outcome?.reason === 'SURRENDER'
              ? 'The match ended by surrender.'
              : view.outcome?.kind === 'DRAW'
                ? 'Both heroes fell in the same resolution.'
                : 'A hero has fallen.'}{' '}
          This was a practice match. No leaderboard points were awarded.
        </p>
        <Button onClick={onRestart}>Practice again</Button>
        <Link className="button button-secondary" to="/lobby">
          Return to lobby
        </Link>
      </Dialog>
      {!active && !resultOpen && (
        <Button onClick={() => setResultOpen(true)}>View result</Button>
      )}
    </div>
  );
}
