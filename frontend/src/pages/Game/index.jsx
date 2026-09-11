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
export default function MatchPage() {
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
          Playable matches arrive after the game engine and multiplayer
          milestones. This link does not connect to a live game.
        </EmptyState>
      </div>
    </div>
  );
}
