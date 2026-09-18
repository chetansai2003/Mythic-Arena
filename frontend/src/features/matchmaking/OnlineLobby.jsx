import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOnline } from '../../hooks/online-context.jsx';
import { Button, StatusBanner } from '../../components/index.jsx';

export default function OnlineLobby({ deckId }) {
  const online = useOnline();
  const location = useLocation();
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const [highlighted, setHighlighted] = useState(false);
  const openQueue = useCallback(() => {
    panelRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    panelRef.current
      ?.querySelector('button:not(:disabled)')
      ?.focus({ preventScroll: true });
    setHighlighted(true);
  }, []);
  const found =
    online?.feed.found?.gameId ??
    (['INITIALIZING', 'ACTIVE'].includes(online?.feed.snapshot?.status)
      ? online.feed.snapshot.gameId
      : null);
  useEffect(() => {
    if (found) navigate(`/match/${found}`);
  }, [found, navigate]);
  useEffect(() => {
    if (location.hash !== '#online-queue') return;
    openQueue();
  }, [location.hash, openQueue]);
  useEffect(() => {
    window.addEventListener('mythic:open-online-queue', openQueue);
    return () =>
      window.removeEventListener('mythic:open-online-queue', openQueue);
  }, [openQueue]);
  useEffect(() => {
    if (!highlighted) return;
    const timer = setTimeout(() => setHighlighted(false), 1600);
    return () => clearTimeout(timer);
  }, [highlighted]);
  if (!online) return <p role="status">Connecting to online play…</p>;
  const { client, feed } = online;
  if (!client)
    return (
      <StatusBanner
        kind="error"
        action={
          <Button onClick={() => window.location.reload()}>
            Reload connection
          </Button>
        }
      >
        {feed.error.message}
      </StatusBanner>
    );
  if (feed.connection === 'conflict')
    return (
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
    );
  return (
    <div
      id="online-queue"
      ref={panelRef}
      className={`online-queue ${highlighted ? 'is-highlighted' : ''}`}
      aria-label="Casual battle matchmaking"
    >
      {feed.error && (
        <StatusBanner
          kind="error"
          action={
            <Button onClick={() => void client.resync()}>Reconnect</Button>
          }
        >
          {feed.error.message}
        </StatusBanner>
      )}
      {feed.queue.status === 'QUEUED' ? (
        <>
          <p role="status">Searching for a casual opponent…</p>
          <Button variant="secondary" onClick={() => void client.leave()}>
            Cancel search
          </Button>
        </>
      ) : (
        <Button
          disabled={!deckId || feed.connection !== 'ready'}
          onClick={() => void client.join(deckId)}
        >
          Find an opponent
        </Button>
      )}
    </div>
  );
}
