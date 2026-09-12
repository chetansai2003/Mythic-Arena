import { Link } from 'react-router-dom';
import {
  ArrowRight,
  History,
  Crown,
  Swords,
  Sparkles,
  WandSparkles,
  Volume2,
} from 'lucide-react';
import { EmptyState, Toast } from '../../components/index.jsx';
import PageHeading from '../../components/PageHeading.jsx';
import { lazy, Suspense } from 'react';
import { useOnline } from '../../hooks/online-context.jsx';
const OnlineMatch = lazy(() => import('./OnlineMatch.jsx'));
export default function MatchPage() {
  const online = useOnline();
  if (online?.client)
    return (
      <Suspense fallback={<p role="status">Loading battle…</p>}>
        <OnlineMatch />
      </Suspense>
    );
  return (
    <div className="page">
      <PageHeading eyebrow="THE BATTLEFIELD" title="Battle arena">
        Clarity in every turn. Purpose in every move.
      </PageHeading>
      <div className="content-panel">
        <EmptyState
          icon={Swords}
          title="No active match"
          action={
            <Link className="button button-primary" to="/lobby">
              Return to lobby <ArrowRight size={16} />
            </Link>
          }
        >
          Sign in and find an opponent in the lobby, or play against the
          apprentice in <Link to="/practice">Practice grounds</Link>.
        </EmptyState>
      </div>
    </div>
  );
}
