import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import styles from './MovieDetailsModal.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MovieDetailsModal = ({ movie, onClose }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const type = movie.media_type || 'movie';
        const res = await axios.get(`${API_URL}/api/movies/${movie.id}/details?type=${type}`);
        setDetails(res.data);
      } catch (err) {
        console.error('Failed to fetch details', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [movie]);

  const trailer = details?.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
  const cast = details?.credits?.cast?.slice(0, 5) || [];
  const providers = details?.['watch/providers']?.results?.IN?.flatrate || [];

  return (
    <motion.div 
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className={styles.modal}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <button className={styles.closeBtn} onClick={onClose}>×</button>
        
        <div className={styles.header}>
          <img 
            src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`} 
            alt={movie.title} 
            className={styles.poster}
          />
          <div className={styles.headerInfo}>
            <h2>{movie.title || movie.name}</h2>
            <div className={styles.metaRow}>
              <span className={styles.rating}>⭐ {details?.vote_average?.toFixed(1) || movie.vote_average?.toFixed(1) || 'N/A'}/10</span>
              <span className={styles.year}>
                {(details?.release_date || movie.release_date || details?.first_air_date || movie.first_air_date || '').split('-')[0]}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.content}>
          {trailer && (
            <div className={styles.section}>
              <div className={styles.trailerContainer}>
                <iframe 
                  src={`https://www.youtube.com/embed/${trailer.key}`}
                  title="Trailer"
                  frameBorder="0"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          <div className={styles.section}>
            <h3>Overview</h3>
            <p>{details?.overview || movie.overview}</p>
          </div>

          {cast.length > 0 && (
            <div className={styles.section}>
              <h3>Top Cast</h3>
              <div className={styles.castList}>
                {cast.map(c => (
                  <div key={c.id} className={styles.castMember}>
                    {c.profile_path ? (
                      <img src={`https://image.tmdb.org/t/p/w92${c.profile_path}`} alt={c.name} />
                    ) : (
                      <div className={styles.castFallback}>👤</div>
                    )}
                    <span>{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {providers.length > 0 && (
            <div className={styles.section}>
              <h3>Available On</h3>
              <div className={styles.providerList}>
                {providers.map(p => (
                  <img 
                    key={p.provider_id} 
                    src={`https://image.tmdb.org/t/p/w92${p.logo_path}`} 
                    alt={p.provider_name} 
                    className={styles.providerLogo}
                    title={p.provider_name}
                  />
                ))}
              </div>
            </div>
          )}

          <div className={styles.section}>
            <h3>Rate this Movie</h3>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'center' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <span 
                  key={star}
                  style={{ fontSize: '32px', cursor: 'pointer', color: 'var(--accent-gold)' }}
                  onClick={async () => {
                    try {
                      await axios.post(`${API_URL}/api/user/ratings`, {
                        movieId: movie.id,
                        movieData: movie,
                        rating: star
                      });
                      alert('Rating saved!');
                    } catch (err) {
                      console.error('Failed to rate', err);
                    }
                  }}
                >
                  ★
                </span>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Your ratings help the AI Matchmaker learn your tastes!
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MovieDetailsModal;
