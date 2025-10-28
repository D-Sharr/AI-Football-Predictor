import React from 'react';

interface DateNavigatorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const DateNavigator: React.FC<DateNavigatorProps> = ({ selectedDate, onDateChange }) => {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate a range of dates, e.g., 3 days past, today, and 7 days future
  for (let i = -3; i <= 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);
    dates.push(date);
  }

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const formatDateLabel = (date: Date) => {
    if (isSameDay(date, today)) {
      return "Today";
    }
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  return (
    <div className="py-2">
      <div className="flex space-x-2 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {dates.map((date, index) => {
          const isActive = isSameDay(date, selectedDate);
          const buttonClass = isActive
            ? 'bg-brand-accent text-white shadow-lg'
            : 'bg-white hover:bg-gray-200 dark:bg-brand-primary dark:hover:bg-brand-secondary text-gray-700 dark:text-brand-text-dark';

          return (
            <button
              key={index}
              onClick={() => onDateChange(date)}
              className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-colors duration-200 ${buttonClass}`}
            >
              <span className="text-xs font-semibold">{formatDateLabel(date)}</span>
              <span className="text-xl font-bold">{date.getDate()}</span>
            </button>
          );
        })}
      </div>
      <style>{`
        .overflow-x-auto::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default DateNavigator;