import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './StoryViewer.module.css';

const StoryViewer = ({ movies, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const audioRef = useRef(null);
  const [songPath, setSongPath] = useState('');

  // Setup random song
  useEffect(() => {
    const randomSongNum = Math.floor(Math.random() * 11) + 1; // 1 to 11
    setSongPath(`/song${randomSongNum}.mp3`);
  }, []);

  // Play audio when path is set
  useEffect(() => {
    if (songPath && audioRef.current) {
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(err => console.log("Audio autoplay prevented", err));
    }
  }, [songPath]);

  // Auto-advance logic (10s per slide)
  useEffect(() => {
    const timer = setTimeout(() => {
      handleNext();
    }, 13000);
    return () => clearTimeout(timer);
  }, [currentIndex]);

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

  const currentMovie = movies[currentIndex];

  const formatDate = (dateString) => {
    if (!dateString) return "Sometime in the past";
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

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
        {songPath && <audio ref={audioRef} src={songPath} loop />}
        
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
