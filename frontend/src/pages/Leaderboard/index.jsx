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
export default function Leaderboard() {
  return (
    <div className="page">
      <PageHeading eyebrow="HALL OF LEGENDS" title="Leaderboard">
        Earn your place, one victory at a time.
      </PageHeading>
      <div className="content-panel">
        <EmptyState icon={Crown} title="The first legends are yet to rise">
          The release leaderboard will count wins in casual online matches.
          Rankings become available with completed match results.
        </EmptyState>
      </div>
    </div>
  );
}
