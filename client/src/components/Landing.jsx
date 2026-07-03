import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { nanoid } from 'nanoid';
import { AuthContext } from '../context/AuthContext';
import styles from './Landing.module.css';

const Landing = () => {
  const navigate = useNavigate();
  const { logout, user } = useContext(AuthContext);
  const [aiPrompt, setAiPrompt] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const handleAIMatch = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setLoadingAI(true);
    try {
      const isSmartAi = localStorage.getItem('smartAi') !== 'false';
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ai-matchmaker`, { prompt: aiPrompt, useSmartAi: isSmartAi });
      
      const prefs = res.data;
      const code = `COUCH-${nanoid(4).toUpperCase()}`;
      localStorage.setItem(`prefs_${code}`, JSON.stringify(prefs));
      navigate(`/room/${code}`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate AI match');
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.bgWrapper}>
        <div className={styles.parallaxBg}></div>
        <div className={styles.noiseOverlay}></div>
      </div>
      
      <div className={styles.content}>
        <div className={styles.topBar}>
          <span className={styles.greeting}>Hi, {user?.username}!</span>
          <button className={styles.logoutBtn} onClick={handleLogout}>Log Out</button>
        </div>
        
        <div className={styles.logo}>
          <span className={styles.icon}>🥂💖</span>
          <h1 className={styles.title}>FlickPick</h1>
        </div>
        <p className={styles.tagline}>Stop scrolling. Start watching.</p>
        
        <div className={styles.actions}>
          <form onSubmit={handleAIMatch} className={styles.aiForm}>
            <input 
              type="text" 
              placeholder="e.g. Scary movies from the 90s"
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              className={styles.aiInput}
            />
            <button type="submit" className={styles.aiBtn} disabled={loadingAI}>
              {loadingAI ? '✨...' : '✨ Magic Match'}
            </button>
          </form>
          <div className={styles.divider}>or</div>
          <button className={styles.primaryBtn} onClick={() => navigate('/setup')}>
            Manual Room Setup
          </button>
          <button className={styles.ghostBtn} onClick={() => {
            const code = prompt('Enter Room Code:');
            if (code) navigate(`/room/${code.toUpperCase()}`);
          }}>
            Join with a code
          </button>
        </div>
      </div>
    </div>
  );
};

export default Landing;
