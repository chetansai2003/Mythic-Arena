import PageHeading from '../../components/PageHeading.jsx';
import ResultsList from '../../features/game/ResultsList.jsx';

export default function HistoryPage() {
  return (
    <div className="page history-page">
      <PageHeading eyebrow="THE CHRONICLES" title="Match history">
        A record of every hard-fought battle.
      </PageHeading>
      <ResultsList history />
    </div>
  );
}
