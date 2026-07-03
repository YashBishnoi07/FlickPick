import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { AnimatePresence } from 'framer-motion';
import StoryViewer from './StoryViewer';
import styles from './HighlightsRow.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const HighlightsRow = () => {
  const [highlightChunks, setHighlightChunks] = useState([]);
  const [activeStoryGroup, setActiveStoryGroup] = useState(null);

  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/user/matches`);
        
        // Match documents have `movieData` inside them, but date is on the match itself
        const matches = data;
        
        // Group by partner
        const grouped = {};
        
        matches.forEach(m => {
          // Identify the partner (the other userId)
          let partner = null;
          if (m.userId1 && m.userId1._id !== user._id) partner = m.userId1;
          else if (m.userId2 && m.userId2._id !== user._id) partner = m.userId2;
          
          if (!partner) return; // Skip matches that aren't paired correctly or are single user
          
          if (!grouped[partner._id]) {
            grouped[partner._id] = {
              partner,
              movies: []
            };
          }
          grouped[partner._id].movies.push({ ...m.movieData, matchDate: m.createdAt });
        });

        setHighlightChunks(Object.values(grouped));
      } catch (err) {
        console.error('Failed to fetch matches', err);
      }
    };
    fetchMatches();
  }, [user]);

  return (
    <>
      <div className={styles.container}>
        <h2 className={styles.memoriesTitle}>Memories</h2>
        
        {highlightChunks.length === 0 ? (
          <p className={styles.emptyText}>No memories yet. Match with a friend to see them here!</p>
        ) : (
          <div className={styles.scrollWrapper}>
            {highlightChunks.map((group) => {
              const partner = group.partner;
              const movies = group.movies;
              
              const renderAvatar = () => {
                if (partner?.avatar?.startsWith('data:image')) {
                  return <img src={partner.avatar} alt={partner.username} className={styles.partnerAvatarImage} />;
                }
                const fallback = partner?.avatar === '🦊' ? '👤' : (partner?.avatar || '👤');
                return <span className={styles.emojiAvatar}>{fallback}</span>;
              };

              return (
                <div 
                  key={`group-${partner._id}`} 
                  className={styles.highlightCircle}
                  onClick={() => setActiveStoryGroup(movies)}
                >
                  <div className={styles.imageRing}>
                    {renderAvatar()}
                  </div>
                  <span className={styles.movieName}>
                    {partner.username}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {activeStoryGroup && (
          <StoryViewer 
            key="story-viewer"
            movies={activeStoryGroup} 
            onClose={() => setActiveStoryGroup(null)} 
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default HighlightsRow;
