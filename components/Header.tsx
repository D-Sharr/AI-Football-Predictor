
import React from 'react';

interface HeaderProps {
  theme: string;
  onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, onToggleTheme }) => {
  return (
    <header className="bg-white dark:bg-brand-surface shadow-md sticky top-0 z-20">
      <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
            <span className="material-symbols-rounded text-brand-accent text-4xl select-none">
              auto_awesome
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-brand-text-light">
              AI Football Predictor
            </h1>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-full text-gray-500 dark:text-brand-secondary hover:bg-gray-200 dark:hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent dark:focus:ring-offset-brand-surface flex items-center justify-center"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <span className="material-symbols-rounded text-2xl">light_mode</span>
            ) : (
              <span className="material-symbols-rounded text-2xl">dark_mode</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
