import React, { useMemo } from 'react';
import Loader from './Loader';

interface AccumulatorModalProps {
  isLoading: boolean;
  data: string | null;
  error: string | null;
  leagueName: string;
  onClose: () => void;
}

interface AccumulatorData {
  title: string;
  bets: string[];
  rationale: string;
}

const AccumulatorTipCard: React.FC<{ data: AccumulatorData }> = ({ data }) => {
  if (!data.title) return null;

  return (
    <div className="bg-gray-100 dark:bg-black/20 p-4 rounded-lg mb-4 last:mb-0">
      <h3 className="text-lg font-bold text-brand-accent mb-3">{data.title}</h3>
      <ul className="space-y-2 mb-4">
        {data.bets.map((bet, index) => (
          <li key={index} className="flex items-start p-2 bg-white dark:bg-brand-surface rounded-md shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span
              className="text-sm text-gray-800 dark:text-brand-text-dark"
              dangerouslySetInnerHTML={{ __html: bet.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-brand-text-light">$1</strong>') }}
            />
          </li>
        ))}
      </ul>
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-brand-text-light mb-1">Rationale:</h4>
        <p className="text-sm text-gray-600 dark:text-brand-text-dark leading-relaxed">{data.rationale}</p>
      </div>
    </div>
  );
};


const AccumulatorModal: React.FC<AccumulatorModalProps> = ({ isLoading, data, error, leagueName, onClose }) => {
    const parsedAccumulators = useMemo(() => {
    if (!data) return null;

    // Split by the main headings, keeping the content.
    const sections = data.split('### ').filter(s => s.trim());
    const accumulators: { safe?: AccumulatorData, value?: AccumulatorData } = {};

    sections.forEach(section => {
      const lines = section.split('\n').filter(l => l.trim());
      const title = lines.shift()?.trim() || '';

      const rationaleIndex = lines.findIndex(line => line.toLowerCase().includes('**rationale:**'));
      
      let bets: string[] = [];
      let rationale = '';

      if (rationaleIndex !== -1) {
        bets = lines.slice(0, rationaleIndex).map(b => b.replace(/^\* /, '').trim());
        rationale = lines.slice(rationaleIndex).join(' ').replace(/\*\*Rationale:\*\*/i, '').trim();
      } else {
        // Fallback if rationale isn't found or formatted differently
        const betLines = lines.filter(l => l.startsWith('* '));
        const rationaleLines = lines.filter(l => !l.startsWith('* '));
        bets = betLines.map(b => b.replace(/^\* /, '').trim());
        rationale = rationaleLines.join(' ').replace(/\*\*Rationale:\*\*/i, '').trim();
      }
      
      const accumulatorData = { title, bets, rationale };

      if (title.toLowerCase().includes('safe')) {
        accumulators.safe = accumulatorData;
      } else if (title.toLowerCase().includes('value')) {
        accumulators.value = accumulatorData;
      }
    });

    return accumulators;
  }, [data]);

  return (
    <div 
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="accumulator-title"
    >
      <div 
        className="bg-white dark:bg-brand-surface rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transition-transform transform scale-95 animate-modal-enter"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-brand-primary">
          <h2 id="accumulator-title" className="text-lg font-bold text-gray-900 dark:text-brand-text-light">
            AI Accumulator Tips: <span className="text-brand-accent">{leagueName}</span>
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-brand-primary" aria-label="Close modal">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-brand-text-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-48 space-y-4">
              <Loader />
              <p className="text-lg font-semibold text-gray-800 dark:text-brand-text-light">Generating Accumulator Bets...</p>
              <p className="text-sm text-gray-600 dark:text-brand-text-dark">The AI is analyzing all matches in the league.</p>
            </div>
          )}
          {error && (
            <div className="text-center text-red-500 dark:text-red-400">
              <h3 className="text-lg font-bold mb-2">An Error Occurred</h3>
              <p>{error}</p>
            </div>
          )}
          {parsedAccumulators && (
            <div>
              {parsedAccumulators.safe && <AccumulatorTipCard data={parsedAccumulators.safe} />}
              {parsedAccumulators.value && <AccumulatorTipCard data={parsedAccumulators.value} />}
            </div>
          )}
        </div>
      </div>
       <style>{`
            @keyframes modal-enter {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
            .animate-modal-enter {
                animation: modal-enter 0.2s ease-out forwards;
            }
        `}</style>
    </div>
  );
};

export default AccumulatorModal;