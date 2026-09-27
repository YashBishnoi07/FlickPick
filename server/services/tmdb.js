import axios from 'axios';
import https from 'https';
import { GoogleGenerativeAI } from '@google/generative-ai';
import freekeys from 'freekeys';
import Movie from '../models/Movie.js';

let cachedFreeKey = null;
const getApiKey = async () => {
  if (process.env.TMDB_API_KEY) return process.env.TMDB_API_KEY;
  if (cachedFreeKey) return cachedFreeKey;
  try {
    const keys = await freekeys();
    cachedFreeKey = keys.tmdb_key;
    return cachedFreeKey;
  } catch (err) {
    console.error('Failed to fetch freekeys:', err.message);
    return null;
  }
};

const MOCK_MOVIES = [
  { id: 101, title: 'Inception', poster_path: '/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg', release_date: '2010-07-15', vote_average: 8.8, overview: 'A thief who steals corporate secrets through the use of dream-sharing technology...', media_type: 'movie' },
  { id: 102, title: 'The Dark Knight', poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', release_date: '2008-07-16', vote_average: 9.0, overview: 'Batman raises the stakes in his war on crime.', media_type: 'movie' },
  { id: 103, title: 'Interstellar', poster_path: '/gEU2QlsUUHXjNpeVDcrcwfHkX1j.jpg', release_date: '2014-11-05', vote_average: 8.6, overview: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.', media_type: 'movie' },
  { id: 104, title: 'Parasite', poster_path: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', release_date: '2019-05-30', vote_average: 8.5, overview: 'All unemployed, Ki-taek\'s family takes peculiar interest in the wealthy and glamorous Parks...', media_type: 'movie' },
  { id: 105, title: 'Dune', poster_path: '/d5NXSklXo0qyIYkgV94XAgMIckC.jpg', release_date: '2021-09-15', vote_average: 7.9, overview: 'Paul Atreides, a brilliant and gifted young man born into a great destiny beyond his understanding...', media_type: 'movie' },
  { id: 106, title: 'Spider-Man: No Way Home', poster_path: '/1g0dhYtq4irTY1R80vFAe85k0qJ.jpg', release_date: '2021-12-15', vote_average: 8.0, overview: 'Peter Parker is unmasked and no longer able to separate his normal life from the high-stakes of being a super-hero.', media_type: 'movie' }
];

export const getMovies = async ({ services, genres, decade, runtime, page = 1, actor, searchQuery, language, exactMatches }) => {
  let apiKey = await getApiKey();

  if (!apiKey) {
    console.warn('TMDB_API_KEY missing and freekeys failed, using mock data.');
    return { results: MOCK_MOVIES };
  }
  
  const httpsAgent = new https.Agent({ family: 4 });

  // If Gemini provided exact movie recommendations (Magic Match!)
  if (exactMatches && Array.isArray(exactMatches) && exactMatches.length > 0) {
    const pageSize = 5; // Fetch 5 per page to allow scrolling
    const startIndex = (page - 1) * pageSize;
    const titlesToFetch = exactMatches.slice(startIndex, startIndex + pageSize);
    
    if (titlesToFetch.length === 0) return { results: [] };

    try {
      const promises = titlesToFetch.map(title => 
        axios.get(`https://api.themoviedb.org/3/search/multi`, {
          params: { api_key: apiKey, query: title },
          httpsAgent
        }).then(res => res.data.results?.[0]).catch(() => null)
      );
      
      const rawResults = await Promise.all(promises);
      const results = rawResults.filter(Boolean).map(m => ({ ...m, media_type: m.media_type || 'movie' }));
      return { results };
    } catch (err) {
      console.error('Exact Matches fetch failed:', err);
      // fallback to standard discover if it fails
    }
  }

  let movieUrl = `https://api.themoviedb.org/3/discover/movie`;
  let tvUrl = `https://api.themoviedb.org/3/discover/tv`;
  
  let params = {
    api_key: apiKey,
    language: 'en-US',
    region: 'IN', // Default to India region for localized popularity
    sort_by: 'popularity.desc',
    include_adult: false,
    include_video: false,
    page: page,
  };

  if (language && language.trim() !== '') {
    params.with_original_language = language;
  } else {
    // If no specific language requested, alternate Hindi and English per page!
    // This guarantees a perfect 50/50 mix as the user scrolls.
    params.with_original_language = (page % 2 === 0) ? 'hi' : 'en';
  }

  if (searchQuery && searchQuery.trim() !== '') {
    movieUrl = `https://api.themoviedb.org/3/search/movie`;
    tvUrl = `https://api.themoviedb.org/3/search/tv`;
    params.query = searchQuery;
    // We ignore generic filters like decade, runtime, genres if there is an exact search query
  } else {
    // Standard Discover Mode
    if (actor && actor.trim() !== '') {
      try {
        const personRes = await axios.get(`https://api.themoviedb.org/3/search/person`, {
          params: { api_key: apiKey, query: actor },
          httpsAgent
        });
        if (personRes.data.results && personRes.data.results.length > 0) {
               const personId = personRes.data.results[0].id;
               console.log('Actor lookup for:', actor, '-> personId:', personId, 'matched name:', personRes.data.results[0].name);
                params.with_cast = personId;
         } else {
                console.log('Actor lookup for:', actor, '-> NO MATCH FOUND');
           }
      } catch (err) {
        console.error('Failed to lookup actor ID:', err.message);
      }
    }

  if (services) {
    const providerMap = {
      'netflix': 8,
      'prime video': 119,
      'disney+ hotstar': 122,
      'sonyliv': 237,
      'jiocinema': 220,
      'zee5': 232,
      'prime': 119,
      'disney+': 337,
      'hbo max': 384,
      'hulu': 15,
      'apple tv+': 350,
      'crunchyroll': 283,
      'max': 384
    };
    const providerIds = services.split(',').map(s => providerMap[s.trim().toLowerCase()]).filter(Boolean).join('|');
    if (providerIds) {
      params.with_watch_providers = providerIds;
      params.watch_region = 'IN';
    }
  }

  if (genres) {
    const genreMap = {
      'action': 28,
      'comedy': 35,
      'horror': 27,
      'romance': 10749,
      'sci-fi': 878,
      'drama': 18
    };
    const genreIds = genres.split(',').map(g => genreMap[g.trim().toLowerCase()]).filter(Boolean).join('|');
    if (genreIds) {
      params.with_genres = genreIds;
    }
  }

  if (decade && decade !== 'all') {
    const startYear = parseInt(decade, 10);
    const endYear = startYear + 9;
    params['primary_release_date.gte'] = `${startYear}-01-01`;
    params['primary_release_date.lte'] = `${endYear}-12-31`;
    params['first_air_date.gte'] = `${startYear}-01-01`;
    params['first_air_date.lte'] = `${endYear}-12-31`;
  }

  if (runtime && runtime !== 'all') {
    params['with_runtime.lte'] = parseInt(runtime, 10);
  }

  } // End of discover filters

  // try {

  //   const [movieRes, tvRes] = await Promise.allSettled([
  //     axios.get(movieUrl, { params, timeout: 15000, httpsAgent }),
  //     axios.get(tvUrl, { params, timeout: 15000, httpsAgent })
  //   ]);
try {

  const tvParams = { ...params };
  if (tvParams.with_cast) {
    tvParams.with_people = tvParams.with_cast;
    delete tvParams.with_cast;
  }

  const [movieRes, tvRes] = await Promise.allSettled([
    axios.get(movieUrl, { params, timeout: 15000, httpsAgent }),
    axios.get(tvUrl, { params: tvParams, timeout: 15000, httpsAgent })
  ]);
    let combinedResults = [];

    if (movieRes.status === 'fulfilled' && movieRes.value.data.results) {
      const movies = movieRes.value.data.results.map(m => ({ ...m, media_type: 'movie' }));
      combinedResults = [...combinedResults, ...movies];
    }

    if (tvRes.status === 'fulfilled' && tvRes.value.data.results) {
      const tvShows = tvRes.value.data.results.map(tv => ({
        ...tv,
        title: tv.name,
        release_date: tv.first_air_date,
        media_type: 'tv'
      }));
      combinedResults = [...combinedResults, ...tvShows];
    }
    
    console.log('Result count:', combinedResults.length, 'Sample:', combinedResults.slice(0, 5).map(m => ({ title: m.title, lang: m.original_language, type: m.media_type })));
    combinedResults.sort(() => Math.random() - 0.5);

    if (combinedResults.length > 0) {
       return { results: combinedResults };
    } else {
       return { results: [] };
    }
  } catch (error) {
    console.error('TMDB API Error:', error.message);
    if (error.response) {
      console.error('TMDB Response:', error.response.data);
    }
    return { results: [], error: 'TMDB API request failed' };
  }
};

export const getMovieDetails = async (id, type = 'movie') => {
  let apiKey = await getApiKey();

  if (!apiKey) {
    console.warn('TMDB_API_KEY missing and freekeys failed, using mock details.');
    return {
      id,
      title: MOCK_MOVIES.find(m => m.id == id)?.title || 'Unknown Title',
      overview: 'Mock overview.',
      credits: { cast: [] },
      similar: { results: [] },
      "watch/providers": { results: {} }
    };
  }

  try {
    const httpsAgent = new https.Agent({ family: 4 });
    const url = `https://api.themoviedb.org/3/${type}/${id}`;
    const res = await axios.get(url, {
      params: {
        api_key: apiKey,
        append_to_response: 'videos,credits,watch/providers'
      },
      timeout: 5000,
      httpsAgent
    });
    return res.data;
  } catch (err) {
    console.error(`Failed to fetch details for ${type} ${id}:`, err.message);
    return null;
  }
};
