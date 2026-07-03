import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import useSWR from 'swr';
import styles from './ProfileTab.module.css';
import WrappedModal from './WrappedModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ProfileTab = () => {
  const { user, setUser } = useContext(AuthContext);
  const fetcher = (url) => axios.get(url).then(res => res.data);
  const { data: likes = [] } = useSWR(user ? `${API_URL}/api/user/likes` : null, fetcher);
  const { data: matches = [] } = useSWR(user ? `${API_URL}/api/user/matches` : null, fetcher);
  const { data: wrappedData = null } = useSWR(user ? `${API_URL}/api/user/wrapped` : null, fetcher);
  const matchesCount = matches.length;
  
  const [showWrapped, setShowWrapped] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [smartAi, setSmartAi] = useState(localStorage.getItem('smartAi') !== 'false');

  // Calculate Trophies
  const trophies = [];
  if (matchesCount >= 1) trophies.push({ id: 1, icon: '🔥', title: 'First Match', desc: 'Matched with a friend' });
  if (matchesCount >= 10) trophies.push({ id: 2, icon: '🏆', title: 'Cinephile', desc: 'Matched 10 times' });
  if (likes.length >= 20) trophies.push({ id: 3, icon: '🍿', title: 'Swipe Master', desc: 'Liked 20+ movies' });
  
  const GENRE_MAP = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
    99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
    27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
    10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
  };

  // Find favorite genre based on likes
  if (likes.length > 0) {
    const genreCounts = {};
    likes.forEach(like => {
      const genres = like.movieData.genre_ids || [];
      genres.forEach(g => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    });
    const topGenreId = Object.keys(genreCounts).reduce((a, b) => genreCounts[a] > genreCounts[b] ? a : b);
    
    // Add a trophy for having a strong genre preference if they have enough likes
    if (genreCounts[topGenreId] >= 100) {
      const genreName = GENRE_MAP[topGenreId] || 'Cinephile';
      trophies.push({ id: 4, icon: '🎭', title: `${genreName} Specialist`, desc: `You really love ${genreName} movies!` });
    }
  }

  const [showAvatarSelect, setShowAvatarSelect] = useState(false);
  const [showTopPicksSelect, setShowTopPicksSelect] = useState(false);
  const fileInputRef = React.useRef(null);
  const avatars = ['🦊', '🐼', '🦁', '🐯', '🐰', '🐸', '🐵', '🦄', '🐶', '🐱'];

  const handleAvatarChange = async (avatar) => {
    try {
      await axios.put(`${API_URL}/api/user/avatar`, { avatar });
      setUser({ ...user, avatar });
      setShowAvatarSelect(false);
    } catch (err) {
      console.error('Failed to change avatar', err);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (max 2MB to avoid huge DB payloads)
    if (file.size > 2 * 1024 * 1024) {
      alert("Please choose an image under 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      handleAvatarChange(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleTopPickChange = async (movie) => {
    let newPicks = [...(user.topPicks || [])];
    const exists = newPicks.find(p => p.id === movie.id);
    if (exists) {
      newPicks = newPicks.filter(p => p.id !== movie.id);
    } else {
      if (newPicks.length >= 3) return; // Max 3
      newPicks.push(movie);
    }
    
    try {
      await axios.put(`${API_URL}/api/user/top-picks`, { topPicks: newPicks });
      setUser({ ...user, topPicks: newPicks });
    } catch (err) {
      console.error('Failed to change top picks', err);
    }
  };

  const renderAvatarContent = () => {
    if (user?.avatar?.startsWith('data:image')) {
      return <img src={user.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
    }
    return user?.avatar || user?.username?.charAt(0).toUpperCase() || '👤';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.avatar} onClick={() => setShowAvatarSelect(!showAvatarSelect)}>
          {renderAvatarContent()}
        </div>
        <h2>{user?.username}</h2>
      </div>

      {showAvatarSelect && (
        <div className={styles.avatarSelectSection}>
          <div className={styles.avatarHeader}>
            <h3 className={styles.sectionTitle}>Choose your Avatar</h3>
            <button className={styles.uploadBtn} onClick={() => fileInputRef.current.click()}>
              Upload Photo
            </button>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileUpload} 
            />
          </div>
          <div className={styles.avatarGrid}>
            {avatars.map(a => (
              <div 
                key={a} 
                className={`${styles.avatarOption} ${user?.avatar === a ? styles.selectedAvatar : ''}`}
                onClick={() => handleAvatarChange(a)}
              >
                {a}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.topPicksHeader}>
          <h3 className={styles.sectionTitle}>Top Picks</h3>
          {user?.topPicks?.length > 0 && (
            <button className={styles.uploadBtn} onClick={() => setShowTopPicksSelect(!showTopPicksSelect)}>
              {showTopPicksSelect ? 'Done' : 'Edit'}
            </button>
          )}
        </div>

        {(!user?.topPicks || user?.topPicks?.length === 0) && !showTopPicksSelect ? (
          <div className={styles.emptyTopPicks}>
            <p className={styles.emptyText}>Show off your favorite movies!</p>
            <button className={styles.uploadBtn} onClick={() => setShowTopPicksSelect(true)}>Select Top Picks</button>
          </div>
        ) : !showTopPicksSelect ? (
          <div className={styles.topPicksGrid}>
            {user.topPicks.map(movie => (
              <div key={`pick-${movie.id}`} className={styles.topPickCard}>
                <img src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`} alt={movie.title} />
              </div>
            ))}
          </div>
        ) : null}

        {showTopPicksSelect && (
          <div className={styles.topPicksSelectionArea}>
            <p className={styles.emptyText} style={{ marginBottom: '12px' }}>
              Select up to 3 movies from your likes ({user?.topPicks?.length || 0}/3)
            </p>
            <div className={styles.likesGrid}>
              {likes.map(like => {
                const movie = like.movieData;
                const isSelected = user?.topPicks?.some(p => p.id === movie.id);
                return (
                  <div 
                    key={`select-${movie.id}`} 
                    className={`${styles.likeSelectCard} ${isSelected ? styles.selectedPick : ''}`}
                    onClick={() => handleTopPickChange(movie)}
                  >
                    <img src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`} alt={movie.title} />
                    {isSelected && <div className={styles.checkOverlay}>✓</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
          <h3 className={styles.sectionTitle} style={{marginBottom: 0}}>Trophies</h3>
          <button 
            onClick={() => setShowWrapped(true)}
            style={{background: 'linear-gradient(90deg, var(--brand-primary), var(--accent-gold))', color: 'white', border: 'none', borderRadius: '20px', padding: '6px 16px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px'}}
          >
            Show Wrapped
          </button>
        </div>
        
        {trophies.length === 0 ? (
          <p className={styles.emptyText}>Keep swiping to earn trophies!</p>
        ) : (
          <div className={styles.trophyGrid}>
            {trophies.map(t => (
              <div key={t.id} className={styles.trophyCard}>
                <span className={styles.trophyIcon}>{t.icon}</span>
                <span className={styles.trophyTitle}>{t.title}</span>
                <span className={styles.trophyDesc}>{t.desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Settings</h3>
        
        <div className={styles.settingsRow}>
          <div className={styles.settingsLabel}>
            <h4>App Theme</h4>
            <p>Customize your viewing experience</p>
          </div>
          <select 
            className={styles.settingsSelect}
            value={theme}
            onChange={(e) => {
              const newTheme = e.target.value;
              setTheme(newTheme);
              localStorage.setItem('theme', newTheme);
              document.documentElement.setAttribute('data-theme', newTheme);
              window.dispatchEvent(new Event('themeChange')); // Force re-render if needed
            }}
          >
            <option value="dark">Dark (Default)</option>
            <option value="light">Light</option>
            <option value="oled">OLED Black</option>
          </select>
        </div>

        <div className={styles.settingsRow}>
          <div className={styles.settingsLabel}>
            <h4>Smart AI Personalization</h4>
            <p>Use your rated movies to improve AI Matchmaker</p>
          </div>
          <label className={styles.toggleSwitch}>
            <input 
              type="checkbox" 
              checked={smartAi}
              onChange={(e) => {
                const isChecked = e.target.checked;
                setSmartAi(isChecked);
                localStorage.setItem('smartAi', isChecked);
              }}
            />
            <span className={styles.slider}></span>
          </label>
        </div>
      </div>
      
      {showWrapped && (
        <WrappedModal data={wrappedData} onClose={() => setShowWrapped(false)} />
      )}
    </div>
  );
};

export default ProfileTab;
