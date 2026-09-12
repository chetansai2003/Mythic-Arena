import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { catalogResponseSchema } from '@mythic/shared';
import { useOnline } from '../../hooks/online-context.jsx';
import { useApi } from '../../hooks/api-context.jsx';
import { Button, Skeleton, StatusBanner } from '../../components/index.jsx';
import BattleBoard from '../../features/game/BattleBoard.jsx';
import MatchPortal from '../../three/MatchPortal.jsx';
import '../../styles/battle.css';

export default function OnlineMatch() {
  const { gameId } = useParams();
  const { client, feed } = useOnline();
  const api = useApi();
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    void client.watch(gameId);
  }, [client, gameId]);
  useEffect(() => {
    let active = true;
    api
      .request('/cards')
      .then((data) => {
        if (active)
          setCatalog(
            catalogResponseSchema
              .parse(data)
              .cards.map((entry) => entry.definition),
          );
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      });
    return () => {
      active = false;
    };
  }, [api, attempt]);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  const snapshot = feed.snapshot?.gameId === gameId ? feed.snapshot : null;
  if (feed.connection === 'conflict')
    return (
      <div className="page">
        <h1>Battle arena</h1>
        <StatusBanner
          kind="error"
          action={
            <Button onClick={() => client.takeControl()}>
              Take control in this tab
            </Button>
          }
        >
          {feed.error.message}
        </StatusBanner>
      </div>
    );
  if (error)
    return (
      <div className="page">
        <h1>Battle arena</h1>
        <StatusBanner
          kind="error"
          action={
            <Button
              onClick={() => {
                setError(null);
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </Button>
          }
        >
          {error}
        </StatusBanner>
      </div>
    );
  if (!snapshot || !catalog)
    return (
      <div className="page">
        <h1>Battle arena</h1>
        {feed.error ? (
          <StatusBanner
            kind="error"
            action={
              <Button onClick={() => void client.resync()}>
                Restore board
              </Button>
            }
          >
            {feed.error.message}
          </StatusBanner>
        ) : (
          <Skeleton label="Restoring server state" />
        )}
      </div>
    );
  if (snapshot.status === 'INITIALIZING')
    return (
      <div className="page">
        <p className="eyebrow">CASUAL ONLINE MATCH</p>
        <h1>Your opponent is here</h1>
        <MatchPortal
          self={snapshot.self.displayName}
          opponent={snapshot.opponent.displayName}
          gameId={gameId}
        />
        <div className="content-panel">
          <h2>{snapshot.opponent.displayName}</h2>
          <p>
            Both players must be ready. Reservation ends in{' '}
            {Math.max(0, Math.ceil((snapshot.readyEndsAt - clock) / 1000))}{' '}
            seconds.
          </p>
          <Button
            disabled={feed.connection !== 'ready'}
            onClick={() => void client.ready(gameId)}
          >
            Ready to battle
          </Button>
          <p role="status">Waiting for both players to confirm readiness.</p>
          {feed.error && (
            <StatusBanner kind="error">{feed.error.message}</StatusBanner>
          )}
        </div>
      </div>
    );
  return (
    <div className="page practice-page">
      <BattleBoard key={gameId} transport={client} catalog={catalog} online />
    </div>
  );
}
