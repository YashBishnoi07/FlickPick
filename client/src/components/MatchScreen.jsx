import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { animated, useSpring } from '@react-spring/web';
import styles from './MatchScreen.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MatchScreen = ({ matchData, onKeepSwiping }) => {
  const navigate = useNavigate();
  const movie = matchData.movieData;
  const [details, setDetails] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        zIndex: 9999,
        colors: ['#FF4458', '#F5C842', '#ffffff']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        zIndex: 9999,
        colors: ['#FF4458', '#F5C842', '#ffffff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      zIndex: 9999,
      colors: ['#FF4458', '#F5C842', '#ffffff']
    });

    frame();

    const fetchDetails = async () => {
      try {
        const type = movie.media_type || 'movie';
        const res = await axios.get(`${API_URL}/api/movies/${movie.id}/details?type=${type}`);
        setDetails(res.data);
      } catch (err) {
        console.error('Failed to fetch match details', err);
      }
    };
    fetchDetails();
  }, [movie]);

  const handleSaveToWatchlist = async () => {
    try {
      await axios.post(`${API_URL}/api/user/watchlist`, { movieData: movie });
      setSaved(true);
    } catch (err) {
      console.error('Failed to save to watchlist', err);
    }
  };

  const bgSpring = useSpring({
    from: { opacity: 0 },
    to: { opacity: 1 },
    config: { duration: 500 }
  });

  const badgeSpring = useSpring({
    from: { scale: 0, opacity: 0 },
    to: { scale: 1, opacity: 1 },
    delay: 300,
    config: { tension: 180, friction: 12 }
  });

  const contentSpring = useSpring({
    from: { y: 50, opacity: 0 },
    to: { y: 0, opacity: 1 },
    delay: 500
  });

  return (
    <animated.div className={styles.container} style={bgSpring}>
      <div 
        className={styles.backgroundBlur} 
        style={{ backgroundImage: `url(https://image.tmdb.org/t/p/w500${movie?.poster_path})` }}
      ></div>
      <div className={styles.overlay}></div>

      <div className={styles.content}>
        <animated.div className={styles.badgeContainer} style={badgeSpring}>
          <div className={styles.pulseRing}></div>
          <h1 className={styles.matchText}>🎉 It's a Match!</h1>
        </animated.div>

        <animated.div className={styles.movieInfo} style={contentSpring}>
          <img 
            className={styles.poster} 
            src={`https://image.tmdb.org/t/p/w500${movie?.poster_path}`} 
            alt={movie?.title} 
          />
          <h2 className={styles.title}>{movie?.title}</h2>
          <p className={styles.tagline}>Tonight's movie is decided.</p>

          {details?.videos?.results && details.videos.results.some(v => v.type === 'Trailer' && v.site === 'YouTube') && (
            <div className={styles.trailerContainer} onPointerDown={(e) => e.stopPropagation()}>
              <iframe 
                className={styles.trailerIframe}
                src={`https://www.youtube.com/embed/${details.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube').key}`}
                title="Trailer"
                frameBorder="0"
                allowFullScreen
              ></iframe>
            </div>
          )}

          {details && details['watch/providers']?.results?.IN && (
            <div className={styles.providersContainer}>
              <h4 className={styles.providersTitle}>Where to Watch (IN):</h4>
              <div className={styles.providerList}>
                {(details['watch/providers'].results.IN.flatrate || []).map(p => (
                  <img 
                    key={p.provider_id} 
                    src={`https://image.tmdb.org/t/p/w45${p.logo_path}`} 
                    alt={p.provider_name} 
                    title={p.provider_name} 
                    className={styles.providerLogo}
                  />
                ))}
                {!(details['watch/providers'].results.IN.flatrate?.length > 0) && (
                  <span className={styles.noFree}>Not on flatrate streaming</span>
                )}
              </div>
            </div>
          )}
          
          <div className={styles.actions}>
            <button className={styles.primaryBtn} onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent((movie?.title || '') + ' trailer')}`, '_blank')}>
              ▶ Watch Trailer
            </button>
            <button 
              className={styles.ghostBtn} 
              onClick={handleSaveToWatchlist}
              disabled={saved}
            >
              {saved ? '✅ Saved to Watchlist' : '➕ Save to Watchlist'}
            </button>
            <button className={styles.ghostBtn} onClick={onKeepSwiping}>
              Keep Swiping
            </button>
            <button className={styles.homeBtn} onClick={() => navigate('/')} style={{ marginTop: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', width: '100%' }}>
              🏠 Return to Home
            </button>
          </div>
        </animated.div>
      </div>
    </animated.div>
  );
};

export default MatchScreen;
