
import React, { useState, useEffect } from 'react';
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
  
  const groupedFixtures: { [key: string]: Fixture[] } = fixtures.reduce((acc, fixture) => {
    const leagueName = `${fixture.league.name} - ${fixture.league.country}`;
    if (!acc[leagueName]) {
      acc[leagueName] = [];
    }
    acc[leagueName].push(fixture);
    return acc;
  }, {} as { [key: string]: Fixture[] });

  const leagueNames = Object.keys(groupedFixtures);

  useEffect(() => {
    if (leagueNames.length === 1) {
      setOpenLeagues(new Set(leagueNames));
    } else if (leagueNames.length > 0) {
      setOpenLeagues(new Set([leagueNames[0]]));
    } else {
      setOpenLeagues(new Set());
    }
  }, [fixtures]);

  const toggleLeague = (leagueName: string) => {
    setOpenLeagues(prevOpenLeagues => {
      const newOpenLeagues = new Set(prevOpenLeagues);
      if (newOpenLeagues.has(leagueName)) {
        newOpenLeagues.delete(leagueName);
      } else {
        newOpenLeagues.add(leagueName);
      }
      return newOpenLeagues;
    });
  };

  const expandAll = () => setOpenLeagues(new Set(leagueNames));
  const collapseAll = () => setOpenLeagues(new Set());

  if (fixtures.length === 0) {
    return (
      <div className="text-center p-8 bg-white dark:bg-brand-surface rounded-lg shadow">
        <p className="text-gray-600 dark:text-brand-text-dark text-lg">No matches found for the selected day or filter.</p>
      </div>
    );
  }

  return (
    <div>
      {leagueNames.length > 1 && (
        <div className="flex justify-end space-x-2 mb-4">
          <button onClick={expandAll} className="text-sm bg-gray-200 hover:bg-gray-300 dark:bg-brand-primary dark:hover:bg-brand-secondary text-gray-800 dark:text-brand-text-dark font-semibold py-1 px-3 rounded-lg transition-colors">Expand All</button>
          <button onClick={collapseAll} className="text-sm bg-gray-200 hover:bg-gray-300 dark:bg-brand-primary dark:hover:bg-brand-secondary text-gray-800 dark:text-brand-text-dark font-semibold py-1 px-3 rounded-lg transition-colors">Collapse All</button>
        </div>
      )}
      <div className="space-y-4">
        {Object.entries(groupedFixtures).map(([leagueName, leagueFixtures]) => {
          const isOpen = openLeagues.has(leagueName);
          
          return (
            <div key={leagueName} className="bg-white dark:bg-brand-surface rounded-lg overflow-hidden transition-all duration-300 shadow">
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleLeague(leagueName)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleLeague(leagueName); }}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-brand-primary transition-colors focus:outline-none cursor-pointer"
                aria-expanded={isOpen}
                aria-controls={`league-panel-${leagueFixtures[0].league.id}`}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <img src={leagueFixtures[0].league.logo} alt={leagueName} className="w-8 h-8 object-contain flex-shrink-0"/>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-brand-text-light truncate">{leagueName}</h3>
                </div>

                <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); onAnalyzeLeague(leagueFixtures); }}
                    disabled={isApiLimitReached}
                    className="p-2 rounded-full text-brand-accent hover:bg-gray-200 dark:hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent dark:focus:ring-offset-brand-surface disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent flex items-center justify-center"
                    title={isApiLimitReached ? "Daily free usage limit reached. Try again tomorrow." : "Analyze All Matches in this League"}
                  >
                     <span className="material-symbols-rounded text-2xl">auto_fix_high</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onCopyLeagueMatches(leagueFixtures); }}
                    className="p-2 rounded-full text-gray-500 dark:text-brand-secondary hover:bg-gray-200 dark:hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent dark:focus:ring-offset-brand-surface flex items-center justify-center"
                    title="Copy Match List (Home vs Away)"
                  >
                    <span className="material-symbols-rounded text-xl">content_copy</span>
                  </button>
                  <span 
                    className={`material-symbols-rounded text-2xl text-gray-500 dark:text-brand-secondary transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  >
                    expand_more
                  </span>
                </div>
              </div>
              {isOpen && (
                <div id={`league-panel-${leagueFixtures[0].league.id}`} className="p-4 bg-gray-50 dark:bg-black/20">
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
    </div>
  );
};

export default FixtureList;
