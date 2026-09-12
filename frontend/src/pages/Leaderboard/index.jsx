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
import ResultsList from '../../features/game/ResultsList.jsx';
export default function Leaderboard() {
  return (
    <div className="page">
      <PageHeading eyebrow="HALL OF LEGENDS" title="Leaderboard">
        Earn your place, one victory at a time.
      </PageHeading>
      <div className="content-panel">
        <ResultsList />
      </div>
    </div>
  );
}
