import React from 'react';

interface LeagueFilterProps {
  leagues: string[];
  selectedLeague: string;
  onLeagueChange: (league: string) => void;
}

const LeagueFilter: React.FC<LeagueFilterProps> = ({ leagues, selectedLeague, onLeagueChange }) => {
  return (
    <div className="mb-6 max-w-sm">
      <label htmlFor="league-filter" className="block text-sm font-medium text-gray-600 dark:text-brand-text-dark mb-1">
        Filter by League
      </label>
      <select
        id="league-filter"
        name="league-filter"
        value={selectedLeague}
        onChange={(e) => onLeagueChange(e.target.value)}
        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-brand-primary bg-white dark:bg-brand-surface text-gray-900 dark:text-brand-text-light focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm rounded-md appearance-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23A0AEC0' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.5rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1.5em 1.5em',
        }}
      >
        <option value="all">All Leagues</option>
        {leagues.map((league) => (
          <option key={league} value={league}>
            {league}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LeagueFilter;