import React from 'react';
import styles from './WaitingRoom.module.css';

const WaitingRoom = ({ roomId, isConnected }) => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.sofaIcon}>🥂</div>
        <h2 className={styles.title}>
          Waiting for your partner<span className={styles.dots}>...</span>
        </h2>
        <p className={styles.subtitle}>
          {isConnected ? "Connected to server." : "Connecting..."}
        </p>

        <div className={styles.shareBox}>
          <p className={styles.shareText}>Tell them to join with code:</p>
          <div className={styles.codeRow}>
            <div className={styles.codePill}>{roomId}</div>
            <button 
              className={styles.copyBtn} 
              onClick={() => {
                if (navigator.clipboard) navigator.clipboard.writeText(roomId);
              }}
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingRoom;
