import axios from 'axios';

let cachedAccessToken = null;
let tokenExpiresAt = 0;
const trackCache = new Map();

// Genre to vibe search fallback queries
const GENRE_VIBE_MAP = {
  28: 'action cinematic epic soundtrack', // Action
  12: 'adventure epic cinematic soundtrack', // Adventure
  16: 'animation cute whimsical soundtrack', // Animation
  35: 'upbeat funny groovy soundtrack', // Comedy
  80: 'crime mystery gritty noir soundtrack', // Crime
  99: 'documentary ambient peaceful soundtrack', // Documentary
  18: 'dramatic emotional piano cinematic soundtrack', // Drama
  10751: 'disney magical family acoustic soundtrack', // Family
  14: 'fantasy mystical magical soundtrack', // Fantasy
  36: 'historical cinematic orchestral soundtrack', // History
  27: 'horror dark suspense eerie soundtrack', // Horror
  10402: 'musical musical theatre soundtrack', // Music
  9648: 'mystery suspense thriller soundtrack', // Mystery
  10749: 'romantic love acoustic sweet soundtrack', // Romance
  878: 'sci-fi synthwave ambient futuristic soundtrack', // Sci-Fi
  10770: 'drama cinematic soundtrack', // TV Movie
  53: 'thriller tension pulse synth soundtrack', // Thriller
  10752: 'war dramatic heavy orchestral soundtrack', // War
  37: 'western acoustic guitar whistle soundtrack' // Western
};

/**
 * Obtain or reuse a Spotify Client Credentials access token
 */
const getSpotifyAccessToken = async () => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  // Reuse token if still valid (with 60s buffer)
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedAccessToken;
  }

  try {
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 5000
      }
    );

    cachedAccessToken = response.data.access_token;
    tokenExpiresAt = Date.now() + (response.data.expires_in * 1000);
    return cachedAccessToken;
  } catch (error) {
    console.error('Spotify token error:', error.response?.data || error.message);
    return null;
  }
};

/**
 * Searches Spotify for a track matching the movie title (soundtrack)
 * or falls back to a genre vibe soundtrack.
 */
export const getTrackForMovie = async ({ title, genreIds = [], year }) => {
  if (!title) return null;

  const cacheKey = `${title.toLowerCase().trim()}_${year || ''}`;
  if (trackCache.has(cacheKey)) {
    return trackCache.get(cacheKey);
  }

  const token = await getSpotifyAccessToken();
  if (!token) {
    return null; // Gracefully signal to caller to use local fallback
  }

  const searchSpotify = async (query) => {
    try {
      const res = await axios.get('https://api.spotify.com/v1/search', {
        params: {
          q: query,
          type: 'track',
          limit: 3
        },
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 5000
      });

      const items = res.data?.tracks?.items || [];
      if (items.length > 0) {
        const track = items[0];
        return {
          trackId: track.id,
          trackUri: track.uri,
          name: track.name,
          artist: track.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
          album: track.album?.name,
          albumArt: track.album?.images?.[0]?.url || track.album?.images?.[1]?.url || null,
          previewUrl: track.preview_url || null,
          spotifyUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`
        };
      }
    } catch (err) {
      console.warn(`Spotify search failed for query "${query}":`, err.response?.data || err.message);
    }
    return null;
  };

  // 1. Try exact movie soundtrack/theme search
  let result = await searchSpotify(`${title} soundtrack`);
  if (!result) {
    result = await searchSpotify(`${title} theme song`);
  }

  // 2. If no direct OST match found, find vibe by genre
  if (!result && genreIds && genreIds.length > 0) {
    const primaryGenreId = genreIds[0];
    const vibeQuery = GENRE_VIBE_MAP[primaryGenreId] || 'cinematic movie soundtrack';
    result = await searchSpotify(vibeQuery);
  }

  // 3. Ultimate fallback: general cinematic movie vibe
  if (!result) {
    result = await searchSpotify('cinematic movie soundtrack');
  }

  if (result) {
    trackCache.set(cacheKey, result);
  }

  return result;
};
