
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Fixture, PredictionState, BatchPrediction } from './types';
import { getDailyFixtures, clearCacheForDate } from './services/footballApiService';
import { getLeaguePredictions } from './services/geminiService';
import { canMakeApiCall, recordApiCall } from './services/usageTracker';
import Header from './components/Header';
import FixtureList from './components/FixtureList';
import Loader from './components/Loader';
import DateNavigator from './components/DateNavigator';
import LeagueFilter from './components/LeagueFilter';
import { PREFERRED_LEAGUE_IDS } from './constants';
import { getContinent, continentSortOrder } from './utils';

const App: React.FC = () => {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [isLoadingFixtures, setIsLoadingFixtures] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [availableLeagues, setAvailableLeagues] = useState<string[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [theme, setTheme] = useState('light');
  const [isApiLimitReached, setIsApiLimitReached] = useState<boolean>(() => !canMakeApiCall());
  const [predictions, setPredictions] = useState<{ [key: number]: PredictionState }>({});
  
  // Track IDs currently being processed to prevent duplicate API calls
  const processingIds = useRef<Set<number>>(new Set());

  const updateApiUsage = useCallback(() => {
    setIsApiLimitReached(!canMakeApiCall());
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  
  const fetchFixtures = useCallback(async (date: Date) => {
    setIsLoadingFixtures(true);
    setError(null);
    setFixtures([]);
    setAvailableLeagues([]);
    setSelectedLeague('all');
    try {
      const dailyFixtures = await getDailyFixtures(date);
      const allFixtures = dailyFixtures.filter(fixture => 
        !/(women|u-?\d\d)/i.test(fixture.league.name) && !/(women|u-?\d\d)/i.test(fixture.league.round)
      );
      
      allFixtures.sort((a, b) => {
        const rankA = PREFERRED_LEAGUE_IDS.indexOf(a.league.id);
        const rankB = PREFERRED_LEAGUE_IDS.indexOf(b.league.id);
        if (rankA !== -1 && rankB === -1) return -1;
        if (rankA === -1 && rankB !== -1) return 1;
        if (rankA !== -1 && rankB !== -1) return rankA - rankB;
        
        const continentA = getContinent(a.league.country);
        const continentB = getContinent(b.league.country);
        const indexA = continentSortOrder.indexOf(continentA);
        const indexB = continentSortOrder.indexOf(continentB);
        if (indexA !== indexB) return indexA - indexB;
        return a.league.name.localeCompare(b.league.name);
      });

      const uniqueLeagues = Array.from(new Set(allFixtures.map(f => `${f.league.name} - ${f.league.country}`)));
      setFixtures(allFixtures);
      setAvailableLeagues(uniqueLeagues);
    } catch (err) {
      setError('Failed to fetch match fixtures.');
    } finally {
      setIsLoadingFixtures(false);
    }
  }, []);

  useEffect(() => {
    fetchFixtures(selectedDate);
  }, [fetchFixtures, selectedDate]);

  const handleAnalyzeLeague = useCallback(async (fixturesInLeague: Fixture[]) => {
    if (isApiLimitReached) return;

    // Filter out matches already being analyzed or already analyzed
    const fixturesToAnalyze = fixturesInLeague.filter(f => 
      !predictions[f.fixture.id]?.result && 
      !predictions[f.fixture.id]?.isLoading &&
      !processingIds.current.has(f.fixture.id)
    );

    if (fixturesToAnalyze.length === 0) return;

    const chunkSize = 3;
    for (let i = 0; i < fixturesToAnalyze.length; i += chunkSize) {
      if (!canMakeApiCall()) {
        setIsApiLimitReached(true);
        break;
      }

      const chunk = fixturesToAnalyze.slice(i, i + chunkSize);
      chunk.forEach(f => processingIds.current.add(f.fixture.id));

      setPredictions(prev => {
        const next = { ...prev };
        chunk.forEach(f => {
          next[f.fixture.id] = { result: null, isLoading: true, error: null };
        });
        return next;
      });

      recordApiCall();
      updateApiUsage();

      const onPrediction = (p: BatchPrediction) => {
        setPredictions(prev => ({
          ...prev,
          [p.fixtureId]: { result: p.prediction, isLoading: false, error: null }
        }));
        processingIds.current.delete(p.fixtureId);
      };

      const onError = (err: Error) => {
        const msg = err.message || "Analysis failed";
        setPredictions(prev => {
          const next = { ...prev };
          chunk.forEach(f => {
            if (next[f.fixture.id]?.isLoading) {
              next[f.fixture.id] = { result: null, isLoading: false, error: msg };
            }
            processingIds.current.delete(f.fixture.id);
          });
          return next;
        });
      };

      const onComplete = () => {
        setPredictions(prev => {
          const next = { ...prev };
          chunk.forEach(f => {
            if (next[f.fixture.id]?.isLoading) {
              next[f.fixture.id] = { ...next[f.fixture.id], isLoading: false };
            }
            processingIds.current.delete(f.fixture.id);
          });
          return next;
        });
      };

      try {
        await getLeaguePredictions(chunk, onPrediction, onError, onComplete);
      } catch (err) {
        console.error("Batch error", err);
      }
    }
  }, [predictions, isApiLimitReached, updateApiUsage]);

  const handleRefresh = useCallback(async () => {
    clearCacheForDate(selectedDate);
    setPredictions({});
    processingIds.current.clear();
    await fetchFixtures(selectedDate);
  }, [selectedDate, fetchFixtures]);

  return (
    <div className="min-h-screen font-sans">
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main className="container mx-auto p-4 md:p-8">
        <DateNavigator selectedDate={selectedDate} onDateChange={(d) => setSelectedDate(d)} />
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-brand-text-light">Matches</h2>
          <button onClick={handleRefresh} disabled={isLoadingFixtures} className="flex items-center space-x-2 bg-gray-200 dark:bg-brand-primary py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
            <span className={`material-symbols-rounded text-xl ${isLoadingFixtures ? 'animate-spin' : ''}`}>refresh</span>
            <span>Refresh</span>
          </button>
        </div>
        {isLoadingFixtures ? (
          <div className="flex justify-center items-center h-64"><Loader /></div>
        ) : error ? (
          <div className="text-center p-8 bg-white dark:bg-brand-surface rounded-lg shadow"><p className="text-red-500">{error}</p></div>
        ) : (
          <>
            <LeagueFilter leagues={availableLeagues} selectedLeague={selectedLeague} onLeagueChange={(l) => setSelectedLeague(l)} />
            <FixtureList 
              fixtures={selectedLeague === 'all' ? fixtures : fixtures.filter(f => `${f.league.name} - ${f.league.country}` === selectedLeague)} 
              predictions={predictions}
              onAnalyzeLeague={handleAnalyzeLeague}
              onCopyLeagueMatches={(fx) => {
                const text = fx.map(f => `${f.teams.home.name} vs ${f.teams.away.name}`).join('\n');
                navigator.clipboard.writeText(text).then(() => alert("Copied!"));
              }}
              isApiLimitReached={isApiLimitReached}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default App;
