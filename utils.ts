export const continentSortOrder = [
  'World',
  'Europe',
  'Americas',
  'Asia',
  'Africa',
  'Oceania'
];

// A mapping of country names from the API to continents for sorting purposes.
const countryToContinent: { [key:string]: string } = {
    'World': 'World',
    // Europe
    'England': 'Europe', 'Spain': 'Europe', 'Italy': 'Europe', 'Germany': 'Europe', 'France': 'Europe',
    'Netherlands': 'Europe', 'Portugal': 'Europe', 'Belgium': 'Europe', 'Scotland': 'Europe', 'Turkey': 'Europe',
    'Russia': 'Europe', 'Greece': 'Europe', 'Switzerland': 'Europe', 'Austria': 'Europe', 'Denmark': 'Europe',
    'Norway': 'Europe', 'Sweden': 'Europe', 'Poland': 'Europe', 'Ukraine': 'Europe', 'Croatia': 'Europe',
    'Czech-Republic': 'Europe', 'Romania': 'Europe', 'Serbia': 'Europe', 'Ireland': 'Europe', 'Wales': 'Europe',
    'Northern-Ireland': 'Europe', 'Finland': 'Europe', 'Iceland': 'Europe', 'Hungary': 'Europe',
    'Slovakia': 'Europe', 'Slovenia': 'Europe', 'Bosnia-And-Herzegovina': 'Europe', 'Albania': 'Europe',
    'Georgia': 'Europe', 'Cyprus': 'Europe', 'Israel': 'Europe', 'Kazakhstan': 'Europe', 'Azerbaijan': 'Europe',
    'Armenia': 'Europe',

    // Americas
    'Brazil': 'Americas', 'Argentina': 'Americas', 'Colombia': 'Americas', 'Chile': 'Americas', 'Uruguay': 'Americas',
    'Paraguay': 'Americas', 'Ecuador': 'Americas', 'Peru': 'Americas', 'Bolivia': 'Americas', 'Venezuela': 'Americas',
    'USA': 'Americas', 'Mexico': 'Americas', 'Canada': 'Americas', 'Costa-Rica': 'Americas', 'Honduras': 'Americas',
    'Jamaica': 'Americas',

    // Asia
    'Japan': 'Asia', 'Saudi-Arabia': 'Asia', 'South-Korea': 'Asia', 'Qatar': 'Asia', 'Iran': 'Asia',
    'Australia': 'Asia', 'China': 'Asia', 'United-Arab-Emirates': 'Asia', 'Uzbekistan': 'Asia', 'Thailand': 'Asia',
    'Vietnam': 'Asia', 'Malaysia': 'Asia', 'India': 'Asia', 'Indonesia': 'Asia',

    // Africa
    'Egypt': 'Africa', 'Morocco': 'Africa', 'Nigeria': 'Africa', 'Senegal': 'Africa', 'Algeria': 'Africa',
    'Tunisia': 'Africa', 'Cameroon': 'Africa', 'Ghana': 'Africa', 'Ivory-Coast': 'Africa', 'South-Africa': 'Africa',
    'DR-Congo': 'Africa',

    // Oceania
    'New-Zealand': 'Oceania',
};

/**
 * Gets the continent for a given country.
 * @param country The country name from the API.
 * @returns The continent name or 'Others' if not found.
 */
export const getContinent = (country: string): string => {
    const formattedCountry = country.replace(/\s+/g, '-');
    return countryToContinent[formattedCountry] || 'Others';
}
