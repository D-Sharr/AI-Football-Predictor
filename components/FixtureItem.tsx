
import React, { useState } from 'react';
import { Fixture, PredictionState, Tip } from '../types';
import { translateTextStream } from '../services/geminiService';
import AnalysisModal from './AnalysisModal';

interface FixtureItemProps {
  fixture: Fixture;
  predictionState?: PredictionState;
}

const FixtureItem: React.FC<FixtureItemProps> = ({ fixture, predictionState }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const { result: prediction, isLoading, error } = predictionState || { result: null, isLoading: false, error: null };

  const kickoffTime = new Date(fixture.fixture.date).toLocaleTimeString('en-US', {
    timeZone: 'Asia/Yangon',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).replace(' ', '');

  const isFinished = ['FT', 'AET', 'PEN'].includes(fixture.fixture.status.short);

  const handleCopyText = () => {
    if (copied) return;
    const matchDate = new Date(fixture.fixture.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const textToCopy = `${matchDate}, KP Astrology Prediction, ${fixture.teams.home.name} vs ${fixture.teams.away.name}.`;
    navigator.clipboard.writeText(textToCopy).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleTranslate = async () => {
    if (translatedText !== null || !prediction?.analysis) return;

    setIsTranslating(true);
    setTranslatedText("");

    try {
        await translateTextStream(prediction.analysis, 'Burmese', (chunk) => {
            setTranslatedText(prev => (prev === null ? "" : prev) + chunk);
        });
    } catch (err) {
        console.error("Translation failed", err);
        setTranslatedText(null);
    } finally {
        setIsTranslating(false);
    }
  };

  const handleShowOriginal = () => {
      setTranslatedText(null);
  };

  return (
    <>
      <div className="bg-white dark:bg-brand-surface rounded-xl shadow-md border border-gray-100 dark:border-brand-primary/30 flex flex-col justify-between transition-all duration-300 hover:shadow-xl relative overflow-hidden group">
        {/* Header Bar */}
        <div className="p-3 border-b border-gray-50 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-black/10">
          <div className="flex items-center space-x-2">
              {isFinished ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-200 dark:bg-brand-primary text-gray-600 dark:text-brand-text-dark">FINISHED</span>
              ) : (
                  <button 
                    onClick={handleCopyText} 
                    disabled={copied} 
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 hover:bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300 transition-colors disabled:bg-green-500 disabled:text-white"
                  >
                      {copied ? 'COPIED' : 'COPY MATCH'}
                  </button>
              )}
          </div>

          <div className="flex items-center space-x-1">
              {isLoading ? (
                  <div className="text-[10px] font-bold text-brand-accent animate-pulse uppercase tracking-widest">Analyzing...</div>
              ) : prediction ? (
                  <div className="flex space-x-1.5">
                      {prediction.winResult && (
                          <div className="flex items-center bg-indigo-500 rounded px-2.5 py-1 shadow-sm" title={`Predicted Outcome: ${prediction.winResult.value}`}>
                               <span className="text-[11px] font-black text-white">{prediction.winResult.value}</span>
                          </div>
                      )}
                      {prediction.totalGoals && (
                          <div className="flex items-center bg-purple-500 rounded px-2.5 py-1 shadow-sm" title={`Predicted Goals: ${prediction.totalGoals.value}`}>
                               <span className="text-[11px] font-black text-white">{prediction.totalGoals.value}</span>
                          </div>
                      )}
                  </div>
              ) : null}
          </div>
        </div>

        {/* Team Content */}
        <div className="p-4">
          <div className="flex items-center justify-between space-x-2 mb-4">
            <div className="flex-1 flex flex-col items-center text-center">
              <img src={fixture.teams.home.logo} alt="" className="h-12 w-12 object-contain mb-2 drop-shadow-sm transition-transform group-hover:scale-110" />
              <h4 className="font-bold text-xs text-gray-900 dark:text-brand-text-light line-clamp-2">{fixture.teams.home.name}</h4>
            </div>

            <div className="flex flex-col items-center justify-center min-w-[80px]">
              <span className="text-[10px] text-gray-400 dark:text-brand-text-dark font-medium uppercase mb-1">{fixture.league.round}</span>
              {isFinished ? (
                  <span className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
                      {fixture.goals.home} - {fixture.goals.away}
                  </span>
              ) : (
                  <div className="bg-gray-100 dark:bg-black/20 px-3 py-1 rounded-full">
                      <span className="text-sm font-bold text-brand-accent tabular-nums">{kickoffTime}</span>
                  </div>
              )}
            </div>

            <div className="flex-1 flex flex-col items-center text-center">
              <img src={fixture.teams.away.logo} alt="" className="h-12 w-12 object-contain mb-2 drop-shadow-sm transition-transform group-hover:scale-110" />
              <h4 className="font-bold text-xs text-gray-900 dark:text-brand-text-light line-clamp-2">{fixture.teams.away.name}</h4>
            </div>
          </div>

          {/* Quick Predictions Footer (Correct Scores) */}
          {prediction?.correctScores && (
              <div className="flex flex-wrap justify-center gap-2 pt-2 border-t border-gray-50 dark:border-white/5">
                  {prediction.correctScores.map((score, idx) => {
                      const isActual = isFinished && `${fixture.goals.home}-${fixture.goals.away}` === score.replace(/\s/g, '');
                      return (
                          <span key={idx} className={`px-2 py-1 rounded-md text-[11px] font-black border transition-colors ${isActual ? 'bg-green-500 border-green-600 text-white' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 text-gray-600 dark:text-brand-text-dark'}`}>
                              {score}
                          </span>
                      );
                  })}
              </div>
          )}
        </div>

        {/* Action Button Section */}
        {prediction && (
            <div className="px-4 pb-4">
                <button 
                  onClick={() => setIsModalOpen(true)} 
                  className="w-full flex justify-center items-center px-4 py-2.5 rounded-lg text-xs font-bold bg-brand-accent hover:bg-brand-accent/90 text-white transition-all shadow-md active:scale-95"
                >
                  <span className="material-symbols-rounded text-lg mr-2">analytics</span>
                  VIEW KP ANALYSIS
                </button>
            </div>
        )}

        {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/10 m-4 rounded-lg">
                <p className="text-center text-red-500 dark:text-red-400 text-xs font-medium">{error}</p>
            </div>
        )}
      </div>

      {/* Analysis Modal */}
      {prediction && (
        <AnalysisModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          homeTeam={fixture.teams.home}
          awayTeam={fixture.teams.away}
          analysis={prediction.analysis}
          translatedAnalysis={translatedText}
          isTranslating={isTranslating}
          onTranslate={handleTranslate}
          onShowOriginal={handleShowOriginal}
        />
      )}
    </>
  );
};

export default FixtureItem;
