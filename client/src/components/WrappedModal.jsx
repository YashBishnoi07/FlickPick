import React from 'react';
import { animated, useSpring } from '@react-spring/web';
import styles from './WrappedModal.module.css';

const WrappedModal = ({ data, onClose }) => {
  const { y } = useSpring({
    from: { y: window.innerHeight },
    to: { y: 0 },
    config: { tension: 280, friction: 30 }
  });

  if (!data || data.error) {
    return (
      <animated.div className={styles.overlay} style={{ y }} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <h2>FlickPick Wrapped</h2>
          <p>Not enough swipe data yet! Keep swiping to generate your wrapped.</p>
          <button className={styles.closeBtn} onClick={onClose}>Close</button>
        </div>
      </animated.div>
    );
  }

  return (
    <animated.div className={styles.overlay} style={{ y }} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.wrappedContent}>
          <h2 className={styles.title}>Your FlickPick Wrapped</h2>
          
          <div className={styles.statBox}>
            <h3>{data.totalSwipes}</h3>
            <p>Total Swipes</p>
          </div>

          <div className={styles.row}>
            <div className={styles.statBox}>
              <h3 className={styles.rightSwipe}>{data.rightSwipes}</h3>
              <p>Likes</p>
            </div>
            <div className={styles.statBox}>
              <h3 className={styles.leftSwipe}>{data.leftSwipes}</h3>
              <p>Nopes</p>
            </div>
          </div>

          <div className={styles.topGenre}>
            <p>Your Top Genre</p>
            <h1 className={styles.genreText}>{data.topGenreName}</h1>
          </div>
        </div>

        <button className={styles.closeBtn} onClick={onClose}>Done</button>
      </div>
    </animated.div>
  );
};

export default WrappedModal;
