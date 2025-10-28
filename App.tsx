import React, { useState, useEffect, useCallback } from 'react';
import { Fixture, PredictionState } from './types';
import { getDailyFixtures, clearCacheForDate } from './services/footballApiService';
import { getMatchPrediction, getAccumulatorPrediction } from './services/geminiService';
import Header from './components/Header';
import FixtureList from './components/FixtureList';
import Loader from './components/Loader';
import DateNavigator from './components/DateNavigator';
import LeagueFilter from './components/LeagueFilter';
import { PREFERRED_LEAGUE_IDS } from './constants';
import { getContinent, continentSortOrder } from './utils';
import AccumulatorModal from './components/AccumulatorModal';

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

  const [theme, setTheme] = useState('dark');

  // State to hold all predictions, keyed by fixture ID
  const [predictions, setPredictions] = useState<{ [key: number]: PredictionState }>({});

  const [accumulatorState, setAccumulatorState] = useState<{
    isLoading: boolean;
    data: string | null;
    error: string | null;
    leagueName: string | null;
  }>({ isLoading: false, data: null, error: null, leagueName: null });


  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };
  
  const fetchFixtures = useCallback(async (date: Date) => {
    setIsLoadingFixtures(true);
    setError(null);
    setFixtures([]);
    setAvailableLeagues([]);
    setSelectedLeague('all');
    // Clear old predictions when date changes
    setPredictions({});
    try {
      const dailyFixtures = await getDailyFixtures(date);
      
      const allFixtures = dailyFixtures.filter(fixture => 
        !/(women|u-?\d\d)/i.test(fixture.league.name) && !/(women|u-?\d\d)/i.test(fixture.league.round)
      );
      
      allFixtures.sort((a, b) => {
        const rankA = PREFERRED_LEAGUE_IDS.indexOf(a.league.id);
        const rankB = PREFERRED_LEAGUE_IDS.indexOf(b.league.id);

        const isAPreferred = rankA !== -1;
        const isBPreferred = rankB !== -1;

        if (isAPreferred && !isBPreferred) return -1;
        if (!isAPreferred && isBPreferred) return 1;

        if (isAPreferred && isBPreferred) {
          if (rankA !== rankB) {
            return rankA - rankB;
          }
        }

        const continentA = getContinent(a.league.country);
        const continentB = getContinent(b.league.country);
        const indexA = continentSortOrder.indexOf(continentA);
        const indexB = continentSortOrder.indexOf(continentB);

        if (indexA !== indexB) {
          const effectiveIndexA = indexA === -1 ? Infinity : indexA;
          const effectiveIndexB = indexB === -1 ? Infinity : indexB;
          return effectiveIndexA - effectiveIndexB;
        }

        if (a.league.name !== b.league.name) {
            return a.league.name.localeCompare(b.league.name);
        }
        
        return new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime();
      });

      const uniqueLeagues = Array.from(
        new Set(allFixtures.map(f => `${f.league.name} - ${f.league.country}`))
      );

      setFixtures(allFixtures);
      setAvailableLeagues(uniqueLeagues);

    } catch (err) {
      setError('Failed to fetch match fixtures. The API might be unavailable or the daily limit reached.');
      console.error(err);
    } finally {
      setIsLoadingFixtures(false);
    }
  }, []);

  useEffect(() => {
    fetchFixtures(selectedDate);
  }, [fetchFixtures, selectedDate]);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  const handleLeagueChange = (league: string) => {
    setSelectedLeague(league);
  };

  const handleGetPrediction = useCallback(async (fixture: Fixture) => {
    const fixtureId = fixture.fixture.id;
    if (predictions[fixtureId]?.result || predictions[fixtureId]?.isLoading) {
        return;
    }

    setPredictions(prev => ({
        ...prev,
        [fixtureId]: { result: null, isLoading: true, error: null }
    }));

    try {
        const result = await getMatchPrediction(fixture);
        setPredictions(prev => ({
            ...prev,
            [fixtureId]: { result, isLoading: false, error: null }
        }));
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        setPredictions(prev => ({
            ...prev,
            [fixtureId]: { result: null, isLoading: false, error: errorMessage }
        }));
    }
  }, [predictions]);

  const filteredFixtures = selectedLeague === 'all'
    ? fixtures
    : fixtures.filter(f => `${f.league.name} - ${f.league.country}` === selectedLeague);

  
  const handleRefresh = useCallback(async () => {
    clearCacheForDate(selectedDate);
    await fetchFixtures(selectedDate);
  }, [selectedDate, fetchFixtures]);


  const formatDisplayDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.getTime() === today.getTime()) return "Today's Matches";
    if (date.getTime() === yesterday.getTime()) return "Yesterday's Matches";
    if (date.getTime() === tomorrow.getTime()) return "Tomorrow's Matches";
    return `Matches for ${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
  };

  const handleAnalyzeLeague = useCallback(async (fixturesInLeague: Fixture[]) => {
    fixturesInLeague.forEach(fixture => {
        handleGetPrediction(fixture);
    });
  }, [handleGetPrediction]);


  const handleGetAccumulatorTips = useCallback(async (fixturesInLeague: Fixture[], leagueName: string) => {
    setAccumulatorState({ isLoading: true, data: null, error: null, leagueName });
    try {
        const result = await getAccumulatorPrediction(fixturesInLeague, leagueName);
        setAccumulatorState({ isLoading: false, data: result, error: null, leagueName });
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while generating accumulator tips.";
        setAccumulatorState({ isLoading: false, data: null, error: errorMessage, leagueName });
    }
  }, []);

  const closeAccumulatorModal = () => {
    setAccumulatorState({ isLoading: false, data: null, error: null, leagueName: null });
  };


  return (
    <div className="min-h-screen font-sans">
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main className="container mx-auto p-4 md:p-8">
        <DateNavigator selectedDate={selectedDate} onDateChange={handleDateChange} />
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-brand-text-light">
            {formatDisplayDate(selectedDate)}
          </h2>
          <button
            onClick={handleRefresh}
            disabled={isLoadingFixtures}
            className="flex items-center space-x-2 bg-gray-200 hover:bg-gray-300 dark:bg-brand-primary dark:hover:bg-brand-secondary text-gray-800 dark:text-brand-text-dark font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh match data"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isLoadingFixtures ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            <span>{isLoadingFixtures ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

        {isLoadingFixtures ? (
          <div className="flex justify-center items-center h-64">
            <Loader />
          </div>
        ) : error ? (
          <div className="text-center p-8 bg-white dark:bg-brand-surface rounded-lg shadow">
            <p className="text-red-500 dark:text-red-400 text-lg">{error}</p>
          </div>
        ) : (
          <>
            {fixtures.length > 0 && (
              <LeagueFilter
                leagues={availableLeagues}
                selectedLeague={selectedLeague}
                onLeagueChange={handleLeagueChange}
              />
            )}
            <FixtureList 
              fixtures={filteredFixtures} 
              predictions={predictions}
              onGetPrediction={handleGetPrediction}
              onAnalyzeLeague={handleAnalyzeLeague}
              onGetAccumulatorTips={handleGetAccumulatorTips}
            />
          </>
        )}
      </main>
      {accumulatorState.leagueName && (
        <AccumulatorModal
            isLoading={accumulatorState.isLoading}
            data={accumulatorState.data}
            error={accumulatorState.error}
            leagueName={accumulatorState.leagueName}
            onClose={closeAccumulatorModal}
        />
      )}
    </div>
  );
};

export default App;