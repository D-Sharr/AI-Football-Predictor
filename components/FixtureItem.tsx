import React, { useState } from 'react';
import { Fixture, PredictionState, Tip } from '../types';

interface FixtureItemProps {
  fixture: Fixture;
  predictionState?: PredictionState;
  onGetPrediction: (fixture: Fixture) => void;
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
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          <circle
            className="text-gray-300 dark:text-brand-secondary"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            className={`${getStrokeColor(confidence)} transition-all duration-500 ease-out`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        <span className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-xs font-bold text-gray-700 dark:text-brand-text-light">
          {confidence}%
        </span>
      </div>
    );
  };


const FixtureItem: React.FC<FixtureItemProps> = ({ fixture, predictionState, onGetPrediction }) => {
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false);

  const { result: prediction, isLoading, error } = predictionState || { result: null, isLoading: false, error: null };

  const kickoffTime = new Date(fixture.fixture.date).toLocaleTimeString('en-US', {
    timeZone: 'Asia/Yangon',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).replace(' ', '');

  const finishedMatchStatuses = ['FT', 'AET', 'PEN'];
  const isFinished = finishedMatchStatuses.includes(fixture.fixture.status.short);

  const handleGetPrediction = () => {
    onGetPrediction(fixture);
  };
  
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 75) return 'bg-green-600/80 text-white';
    if (confidence >= 50) return 'bg-yellow-500/80 text-black';
    return 'bg-gray-500/80 text-white';
  };
  
  const validateTip = (tip: Tip, fixture: Fixture): 'correct' | 'incorrect' | 'unknown' => {
    const homeGoals = fixture.goals.home;
    const awayGoals = fixture.goals.away;

    if (homeGoals === null || awayGoals === null) return 'unknown';

    const tipValue = tip.value.toUpperCase();

    try {
        switch (tip.bet) {
            case 'Match Result':
                if (tipValue === 'W1') return homeGoals > awayGoals ? 'correct' : 'incorrect';
                if (tipValue === 'X') return homeGoals === awayGoals ? 'correct' : 'incorrect';
                if (tipValue === 'W2') return homeGoals < awayGoals ? 'correct' : 'incorrect';
                break;
            case 'Double Chance':
                if (tipValue === '1X') return homeGoals >= awayGoals ? 'correct' : 'incorrect';
                if (tipValue === '12') return homeGoals !== awayGoals ? 'correct' : 'incorrect';
                if (tipValue === '2X') return homeGoals <= awayGoals ? 'correct' : 'incorrect';
                break;
            case 'Both Teams to Score':
                if (tipValue === 'BTTS') return homeGoals > 0 && awayGoals > 0 ? 'correct' : 'incorrect';
                if (tipValue === 'BTTS-NO') return homeGoals === 0 || awayGoals === 0 ? 'correct' : 'incorrect';
                break;
            case 'Total Goals': {
                const parts = tipValue.split(' ');
                const condition = parts[0];
                const value = parseFloat(parts[1]);
                if (isNaN(value)) return 'unknown';
                const totalGoals = homeGoals + awayGoals;
                if (condition === 'TO') return totalGoals > value ? 'correct' : 'incorrect';
                if (condition === 'TU') return totalGoals < value ? 'correct' : 'incorrect';
                break;
            }
            case 'Team Total Goals': {
                const parts = tipValue.substring(1).split(' ');
                const condition = parts[0];
                const value = parseFloat(parts[1]);
                if (isNaN(value)) return 'unknown';
                if (tipValue.startsWith('1')) {
                    if (condition === 'TO') return homeGoals > value ? 'correct' : 'incorrect';
                    if (condition === 'TU') return homeGoals < value ? 'correct' : 'incorrect';
                } else if (tipValue.startsWith('2')) {
                    if (condition === 'TO') return awayGoals > value ? 'correct' : 'incorrect';
                    if (condition === 'TU') return awayGoals < value ? 'correct' : 'incorrect';
                }
                break;
            }
            case 'Asian Handicap': {
                const parts = tipValue.split(' ');
                const team = parts[0];
                const handicap = parseFloat(parts[1]);
                if (isNaN(handicap)) return 'unknown';
                if (team === 'H') return (homeGoals + handicap) > awayGoals ? 'correct' : 'incorrect';
                if (team === 'A') return (awayGoals + handicap) > homeGoals ? 'correct' : 'incorrect';
                break;
            }
            case 'Correct Score': {
                const scores = tipValue.split('-');
                const predictedHome = parseInt(scores[0]);
                const predictedAway = parseInt(scores[1]);
                if (isNaN(predictedHome) || isNaN(predictedAway)) return 'unknown';
                return homeGoals === predictedHome && awayGoals === predictedAway ? 'correct' : 'incorrect';
            }
            default:
                return 'unknown';
        }
    } catch (e) {
        return 'unknown';
    }
    return 'unknown';
  };

  const bestTip = prediction?.bestTip;

  return (
    <div className="bg-white dark:bg-brand-surface rounded-lg shadow-lg flex flex-col justify-between transition-shadow duration-300 hover:shadow-xl relative overflow-hidden">
      <div className="p-4">
        {/* Card Header */}
        <div className="flex justify-between items-center mb-2 text-xs font-semibold">
           <div className={`px-2 py-1 rounded-md ${isFinished ? 'bg-yellow-500 text-black' : 'bg-gray-200 dark:bg-brand-primary text-gray-800 dark:text-brand-text-dark'}`}>
                {isFinished ? 'FINISHED' : kickoffTime}
           </div>

            {isLoading ? (
                <div className="flex items-center justify-center space-x-1 bg-blue-500/80 text-white px-2 py-1 rounded-md animate-pulse">
                    <span>Analyzing...</span>
                </div>
            ) : bestTip ? (
                <div title={`Confidence: ${bestTip.confidence}%`} className={`px-2 py-1 rounded-md transition-colors ${getConfidenceColor(bestTip.confidence)}`}>
                    {bestTip.value}
                </div>
            ) : (
                <button
                    onClick={handleGetPrediction}
                    className="flex items-center justify-center space-x-1 bg-brand-accent text-white px-2 py-1 rounded-md hover:bg-teal-500 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 00-1-1v-.5a1.5 1.5 0 01-3 0v.5a1 1 0 00-1 1H6a1 1 0 01-1-1v-3a1 1 0 011-1h.5a1.5 1.5 0 000-3H6a1 1 0 01-1-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" /></svg>
                    <span>AI Tips</span>
                </button>
            )}
        </div>
        
        {/* Round info */}
        <div className="text-center text-xs text-gray-500 dark:text-brand-secondary mb-2 leading-tight">
          {fixture.league.round}
        </div>

        {/* Teams Section */}
        <div className="flex items-center justify-around text-center mb-4">
          <div className="flex-1 flex flex-col items-center px-1">
            <img src={fixture.teams.home.logo} alt={fixture.teams.home.name} className="h-12 w-12 object-contain mb-2" />
            <h4 className="font-bold text-gray-900 dark:text-brand-text-light leading-tight">{fixture.teams.home.name}</h4>
          </div>
          
          <div className="text-2xl font-bold text-gray-800 dark:text-brand-text-light px-2">
            {isFinished ? `${fixture.goals.home} - ${fixture.goals.away}` : 'vs'}
          </div>

          <div className="flex-1 flex flex-col items-center px-1">
            <img src={fixture.teams.away.logo} alt={fixture.teams.away.name} className="h-12 w-12 object-contain mb-2" />
            <h4 className="font-bold text-gray-900 dark:text-brand-text-light leading-tight">{fixture.teams.away.name}</h4>
          </div>
        </div>
      </div>
        
      {/* Prediction Details - Expands */}
      {prediction && (
          <div className="bg-gray-50 dark:bg-black/20 p-4 border-t border-gray-200 dark:border-brand-primary">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-center">
                {prediction.tips.map((tip) => {
                    const validationResult = isFinished ? validateTip(tip, fixture) : 'unknown';
                    return (
                        <div key={`${tip.bet}-${tip.value}`} className="relative bg-white dark:bg-brand-surface p-2 rounded-lg shadow flex flex-col items-center justify-center space-y-1">
                            {validationResult === 'correct' && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-500 rounded-full p-0.5 shadow-lg z-10">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                             {validationResult === 'incorrect' && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full p-0.5 shadow-lg z-10">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                            )}

                            <CircularProgress confidence={tip.confidence} />
                            <p className="text-sm text-gray-900 dark:text-brand-text-light font-bold leading-tight">{tip.value}</p>
                        </div>
                    );
                })}
            </div>

              <div className="mt-4">
                  <button onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)} className="w-full flex justify-between items-center text-left p-2 bg-gray-200 dark:bg-brand-primary rounded-md hover:bg-gray-300 dark:hover:bg-brand-secondary transition-colors">
                      <span className="font-semibold text-sm text-gray-900 dark:text-brand-text-light">Detailed Analysis</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform transition-transform ${isAnalysisExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                  </button>
                  {isAnalysisExpanded && (
                      <div className="mt-2 p-3 bg-white dark:bg-brand-surface rounded-md text-sm text-gray-700 dark:text-brand-text-dark max-h-64 overflow-y-auto">
                          <SimpleMarkdown text={prediction.analysis} />
                      </div>
                  )}
              </div>
          </div>
      )}
      
      {error && <div className="p-4 text-center text-red-500 dark:text-red-400 text-xs border-t border-gray-200 dark:border-brand-primary">{error}</div>}
    </div>
  );
};

export default FixtureItem;