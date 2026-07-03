import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { animated, useSpring } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import styles from './MovieDetailDrawer.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MovieDetailDrawer = ({ movie, onClose, onNope, onLike }) => {
  const [{ y }, api] = useSpring(() => ({ y: window.innerHeight }));
  const [details, setDetails] = useState(null);

  useEffect(() => {
    api.start({ y: 0, config: { tension: 300, friction: 30 } });
    
    const fetchDetails = async () => {
      try {
        const type = movie.media_type || 'movie';
        const res = await axios.get(`${API_URL}/api/movies/${movie.id}/details?type=${type}`);
        setDetails(res.data);
      } catch (err) {
        console.error('Failed to fetch details', err);
      }
    };
    fetchDetails();
  }, [api, movie]);

  const cast = details?.credits?.cast?.slice(0, 4) || [];
  const providers = details?.['watch/providers']?.results?.IN;
  const freeProviders = providers?.flatrate || [];
  const rentBuyProviders = [...(providers?.rent || []), ...(providers?.buy || [])];
  const paidProviders = Array.from(new Map(rentBuyProviders.map(p => [p.provider_id, p])).values());

  const bind = useDrag(({ active, movement: [, my], velocity: [, vy] }) => {
    if (!active && (my > 100 || vy > 0.5)) {
      api.start({ y: window.innerHeight, onRest: onClose });
    } else {
      api.start({ y: active ? Math.max(0, my) : 0 });
    }
  });

  return (
    <>
      <animated.div 
        className={styles.backdrop} 
        style={{ opacity: y.to([0, window.innerHeight], [1, 0]) }}
        onClick={() => api.start({ y: window.innerHeight, onRest: onClose })}
      />
      <animated.div
        className={styles.drawer}
        style={{ y }}
        {...bind()}
      >
        <div className={styles.dragHandle}></div>
        
        <div className={styles.header}>
          <img 
            className={styles.thumb} 
            src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`} 
            alt={movie.title} 
          />
          <div className={styles.headerInfo}>
            <h2 className={styles.title}>{movie.title}</h2>
            <p className={styles.meta}>
              {movie.release_date?.substring(0,4)} · ⭐ {movie.vote_average?.toFixed(1)}
            </p>
          </div>
        </div>

        <div className={styles.content}>
          <h3 className={styles.sectionTitle}>Overview</h3>
          <p className={styles.overview}>{movie.overview}</p>

          {cast.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Top Cast</h3>
              <div className={styles.castContainer}>
                {cast.map(c => (
                  <div key={c.id} className={styles.castMember}>
                    {c.profile_path ? (
                      <img src={`https://image.tmdb.org/t/p/w185${c.profile_path}`} alt={c.name} className={styles.castAvatar} />
                    ) : (
                      <div className={styles.castAvatarFallback}>{c.name.charAt(0)}</div>
                    )}
                    <span className={styles.castName}>{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {providers && (freeProviders.length > 0 || paidProviders.length > 0) && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Where to Watch</h3>
              
              {freeProviders.length > 0 && (
                <div className={styles.providerGroup}>
                  <p className={styles.providerLabel}>Stream (Subscription):</p>
                  <div className={styles.providerList}>
                    {freeProviders.map(p => (
                      <img key={p.provider_id} src={`https://image.tmdb.org/t/p/w45${p.logo_path}`} alt={p.provider_name} title={p.provider_name} className={styles.providerLogo} />
                    ))}
                  </div>
                </div>
              )}
              
              {paidProviders.length > 0 && (
                <div className={styles.providerGroup}>
                  <p className={styles.providerLabel}>Rent / Buy:</p>
                  <div className={styles.providerList}>
                    {paidProviders.map(p => (
                      <img key={p.provider_id} src={`https://image.tmdb.org/t/p/w45${p.logo_path}`} alt={p.provider_name} title={p.provider_name} className={styles.providerLogo} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.nopeBtn} onClick={onNope}>✕ Nope</button>
          <button className={styles.likeBtn} onClick={onLike}>♥ Like This One</button>
        </div>
      </animated.div>
    </>
  );
};

export default MovieDetailDrawer;
