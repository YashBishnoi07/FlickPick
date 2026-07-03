import React, { useEffect, useRef, useState } from 'react';
import styles from './VetoOverlay.module.css';

const VetoOverlay = ({ onComplete, onRevenge }) => {
  const videoRef = useRef(null);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    // Auto-play the video when mounted
    if (videoRef.current) {
      videoRef.current.play().catch(e => console.log('Video autoplay blocked:', e));
    }

    const timer = setTimeout(() => {
      setShowActions(true);
    }, 4000); // Show actions after video mostly finishes

    return () => clearTimeout(timer);
  }, []);

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
      <div className={styles.shatterContainer}>
        {/* Shards for CSS animation */}
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`${styles.shard} ${styles[`shard${i + 1}`]}`}></div>
        ))}
      </div>
      
      <div className={styles.videoContainer}>
        <video 
          ref={videoRef}
          src="/veto.mp4" 
          className={styles.video}
          style={{ filter: 'url(#green-screen)' }}
          playsInline
          preload="auto"
        />
        <h1 className={styles.vetoText}>hehehe : ))</h1>
      </div>

      {showActions && (
        <div className={styles.actionOverlay}>
          <button 
            className={styles.revengeBtn} 
            onClick={() => {
              onRevenge();
              onComplete();
            }}
          >
            🔥 Send Reaction!
          </button>
          <button 
            className={styles.skipBtn} 
            onClick={onComplete}
          >
            Whatever...
          </button>
        </div>
      )}
    </div>
  );
};

export default VetoOverlay;
