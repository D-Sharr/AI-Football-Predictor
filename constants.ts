// IMPORTANT: In a real-world application, this key should be stored in a secure environment variable on a server, not exposed in client-side code.
// For the purpose of this self-contained app, it is included here as per the prompt's instructions.
//export const API_FOOTBALL_KEY = '095979377emsh864edabb6d16019p1ea440jsn03dc4fee9e5d';
export const API_FOOTBALL_KEY = 'Dg9q4XpMqPmshEye5nnjeqrvir54p1zXj0UjsnJSQlhAaasBgI';
export const API_FOOTBALL_HOST = 'api-football-v1.p.rapidapi.com';

// A selection of popular league IDs, ordered by world ranking/importance.
// This order determines their position in the fixture list.
export const PREFERRED_LEAGUE_IDS: number[] = [
    1, // World: World Cup
    4, // Africa: Africa Cup of Nations
    2, // World: UEFA Champions League
    13, // World: Copa Libertadores
    3, // World: UEFA Europa League
    21, // Asia: AFC Champions League
    11, // World: Copa Sudamericana
    848, // World: UEFA Conference League
    39, // England: Premier League
    45, // England: FA Cup
    48, // England: League Cup
    140, // Spain: La Liga
    143, // Spain: Copa del Rey
    135, // Italy: Serie A
    78, // Germany: Bundesliga
    61, // France: Ligue 1
    94, // Portugal: Primeira Liga
    88, // Netherlands: Eredivisie
    71, // Brazil: Serie A
    128, // Argentina: Liga Profesional
    253, // USA: MLS
    292, // Saudi Arabia: Saudi Pro League
    98, // Japan: J1 League
];
