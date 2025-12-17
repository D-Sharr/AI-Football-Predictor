
import React from 'react';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeTeam: { name: string; logo: string };
  awayTeam: { name: string; logo: string };
  analysis: string;
  translatedAnalysis: string | null;
  isTranslating: boolean;
  onTranslate: () => void;
  onShowOriginal: () => void;
}

const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const elements = text.split('\n').map((line, index) => {
    const trimmed = line.trim();
    
    // Bullet points
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      return (
        <li key={index} className="ml-4 mb-2 list-disc text-sm md:text-base text-gray-700 dark:text-brand-text-dark">
          {trimmed.substring(2)}
        </li>
      );
    }

    // Headings
    if (line.startsWith('### ')) {
      return (
        <h3 key={index} className="text-base md:text-lg font-black mt-6 mb-3 text-brand-accent uppercase tracking-wider border-b-2 border-brand-accent/20 pb-1">
          {line.substring(4)}
        </h3>
      );
    }

    // Bold lines
    if (line.startsWith('**')) {
      const boldEnd = line.indexOf('**', 2);
      if (boldEnd !== -1) {
        const boldText = line.substring(2, boldEnd);
        const restText = line.substring(boldEnd + 2);
        return (
          <p key={index} className="my-3 leading-relaxed text-sm md:text-base text-gray-700 dark:text-brand-text-dark">
            <strong className="text-gray-900 dark:text-brand-text-light font-bold">{boldText}</strong>{restText}
          </p>
        );
      }
    }

    // Empty lines
    if (trimmed === '') {
      return <div key={index} className="h-2" />;
    }

    // Normal text
    return (
      <p key={index} className="my-3 leading-relaxed text-sm md:text-base text-gray-700 dark:text-brand-text-dark">
        {line}
      </p>
    );
  });
  
  return <div className="space-y-1">{elements}</div>;
};

const AnalysisModal: React.FC<AnalysisModalProps> = ({ 
  isOpen, 
  onClose, 
  homeTeam, 
  awayTeam, 
  analysis, 
  translatedAnalysis, 
  isTranslating, 
  onTranslate, 
  onShowOriginal 
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-brand-surface w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 md:p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50 dark:bg-black/20">
          <div className="flex items-center space-x-4">
            <div className="flex -space-x-3">
              <img src={homeTeam.logo} alt="" className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-md bg-white rounded-full p-1.5 border-2 border-gray-100" />
              <img src={awayTeam.logo} alt="" className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-md bg-white rounded-full p-1.5 border-2 border-gray-100" />
            </div>
            <div>
              <h2 className="text-base md:text-xl font-black text-gray-900 dark:text-brand-text-light leading-tight">
                Complete KP Analysis
              </h2>
              <p className="text-[10px] md:text-xs text-brand-accent font-bold uppercase tracking-widest mt-0.5">
                {homeTeam.name} vs {awayTeam.name}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-all group active:scale-90"
          >
            <span className="material-symbols-rounded text-gray-500 dark:text-brand-text-dark group-hover:rotate-90 transition-transform">close</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar bg-white dark:bg-brand-surface selection:bg-brand-accent selection:text-white">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-accent animate-pulse shadow-[0_0_8px_rgba(56,178,172,0.6)]"></span>
              <span className="text-[11px] font-black text-gray-400 dark:text-brand-text-dark uppercase tracking-[0.2em]">Verified Astrology Report</span>
            </div>
            <div className="flex items-center space-x-3">
              {translatedAnalysis !== null ? (
                <button 
                  onClick={onShowOriginal}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 flex items-center space-x-1.5 transition-colors"
                >
                  <span className="material-symbols-rounded text-base">language</span>
                  <span>English View</span>
                </button>
              ) : (
                <button 
                  onClick={onTranslate} 
                  disabled={isTranslating}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-brand-accent hover:bg-brand-accent/10 flex items-center space-x-1.5 disabled:opacity-50 transition-colors"
                >
                  <span className="material-symbols-rounded text-base animate-bounce-slow">{isTranslating ? 'sync' : 'translate'}</span>
                  <span>{isTranslating ? 'Translating...' : 'Translate to Burmese'}</span>
                </button>
              )}
            </div>
          </div>

          <article className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
            <SimpleMarkdown text={translatedAnalysis !== null ? translatedAnalysis : analysis} />
          </article>
          
          <div className="mt-12 p-6 bg-brand-accent/5 dark:bg-brand-accent/10 rounded-2xl border-2 border-dashed border-brand-accent/20">
            <div className="flex items-start space-x-3">
              <span className="material-symbols-rounded text-brand-accent text-xl mt-0.5">info</span>
              <p className="text-[11px] md:text-xs text-gray-500 dark:text-brand-text-dark italic leading-relaxed">
                KP Astrology (Krishnamurti Paddhati) uses precise sub-lord calculations to predict outcomes. 
                While highly accurate, football remains a sport of dynamic human performance. Please use these insights as part of your broader research.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 bg-gray-50 dark:bg-black/20 border-t border-gray-100 dark:border-white/5 flex justify-end">
          <button 
            onClick={onClose}
            className="px-10 py-3 bg-brand-accent hover:bg-brand-accent/90 text-white text-sm font-black rounded-2xl transition-all shadow-xl shadow-brand-accent/30 active:scale-95"
          >
            I Understand
          </button>
        </div>
      </div>

      <style>{`
        .animate-fade-in { animation: fadeIn 0.25s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-bounce-slow { animation: bounce 2s infinite; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 20px; border: 2px solid transparent; background-clip: content-box; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #4a5568; background-clip: content-box; }
      `}</style>
    </div>
  );
};

export default AnalysisModal;
