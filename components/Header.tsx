
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
            {/* Magic Crystal Ball Logo */}
            <div className="relative group cursor-pointer">
              {/* The Crystal Ball */}
              <div className="relative w-11 h-11 flex items-center justify-center rounded-full bg-gradient-to-tr from-indigo-900 via-purple-600 to-cyan-400 shadow-[0_0_20px_rgba(168,85,247,0.5)] overflow-hidden select-none z-10 border border-white/10">
                {/* Moving Nebula Energy */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.3),transparent)] animate-nebula-pulse" />
                <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-white/10 to-transparent rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                
                {/* Inner Magic Icon */}
                <span className="material-symbols-rounded text-white text-2xl animate-spin-slow relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
                  auto_awesome
                </span>
                
                {/* Glossy Top Reflection */}
                <div className="absolute top-1 left-2 w-4 h-2.5 bg-white/30 rounded-full blur-[1px] rotate-[-15deg]" />
              </div>
              
              {/* Crystal Ball Stand */}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-7 h-3 bg-gradient-to-b from-gray-400 to-gray-600 dark:from-gray-600 dark:to-black rounded-sm clip-path-stand shadow-md z-0" />
              
              {/* Ambient Glow */}
              <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            <div className="flex flex-col -space-y-1">
              <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-brand-text-light tracking-tight">
                KP Football <span className="text-brand-accent">Professor</span>
              </h1>
              <span className="text-[10px] font-bold text-gray-400 dark:text-brand-text-dark uppercase tracking-[0.2em] ml-0.5">Predicting the Future</span>
            </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-full text-gray-500 dark:text-brand-secondary hover:bg-gray-200 dark:hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent dark:focus:ring-offset-brand-surface flex items-center justify-center transition-all hover:scale-110 active:scale-95"
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
      
      <style>{`
        .clip-path-stand {
          clip-path: polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%);
        }
        @keyframes nebula-pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.5); opacity: 0.6; }
        }
        .animate-nebula-pulse {
          animation: nebula-pulse 4s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
};

export default Header;
