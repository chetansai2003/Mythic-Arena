import PageHeading from '../../components/PageHeading.jsx';
import ResultsList from '../../features/game/ResultsList.jsx';

export default function Leaderboard() {
  return (
    <div className="page leaderboard-page">
      <PageHeading eyebrow="HALL OF LEGENDS" title="Leaderboard">
        Earn your place, one victory at a time.
      </PageHeading>
      <ResultsList />
    </div>
  );
}
