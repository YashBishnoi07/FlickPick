import React from 'react';
import { useSpring, animated } from '@react-spring/web';

const LoadingScreen = () => {
  const popAnim = useSpring({
    from: { scale: 1, opacity: 0.5 },
    to: async (next) => {
      while (true) {
        await next({ scale: 1.2, opacity: 1 });
        await next({ scale: 1, opacity: 0.5 });
      }
    },
    config: { duration: 750 }
  });

  const fadeAnim = useSpring({
    from: { opacity: 0 },
    to: { opacity: 1 },
    delay: 500
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100dvh',
      width: '100%',
      backgroundColor: 'var(--brand-secondary, #1C1C1E)',
      color: 'white',
      zIndex: 9999
    }}>
      <animated.div style={{ ...popAnim, fontSize: '48px', marginBottom: '16px' }}>
        🍿
      </animated.div>
      <animated.p style={{
        ...fadeAnim,
        fontFamily: 'var(--font-ui, sans-serif)',
        color: 'var(--text-secondary, rgba(255,255,255,0.6))',
        fontSize: '14px'
      }}>
        Loading...
      </animated.p>
    </div>
  );
};

export default LoadingScreen;
