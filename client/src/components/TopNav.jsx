import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './TopNav.module.css';

const TopNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show top nav on Home page or if it overlaps badly
  if (location.pathname === '/') return null;

  return (
    <div className={styles.navContainer}>
      <button className={styles.navBtn} onClick={() => navigate(-1)} aria-label="Go Back">
        ←
      </button>
      <button className={styles.navBtn} onClick={() => navigate('/')} aria-label="Go Home">
        🏠
      </button>
    </div>
  );
};

export default TopNav;
