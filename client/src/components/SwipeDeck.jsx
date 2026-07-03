import React, { useEffect, useState } from 'react';
import { useTMDB } from '../hooks/useTMDB';
import SwipeCard from './SwipeCard';
import MovieDetailDrawer from './MovieDetailDrawer';
import VetoOverlay from './VetoOverlay';
import ReactionOverlay from './ReactionOverlay';
import styles from './SwipeDeck.module.css';

const SwipeDeck = ({ roomId, emitSwipe, partnerConnected, vetoedMovieId, partnerVetoReactionTrigger, emitVetoReaction, roomPrefs }) => {
  const { movies, fetchMovies, loading, hasMore } = useTMDB();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [hasVetoed, setHasVetoed] = useState(false);
  const [showVetoOverlay, setShowVetoOverlay] = useState(false);
  const [showReactionOverlay, setShowReactionOverlay] = useState(false);
  const [prefs, setPrefs] = useState({ services: '', genres: '' });

  const [swipedMovies, setSwipedMovies] = useState(new Set());

  useEffect(() => {
    if (partnerVetoReactionTrigger > 0) {
      setShowReactionOverlay(true);
    }
  }, [partnerVetoReactionTrigger]);

  useEffect(() => {
    const prefsStr = localStorage.getItem(`prefs_${roomId}`);
    const loadedPrefs = roomPrefs || (prefsStr ? JSON.parse(prefsStr) : { services: '', genres: '' });
    setPrefs(loadedPrefs);
    fetchMovies(loadedPrefs, 1);
  }, [roomId, fetchMovies, roomPrefs]);

  useEffect(() => {
    if (!loading && hasMore && movies.length > 0 && currentIndex > movies.length - 5) {
      const prefsStr = localStorage.getItem(`prefs_${roomId}`);
      const loadedPrefs = prefsStr ? JSON.parse(prefsStr) : { services: '', genres: '' };
      fetchMovies(loadedPrefs);
    }
  }, [currentIndex, movies.length, roomId, fetchMovies, loading, hasMore]);

  const handleSwipeLeft = (movie) => {
    setSwipedMovies(prev => new Set(prev).add(movie.id));
    emitSwipe('left', movie.id, movie);
    setCurrentIndex(prev => prev + 1);
  };

  const handleSwipeRight = (movie) => {
    if (movie.id === vetoedMovieId && !swipedMovies.has(movie.id)) {
      setShowVetoOverlay(true);
      return; // Stop the swipe! The trap has sprung!
    }
    setSwipedMovies(prev => new Set(prev).add(movie.id));
    emitSwipe('right', movie.id, movie);
    setCurrentIndex(prev => prev + 1);
  };

  const currentMovie = movies[currentIndex];

  return (
    <div className={styles.container}>
      <div className={styles.statusBar}>
        <div className={styles.partnerStatus}>
          <div className={`${styles.pulseDot} ${partnerConnected ? styles.green : styles.orange}`}></div>
          {partnerConnected ? 'Partner also swiping...' : 'Partner thinking...'}
        </div>
      </div>

      <div className={styles.deckArea}>
        {movies.length === 0 && loading ? (
          <div className={styles.loadingState}>Loading movies...</div>
        ) : movies.length > 0 && currentIndex < movies.length ? (
          movies.slice(currentIndex, currentIndex + 3).reverse().map((movie, idx, arr) => {
            const isTop = idx === arr.length - 1;
            const depth = arr.length - 1 - idx;
            
            const style = {
              scale: 1 - (depth * 0.05),
              y: depth * 25,
              zIndex: 10 - depth
            };

            return (
              <SwipeCard 
                key={movie.id} 
                movie={movie} 
                isTop={isTop}
                style={style}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
              />
            );
          })
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.popcornIcon}>🍿</div>
            <p>You've seen everything! Refresh for more?</p>
          </div>
        )}
      </div>

      <div className={styles.actionRow}>
        <button 
          className={styles.nopeBtn} 
          onClick={() => currentMovie && handleSwipeLeft(currentMovie)}
        >✕</button>
        <button 
          className={`${styles.vetoBtn} ${hasVetoed ? styles.used : ''}`}
          onClick={() => {
            if (!hasVetoed && currentMovie) {
              setHasVetoed(true);
              emitSwipe('veto', currentMovie.id, currentMovie);
              setCurrentIndex(prev => prev + 1);
            }
          }}
          disabled={hasVetoed}
        >⛔</button>
        <button 
          className={styles.infoBtn} 
          onClick={() => currentMovie && setSelectedMovie(currentMovie)}
        >ⓘ</button>
        <button 
          className={styles.likeBtn} 
          onClick={() => currentMovie && handleSwipeRight(currentMovie)}
        >♥</button>
      </div>

      {movies.length > 0 && (
        <div className={styles.progress}>
          {currentIndex + 1} of {movies.length} movies
        </div>
      )}

      {selectedMovie && (
        <MovieDetailDrawer 
          movie={selectedMovie} 
          onClose={() => setSelectedMovie(null)} 
          onNope={() => {
            handleSwipeLeft(selectedMovie);
            setSelectedMovie(null);
          }}
          onLike={() => {
            handleSwipeRight(selectedMovie);
            setSelectedMovie(null);
          }}
        />
      )}

      {showVetoOverlay && (
        <VetoOverlay 
          onRevenge={emitVetoReaction}
          onComplete={() => {
            setShowVetoOverlay(false);
            setCurrentIndex(prev => prev + 1);
          }} 
        />
      )}

      {showReactionOverlay && (
        <ReactionOverlay 
          onComplete={() => {
            setShowReactionOverlay(false);
          }} 
        />
      )}
    </div>
  );
};

export default SwipeDeck;
