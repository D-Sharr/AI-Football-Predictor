
import React, { useState } from 'react';
import { Fixture, PredictionState, Tip } from '../types';
import { translateText } from '../services/geminiService';

interface FixtureItemProps {
  fixture: Fixture;
  predictionState?: PredictionState;
}

const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const elements = text.split('\n').map((line, index) => {
    if (line.startsWith('### ')) {
      return <h3 key={index} className="text-lg font-semibold mt-3 mb-1 text-brand-accent">{line.substring(4)}</h3>;
    }
    if (line.startsWith('**')) {
        const boldEnd = line.indexOf('**', 2);
        const boldText = line.substring(2, boldEnd);
        const restText = line.substring(boldEnd + 2);
       return <p key={index} className="my-1"><strong className="text-gray-900 dark:text-brand-text-light">{boldText}</strong>{restText}</p>;
    }
    if (line.trim() === '') {
      return <br key={index} />;
    }
    return <p key={index} className="my-1">{line}</p>;
  });
  return <>{elements}</>;
};

const CircularProgress: React.FC<{ confidence: number }> = ({ confidence }) => {
    const size = 60;
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (confidence / 100) * circumference;
  
    const getStrokeColor = (conf: number): string => {
      if (conf >= 75) return 'stroke-green-500';
      if (conf >= 50) return 'stroke-yellow-500';
      return 'stroke-gray-500';
    };
  
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle className="text-gray-300 dark:text-brand-secondary" strokeWidth={strokeWidth} stroke="currentColor" fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
          <circle className={`${getStrokeColor(confidence)} transition-all duration-500 ease-out`} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" stroke="currentColor" fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
        </svg>
        <span className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-xs font-bold text-gray-700 dark:text-brand-text-light">{confidence}%</span>
      </div>
    );
  };

const FixtureItem: React.FC<FixtureItemProps> = ({ fixture, predictionState }) => {
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false);
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
    // Modified: removed "Most Likely Scores" from the copied text
    const textToCopy = `${matchDate}, KP Astrology Prediction, ${fixture.teams.home.name} vs ${fixture.teams.away.name}.`;
    navigator.clipboard.writeText(textToCopy).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleTranslate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (translatedText || !prediction?.analysis) return;

    setIsTranslating(true);
    try {
        const result = await translateText(prediction.analysis, 'Burmese');
        setTranslatedText(result);
    } catch (err) {
        console.error("Translation failed", err);
    } finally {
        setIsTranslating(false);
    }
  };

  const handleShowOriginal = (e: React.MouseEvent) => {
      e.stopPropagation();
      setTranslatedText(null);
  };

  const isValidTipType = (value: string): boolean => {
    const upperValue = value.toUpperCase().trim();
    const resultMarkets = ['W1', 'X', 'W2', '1X', '12', '2X'];
    if (resultMarkets.includes(upperValue)) return true;
    return /^T[OU]\s*[\d.]+$/.test(upperValue);
  };

  const validateTip = (tip: Tip, fixture: Fixture): 'correct' | 'incorrect' | 'unknown' | 'uncheckable' => {
    const homeGoals = fixture.goals.home;
    const awayGoals = fixture.goals.away;
    if (homeGoals === null || awayGoals === null) return 'unknown';

    const val = tip.value.toUpperCase().trim();
    
    // Total Goals
    const tgMatch = val.match(/^(T[OU])\s*([\d.]+)$/);
    if (tgMatch) {
        const [, condition, lineStr] = tgMatch;
        const line = parseFloat(lineStr);
        const total = homeGoals + awayGoals;
        if (condition === 'TO') return total > line ? 'correct' : 'incorrect';
        if (condition === 'TU') return total < line ? 'correct' : 'incorrect';
    }

    // Results
    if (val === 'W1') return homeGoals > awayGoals ? 'correct' : 'incorrect';
    if (val === 'X') return homeGoals === awayGoals ? 'correct' : 'incorrect';
    if (val === 'W2') return homeGoals < awayGoals ? 'correct' : 'incorrect';
    if (val === '1X') return homeGoals >= awayGoals ? 'correct' : 'incorrect';
    if (val === '12') return homeGoals !== awayGoals ? 'correct' : 'incorrect';
    if (val === '2X') return homeGoals <= awayGoals ? 'correct' : 'incorrect';

    return 'unknown';
  };

  return (
    <div className="bg-white dark:bg-brand-surface rounded-lg shadow-lg flex flex-col justify-between transition-shadow duration-300 hover:shadow-xl relative overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-start mb-2 text-xs font-semibold">
          {isFinished ? (
              <div className="px-2 py-1 rounded-md bg-amber-500 text-black">FINISHED</div>
          ) : (
              <button onClick={handleCopyText} disabled={copied} className="px-2 py-1 rounded-md bg-sky-200 hover:bg-sky-300 text-sky-800 dark:bg-sky-800 dark:hover:bg-sky-700 dark:text-sky-100 transition-all disabled:bg-green-500 disabled:text-white">
                  {copied ? 'Copied!' : 'Copy Text'}
              </button>
          )}

          <div className="flex items-center space-x-2">
            {isLoading ? (
                <div className="bg-blue-500/80 text-white px-2 py-1 rounded-md animate-pulse">Analyzing...</div>
            ) : (
              <>
                <div className="flex items-center space-x-1">
                  {prediction?.safeTip && (
                      <div className="flex items-center space-x-1 px-2 py-1 rounded-md bg-cyan-600 text-white" title="Safe KP Tip">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                          <span>{prediction.safeTip.value}</span>
                      </div>
                  )}
                  {prediction?.valueTip && (
                      <div className="flex items-center space-x-1 px-2 py-1 rounded-md bg-orange-600 text-white" title="Value KP Tip">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm-.707 10.607a1 1 0 011.414 0l.707-.707a1 1 0 11-1.414-1.414l-.707.707zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
                          <span>{prediction.valueTip.value}</span>
                      </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-around text-center mb-3">
          <div className="flex-1 flex flex-col items-center px-1 min-w-0">
            <img src={fixture.teams.home.logo} alt="" className="h-10 w-10 object-contain mb-2" />
            <h4 className="font-bold text-xs text-gray-900 dark:text-brand-text-light truncate w-full">{fixture.teams.home.name}</h4>
          </div>
          <div className="text-gray-800 dark:text-brand-text-light px-2 flex flex-col items-center">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-normal whitespace-nowrap mb-0.5">{fixture.league.round}</span>
            {isFinished ? <span className="text-xl font-bold">{fixture.goals.home} - {fixture.goals.away}</span> : <span className="text-sm font-bold">{kickoffTime}</span>}
          </div>
          <div className="flex-1 flex flex-col items-center px-1 min-w-0">
            <img src={fixture.teams.away.logo} alt="" className="h-10 w-10 object-contain mb-2" />
            <h4 className="font-bold text-xs text-gray-900 dark:text-brand-text-light truncate w-full">{fixture.teams.away.name}</h4>
          </div>
        </div>

        {/* Most Likely Goals - Relocated to Bottom Center of Main Card */}
        {prediction?.correctScores && prediction.correctScores.length > 0 && (
            <div className="flex flex-col items-center justify-center pb-1">
                <h5 className="text-[9px] uppercase tracking-wider font-bold text-gray-400 dark:text-brand-text-dark mb-1">Most Likely Goals</h5>
                <div className="flex flex-wrap justify-center gap-2">
                    {prediction.correctScores.map((score, idx) => {
                        const isActual = isFinished && `${fixture.goals.home}-${fixture.goals.away}` === score.replace(/\s/g, '');
                        return (
                            <span key={idx} className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${isActual ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-white/5 dark:border-white/10 dark:text-brand-text-light'}`}>
                                {score}
                            </span>
                        );
                    })}
                </div>
            </div>
        )}
      </div>
        
      {prediction && (
          <div className="bg-gray-50 dark:bg-black/20 p-4 border-t border-gray-200 dark:border-brand-primary">
              <div className="grid grid-cols-2 gap-3 text-center mb-4">
                {prediction.tips
                    .filter(tip => isValidTipType(tip.value))
                    .sort((a, b) => b.confidence - a.confidence)
                    .slice(0, 4)
                    .map((tip) => {
                    const validation = isFinished ? validateTip(tip, fixture) : 'unknown';
                    return (
                        <div key={`${tip.bet}-${tip.value}`} className="relative bg-white dark:bg-brand-surface p-2 rounded-lg shadow flex flex-col items-center space-y-1">
                            {isFinished && (
                                <div className={`absolute -top-2 left-1/2 -translate-x-1/2 rounded-full p-0.5 shadow-lg z-10 ${validation === 'correct' ? 'bg-green-500' : validation === 'incorrect' ? 'bg-red-500' : 'hidden'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                      {validation === 'correct' ? <path d="M5 13l4 4L19 7" /> : <path d="M6 18L18 6M6 6l12 12" />}
                                    </svg>
                                </div>
                            )}
                            <CircularProgress confidence={tip.confidence} />
                            <p className="text-xs text-gray-900 dark:text-brand-text-light font-bold">{tip.value}</p>
                        </div>
                    );
                })}
            </div>

              <div className="mt-4">
                  <button onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)} className="w-full flex justify-between items-center p-2 bg-gray-200 dark:bg-brand-primary rounded-md text-sm font-semibold">
                      <span className="truncate">KP Astrology Analysis</span>
                      <div className="flex items-center space-x-2">
                          {isAnalysisExpanded && !translatedText && (
                              <span 
                                  onClick={handleTranslate} 
                                  className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-300 px-2 py-1 rounded hover:bg-blue-500 hover:text-white transition-colors z-10 whitespace-nowrap"
                              >
                                  {isTranslating ? 'Translating...' : 'Translate to Burmese'}
                              </span>
                          )}
                          {isAnalysisExpanded && translatedText && (
                              <span 
                                  onClick={handleShowOriginal}
                                  className="text-xs bg-gray-500/10 text-gray-600 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-500 hover:text-white transition-colors z-10 whitespace-nowrap"
                              >
                                  Show Original
                              </span>
                          )}
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transform transition-transform ${isAnalysisExpanded ? 'rotate-180' : ''} flex-shrink-0`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                      </div>
                  </button>
                  {isAnalysisExpanded && (
                      <div className="mt-2 p-3 bg-white dark:bg-brand-surface rounded-md text-xs text-gray-700 dark:text-brand-text-dark max-h-64 overflow-y-auto">
                          <SimpleMarkdown text={translatedText || prediction.analysis} />
                      </div>
                  )}
              </div>
          </div>
      )}
      {error && <div className="p-4 text-center text-red-500 text-xs">{error}</div>}
    </div>
  );
};

export default FixtureItem;
