import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Crown,
  History,
  Shield,
  Sparkles,
  Swords,
  Trophy,
} from 'lucide-react';
import {
  historyResponseSchema,
  leaderboardResponseSchema,
} from '@mythic/shared';
import { useApi } from '../../hooks/api-context.jsx';
import { Button, Skeleton, StatusBanner } from '../../components/index.jsx';

export default function ResultsList({ history = false }) {
  const api = useApi();
  const userId = useSelector((state) => state.session.user?.id);
  const scope = history ? userId : 'public';
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
            scope,
            items: history ? parsed.matches : parsed.players,
            error: null,
          });
      })
      .catch((error) => {
        if (active)
          setResource({
            scope,
            loading: false,
            items: [],
            error: error.message,
          });
      });
    return () => {
      active = false;
    };
  }, [api, userId, history, attempt, scope]);

  if (history && !userId) {
    return (
      <div className="content-panel empty-chronicle-card guest-chronicle-card">
        <div className="empty-chronicle-emblem">
          <div className="emblem-glow violet-glow" />
          <div className="emblem-icon violet">
            <Shield size={34} />
          </div>
        </div>
        <h2>The chronicles await your legend</h2>
        <p className="empty-chronicle-desc">
          Sign in to preserve your combat records, review turn-by-turn match
          histories, and join the race for glory on the global leaderboard.
        </p>
        <div className="empty-chronicle-actions">
          <Link
            to="/login"
            state={{ from: '/history' }}
            className="button button-primary"
          >
            Sign in <ArrowRight size={16} />
          </Link>
          <Link
            to="/register"
            state={{ from: '/history' }}
            className="button button-secondary"
          >
            Create an account
          </Link>
        </div>
        <div className="chronicle-features-grid">
          <div className="chronicle-feature-card">
            <div className="feature-icon gold">
              <Swords size={18} />
            </div>
            <h4>Preserved Records</h4>
            <p>
              Every match outcome, opponent, and turn count is saved permanently
              to your profile.
            </p>
          </div>
          <div className="chronicle-feature-card">
            <div className="feature-icon violet">
              <Crown size={18} />
            </div>
            <h4>Hall of Legends</h4>
            <p>
              Compete on an even playing field for the top spots in the realm’s
              Hall of Legends.
            </p>
          </div>
          <div className="chronicle-feature-card">
            <div className="feature-icon cyan">
              <Sparkles size={18} />
            </div>
            <h4>Full Deck Library</h4>
            <p>
              All twenty original mythic cards are immediately available to
              every registered player.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!api) {
    return (
      <div className="content-panel empty-chronicle-card">
        <div className="empty-chronicle-emblem">
          <div className="emblem-icon">
            <History size={30} />
          </div>
        </div>
        <h2>No results available yet</h2>
        <p className="empty-chronicle-desc">Connecting to arena services...</p>
      </div>
    );
  }

  if (resource.loading || resource.scope !== scope) {
    return (
      <div className="content-panel skeleton-panel">
        <Skeleton
          label={
            history ? 'Loading match history' : 'Loading leaderboard standings'
          }
        />
      </div>
    );
  }

  if (resource.error) {
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
  }

  const items = resource.items || [];
  const total = items.length;
  const wins = history
    ? items.filter(
        (m) => m.outcome.kind === 'WIN' && m.outcome.winnerId === userId,
      ).length
    : 0;
  const defeats = history
    ? items.filter(
        (m) => m.outcome.kind === 'WIN' && m.outcome.winnerId !== userId,
      ).length
    : 0;
  const winRate = total > 0 ? `${Math.round((wins / total) * 100)}%` : '—';

  return (
    <div className="results-container">
      {/* Stats Bar */}
      {history ? (
        <div className="history-stats-bar">
          <div className="history-stat-card">
            <span className="stat-label">
              <Swords size={14} /> Total Battles
            </span>
            <span className="stat-value">{total}</span>
            <span className="stat-hint">1v1 matchmaking</span>
          </div>
          <div className="history-stat-card stat-win">
            <span className="stat-label">
              <Crown size={14} /> Victories
            </span>
            <span className="stat-value">{wins}</span>
            <span className="stat-hint">Decisive triumphs</span>
          </div>
          <div className="history-stat-card stat-defeat">
            <span className="stat-label">
              <Shield size={14} /> Defeats
            </span>
            <span className="stat-value">{defeats}</span>
            <span className="stat-hint">Lessons in battle</span>
          </div>
          <div className="history-stat-card stat-rate">
            <span className="stat-label">
              <Sparkles size={14} /> Win Rate
            </span>
            <span className="stat-value">{winRate}</span>
            <span className="stat-hint">Combat efficacy</span>
          </div>
        </div>
      ) : (
        <div className="history-stats-bar leaderboard-stats-bar">
          <div className="history-stat-card">
            <span className="stat-label">
              <Sparkles size={14} /> Season
            </span>
            <span className="stat-value">Season 01</span>
            <span className="stat-hint">The Dawning Realm</span>
          </div>
          <div className="history-stat-card stat-win">
            <span className="stat-label">
              <Crown size={14} /> Contenders
            </span>
            <span className="stat-value">{total}</span>
            <span className="stat-hint">
              {total === 0 ? 'Awaiting champions' : 'Active legends'}
            </span>
          </div>
          <div className="history-stat-card stat-rate">
            <span className="stat-label">
              <Swords size={14} /> Catalog Access
            </span>
            <span className="stat-value">20 / 20</span>
            <span className="stat-hint">All cards unlocked</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {total === 0 ? (
        <div className="content-panel empty-chronicle-card">
          <div className="empty-chronicle-emblem">
            <div
              className={`emblem-glow ${history ? 'amber-glow' : 'gold-glow'}`}
            />
            <div className={`emblem-icon ${history ? 'amber' : 'gold'}`}>
              {history ? <Swords size={32} /> : <Crown size={32} />}
            </div>
          </div>
          <h2>
            {history
              ? 'Your saga begins with the first clash'
              : 'The throne stands unclaimed'}
          </h2>
          <p className="empty-chronicle-desc">
            {history
              ? 'Your completed online matches will appear here. Practice does not change your record. Enter matchmaking to forge your first victory.'
              : 'The first legends are yet to rise. Win a casual online match to join the leaderboard and claim rank #1.'}
          </p>
          <div className="empty-chronicle-actions">
            <Link to="/lobby" className="button button-primary">
              {history ? 'Enter the arena' : 'Claim Rank #1'}{' '}
              <ArrowRight size={16} />
            </Link>
            {history && (
              <Link to="/practice" className="button button-secondary">
                <Sparkles size={15} /> Practice grounds
              </Link>
            )}
          </div>
          <div className="chronicle-features-grid">
            <div className="chronicle-feature-card">
              <div className="feature-icon gold">
                {history ? <Swords size={18} /> : <Crown size={18} />}
              </div>
              <h4>{history ? 'Casual 1v1 Battles' : 'Pioneer Champion'}</h4>
              <p>
                {history
                  ? 'Challenge live players in tactical combat. Turn counts and end conditions are automatically logged.'
                  : 'Be the very first player to secure a victory and establish the high watermark.'}
              </p>
            </div>
            <div className="chronicle-feature-card">
              <div className="feature-icon violet">
                {history ? <Crown size={18} /> : <Shield size={18} />}
              </div>
              <h4>{history ? 'Hall of Legends' : 'Balanced Warfare'}</h4>
              <p>
                {history
                  ? 'Every victory recorded here directly advances your standing in the realm leaderboard.'
                  : 'Every player commands the full card catalog from day one. Only wits determine the victor.'}
              </p>
            </div>
            <div className="chronicle-feature-card">
              <div className="feature-icon cyan">
                <Sparkles size={18} />
              </div>
              <h4>{history ? 'Practice Without Risk' : 'Instant Updates'}</h4>
              <p>
                {history
                  ? 'Practice mode lets you hone card combos against the apprentice without changing your record.'
                  : 'Standings update automatically as soon as any matchmaking duel concludes.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Results List */
        <div className="results-list">
          {items.map((entry, index) => {
            if (history) {
              const isWinner =
                entry.outcome.kind === 'WIN' &&
                entry.outcome.winnerId === userId;
              const isDraw = entry.outcome.kind === 'DRAW';
              const opponent =
                entry.players?.find((p) => p.id !== userId)?.displayName ||
                'Opponent';
              const outcomeTitle =
                entry.outcome.kind === 'WIN'
                  ? isWinner
                    ? 'Victory'
                    : 'Defeat'
                  : isDraw
                    ? 'Draw'
                    : 'Aborted';
              const dateStr = new Date(entry.endedAt).toLocaleDateString(
                undefined,
                {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                },
              );
              const reason = entry.outcome.reason
                ? entry.outcome.reason.replaceAll('_', ' ').toLowerCase()
                : '';

              return (
                <article
                  key={entry.id}
                  className={`content-panel match-result-card ${
                    isDraw ? 'is-draw' : isWinner ? 'is-victory' : 'is-defeat'
                  }`}
                >
                  <div className="match-outcome-badge">
                    {isWinner ? (
                      <Crown size={18} />
                    ) : isDraw ? (
                      <History size={18} />
                    ) : (
                      <Shield size={18} />
                    )}
                    <span>{outcomeTitle}</span>
                  </div>

                  <div className="match-details">
                    <h2 className="match-title">{outcomeTitle}</h2>
                    <p className="match-opponent">
                      Against <span className="opponent-name">{opponent}</span>
                    </p>
                  </div>

                  <div className="match-stats-pills">
                    <span className="match-pill">
                      <Swords size={13} /> {entry.turns}{' '}
                      {entry.turns === 1 ? 'turn' : 'turns'}
                    </span>
                    {reason && (
                      <span className="match-pill reason-pill">{reason}</span>
                    )}
                    <span className="match-pill time-pill">{dateStr}</span>
                  </div>
                </article>
              );
            }

            // Leaderboard item
            const isTop1 = index === 0;
            const isTop2 = index === 1;
            const isTop3 = index === 2;

            return (
              <article
                key={entry.id || entry.displayName}
                className={`content-panel leaderboard-card ${
                  isTop1 ? 'rank-1' : isTop2 ? 'rank-2' : isTop3 ? 'rank-3' : ''
                }`}
              >
                <div className="leaderboard-rank">
                  {isTop1 ? (
                    <Crown size={22} className="crown-gold" />
                  ) : isTop2 ? (
                    <Trophy size={20} className="trophy-silver" />
                  ) : isTop3 ? (
                    <Trophy size={18} className="trophy-bronze" />
                  ) : (
                    <span className="rank-number">#{index + 1}</span>
                  )}
                </div>
                <div className="leaderboard-player">
                  <h2>{entry.displayName}</h2>
                  <span className="leaderboard-status">
                    {isTop1
                      ? 'Reigning Champion'
                      : isTop2 || isTop3
                        ? 'Master Duelist'
                        : 'Realm Contender'}
                  </span>
                </div>
                <div className="leaderboard-wins">
                  <span className="wins-count">{entry.wins}</span>
                  <span className="wins-label">
                    {entry.wins === 1 ? 'win' : 'wins'}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
