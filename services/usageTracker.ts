export const API_USAGE_LIMIT = 50; // A reasonable demo daily limit

const getTodaysDateString = (): string => {
  const today = new Date();
  // Use UTC date to avoid timezone issues affecting the "day"
  return today.toISOString().split('T')[0];
};

const getUsageKey = (): string => `apiUsage_${getTodaysDateString()}`;

interface ApiUsage {
  used: number;
}

const getTodaysUsage = (): ApiUsage => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { used: 0 };
  }
  const key = getUsageKey();
  const storedUsage = localStorage.getItem(key);
  if (storedUsage) {
    try {
      const parsed = JSON.parse(storedUsage);
      if (typeof parsed.used === 'number') {
        return parsed;
      }
    } catch (e) {
      // Corrupted data, reset it
      localStorage.removeItem(key);
      return { used: 0 };
    }
  }
  return { used: 0 };
};

export const recordApiCall = (): void => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  const currentUsage = getTodaysUsage();
  const newUsage: ApiUsage = { used: currentUsage.used + 1 };
  localStorage.setItem(getUsageKey(), JSON.stringify(newUsage));
};

export const getUsageInfo = (): { used: number; remaining: number; limit: number } => {
  const { used } = getTodaysUsage();
  const limit = API_USAGE_LIMIT;
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
};

export const canMakeApiCall = (): boolean => {
  const { used, limit } = getUsageInfo();
  return used < limit;
};
