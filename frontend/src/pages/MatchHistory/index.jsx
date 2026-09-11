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
export default function HistoryPage() {
  return (
    <div className="page">
      <PageHeading eyebrow="THE CHRONICLES" title="Match history">
        A record of every hard-fought battle.
      </PageHeading>
      <div className="content-panel">
        <EmptyState icon={History} title="Your chronicle awaits">
          Completed matches will appear here once online play is available. No
          matches have been played in this preview.
        </EmptyState>
      </div>
    </div>
  );
}
