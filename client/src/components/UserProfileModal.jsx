import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import styles from './UserProfileModal.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const UserProfileModal = ({ userId, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/user/${userId}/profile`);
        setProfile(res.data);
      } catch (err) {
        console.error('Failed to fetch user profile', err);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchProfile();
  }, [userId]);

  const renderAvatarContent = () => {
    if (profile?.avatar?.startsWith('data:image')) {
      return <img src={profile.avatar} alt="Profile" className={styles.avatarImage} />;
    }
    const fallback = profile?.avatar === '🦊' ? '👤' : (profile?.avatar || profile?.username?.charAt(0).toUpperCase() || '👤');
    return fallback;
  };

  const renderTrophies = () => {
    const trophies = [];
    if (profile?.matchesCount >= 1) trophies.push({ id: 1, icon: '🔥', title: 'First Match' });
    if (profile?.matchesCount >= 10) trophies.push({ id: 2, icon: '🏆', title: 'Cinephile' });
    if (profile?.likesCount >= 20) trophies.push({ id: 3, icon: '🍿', title: 'Swipe Master' });
    
    return trophies;
  };

  return createPortal(
    <motion.div 
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div 
        className={styles.modal}
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <button className={styles.closeBtn} onClick={onClose}>×</button>
        
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : profile ? (
          <div className={styles.content}>
            <div className={styles.header}>
              <div className={styles.avatar}>{renderAvatarContent()}</div>
              <h2>{profile.username}</h2>
              <p className={styles.memberSince}>
                Member since {new Date(profile.createdAt).getFullYear()}
              </p>
            </div>

            <div className={styles.section}>
              <h3>Top Picks</h3>
              {profile.topPicks && profile.topPicks.length > 0 ? (
                <div className={styles.topPicksGrid}>
                  {profile.topPicks.map(movie => (
                    <div key={movie.id} className={styles.topPickCard}>
                      <img src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`} alt={movie.title} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyText}>{profile.username} hasn't chosen any top picks yet.</p>
              )}
            </div>

            {renderTrophies().length > 0 && (
              <div className={styles.section}>
                <h3>Trophies</h3>
                <div className={styles.trophyGrid}>
                  {renderTrophies().map(t => (
                    <div key={t.id} className={styles.trophyBadge} title={t.title}>
                      <span className={styles.trophyIcon}>{t.icon}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.error}>Could not load profile.</div>
        )}
      </motion.div>
    </motion.div>,
    document.body
  );
};

export default UserProfileModal;
