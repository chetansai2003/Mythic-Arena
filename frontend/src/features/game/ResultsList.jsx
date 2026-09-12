import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  historyResponseSchema,
  leaderboardResponseSchema,
} from '@mythic/shared';
import { useApi } from '../../hooks/api-context.jsx';
import { Button, Skeleton, StatusBanner } from '../../components/index.jsx';

export default function ResultsList({ history = false }) {
  const api = useApi();
  const userId = useSelector((state) => state.session.user?.id);
  const [resource, setResource] = useState({
    loading: true,
    items: [],
    error: null,
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!api || (history && !userId)) return;
    let active = true;
    api
      .request(history ? '/matches' : '/leaderboard')
      .then((data) => {
        const parsed = (
          history ? historyResponseSchema : leaderboardResponseSchema
        ).parse(data);
        if (active)
          setResource({
            loading: false,
            items: history ? parsed.matches : parsed.players,
            error: null,
          });
      })
      .catch((error) => {
        if (active)
          setResource({ loading: false, items: [], error: error.message });
      });
    return () => {
      active = false;
    };
  }, [api, userId, history, attempt]);
  if (history && !userId)
    return (
      <p>
        <Link to="/login">Sign in</Link> to see your completed online matches.
      </p>
    );
  if (!api) return <p>No results to show yet.</p>;
  if (resource.loading) return <Skeleton label="Loading match results" />;
  if (resource.error)
    return (
      <StatusBanner
        kind="error"
        action={
          <Button onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
        }
      >
        {resource.error}
      </StatusBanner>
    );
  if (!resource.items.length)
    return (
      <p>
        {history
          ? 'Your completed online matches will appear here. Practice does not change your record.'
          : 'The first legends are yet to rise. Win a casual online match to join the leaderboard.'}
      </p>
    );
  return (
    <div className="results-list">
      {resource.items.map((entry, index) =>
        history ? (
          <article key={entry.id} className="content-panel">
            <h2>
              {entry.outcome.kind === 'WIN'
                ? entry.outcome.winnerId === userId
                  ? 'Victory'
                  : 'Defeat'
                : entry.outcome.kind === 'DRAW'
                  ? 'Draw'
                  : 'Aborted'}
            </h2>
            <p>
              Against {entry.players.find((p) => p.id !== userId)?.displayName}{' '}
              · {entry.turns} turns
            </p>
            <p>
              {new Date(entry.endedAt).toLocaleString()} ·{' '}
              {entry.outcome.reason.replaceAll('_', ' ').toLowerCase()}
            </p>
          </article>
        ) : (
          <article key={entry.id} className="content-panel">
            <h2>
              {index + 1}. {entry.displayName}
            </h2>
            <p>
              {entry.wins} {entry.wins === 1 ? 'win' : 'wins'}
            </p>
          </article>
        ),
      )}
    </div>
  );
}
