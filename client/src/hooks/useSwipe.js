import { useSpring } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { useState } from 'react';

export const useSwipe = ({ onSwipeLeft, onSwipeRight, threshold = 80 }) => {
  const [isGone, setIsGone] = useState(false);

  const [{ x, y, rot, scale }, api] = useSpring(() => ({
    x: 0,
    y: 0,
    rot: 0,
    scale: 1,
    config: { friction: 40, tension: 400 }
  }));

  const bind = useDrag(({ active, movement: [mx, my], velocity: [vx], direction: [xDir] }) => {
    const trigger = vx > 0.2; 
    let dir = xDir < 0 ? -1 : 1;
    
    if (!active && (trigger || Math.abs(mx) > threshold)) {
      setIsGone(true);
      // Swipe out
      api.start({
        x: (200 + window.innerWidth) * dir,
        y: my,
        rot: mx * 0.08,
        scale: 1,
        config: { friction: 50, tension: 200 },
        onRest: () => {
          if (dir === 1) onSwipeRight();
          else onSwipeLeft();
        }
      });
      
      // Haptics
      if (navigator.vibrate) {
        if (dir === 1) navigator.vibrate(50);
        else navigator.vibrate([30, 20, 30]);
      }
    } else {
      // Snap back or follow finger
      api.start({
        x: active ? mx : 0,
        y: active ? my : 0,
        rot: active ? mx * 0.08 : 0,
        scale: active ? 1.05 : 1,
        config: { friction: 40, tension: active ? 800 : 400 }
      });
    }
  });

  return { x, y, rot, scale, bind, isGone, api };
};
