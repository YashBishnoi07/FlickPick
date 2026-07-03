import React, { useEffect, useRef } from 'react';
import styles from './ReactionOverlay.module.css';

const ReactionOverlay = ({ onComplete }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(e => console.log('Reaction video autoplay blocked:', e));
    }

    const timer = setTimeout(() => {
      onComplete();
    }, 5000); // Overlay lasts 5 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={styles.overlay}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <filter id="green-screen">
          <feColorMatrix type="matrix" values="
            1 0 0 0 0
            0 1 0 0 0
            0 0 1 0 0
            1.5 -2 1.5 0 1
          " />
        </filter>
      </svg>
      <div className={styles.videoContainer}>
        <video 
          ref={videoRef}
          src="/reaction.mp4" 
          className={styles.video}
          style={{ filter: 'url(#green-screen)' }}
          playsInline
          preload="auto"
        />
        <h1 className={styles.reactionText}>Whyy?? How could you : (</h1>
      </div>
    </div>
  );
};

export default ReactionOverlay;
