
import React, { useState, useEffect, useMemo } from 'react';
import { Fixture, PredictionState } from '../types';
import FixtureItem from './FixtureItem';

interface FixtureListProps {
  fixtures: Fixture[];
  predictions: { [key: number]: PredictionState };
  onAnalyzeLeague: (fixtures: Fixture[]) => void;
  onCopyLeagueMatches: (fixtures: Fixture[]) => void;
  isApiLimitReached: boolean;
}

const FixtureList: React.FC<FixtureListProps> = ({ fixtures, predictions, onAnalyzeLeague, onCopyLeagueMatches, isApiLimitReached }) => {
  const [openLeagues, setOpenLeagues] = useState<Set<string>>(new Set());
  
  const groupedFixtures: { [key: string]: Fixture[] } = useMemo(() => {
    return fixtures.reduce((acc, fixture) => {
      const leagueName = `${fixture.league.name} - ${fixture.league.country}`;
      if (!acc[leagueName]) acc[leagueName] = [];
      acc[leagueName].push(fixture);
      return acc;
    }, {} as { [key: string]: Fixture[] });
  }, [fixtures]);

  const leagueNames = Object.keys(groupedFixtures);

  useEffect(() => {
    if (leagueNames.length > 0) {
      setOpenLeagues(new Set([leagueNames[0]]));
    }
  }, [fixtures]);

  const toggleLeague = (leagueName: string) => {
    setOpenLeagues(prev => {
      const next = new Set(prev);
      if (next.has(leagueName)) next.delete(leagueName);
      else next.add(leagueName);
      return next;
    });
  };

  if (fixtures.length === 0) {
    return (
      <div className="text-center p-8 bg-white dark:bg-brand-surface rounded-lg shadow">
        <p className="text-gray-600 dark:text-brand-text-dark text-lg">No matches found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedFixtures).map(([leagueName, leagueFixtures]) => {
        const isOpen = openLeagues.has(leagueName);
        const isAnalyzing = leagueFixtures.some(f => predictions[f.fixture.id]?.isLoading);
        const allAnalyzed = leagueFixtures.every(f => predictions[f.fixture.id]?.result || predictions[f.fixture.id]?.error);
        
        return (
          <div key={leagueName} className="bg-white dark:bg-brand-surface rounded-lg overflow-hidden transition-all duration-300 shadow">
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleLeague(leagueName)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-brand-primary transition-colors focus:outline-none cursor-pointer"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <img src={leagueFixtures[0].league.logo} alt="" className="w-8 h-8 object-contain flex-shrink-0"/>
                <h3 className="text-lg font-bold text-gray-900 dark:text-brand-text-light truncate">{leagueName}</h3>
              </div>

              <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                {!allAnalyzed && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onAnalyzeLeague(leagueFixtures); }}
                    disabled={isApiLimitReached || isAnalyzing}
                    className={`p-2 rounded-full flex items-center justify-center transition-all ${isAnalyzing ? 'text-brand-accent animate-spin' : 'text-brand-accent hover:bg-gray-200 dark:hover:bg-brand-primary'}`}
                    title={isApiLimitReached ? "Limit reached" : "Analyze League"}
                  >
                     <span className="material-symbols-rounded text-2xl">
                       {isAnalyzing ? 'sync' : 'auto_fix_high'}
                     </span>
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onCopyLeagueMatches(leagueFixtures); }}
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-brand-primary"
                  title="Copy Matches"
                >
                  <span className="material-symbols-rounded text-xl">content_copy</span>
                </button>
                <span className={`material-symbols-rounded text-2xl text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </div>
            </div>
            {isOpen && (
              <div className="p-4 bg-gray-50 dark:bg-black/20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {leagueFixtures.map(fixture => (
                    <FixtureItem 
                      key={fixture.fixture.id} 
                      fixture={fixture} 
                      predictionState={predictions[fixture.fixture.id]}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FixtureList;
