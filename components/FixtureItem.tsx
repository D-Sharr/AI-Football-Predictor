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
  
  const validateTip = (tip: Tip, fixture: Fixture): 'correct' | 'incorrect' | 'unknown' | 'uncheckable' => {
    const homeGoals = fixture.goals.home;
    const awayGoals = fixture.goals.away;

    if (homeGoals === null || awayGoals === null) return 'unknown';

    const tipValue = tip.value.toUpperCase().trim();
    const tipBet = tip.bet.toLowerCase();
    
    // Check for uncheckable types by bet name first
    if (tipBet.includes('corner')) {
        return 'uncheckable';
    }

    // --- Regex-based checks on tipValue for higher accuracy ---

    // Team Total Goals (e.g., '1TO 1.5', '2TU 0.5')
    let match = tipValue.match(/^([12])(T[OU])\s*([\d.]+)$/);
    if (match) {
        const [, team, condition, valueStr] = match;
        const value = parseFloat(valueStr);
        if (isNaN(value)) return 'unknown';

        const teamGoals = team === '1' ? homeGoals : awayGoals;
        
        if (condition === 'TO') return teamGoals > value ? 'correct' : 'incorrect';
        if (condition === 'TU') return teamGoals < value ? 'correct' : 'incorrect';
        return 'unknown';
    }

    // Total Goals (e.g., 'TO 2.5', 'TU 1.5')
    match = tipValue.match(/^(T[OU])\s*([\d.]+)$/);
    if (match) {
        const [, condition, valueStr] = match;
        const value = parseFloat(valueStr);
        if (isNaN(value)) return 'unknown';

        const totalGoals = homeGoals + awayGoals;
        if (condition === 'TO') return totalGoals > value ? 'correct' : 'incorrect';
        if (condition === 'TU') return totalGoals < value ? 'correct' : 'incorrect';
        return 'unknown';
    }
    
    // Asian Handicap (e.g., 'H -0.5', 'A +1.0')
    match = tipValue.match(/^([HA])\s*([+-]?[\d.]+)$/);
    if (match) {
        const [, team, handicapStr] = match;
        const handicap = parseFloat(handicapStr);
        if (isNaN(handicap)) return 'unknown';

        if (team === 'H') return (homeGoals + handicap) > awayGoals ? 'correct' : 'incorrect';
        if (team === 'A') return (awayGoals + handicap) > homeGoals ? 'correct' : 'incorrect';
        return 'unknown';
    }

    // Correct Score (e.g., '2-1')
    match = tipValue.match(/^(\d+)-(\d+)$/);
    if (match) {
        const [, predictedHome, predictedAway] = match.map(s => parseInt(s, 10));
        if (isNaN(predictedHome) || isNaN(predictedAway)) return 'unknown';
        return homeGoals === predictedHome && awayGoals === predictedAway ? 'correct' : 'incorrect';
    }

    // HT/FT (e.g., 'W1/W2', 'X/W1')
    match = tipValue.match(/^(W1|W2|X)\/(W1|W2|X)$/);
    if (match) {
        const htHomeGoals = fixture.score?.halftime?.home;
        const htAwayGoals = fixture.score?.halftime?.away;
        if (htHomeGoals === null || htAwayGoals === null || typeof htHomeGoals === 'undefined' || typeof htAwayGoals === 'undefined') {
            return 'unknown';
        }
        
        const [, predictedHt, predictedFt] = match;

        let actualHt: string;
        if (htHomeGoals > htAwayGoals) actualHt = 'W1';
        else if (htHomeGoals < htAwayGoals) actualHt = 'W2';
        else actualHt = 'X';

        let actualFt: string;
        if (homeGoals > awayGoals) actualFt = 'W1';
        else if (homeGoals < awayGoals) actualFt = 'W2';
        else actualFt = 'X';
        
        return (predictedHt === actualHt && predictedFt === actualFt) ? 'correct' : 'incorrect';
    }

    // --- Simple string checks for common values ---

    // Match Result (W1, X, W2)
    if (tipValue === 'W1') return homeGoals > awayGoals ? 'correct' : 'incorrect';
    if (tipValue === 'X') return homeGoals === awayGoals ? 'correct' : 'incorrect';
    if (tipValue === 'W2') return homeGoals < awayGoals ? 'correct' : 'incorrect';
    
    // Double Chance (1X, 12, 2X)
    if (tipValue === '1X') return homeGoals >= awayGoals ? 'correct' : 'incorrect';
    if (tipValue === '12') return homeGoals !== awayGoals ? 'correct' : 'incorrect';
    if (tipValue === '2X') return homeGoals <= awayGoals ? 'correct' : 'incorrect';
    
    // BTTS (BTTS, BTTS-NO)
    if (tipValue === 'BTTS') return homeGoals > 0 && awayGoals > 0 ? 'correct' : 'incorrect';
    if (tipValue === 'BTTS-NO') return homeGoals === 0 || awayGoals === 0 ? 'correct' : 'incorrect';

    // If no match after all checks, we don't know how to validate it.
    return 'unknown';
  };


  return (
    <div className="bg-white dark:bg-brand-surface rounded-lg shadow-lg flex flex-col justify-between transition-shadow duration-300 hover:shadow-xl relative overflow-hidden">
      <div className="p-4">
        {/* Card Header */}
        <div className="flex justify-between items-center mb-2 text-xs font-semibold">
           <div className={`px-2 py-1 rounded-md ${isFinished ? 'bg-amber-500 text-black' : 'bg-gray-200 dark:bg-brand-primary text-gray-800 dark:text-brand-text-dark'}`}>
                {isFinished ? 'FINISHED' : kickoffTime}
           </div>

            {isLoading ? (
                <div className="flex items-center justify-center space-x-1 bg-blue-500/80 text-white px-2 py-1 rounded-md animate-pulse">
                    <span>Analyzing...</span>
                </div>
            ) : prediction ? (
                <div className="flex items-center space-x-1">
                    {prediction.safeTip && (
                        <div title={`Safe Tip. Confidence: ${prediction.safeTip.confidence}%`} className="flex items-center space-x-1 px-2 py-1 rounded-md bg-cyan-500 text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span>{prediction.safeTip.value}</span>
                        </div>
                    )}
                    {prediction.valueTip && (
                        <div title={`Value Tip. Confidence: ${prediction.valueTip.confidence}%`} className="flex items-center space-x-1 px-2 py-1 rounded-md bg-orange-500 text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm-.707 10.607a1 1 0 011.414 0l.707-.707a1 1 0 11-1.414-1.414l-.707.707zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                            </svg>
                            <span>{prediction.valueTip.value}</span>
                        </div>
                    )}
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
          <div className="flex-1 flex flex-col items-center px-1 min-w-0">
            <img src={fixture.teams.home.logo} alt={fixture.teams.home.name} className="h-12 w-12 object-contain mb-2" />
            <h4 className="font-bold text-sm text-gray-900 dark:text-brand-text-light leading-tight truncate w-full">{fixture.teams.home.name}</h4>
          </div>
          
          <div className="text-2xl font-bold text-gray-800 dark:text-brand-text-light px-2">
            {isFinished ? `${fixture.goals.home} - ${fixture.goals.away}` : 'vs'}
          </div>

          <div className="flex-1 flex flex-col items-center px-1 min-w-0">
            <img src={fixture.teams.away.logo} alt={fixture.teams.away.name} className="h-12 w-12 object-contain mb-2" />
            <h4 className="font-bold text-sm text-gray-900 dark:text-brand-text-light leading-tight truncate w-full">{fixture.teams.away.name}</h4>
          </div>
        </div>
        
        {/* Correct Scores Section */}
        {prediction?.correctScores && prediction.correctScores.length > 0 && (
          <div className="border-t border-gray-200 dark:border-brand-primary mt-4 pt-3 text-center">
            <h5 className="text-xs font-semibold text-gray-500 dark:text-brand-secondary mb-2 uppercase tracking-wider">Most Likely Scores</h5>
            <div className="flex justify-center space-x-2">
              {prediction.correctScores.slice(0, 3).map((score, index) => (
                <span key={index} className="px-3 py-1 bg-gray-100 dark:bg-brand-primary rounded-full text-sm font-bold text-gray-800 dark:text-brand-text-dark">
                  {score}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
        
      {/* Prediction Details - Expands */}
      {prediction && (
          <div className="bg-gray-50 dark:bg-black/20 p-4 border-t border-gray-200 dark:border-brand-primary">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-center">
                {prediction.tips
                    .filter(tip => tip.bet.toLowerCase() !== 'correct score')
                    .sort((a, b) => b.confidence - a.confidence)
                    .slice(0, 6)
                    .map((tip) => {
                    const validationResult = isFinished ? validateTip(tip, fixture) : 'unknown';
                    return (
                        <div key={`${tip.bet}-${tip.value}`} className="relative bg-white dark:bg-brand-surface p-2 rounded-lg shadow flex flex-col items-center justify-center space-y-1">
                            {isFinished && validationResult === 'correct' && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-500 rounded-full p-0.5 shadow-lg z-10">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                             {isFinished && validationResult === 'incorrect' && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full p-0.5 shadow-lg z-10">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                            )}
                            {isFinished && (validationResult === 'uncheckable' || validationResult === 'unknown') && (
                                <div 
                                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-400 dark:bg-gray-600 rounded-full p-0.5 shadow-lg z-10" 
                                    title={validationResult === 'uncheckable' ? "Result for this tip type is not available" : "Could not determine result for this tip"}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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