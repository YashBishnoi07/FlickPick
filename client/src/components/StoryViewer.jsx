import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import styles from './StoryViewer.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const StoryViewer = ({ movies, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const audioRef = useRef(null);
  const [songPath, setSongPath] = useState('');
  const [spotifyTrack, setSpotifyTrack] = useState(null);
  const [trackMap, setTrackMap] = useState({});
  const [loadingTrack, setLoadingTrack] = useState(false);

  const currentMovie = movies?.[currentIndex];

  // Helper to fetch Spotify track for a movie
  const fetchSpotifyTrack = async (movie) => {
    if (!movie) return null;
    if (trackMap[movie.id]) return trackMap[movie.id];

    try {
      const res = await axios.get(`${API_URL}/api/spotify/track`, {
        params: {
          title: movie.title || movie.name,
          genreIds: Array.isArray(movie.genre_ids) ? movie.genre_ids.join(',') : '',
          year: (movie.release_date || movie.first_air_date || '').substring(0, 4)
        },
        timeout: 4000
      });

      if (res.data && res.data.trackId) {
        setTrackMap(prev => ({ ...prev, [movie.id]: res.data }));
        return res.data;
      }
    } catch (err) {
      // Spotify track not found or service unconfigured
    }
    return null;
  };

  // Setup or change song whenever current movie changes
  useEffect(() => {
    if (!currentMovie) return;

    let isMounted = true;
    setLoadingTrack(true);

    fetchSpotifyTrack(currentMovie).then((track) => {
      if (!isMounted) return;
      setLoadingTrack(false);

      if (track) {
        setSpotifyTrack(track);
        // If track has audio preview and no iframe needed, or as secondary preview
        if (audioRef.current) {
          audioRef.current.pause();
        }
      } else {
        // Fallback to local audio
        setSpotifyTrack(null);
        if (!songPath) {
          const randomSongNum = Math.floor(Math.random() * 11) + 1;
          setSongPath(`/song${randomSongNum}.mp3`);
        }
      }
    });

    // Preload next movie track for instant transition
    if (movies && currentIndex + 1 < movies.length) {
      fetchSpotifyTrack(movies[currentIndex + 1]);
    }

    return () => {
      isMounted = false;
    };
  }, [currentIndex, currentMovie]);

  // Play local fallback audio when path is set and no Spotify track
  useEffect(() => {
    if (!spotifyTrack && songPath && audioRef.current) {
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(err => console.log("Audio autoplay prevented", err));
    }
  }, [songPath, spotifyTrack]);

  // Auto-advance logic (13s per slide)
  useEffect(() => {
    const timer = setTimeout(() => {
      handleNext();
    }, 13000);
    return () => clearTimeout(timer);
  }, [currentIndex, movies?.length]);

  const handleNext = () => {
    if (currentIndex < movies.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose(); // Reached the end
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Sometime in the past";
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  if (!currentMovie) return null;

  return createPortal(
    <>
      <motion.div 
        className={styles.overlay}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={1}
        onDragEnd={(e, { offset, velocity }) => {
          if (offset.y > 100 || velocity.y > 500) {
            onClose();
          }
        }}
      >
        {/* Local audio player fallback */}
        {!spotifyTrack && songPath && <audio ref={audioRef} src={songPath} loop />}
        
        {/* Segmented Progress Bar */}
        <div className={styles.progressContainer}>
          {movies.map((_, idx) => (
            <div key={idx} className={styles.progressSegment}>
              <div 
                className={styles.progressFill} 
                style={{
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? '100%' : '0%',
                  animation: idx === currentIndex ? 'fillProgress 13s linear forwards' : 'none',
                  transition: 'width 0.1s'
                }}
              ></div>
            </div>
          ))}
        </div>

        {/* Tap areas for navigation */}
        <div className={styles.tapAreaLeft} onClick={handlePrev}></div>
        <div className={styles.tapAreaRight} onClick={handleNext}></div>

        {/* Close Button */}
        <button 
          className={styles.closeBtn} 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          onTouchStart={(e) => e.stopPropagation()}
        >✕</button>

        {/* Date Pinned Top Left */}
        <div className={styles.pinnedDate}>
          📍 {formatDate(currentMovie.matchDate)}
        </div>

        {/* Throwback Signature */}
        <div className={styles.throwbackSignature}>
          Throwback :p
        </div>

        {/* Spotify Now Playing Badge */}
        {spotifyTrack && (
          <div className={styles.spotifyBadgeWrapper}>
            <a 
              href={spotifyTrack.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.spotifyPill}
              onClick={(e) => e.stopPropagation()}
              title="Open track on Spotify"
            >
              <svg className={styles.spotifyLogo} viewBox="0 0 24 24" width="20" height="20" fill="#1DB954">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.307c-.218.358-.682.47-1.04.252-2.853-1.743-6.444-2.138-10.673-1.171-.408.093-.812-.163-.905-.57-.093-.408.163-.812.57-.905 4.636-1.06 8.608-.614 11.796 1.332.358.218.47.682.252 1.042zm1.472-3.272c-.274.446-.86.588-1.306.314-3.266-2.008-8.244-2.59-12.106-1.418-.5.152-1.03-.133-1.182-.633-.152-.5.133-1.03.633-1.182 4.412-1.339 9.897-.692 13.647 1.613.446.274.588.86.314 1.306zm.126-3.41c-3.916-2.325-10.37-2.54-14.104-1.406-.6.182-1.237-.162-1.419-.762-.182-.6.162-1.237.762-1.419 4.292-1.303 11.418-1.053 15.932 1.626.54.32.716 1.02.396 1.56-.32.54-1.02.716-1.56.396z"/>
              </svg>
              <div className={styles.equalizer}>
                <span className={styles.bar}></span>
                <span className={styles.bar}></span>
                <span className={styles.bar}></span>
              </div>
              <div className={styles.trackDetails}>
                <span className={styles.trackName}>{spotifyTrack.name}</span>
                <span className={styles.artistName}>{spotifyTrack.artist}</span>
              </div>
            </a>
          </div>
        )}

        {/* Poster Image */}
        <div className={styles.posterContainer}>
          <AnimatePresence mode="wait">
            <motion.img 
              key={currentMovie.id}
              src={`https://image.tmdb.org/t/p/original${currentMovie.poster_path}`} 
              alt={currentMovie.title} 
              className={styles.poster}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          </AnimatePresence>
          <div className={styles.vignette}></div>
        </div>

        {/* Spotify Embed Player Container */}
        {spotifyTrack && (
          <div className={styles.spotifyPlayerSection}>
            <iframe
              key={spotifyTrack.trackId}
              src={`https://open.spotify.com/embed/track/${spotifyTrack.trackId}?utm_source=generator&theme=0`}
              width="100%"
              height="80"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="eager"
              className={styles.spotifyIframe}
              title="Spotify Player"
            />
          </div>
        )}

        {/* Movie Content */}
        <div className={styles.content}>
          <motion.h1 
            key={`title-${currentMovie.id}`}
            className={styles.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {currentMovie.title}
          </motion.h1>

          <motion.p 
            key={`cap-${currentMovie.id}`}
            className={styles.caption}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            A true masterpiece agreed upon by both of you.
          </motion.p>
        </div>
      </motion.div>
    </>,
    document.body
  );
};

export default StoryViewer;
