import { Fixture } from '../types';
import { API_FOOTBALL_KEY, API_FOOTBALL_HOST } from '../constants';

// Cache expiration time for today's fixtures in milliseconds (15 minutes)
const CACHE_EXPIRATION_MS = 15 * 60 * 1000;

// Helper to format date to YYYY-MM-DD
const formatDateForApi = (date: Date): string => {
    // Manually format to avoid timezone conversion issues with toISOString()
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function clearCacheForDate(date: Date): void {
  const dateString = formatDateForApi(date);
  const cacheKey = `fixtures_${dateString}`;
  console.log(`Clearing cache for key: ${cacheKey}`);
  localStorage.removeItem(cacheKey);
}

export async function getDailyFixtures(date: Date): Promise<Fixture[]> {
  const dateString = formatDateForApi(date);
  const cacheKey = `fixtures_${dateString}`;

  // Check for cached data in localStorage
  const cachedItem = localStorage.getItem(cacheKey);
  if (cachedItem) {
    try {
      const { timestamp, data } = JSON.parse(cachedItem);
      
      const isToday = dateString === formatDateForApi(new Date());
      const isCacheFresh = (Date.now() - timestamp) < CACHE_EXPIRATION_MS;

      // If it's not today, the data doesn't change, so always return from cache.
      // If it is today, only return from cache if it's fresh.
      if (!isToday || isCacheFresh) {
        console.log(`Loading fixtures for ${dateString} from cache.`);
        return data as Fixture[];
      }
    } catch (e) {
      console.error("Failed to parse cache, fetching new data.", e);
      // Clear corrupted item from cache
      localStorage.removeItem(cacheKey);
    }
  }
  
  console.log(`Fetching fixtures for ${dateString} from API.`);
  const url = `https://api-football-v1.p.rapidapi.com/v3/fixtures?date=${dateString}&timezone=Asia/Yangon`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': API_FOOTBALL_KEY,
        'x-rapidapi-host': API_FOOTBALL_HOST,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const allFixtures: Fixture[] = data.response || [];
    
    // Store the new data and a timestamp in localStorage
    const itemToCache = {
        timestamp: Date.now(),
        data: allFixtures,
    };
    localStorage.setItem(cacheKey, JSON.stringify(itemToCache));

    return allFixtures;

  } catch (error) {
    console.error(`Error fetching fixtures for ${dateString}:`, error);
    return []; // Return empty array on failure
  }
}
