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
export default function HistoryPage() {
  return (
    <div className="page">
      <PageHeading eyebrow="THE CHRONICLES" title="Match history">
        A record of every hard-fought battle.
      </PageHeading>
      <div className="content-panel">
        <ResultsList history />
      </div>
    </div>
  );
}
